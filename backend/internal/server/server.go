package server

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/company/internal-service-report/internal/config"
	"github.com/company/internal-service-report/internal/domain/auth"
	"github.com/company/internal-service-report/internal/domain/partner"
	"github.com/company/internal-service-report/internal/domain/report"
	"github.com/company/internal-service-report/internal/domain/user"
	"github.com/company/internal-service-report/internal/middleware"
	"github.com/company/internal-service-report/pkg/bcrypt"
	"github.com/company/internal-service-report/pkg/jwt"
	"github.com/company/internal-service-report/pkg/mailer"
)

// New configures Gin server with all routes and dependencies.
func normalizeOrigin(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.TrimRight(trimmed, "/")
	if !strings.Contains(trimmed, "://") {
		trimmed = fmt.Sprintf("http://%s", trimmed)
	}
	if parsed, err := url.Parse(trimmed); err == nil && parsed.Scheme != "" && parsed.Host != "" {
		return fmt.Sprintf("%s://%s", parsed.Scheme, parsed.Host)
	}
	return trimmed
}

func makeUploadsCORSMiddleware(allowedOrigins []string, allowAll bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			allowed := allowAll
			if !allowAll {
				for _, allowedOrigin := range allowedOrigins {
					if allowedOrigin == origin {
						allowed = true
						break
					}
				}
			}
			if allowed {
				headers := c.Writer.Header()
				headers.Set("Access-Control-Allow-Origin", origin)
				headers.Set("Access-Control-Allow-Credentials", "true")
				headers.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
				headers.Set("Access-Control-Allow-Methods", "GET, OPTIONS")
				headers.Add("Vary", "Origin")
			}
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func New(db *gorm.DB, cfg *config.Config) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	rawFrontend := strings.TrimSpace(cfg.FrontendURL)
	allowAllOrigins := rawFrontend == "" || rawFrontend == "*"
	frontendOrigin := normalizeOrigin(rawFrontend)
	allowedOrigins := []string{}
	if !allowAllOrigins && frontendOrigin != "" {
		allowedOrigins = append(allowedOrigins, frontendOrigin)
		if strings.Contains(frontendOrigin, "localhost") {
			allowedOrigins = append(allowedOrigins, strings.Replace(frontendOrigin, "localhost", "127.0.0.1", 1))
		}
	}

	corsConfig := cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	if allowAllOrigins || len(allowedOrigins) == 0 {
		corsConfig.AllowOrigins = []string{}
		corsConfig.AllowOriginFunc = func(_ string) bool { return true }
	}

	r.Use(cors.New(corsConfig))

	uploadsGroup := r.Group("/uploads")
	uploadsGroup.Use(makeUploadsCORSMiddleware(allowedOrigins, allowAllOrigins))
	uploadsGroup.StaticFS("/", gin.Dir(cfg.UploadDir, true))

	hasher := bcrypt.New(12)
	jwtSvc := jwt.New(cfg.JWTSecret, cfg.AccessTokenTTL)

	mailSvc := mailer.New(mailer.Config{
		Host:     cfg.SMTPHost,
		Port:     cfg.SMTPPort,
		Username: cfg.SMTPUsername,
		Password: cfg.SMTPPassword,
		From:     cfg.SMTPFrom,
	})

	authSvc := auth.NewService(db, hasher, mailSvc)
	authHandler := auth.NewHandler(authSvc, jwtSvc, buildCookieConfig(cfg))

	userSvc := user.NewService(db, hasher, mailSvc)
	userHandler := user.NewHandler(userSvc)

	reportSvc := report.NewService(db, cfg.UploadDir)
	reportHandler := report.NewHandler(reportSvc)

	partnerSvc := partner.NewService(db)
	partnerHandler := partner.NewHandler(partnerSvc)

	api := r.Group("/api/v1")

	api.POST("/auth/login", authHandler.Login)
	api.POST("/auth/logout", authHandler.Logout)
	api.POST("/auth/forgot-password", authHandler.ForgotPassword)

	protected := api.Group("")
	protected.Use(middleware.Auth(jwtSvc))

	protected.GET("/auth/me", authHandler.Me)
	protected.POST("/auth/change-password", authHandler.ChangePassword)

	master := protected.Group("")
	master.Use(middleware.RoleGuard(user.RoleMasterAdmin))
	master.POST("/admins", userHandler.CreateAdmin)
	master.GET("/admins", userHandler.ListAdmins)
	master.PATCH("/admins/:id/reset-password", userHandler.ResetAdminPassword)

	admin := protected.Group("")
	admin.Use(middleware.RoleGuard(user.RoleAdmin))
	admin.POST("/teknisi", userHandler.CreateTeknisi)
	admin.PATCH("/teknisi/:id/reset-password", userHandler.ResetTeknisiPassword)
	admin.POST("/reports", reportHandler.Create)
	admin.PATCH("/reports/:id/assign", reportHandler.Assign)

	teknisiView := protected.Group("")
	teknisiView.Use(middleware.RoleGuard(user.RoleMasterAdmin, user.RoleAdmin))
	teknisiView.GET("/teknisi", userHandler.ListTeknisi)

	reportsView := protected.Group("/reports")
	reportsView.Use(middleware.RoleGuard(user.RoleMasterAdmin, user.RoleAdmin))
	reportsView.GET("", reportHandler.List)

	partnersView := protected.Group("/partners")
	partnersView.Use(middleware.RoleGuard(user.RoleMasterAdmin, user.RoleAdmin))
	partnersView.GET("", partnerHandler.List)
	partnersView.POST("", partnerHandler.Create)
	partnersView.DELETE("/:id", partnerHandler.Delete)

	teknisi := protected.Group("/teknisi")
	teknisi.Use(middleware.RoleGuard(user.RoleTeknisi, user.RoleAdmin, user.RoleMasterAdmin))
	teknisi.GET("/reports", reportHandler.ListAssigned)
	teknisi.GET("/reports/:id", reportHandler.TechnicianDetail)
	teknisi.POST("/reports/:id/attachments", reportHandler.UploadAttachment)
	teknisi.GET("/reports/:id/attachments/:attachment_id/download", reportHandler.DownloadAttachment)
	teknisi.DELETE("/reports/:id/attachments/:attachment_id", reportHandler.DeleteAttachment)
	teknisi.PATCH("/reports/:id/form", reportHandler.SaveTechnicianForm)
	teknisi.PATCH("/reports/:id/progress", reportHandler.UpdateProgress)

	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now()})
	})

	return r
}

func buildCookieConfig(cfg *config.Config) auth.CookieConfig {
	isLocal := strings.Contains(cfg.FrontendURL, "localhost") || strings.Contains(cfg.FrontendURL, "127.0.0.1")
	domain := ""
	if parsed, err := url.Parse(cfg.FrontendURL); err == nil && !isLocal {
		domain = parsed.Hostname()
	}
	conf := auth.CookieConfig{
		Domain: domain,
		Path:   "/",
	}
	if isLocal {
		conf.SameSite = http.SameSiteLaxMode
		conf.Secure = false
	} else {
		conf.SameSite = http.SameSiteNoneMode
		conf.Secure = true
	}
	return conf
}
