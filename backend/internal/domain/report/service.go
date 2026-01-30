package report

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

var (
	ErrReportNotFound  = errors.New("report not found")
	ErrReportForbidden = errors.New("report forbidden")
)

// Service encapsulates business logic for service reports.
type Service struct {
	db        *gorm.DB
	uploadDir string
}

func (s *Service) GetForTechnician(ctx context.Context, reportID, teknisiID uint64) (*ServiceReport, error) {
	var report ServiceReport
	if err := s.db.WithContext(ctx).
		Preload("Attachments").
		Preload("Photos").
		First(&report, reportID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReportNotFound
		}
		return nil, err
	}
	if report.TeknisiID == nil || *report.TeknisiID != teknisiID {
		return nil, ErrReportForbidden
	}
	return &report, nil
}

func (s *Service) SaveTechnicianPayload(ctx context.Context, reportID, teknisiID uint64, payload []byte) (*ServiceReport, error) {
	report, err := s.GetForTechnician(ctx, reportID, teknisiID)
	if err != nil {
		return nil, err
	}
	processed, err := s.persistPayloadImages(reportID, report.Status, payload)
	if err != nil {
		return nil, err
	}
	report.TeknisiPayload = datatypes.JSON(processed)
	if err := s.db.WithContext(ctx).Model(report).Update("teknisi_payload", report.TeknisiPayload).Error; err != nil {
		return nil, err
	}
	return report, nil
}

func (s *Service) persistPayloadImages(reportID uint64, status string, payload []byte) ([]byte, error) {
	if len(payload) == 0 {
		return payload, nil
	}

	// Decode and store base64 data URLs in known fields.
	var root map[string]any
	dec := json.NewDecoder(bytes.NewReader(payload))
	dec.UseNumber()
	if err := dec.Decode(&root); err != nil {
		return payload, nil
	}

	folder := "draft"
	if status == "done" {
		folder = "finalized"
	}
	if finalizedRaw, ok := root["finalizedDate"]; ok {
		if finalizedStr, ok := finalizedRaw.(string); ok {
			finalizedStr = strings.TrimSpace(finalizedStr)
			if finalizedStr != "" {
				folder = sanitizeFilename(finalizedStr)
			}
		}
	}

	storeField := func(key, label string) {
		val, ok := root[key]
		if !ok {
			return
		}
		valStr, ok := val.(string)
		if !ok {
			return
		}
		url, err := s.storeImageDataURL(reportID, folder, label, valStr)
		if err != nil {
			return
		}
		if url != "" {
			root[key] = url
		}
	}

	storeSliceField := func(key, labelPrefix string) {
		val, ok := root[key]
		if !ok {
			return
		}
		arr, ok := val.([]any)
		if !ok {
			return
		}
		changed := false
		for i := range arr {
			itemStr, ok := arr[i].(string)
			if !ok {
				continue
			}
			url, err := s.storeImageDataURL(reportID, folder, fmt.Sprintf("%s-%02d", labelPrefix, i+1), itemStr)
			if err != nil {
				continue
			}
			if url != "" {
				arr[i] = url
				changed = true
			}
		}
		if changed {
			root[key] = arr
		}
	}

	storeField("beforeImage", "beforeImage")
	storeField("afterImage", "afterImage")
	storeSliceField("beforeEvidence", "beforeEvidence")
	storeSliceField("afterEvidence", "afterEvidence")
	storeSliceField("problemPhotos", "problemPhoto")

	out, err := json.Marshal(root)
	if err != nil {
		return payload, nil
	}
	return out, nil
}

func (s *Service) storeImageDataURL(reportID uint64, folder string, label string, value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", nil
	}
	// Already a URL/path.
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") || strings.HasPrefix(trimmed, "/uploads/") {
		return "", nil
	}
	if !strings.HasPrefix(trimmed, "data:image/") {
		return "", nil
	}

	comma := strings.Index(trimmed, ",")
	if comma < 0 {
		return "", nil
	}
	meta := trimmed[:comma]
	data := trimmed[comma+1:]
	if !strings.Contains(meta, ";base64") {
		return "", nil
	}

	mime := strings.TrimPrefix(meta, "data:")
	mime = strings.TrimSuffix(mime, ";base64")
	ext := ".png"
	switch mime {
	case "image/jpeg":
		ext = ".jpg"
	case "image/jpg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	}

	buf, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return "", nil
	}

	safeLabel := sanitizeFilename(label)
	safeFolder := sanitizeFilename(folder)
	if safeFolder == "" {
		safeFolder = "draft"
	}
	storedName := fmt.Sprintf("%s-%s%s", safeLabel, randomSuffix(), ext)
	storedPath := filepath.Join(s.uploadDir, "images", fmt.Sprintf("%d", reportID), safeFolder, storedName)
	if err := os.MkdirAll(filepath.Dir(storedPath), 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(storedPath, buf, 0o644); err != nil {
		return "", err
	}

	// Return URL path; server should expose /uploads -> uploadDir
	return fmt.Sprintf("/uploads/images/%d/%s/%s", reportID, safeFolder, storedName), nil
}

func NewService(db *gorm.DB, uploadDir string) *Service {
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	return &Service{db: db, uploadDir: uploadDir}
}

// ListFilter controls filtering when listing reports.
type ListFilter struct {
	Status  string
	AdminID *uint64
}

func (s *Service) Create(ctx context.Context, adminID uint64, req CreateReportRequest) (*ServiceReport, error) {
	report := &ServiceReport{
		DispatchNo:      generateDispatchNo(),
		AdminID:         adminID,
		CustomerName:    req.Customer.Name,
		CustomerAddress: req.Customer.Address,
		CustomerContact: req.Customer.Contact,
		DeviceName:      req.Device.Name,
		SerialNumber:    req.Device.Serial,
		DeviceLocation:  req.Device.Location,
		Complaint:       req.Complaint,
		Status:          "open",
		FormPayload:     datatypes.JSON(req.FormPayload),
	}
	if err := s.db.WithContext(ctx).Create(report).Error; err != nil {
		return nil, err
	}

	if processed, err := s.persistPayloadImages(report.ID, report.Status, req.FormPayload); err == nil {
		report.FormPayload = datatypes.JSON(processed)
		_ = s.db.WithContext(ctx).Model(report).Update("form_payload", report.FormPayload).Error
	}
	return report, nil
}

func (s *Service) List(ctx context.Context, filter ListFilter) ([]ServiceReport, error) {
	query := s.db.WithContext(ctx).Model(&ServiceReport{})
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.AdminID != nil {
		query = query.Where("admin_id = ?", *filter.AdminID)
	}
	var reports []ServiceReport
	if err := query.Order("opened_at DESC").Limit(200).Find(&reports).Error; err != nil {
		return nil, err
	}
	return reports, nil
}

func (s *Service) GetByID(ctx context.Context, id uint64) (*ServiceReport, error) {
	var report ServiceReport
	if err := s.db.WithContext(ctx).
		Preload("Attachments").
		Preload("Photos").
		First(&report, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReportNotFound
		}
		return nil, err
	}
	return &report, nil
}

func sanitizeFilename(name string) string {
	trimmed := strings.TrimSpace(name)
	trimmed = strings.ReplaceAll(trimmed, "..", "")
	trimmed = strings.ReplaceAll(trimmed, string(os.PathSeparator), "_")
	if trimmed == "" {
		return "attachment"
	}
	return trimmed
}

func randomSuffix() string {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 10)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		b[i] = alphabet[n.Int64()]
	}
	return string(b)
}

func (s *Service) SaveAttachment(ctx context.Context, reportID, teknisiID uint64, originalName, contentType string, size int64, r io.Reader) (*ReportAttachment, error) {
	_, err := s.GetForTechnician(ctx, reportID, teknisiID)
	if err != nil {
		return nil, err
	}

	safeName := sanitizeFilename(originalName)
	ext := filepath.Ext(safeName)
	base := strings.TrimSuffix(safeName, ext)
	if base == "" {
		base = "attachment"
	}
	storedName := fmt.Sprintf("%s-%s%s", base, randomSuffix(), ext)
	storedPath := filepath.Join(s.uploadDir, "attachments", fmt.Sprintf("%d", reportID), storedName)

	if err := os.MkdirAll(filepath.Dir(storedPath), 0o755); err != nil {
		return nil, err
	}

	f, err := os.Create(storedPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	if _, err := io.Copy(f, r); err != nil {
		_ = os.Remove(storedPath)
		return nil, err
	}

	att := &ReportAttachment{
		ReportID:    reportID,
		FilePath:    storedPath,
		FileName:    safeName,
		ContentType: contentType,
		Size:        size,
	}
	if err := s.db.WithContext(ctx).Create(att).Error; err != nil {
		_ = os.Remove(storedPath)
		return nil, err
	}
	return att, nil
}

func (s *Service) GetAttachment(ctx context.Context, reportID, attachmentID uint64) (*ReportAttachment, error) {
	var att ReportAttachment
	if err := s.db.WithContext(ctx).Where("id = ? AND report_id = ?", attachmentID, reportID).First(&att).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReportNotFound
		}
		return nil, err
	}
	return &att, nil
}

func (s *Service) DeleteAttachment(ctx context.Context, reportID, teknisiID, attachmentID uint64) error {
	report, err := s.GetForTechnician(ctx, reportID, teknisiID)
	if err != nil {
		return err
	}
	if report.Status == "done" {
		return ErrReportForbidden
	}

	att, err := s.GetAttachment(ctx, reportID, attachmentID)
	if err != nil {
		return err
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&ReportAttachment{}, att.ID).Error; err != nil {
			return err
		}
		if att.FilePath != "" {
			_ = os.Remove(att.FilePath)
		}
		return nil
	})
}

func (s *Service) ListAssigned(ctx context.Context, teknisiID uint64) ([]ServiceReport, error) {
	var reports []ServiceReport
	if err := s.db.WithContext(ctx).Where("teknisi_id = ?", teknisiID).Order("opened_at DESC").Find(&reports).Error; err != nil {
		return nil, err
	}
	return reports, nil
}

func (s *Service) Assign(ctx context.Context, reportID, teknisiID, adminID uint64) (*ServiceReport, error) {
	var report ServiceReport
	if err := s.db.WithContext(ctx).First(&report, reportID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReportNotFound
		}
		return nil, err
	}
	fromStatus := report.Status
	report.TeknisiID = &teknisiID
	updates := map[string]interface{}{
		"teknisi_id": teknisiID,
	}
	if report.Status == "open" {
		report.Status = "progress"
		updates["status"] = report.Status
	}
	if err := s.db.WithContext(ctx).Model(&report).Updates(updates).Error; err != nil {
		return nil, err
	}
	_ = s.createStatusLog(ctx, report.ID, adminID, fromStatus, report.Status, "Assigned technician")
	return &report, nil
}

func (s *Service) UpdateProgress(ctx context.Context, reportID, teknisiID uint64, req ProgressRequest) (*ServiceReport, error) {
	var report ServiceReport
	if err := s.db.WithContext(ctx).Where("id = ? AND teknisi_id = ?", reportID, teknisiID).First(&report).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReportNotFound
		}
		return nil, err
	}
	fromStatus := report.Status
	report.ActionTaken = req.ActionTaken
	report.Status = req.Status
	if req.Status == "done" {
		now := time.Now()
		report.CompletedAt = &now
	} else {
		report.CompletedAt = nil
	}
	if err := s.db.WithContext(ctx).Model(&report).Updates(map[string]interface{}{
		"action_taken": report.ActionTaken,
		"status":       report.Status,
		"completed_at": report.CompletedAt,
	}).Error; err != nil {
		return nil, err
	}
	note := fmt.Sprintf("Summary: %s", req.JobSummary)
	_ = s.createStatusLog(ctx, report.ID, teknisiID, fromStatus, report.Status, note)
	return &report, nil
}

func (s *Service) createStatusLog(ctx context.Context, reportID, changedBy uint64, fromStatus, toStatus, note string) error {
	log := StatusLog{
		ReportID:  reportID,
		ChangedBy: changedBy,
		From:      fromStatus,
		To:        toStatus,
		Note:      note,
	}
	return s.db.WithContext(ctx).Create(&log).Error
}

func generateDispatchNo() string {
	suffix := "000"
	if n, err := rand.Int(rand.Reader, big.NewInt(900)); err == nil {
		suffix = fmt.Sprintf("%03d", n.Int64()+100)
	}
	return fmt.Sprintf("%s-%s", time.Now().Format("20060102-150405"), suffix)
}
