package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"morning-glory/internal/models"
	"morning-glory/internal/service"
)

func (h *Handlers) registerCreateIssue(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "create_issue",
		Description: "Create a new issue in a project. The issue is the core work unit — use this to track bugs, features, tasks, or any actionable item. Required: title. The projectId is auto-detected if the agent belongs to only one project, otherwise it must be specified. The description, solution, and rootCause fields all support Markdown formatting.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"title":       StringRequiredParam("Issue title (required)"),
			"description": StringParam("Issue description in Markdown"),
			"priority":    StringParam("Priority: critical / high / medium / low (default: medium)"),
			"assigneeIds": ArrayParam("Agent IDs to assign (array of string IDs)", "string"),
			"milestoneId": StringParam("Milestone ID to associate"),
			"environment": StringParam("Environment name, e.g. staging, production"),
			"branch":      StringParam("Branch name"),
			"links":       ArrayParam("Related links (URLs)", "string"),
			"solution":    StringParam("Solution description in Markdown"),
			"rootCause":   StringParam("Root cause analysis in Markdown"),
			"difficulty":  NumberParam("Implementation difficulty (1-5)"),
			"startedAt":   StringParam("Start time (RFC3339 format, e.g. 2024-01-01T00:00:00Z)"),
			"completedAt": StringParam("End time (RFC3339 format)"),
			"projectId":   StringParam("Project ID (required if agent is member of multiple projects)"),
		}, []string{"title"}),
		Handler: h.handleCreateIssue,
	})
}

func (h *Handlers) handleCreateIssue(id json.RawMessage, params json.RawMessage, creatorID uint, remoteAddr string) Response {
	var p struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Priority    string   `json:"priority"`
		AssigneeIDs []string `json:"assigneeIds"`
		MilestoneID string   `json:"milestoneId"`
		Environment string   `json:"environment"`
		Branch      string   `json:"branch"`
		Links       []string `json:"links"`
		Solution    string   `json:"solution"`
		RootCause   string   `json:"rootCause"`
		Difficulty  int      `json:"difficulty"`
		StartedAt   string   `json:"startedAt"`
		CompletedAt string   `json:"completedAt"`
		ProjectID   string   `json:"projectId"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}

	if p.Title == "" {
		return NewError(id, -32602, "Missing required param: title")
	}
	if creatorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	projectID, err := h.resolveProject(p.ProjectID, creatorID)
	if err != nil {
		return NewError(id, -32602, err.Error())
	}
	priority := models.PriorityMedium
	if p.Priority != "" {
		switch p.Priority {
		case "critical", "high", "medium", "low":
			priority = models.Priority(p.Priority)
		default:
			return NewError(id, -32602, "Invalid priority: must be critical/high/medium/low")
		}
	}

	var assigneeIDs []uint
	for _, a := range p.AssigneeIDs {
		if aid, err := strconv.ParseUint(a, 10, 64); err == nil {
			assigneeIDs = append(assigneeIDs, uint(aid))
		}
	}

	var milestoneID *uint
	if p.MilestoneID != "" {
		if mid, err := strconv.ParseUint(p.MilestoneID, 10, 64); err == nil {
			v := uint(mid)
			milestoneID = &v
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
	env, branch := strPtr(p.Environment), strPtr(p.Branch)
	issue, err := h.issueSvc.Create(service.IssueCreateInput{ProjectID: projectID, CreatorID: creatorID, Title: p.Title, Description: p.Description, Priority: priority, AssigneeIDs: assigneeIDs, MilestoneID: milestoneID, Environment: env, Branch: branch, Link: mcpLinksToJson(p.Links), Solution: strPtr(p.Solution), RootCause: strPtr(p.RootCause), Difficulty: diff, StartedAt: startedAt, CompletedAt: completedAt})
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":          fmt.Sprintf("%d", issue.ID),
		"number":      issue.Number,
		"title":       issue.Title,
		"state":       string(issue.State),
		"environment": nilStr(issue.Environment),
		"branch":      nilStr(issue.Branch),
		"links":       mcpParseLinks(issue.Link),
	})
}
