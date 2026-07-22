package gorm

import (
	"morning-glory/internal/models"

	"gorm.io/gorm"
)

type WebhookRepo struct {
	db *gorm.DB
}

func NewWebhookRepo(db *gorm.DB) *WebhookRepo {
	return &WebhookRepo{db: db}
}

func (r *WebhookRepo) Create(webhook *models.Webhook) error {
	return r.db.Create(webhook).Error
}

func (r *WebhookRepo) GetByID(id uint) (*models.Webhook, error) {
	var w models.Webhook
	err := r.db.Preload("Agent").First(&w, id).Error
	return &w, err
}

func (r *WebhookRepo) GetBySecret(secret string) (*models.Webhook, error) {
	var w models.Webhook
	err := r.db.Preload("Agent").Where("secret = ? AND enabled = ?", secret, true).First(&w).Error
	return &w, err
}

func (r *WebhookRepo) ListByAgent(agentID uint) ([]models.Webhook, error) {
	var list []models.Webhook
	err := r.db.Where("agent_id = ?", agentID).Order("created_at DESC").Find(&list).Error
	return list, err
}

func (r *WebhookRepo) ListByProject(projectID uint) ([]models.Webhook, error) {
	var list []models.Webhook
	err := r.db.Where("project_id = ?", projectID).Preload("Agent").Order("created_at DESC").Find(&list).Error
	return list, err
}

func (r *WebhookRepo) Delete(id uint) error {
	return r.db.Delete(&models.Webhook{}, id).Error
}
