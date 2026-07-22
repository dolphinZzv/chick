package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"chick/internal/models"
)

func (h *Handlers) registerSearchTasks(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "search_tasks",
		Description: "Search tasks with filters",
		InputSchema: ObjectSchema(map[string]interface{}{
			"proposalId": StringParam("Filter by proposal ID"),
			"state":      StringParam("Filter by state: pending / in_progress / completed / blocked / cancelled"),
			"assigneeId": StringParam("Filter by assignee agent ID"),
			"limit":      NumberParam("Max results (default 20)"),
			"offset":     NumberParam("Offset for pagination"),
		}, nil),
		Handler: h.handleSearchTasks,
	})
}

func (h *Handlers) handleSearchTasks(id json.RawMessage, params json.RawMessage, agentID uint, remoteAddr string) Response {
	var p struct {
		ProposalID string `json:"proposalId"`
		State      string `json:"state"`
		Search     string `json:"search"`
		AssigneeID string `json:"assigneeId"`
		Limit      int    `json:"limit"`
		Offset     int    `json:"offset"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if agentID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	filter := models.TaskFilter{
		Search: p.Search,
		Limit:  p.Limit,
		Offset: p.Offset,
	}
	if p.Limit <= 0 {
		filter.Limit = 20
	}
	if p.State != "" {
		filter.State = []models.TaskState{models.TaskState(p.State)}
	}
	if p.ProposalID != "" {
		pid, err := strconv.ParseUint(p.ProposalID, 10, 64)
		if err == nil {
			v := uint(pid)
			filter.ProposalID = &v
		}
	}
	if p.AssigneeID != "" {
		aid, err := strconv.ParseUint(p.AssigneeID, 10, 64)
		if err == nil {
			v := uint(aid)
			filter.AssigneeID = &v
		}
	}
	tasks, total, err := h.taskSvc.List(filter)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	items := make([]map[string]interface{}, len(tasks))
	for i, t := range tasks {
		items[i] = map[string]interface{}{
			"id":     fmt.Sprintf("%d", t.ID),
			"number": t.Number,
			"title":  t.Title,
			"state":  string(t.State),
		}
	}
	return NewResponse(id, map[string]interface{}{
		"items": items,
		"total": total,
	})
}
