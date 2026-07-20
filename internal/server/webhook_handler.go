package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"chick/internal/models"
	"chick/internal/service"
)

type WebhookIssueHandler struct {
	webhookSvc *service.WebhookService
	issueSvc   *service.IssueService
}

func NewWebhookIssueHandler(webhookSvc *service.WebhookService, issueSvc *service.IssueService) *WebhookIssueHandler {
	return &WebhookIssueHandler{webhookSvc: webhookSvc, issueSvc: issueSvc}
}

type webhookIssueRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Priority    string   `json:"priority"`
	LabelNames  []string `json:"labels"`
}

func (h *WebhookIssueHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract secret from URL path: /webhook/{secret}/issues
	secret := strings.TrimPrefix(r.URL.Path, "/webhook/")
	secret = strings.TrimSuffix(secret, "/issues")
	if secret == "" || secret == r.URL.Path {
		http.Error(w, "invalid webhook path", http.StatusBadRequest)
		return
	}

	// Authenticate webhook
	wh, err := h.webhookSvc.GetBySecret(secret)
	if err != nil {
		http.Error(w, `{"error":"invalid or disabled webhook"}`, http.StatusUnauthorized)
		return
	}

	// Parse request body
	var req webhookIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if req.Title == "" {
		http.Error(w, `{"error":"title is required"}`, http.StatusBadRequest)
		return
	}

	// Map priority
	priority := models.PriorityMedium
	switch strings.ToLower(req.Priority) {
	case "critical":
		priority = models.PriorityCritical
	case "high":
		priority = models.PriorityHigh
	case "low":
		priority = models.PriorityLow
	}

	// Create issue with webhook agent as creator
	issue, err := h.issueSvc.Create(service.IssueCreateInput{
		ProjectID:   wh.ProjectID,
		CreatorID:   wh.AgentID,
		Title:       req.Title,
		Description: req.Description,
		Priority:    priority,
	})
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":       issue.ID,
		"number":   issue.Number,
		"title":    issue.Title,
		"state":    issue.State,
		"priority": issue.Priority,
	})
}
