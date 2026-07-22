package mcp

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"morning-glory/internal/notifications"
	"morning-glory/internal/service"
)

type Handlers struct {
	projectSvc                  *service.ProjectService
	agentSvc                    *service.AgentService
	issueSvc                    *service.IssueService
	commentSvc                  *service.CommentService
	proposalSvc                 *service.ProposalService
	taskSvc                     *service.TaskService
	workflowSvc                 *service.WorkflowService
	notifSvc                    *notifications.Service
	defaultRequirementProjectID uint
}

func NewHandlers(
	projectSvc *service.ProjectService,
	agentSvc *service.AgentService,
	issueSvc *service.IssueService,
	commentSvc *service.CommentService,
	proposalSvc *service.ProposalService,
	taskSvc *service.TaskService,
	workflowSvc *service.WorkflowService,
	notifSvc *notifications.Service,
	defaultRequirementProjectID uint,
) *Handlers {
	return &Handlers{
		projectSvc:                  projectSvc,
		agentSvc:                    agentSvc,
		issueSvc:                    issueSvc,
		commentSvc:                  commentSvc,
		proposalSvc:                 proposalSvc,
		taskSvc:                     taskSvc,
		workflowSvc:                 workflowSvc,
		notifSvc:                    notifSvc,
		defaultRequirementProjectID: defaultRequirementProjectID,
	}
}

// resolveProject resolves a project ID from an explicit projectId or the agent's single membership.
func (h *Handlers) resolveProject(projectIDStr string, agentID uint) (uint, error) {
	if projectIDStr != "" {
		pid, err := strconv.ParseUint(projectIDStr, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid projectId: %s", projectIDStr)
		}
		return uint(pid), nil
	}
	if agentID == 0 {
		return 0, fmt.Errorf("cannot determine project: not authenticated")
	}
	projects, err := h.projectSvc.ListByAgent(agentID)
	if err != nil {
		return 0, fmt.Errorf("cannot determine project: %w", err)
	}
	if len(projects) == 0 {
		return 0, fmt.Errorf("agent is not a member of any project")
	}
	if len(projects) > 1 {
		return 0, fmt.Errorf("agent is member of multiple projects, specify projectId")
	}
	return projects[0].ID, nil
}

// resolveRequirementProject returns the project ID for submitting requirements.
func (h *Handlers) resolveRequirementProject(agentID uint) (uint, error) {
	if h.defaultRequirementProjectID == 0 {
		return 0, fmt.Errorf("requirement submission is not supported (no MORNING_GLORY_REQUIREMENT_PROJECT_ID configured)")
	}
	proj, err := h.projectSvc.GetByID(h.defaultRequirementProjectID)
	if err != nil {
		return 0, fmt.Errorf("requirement project %d not found: %w", h.defaultRequirementProjectID, err)
	}
	return proj.ID, nil
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func nilStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func nilInt(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}

func nilTimeStr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}

func maskToken(token string) string {
	if len(token) <= 10 {
		return token
	}
	return token[:6] + "…" + token[len(token)-4:]
}

// mcpLinksToJson converts []string to a JSON array string for DB storage.
func mcpLinksToJson(links []string) *string {
	if len(links) == 0 {
		return nil
	}
	for i := range links {
		links[i] = strings.TrimSpace(links[i])
	}
	filtered := make([]string, 0, len(links))
	for _, s := range links {
		if s != "" {
			filtered = append(filtered, s)
		}
	}
	if len(filtered) == 0 {
		return nil
	}
	b, err := json.Marshal(filtered)
	if err != nil {
		slog.Warn("mcpLinksToJson: failed to marshal links", "error", err, "links", filtered)
		return nil
	}
	s := string(b)
	return &s
}

// mcpParseLinks converts a JSON array string from DB to []string.
func mcpParseLinks(link *string) []string {
	if link == nil || *link == "" {
		return []string{}
	}
	var links []string
	if err := json.Unmarshal([]byte(*link), &links); err == nil {
		return links
	}
	return []string{strings.TrimSpace(*link)}
}
