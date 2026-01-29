package response

import "github.com/gin-gonic/gin"

func OK(c *gin.Context, data interface{}) {
    c.JSON(200, gin.H{"data": data})
}

func Created(c *gin.Context, data interface{}) {
    c.JSON(201, gin.H{"data": data})
}

func NoContent(c *gin.Context) {
    c.Status(204)
}

func BadRequest(c *gin.Context, err error) {
    c.JSON(400, gin.H{"error": err.Error()})
}

func Unauthorized(c *gin.Context, msg string) {
    c.JSON(401, gin.H{"error": msg})
}

func Forbidden(c *gin.Context) {
    c.JSON(403, gin.H{"error": "forbidden"})
}

func ForbiddenWithMessage(c *gin.Context, msg string) {
    if msg == "" {
        msg = "forbidden"
    }
    c.JSON(403, gin.H{"error": msg})
}

func NotFound(c *gin.Context, msg string) {
    c.JSON(404, gin.H{"error": msg})
}

func InternalError(c *gin.Context, err error) {
    c.JSON(500, gin.H{"error": err.Error()})
}
