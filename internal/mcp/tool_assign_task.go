package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"
)

func (h *Handlers) registerAssignTask(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "assign_task",
		Description: "Assign an agent to a task",
		InputSchema: ObjectSchema(map[string]interface{}{
			"taskId":     StringRequiredParam("Task ID"),
			"assigneeId": StringRequiredParam("Agent ID to assign"),
		}, []string{"taskId", "assigneeId"}),
		Handler: h.handleAssignTask,
	})
}

func (h *Handlers) handleAssignTask(id json.RawMessage, params json.RawMessage, agentID uint, remoteAddr string) Response {
	var p struct {
		TaskID     string `json:"taskId"`
		AssigneeID string `json:"assigneeId"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if agentID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	taskID, err := strconv.ParseUint(p.TaskID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid taskId: "+p.TaskID)
	}
	assigneeID, err := strconv.ParseUint(p.AssigneeID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid assigneeId: "+p.AssigneeID)
	}
	updated, err := h.taskSvc.Assign(uint(taskID), uint(assigneeID))
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":    fmt.Sprintf("%d", updated.ID),
		"state": string(updated.State),
	})
}
