package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"chick/internal/models"
)

func (h *Handlers) registerTransitionTask(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "transition_task",
		Description: "Transition a task to a new state",
		InputSchema: ObjectSchema(map[string]interface{}{
			"taskId":  StringRequiredParam("Task ID"),
			"toState": StringRequiredParam("Target state: pending / in_progress / completed / blocked / cancelled"),
		}, []string{"taskId", "toState"}),
		Handler: h.handleTransitionTask,
	})
}

func (h *Handlers) handleTransitionTask(id json.RawMessage, params json.RawMessage, actorID uint, remoteAddr string) Response {
	var p struct {
		TaskID  string `json:"taskId"`
		ToState string `json:"toState"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if actorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	taskID, err := strconv.ParseUint(p.TaskID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid taskId: "+p.TaskID)
	}
	updated, err := h.taskSvc.TransitionState(uint(taskID), models.TaskState(p.ToState), actorID)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":    fmt.Sprintf("%d", updated.ID),
		"state": string(updated.State),
	})
}
