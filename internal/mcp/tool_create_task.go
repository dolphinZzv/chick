package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"morning-glory/internal/models"
)

func (h *Handlers) registerCreateTask(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "create_task",
		Description: "Create a task under a proposal. Tasks are actionable units of work within a proposal. Each task can be assigned to an agent and linked to related issues. Common flow: create task -> assign -> transition to in_progress -> completed.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"proposalId":  StringRequiredParam("Proposal ID"),
			"title":       StringRequiredParam("Task title"),
			"description": StringParam("Task description in Markdown"),
			"priority":    StringParam("Priority: critical / high / medium / low"),
			"assigneeId":  StringParam("Agent ID to assign"),
		}, []string{"proposalId", "title"}),
		Handler: h.handleCreateTask,
	})
}

func (h *Handlers) handleCreateTask(id json.RawMessage, params json.RawMessage, authorID uint, remoteAddr string) Response {
	var p struct {
		ProposalID  string `json:"proposalId"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Priority    string `json:"priority"`
		AssigneeID  string `json:"assigneeId"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if authorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	if p.Title == "" {
		return NewError(id, -32602, "Missing required param: title")
	}
	proposalID, err := strconv.ParseUint(p.ProposalID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid proposalId: "+p.ProposalID)
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
	var assigneeID *uint
	if p.AssigneeID != "" {
		aid, err := strconv.ParseUint(p.AssigneeID, 10, 64)
		if err != nil {
			return NewError(id, -32602, "Invalid assigneeId: "+p.AssigneeID)
		}
		v := uint(aid)
		assigneeID = &v
	}
	proposal, err := h.proposalSvc.GetByID(uint(proposalID))
	if err != nil {
		return NewInternalError(id, "proposal not found: "+err.Error())
	}
	task, err := h.taskSvc.Create(uint(proposalID), proposal.ProjectID, authorID, p.Title, p.Description, priority, assigneeID)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":         fmt.Sprintf("%d", task.ID),
		"number":     task.Number,
		"title":      task.Title,
		"state":      string(task.State),
		"priority":   string(task.Priority),
		"proposalId": fmt.Sprintf("%d", proposalID),
	})
}
