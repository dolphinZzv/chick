package service

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"morning-glory/internal/models"
	"morning-glory/internal/repository"
)

type WebhookService struct {
	repos       *repository.Repositories
	webhookRepo repository.WebhookRepository
	issueRepo   repository.IssueRepository
}

func NewWebhookService(repos *repository.Repositories, webhookRepo repository.WebhookRepository, issueRepo repository.IssueRepository) *WebhookService {
	return &WebhookService{repos: repos, webhookRepo: webhookRepo, issueRepo: issueRepo}
}

type WebhookCreateInput struct {
	ProjectID uint
	AgentID   uint
	Name      string
}

type WebhookCreateOutput struct {
	Webhook     *models.Webhook
	CurlExample string
}

func (s *WebhookService) Create(input WebhookCreateInput) (*WebhookCreateOutput, error) {
	secret := whRandomHex(32)
	w := &models.Webhook{
		ProjectID: input.ProjectID,
		AgentID:   input.AgentID,
		Name:      input.Name,
		Secret:    secret,
		Enabled:   true,
	}
	if err := s.webhookRepo.Create(w); err != nil {
		return nil, fmt.Errorf("create webhook: %w", err)
	}

	curlExample := fmt.Sprintf(`curl -X POST "http://YOUR_HOST/webhook/%s/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Issue from webhook",
    "description": "Created via webhook",
    "priority": "medium"
  }'`, secret)

	return &WebhookCreateOutput{Webhook: w, CurlExample: curlExample}, nil
}

func (s *WebhookService) GetBySecret(secret string) (*models.Webhook, error) {
	return s.webhookRepo.GetBySecret(secret)
}

func (s *WebhookService) ListByAgent(agentID uint) ([]models.Webhook, error) {
	return s.webhookRepo.ListByAgent(agentID)
}

func (s *WebhookService) ListByProject(projectID uint) ([]models.Webhook, error) {
	return s.webhookRepo.ListByProject(projectID)
}

func (s *WebhookService) Delete(id uint, agentID uint) error {
	w, err := s.webhookRepo.GetByID(id)
	if err != nil {
		return fmt.Errorf("webhook not found: %w", err)
	}
	if w.AgentID != agentID {
		return fmt.Errorf("access denied")
	}
	return s.webhookRepo.Delete(id)
}

func whRandomHex(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic("whRandomHex: " + err.Error())
	}
	return hex.EncodeToString(b)
}
