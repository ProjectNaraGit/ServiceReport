package report

import (
	"github.com/company/internal-service-report/pkg/response"
	"github.com/gin-gonic/gin"
)

// Handler exposes HTTP handlers for service reports.
type Handler struct {
	svc *Service
}

func (h *Handler) TechnicianDetail(c *gin.Context) {
	var uri struct {
		ID uint64 `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.BadRequest(c, err)
		return
	}

	role := c.GetString("role")
	ctx := c.Request.Context()

	if role == "ADMIN" || role == "MASTER_ADMIN" {
		report, err := h.svc.GetByID(ctx, uri.ID)
		if err != nil {
			if err == ErrReportNotFound {
				response.NotFound(c, "report not found")
				return
			}
			response.InternalError(c, err)
			return
		}
		response.OK(c, report)
		return
	}

	teknisiID := c.GetUint64("userID")
	report, err := h.svc.GetForTechnician(ctx, uri.ID, teknisiID)
	if err != nil {
		if err == ErrReportForbidden {
			response.ForbiddenWithMessage(c, "report not assigned to this technician")
			return
		}
		if err == ErrReportNotFound {
			response.NotFound(c, "report not found")
			return
		}
		response.InternalError(c, err)
		return
	}
	response.OK(c, report)
}

func (h *Handler) SaveTechnicianForm(c *gin.Context) {
	teknisiID := c.GetUint64("userID")
	var uri struct {
		ID uint64 `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.BadRequest(c, err)
		return
	}
	var req TechnicianFormRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}
	report, err := h.svc.SaveTechnicianPayload(c.Request.Context(), uri.ID, teknisiID, req.Payload)
	if err != nil {
		if err == ErrReportForbidden {
			response.ForbiddenWithMessage(c, "report not assigned to this technician")
			return
		}
		if err == ErrReportNotFound {
			response.NotFound(c, "report not found")
			return
		}
		response.InternalError(c, err)
		return
	}
	response.OK(c, report)
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Create(c *gin.Context) {
	adminID := c.GetUint64("userID")
	var req CreateReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}
	report, err := h.svc.Create(c.Request.Context(), adminID, req)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.Created(c, report)
}

func (h *Handler) List(c *gin.Context) {
	filter := ListFilter{Status: c.Query("status")}
	reports, err := h.svc.List(c.Request.Context(), filter)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, reports)
}

func (h *Handler) ListAssigned(c *gin.Context) {
	teknisiID := c.GetUint64("userID")
	reports, err := h.svc.ListAssigned(c.Request.Context(), teknisiID)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, reports)
}

func (h *Handler) Assign(c *gin.Context) {
	adminID := c.GetUint64("userID")
	var uri struct {
		ID uint64 `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.BadRequest(c, err)
		return
	}
	var req AssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}
	report, err := h.svc.Assign(c.Request.Context(), uri.ID, req.TeknisiID, adminID)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, report)
}

func (h *Handler) UpdateProgress(c *gin.Context) {
	teknisiID := c.GetUint64("userID")
	var uri struct {
		ID uint64 `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.BadRequest(c, err)
		return
	}
	var req ProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err)
		return
	}
	report, err := h.svc.UpdateProgress(c.Request.Context(), uri.ID, teknisiID, req)
	if err != nil {
		response.InternalError(c, err)
		return
	}
	response.OK(c, report)
}
