package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"chick/internal/models"
)

func (h *Handlers) registerSearchIssues(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "search_issues",
		Description: "Search issues with filters. Use this to find issues by state, assignee, or full-text search. Returns paginated results with issue ID, number, title, and state.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"state":      StringParam("Filter by state"),
			"search":     StringParam("Full text search"),
			"assigneeId": StringParam("Filter by assignee agent ID"),
			"limit":      NumberParam("Max results (default 20)"),
			"offset":     NumberParam("Offset for pagination"),
			"projectId":  StringParam("Project ID (filter by project)"),
		}, nil),
		Handler: h.handleSearchIssues,
	})
}

func (h *Handlers) handleSearchIssues(id json.RawMessage, params json.RawMessage, agentID uint, remoteAddr string) Response {
	var p struct {
		State      string `json:"state"`
		Search     string `json:"search"`
		AssigneeID string `json:"assigneeId"`
		Limit      int    `json:"limit"`
		Offset     int    `json:"offset"`
		ProjectID  string `json:"projectId"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}

	if agentID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}

	filter := models.IssueFilter{
		Search: p.Search,
		Limit:  p.Limit,
		Offset: p.Offset,
	}
	if p.Limit <= 0 {
		filter.Limit = 20
	}
	if p.State != "" {
		filter.State = []models.IssueState{models.IssueState(p.State)}
	}
	if p.ProjectID != "" {
		pid, err := strconv.ParseUint(p.ProjectID, 10, 64)
		if err != nil {
			return NewError(id, -32602, "Invalid projectId: "+p.ProjectID)
		}
		v := uint(pid)
		if _, err := h.projectSvc.GetMemberRole(v, agentID); err != nil {
			return NewError(id, -32602, "Access denied: not a member of this project")
		}
		filter.ProjectID = &v
	} else {
		projects, err := h.projectSvc.ListByAgent(agentID)
		if err == nil && len(projects) == 1 {
			v := projects[0].ID
			filter.ProjectID = &v
		}
	}
	if p.AssigneeID != "" {
		aid, err := strconv.ParseUint(p.AssigneeID, 10, 64)
		if err != nil {
			return NewError(id, -32602, "Invalid assigneeId: "+p.AssigneeID)
		}
		filter.AssigneeIDs = []uint{uint(aid)}
	}

	issues, total, err := h.issueSvc.List(filter)
	if err != nil {
		return NewInternalError(id, err.Error())
	}

	items := make([]map[string]interface{}, len(issues))
	for i, issue := range issues {
		items[i] = map[string]interface{}{
			"id":     fmt.Sprintf("%d", issue.ID),
			"number": issue.Number,
			"title":  issue.Title,
			"state":  string(issue.State),
		}
	}
	return NewResponse(id, map[string]interface{}{
		"items": items,
		"total": total,
	})
}
