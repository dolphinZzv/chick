package mcp

import (
	"encoding/json"
	"strconv"
)

func (h *Handlers) registerLinkIssuesToTask(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "link_issues_to_task",
		Description: "Link issues to a task",
		InputSchema: ObjectSchema(map[string]interface{}{
			"taskId":   StringRequiredParam("Task ID"),
			"issueIds": ArrayParam("Issue IDs to link", "string"),
		}, []string{"taskId", "issueIds"}),
		Handler: h.handleLinkIssuesToTask,
	})
}

func (h *Handlers) handleLinkIssuesToTask(id json.RawMessage, params json.RawMessage, agentID uint, remoteAddr string) Response {
	var p struct {
		TaskID   string   `json:"taskId"`
		IssueIDs []string `json:"issueIds"`
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
	for _, iid := range p.IssueIDs {
		issueID, err := strconv.ParseUint(iid, 10, 64)
		if err != nil {
			return NewError(id, -32602, "Invalid issueId: "+iid)
		}
		if err := h.taskSvc.LinkIssue(uint(taskID), uint(issueID)); err != nil {
			return NewInternalError(id, err.Error())
		}
	}
	return NewResponse(id, map[string]interface{}{"success": true})
}
