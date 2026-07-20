package models

import "time"

type Webhook struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	ProjectID uint      `gorm:"not null;index:idx_webhook_project_agent;index"`
	AgentID   uint      `gorm:"not null;index:idx_webhook_project_agent"`
	Name      string    `gorm:"type:varchar(100);not null"`
	Secret    string    `gorm:"type:varchar(64);not null;uniqueIndex"`
	Enabled   bool      `gorm:"not null;default:true"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`

	Project Project `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE"`
	Agent   Agent   `gorm:"foreignKey:AgentID;constraint:OnDelete:CASCADE"`
}
