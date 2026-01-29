package report

import (
	"time"

	"gorm.io/datatypes"
)

// ServiceReport stores lifecycle for each maintenance job.
type ServiceReport struct {
	ID              uint64         `gorm:"primaryKey" json:"id"`
	DispatchNo      string         `gorm:"uniqueIndex;size:32" json:"dispatch_no"`
	AdminID         uint64         `gorm:"index" json:"admin_id"`
	TeknisiID       *uint64        `gorm:"index;index:idx_teknisi_opened_at,priority:1" json:"teknisi_id"`
	CustomerName    string         `gorm:"size:120" json:"customer_name"`
	CustomerAddress string         `gorm:"size:255" json:"customer_address"`
	CustomerContact string         `gorm:"size:120" json:"customer_contact"`
	DeviceName      string         `gorm:"size:100" json:"device_name"`
	SerialNumber    string         `gorm:"size:100" json:"serial_number"`
	DeviceLocation  string         `gorm:"size:120" json:"device_location"`
	Complaint       string         `gorm:"type:text" json:"complaint"`
	ActionTaken     string         `gorm:"type:text" json:"action_taken"`
	Status          string         `gorm:"type:enum('open','progress','done');default:'open';index:idx_status_opened_at,priority:1" json:"status"`
	OpenedAt        time.Time      `gorm:"autoCreateTime;index:idx_status_opened_at,priority:2;index:idx_teknisi_opened_at,priority:2" json:"opened_at"`
	UpdatedAt       time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	CompletedAt     *time.Time     `json:"completed_at"`
	FormPayload     datatypes.JSON `gorm:"type:json" json:"form_payload"`
	TeknisiPayload  datatypes.JSON `gorm:"type:json" json:"teknisi_payload"`
	Photos          []ReportPhoto  `gorm:"foreignKey:ReportID;constraint:OnDelete:CASCADE" json:"photos"`
	Attachments     []ReportAttachment `gorm:"foreignKey:ReportID;constraint:OnDelete:CASCADE" json:"attachments"`
	StatusLogs      []StatusLog    `gorm:"foreignKey:ReportID;constraint:OnDelete:CASCADE" json:"status_logs"`
}

// ReportPhoto stores uploaded media.
type ReportPhoto struct {
	ID        uint64    `gorm:"primaryKey" json:"id"`
	ReportID  uint64    `gorm:"index" json:"report_id"`
	Type      string    `gorm:"type:enum('before','after','other');default:'other'" json:"type"`
	FilePath  string    `gorm:"size:255" json:"file_path"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// ReportAttachment stores uploaded file attachments (pdf/doc/etc).
type ReportAttachment struct {
	ID           uint64    `gorm:"primaryKey" json:"id"`
	ReportID     uint64    `gorm:"index" json:"report_id"`
	FilePath     string    `gorm:"size:255" json:"file_path"`
	FileName     string    `gorm:"size:255" json:"file_name"`
	ContentType  string    `gorm:"size:120" json:"content_type"`
	Size         int64     `json:"size"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// StatusLog tracks transitions.
type StatusLog struct {
	ID        uint64 `gorm:"primaryKey"`
	ReportID  uint64 `gorm:"index"`
	ChangedBy uint64
	From      string    `gorm:"size:32"`
	To        string    `gorm:"size:32"`
	Note      string    `gorm:"type:text"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}
