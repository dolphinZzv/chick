package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"morning-glory/internal/models"
	"morning-glory/internal/service"
)

func (h *Handlers) registerEditIssue(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "edit_issue",
		Description: "Edit an existing issue's title, description, or priority",
		InputSchema: ObjectSchema(map[string]interface{}{
			"issueId":     StringRequiredParam("Issue ID"),
			"title":       StringParam("New issue title"),
			"description": StringParam("New issue description in Markdown"),
			"priority":    StringParam("New priority: critical / high / medium / low"),
			"environment": StringParam("Environment name, e.g. staging, production"),
			"branch":      StringParam("Branch name"),
			"links":       ArrayParam("Related links (URLs)", "string"),
			"solution":    StringParam("Solution description in Markdown"),
			"rootCause":   StringParam("Root cause analysis in Markdown"),
			"difficulty":  NumberParam("Implementation difficulty (1-5)"),
			"startedAt":   StringParam("Start processing time (RFC3339)"),
			"completedAt": StringParam("End processing time (RFC3339)"),
		}, []string{"issueId"}),
		Handler: h.handleEditIssue,
	})
}

func (h *Handlers) handleEditIssue(id json.RawMessage, params json.RawMessage, actorID uint, remoteAddr string) Response {
	var p struct {
		IssueID     string   `json:"issueId"`
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Priority    string   `json:"priority"`
		Environment string   `json:"environment"`
		Branch      string   `json:"branch"`
		Links       []string `json:"links"`
		Solution    string   `json:"solution"`
		RootCause   string   `json:"rootCause"`
		Difficulty  int      `json:"difficulty"`
		StartedAt   string   `json:"startedAt"`
		CompletedAt string   `json:"completedAt"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if actorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	issueID, err := strconv.ParseUint(p.IssueID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid issueId: "+p.IssueID)
	}

	existing, err := h.issueSvc.GetByID(uint(issueID))
	if err != nil {
		return NewError(id, -32602, "Issue not found")
	}
	if _, err := h.projectSvc.GetMemberRole(existing.ProjectID, actorID); err != nil {
		return NewError(id, -32602, "Access denied: not a member of this project")
	}

	if p.Title == "" && p.Description == "" && p.Priority == "" && p.Difficulty == 0 && p.StartedAt == "" && p.CompletedAt == "" && len(p.Links) == 0 && p.Solution == "" && p.RootCause == "" {
		return NewError(id, -32602, "At least one field must be provided for update")
	}

	priority := models.Priority(p.Priority)
	if p.Priority != "" {
		switch p.Priority {
		case "critical", "high", "medium", "low":
			priority = models.Priority(p.Priority)
		default:
			return NewError(id, -32602, "Invalid priority: must be critical/high/medium/low")
		}
	}

	var diff *int
	if p.Difficulty != 0 {
		if p.Difficulty < 1 || p.Difficulty > 5 {
			return NewError(id, -32602, "Invalid difficulty: must be 1-5")
		}
		d := p.Difficulty
		diff = &d
	}

	var startedAt, completedAt *time.Time
	if p.StartedAt != "" {
		t, err := time.Parse(time.RFC3339, p.StartedAt)
		if err != nil {
			return NewError(id, -32602, "Invalid startedAt: must be RFC3339 format")
		}
		startedAt = &t
	}
	if p.CompletedAt != "" {
		t, err := time.Parse(time.RFC3339, p.CompletedAt)
		if err != nil {
			return NewError(id, -32602, "Invalid completedAt: must be RFC3339 format")
		}
		completedAt = &t
	}

	var linkInput *string
	if p.Links != nil {
		if len(p.Links) == 0 {
			s := ""
			linkInput = &s
		} else {
			linkInput = mcpLinksToJson(p.Links)
		}
	}
	issue, err := h.issueSvc.Update(uint(issueID), service.IssueUpdateInput{
		Title:       strPtr(p.Title),
		Description: strPtr(p.Description),
		Priority:    &priority,
		Environment: strPtr(p.Environment),
		Branch:      strPtr(p.Branch),
		Link:        linkInput,
		Solution:    strPtr(p.Solution),
		RootCause:   strPtr(p.RootCause),
		StartedAt:   startedAt,
		CompletedAt: completedAt,
		Difficulty:  diff,
	})
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":          fmt.Sprintf("%d", issue.ID),
		"number":      issue.Number,
		"title":       issue.Title,
		"description": issue.Description,
		"state":       string(issue.State),
		"priority":    string(issue.Priority),
		"environment": nilStr(issue.Environment),
		"branch":      nilStr(issue.Branch),
		"links":       mcpParseLinks(issue.Link),
	})
}
