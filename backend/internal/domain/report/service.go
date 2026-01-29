package report

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

var (
	ErrReportNotFound = errors.New("report not found")
	ErrReportForbidden = errors.New("report forbidden")
)

// Service encapsulates business logic for service reports.
type Service struct {
	db *gorm.DB
}

func (s *Service) GetForTechnician(ctx context.Context, reportID, teknisiID uint64) (*ServiceReport, error) {
	var report ServiceReport
	if err := s.db.WithContext(ctx).First(&report, reportID).Error; err != nil {
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
	report.TeknisiPayload = datatypes.JSON(payload)
	if err := s.db.WithContext(ctx).Model(report).Update("teknisi_payload", report.TeknisiPayload).Error; err != nil {
		return nil, err
	}
	return report, nil
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
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
	if err := query.Order("opened_at DESC").Find(&reports).Error; err != nil {
		return nil, err
	}
	return reports, nil
}

func (s *Service) GetByID(ctx context.Context, id uint64) (*ServiceReport, error) {
	var report ServiceReport
	if err := s.db.WithContext(ctx).First(&report, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReportNotFound
		}
		return nil, err
	}
	return &report, nil
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
