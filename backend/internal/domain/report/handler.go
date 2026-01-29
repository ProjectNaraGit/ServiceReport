package report

import (
	"net/http"

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

func (h *Handler) UploadAttachment(c *gin.Context) {
	role := c.GetString("role")
	if role != "TEKNISI" {
		response.ForbiddenWithMessage(c, "only technician can upload attachments")
		return
	}

	teknisiID := c.GetUint64("userID")
	var uri struct {
		ID uint64 `uri:"id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.BadRequest(c, err)
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, err)
		return
	}

	f, err := file.Open()
	if err != nil {
		response.InternalError(c, err)
		return
	}
	defer f.Close()

	contentType := file.Header.Get("Content-Type")
	att, err := h.svc.SaveAttachment(c.Request.Context(), uri.ID, teknisiID, file.Filename, contentType, file.Size, f)
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
	response.Created(c, att)
}

func (h *Handler) DownloadAttachment(c *gin.Context) {
	var uri struct {
		ID           uint64 `uri:"id" binding:"required"`
		AttachmentID uint64 `uri:"attachment_id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.BadRequest(c, err)
		return
	}

	role := c.GetString("role")
	ctx := c.Request.Context()

	if role == "ADMIN" || role == "MASTER_ADMIN" {
		if _, err := h.svc.GetByID(ctx, uri.ID); err != nil {
			if err == ErrReportNotFound {
				response.NotFound(c, "report not found")
				return
			}
			response.InternalError(c, err)
			return
		}
	} else {
		teknisiID := c.GetUint64("userID")
		if _, err := h.svc.GetForTechnician(ctx, uri.ID, teknisiID); err != nil {
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
	}

	att, err := h.svc.GetAttachment(ctx, uri.ID, uri.AttachmentID)
	if err != nil {
		if err == ErrReportNotFound {
			response.NotFound(c, "attachment not found")
			return
		}
		response.InternalError(c, err)
		return
	}

	c.FileAttachment(att.FilePath, att.FileName)
	c.Status(http.StatusOK)
}

func (h *Handler) DeleteAttachment(c *gin.Context) {
	role := c.GetString("role")
	if role != "TEKNISI" {
		response.ForbiddenWithMessage(c, "only technician can delete attachments")
		return
	}

	teknisiID := c.GetUint64("userID")
	var uri struct {
		ID           uint64 `uri:"id" binding:"required"`
		AttachmentID uint64 `uri:"attachment_id" binding:"required"`
	}
	if err := c.ShouldBindUri(&uri); err != nil {
		response.BadRequest(c, err)
		return
	}

	if err := h.svc.DeleteAttachment(c.Request.Context(), uri.ID, teknisiID, uri.AttachmentID); err != nil {
		if err == ErrReportForbidden {
			response.ForbiddenWithMessage(c, "report finalized or not assigned")
			return
		}
		if err == ErrReportNotFound {
			response.NotFound(c, "attachment not found")
			return
		}
		response.InternalError(c, err)
		return
	}
	response.OK(c, gin.H{"deleted": true})
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
