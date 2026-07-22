package mcp

import (
	"encoding/json"
	"strconv"
)

func (h *Handlers) registerUnlinkIssueFromTask(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "unlink_issue_from_task",
		Description: "Unlink an issue from a task",
		InputSchema: ObjectSchema(map[string]interface{}{
			"taskId":  StringRequiredParam("Task ID"),
			"issueId": StringRequiredParam("Issue ID to unlink"),
		}, []string{"taskId", "issueId"}),
		Handler: h.handleUnlinkIssueFromTask,
	})
}

func (h *Handlers) handleUnlinkIssueFromTask(id json.RawMessage, params json.RawMessage, agentID uint, remoteAddr string) Response {
	var p struct {
		TaskID  string `json:"taskId"`
		IssueID string `json:"issueId"`
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
	issueID, err := strconv.ParseUint(p.IssueID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid issueId: "+p.IssueID)
	}
	if err := h.taskSvc.UnlinkIssue(uint(taskID), uint(issueID)); err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{"success": true})
}
