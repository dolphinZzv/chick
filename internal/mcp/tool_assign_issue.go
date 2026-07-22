package mcp

import (
	"encoding/json"
	"strconv"
)

func (h *Handlers) registerAssignIssue(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "assign_issue",
		Description: "Assign an agent to an issue. Use this to delegate work to a specific team member. The agent will receive a notification about the assignment.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"issueId": StringRequiredParam("Issue ID"),
			"agentId": StringRequiredParam("Agent ID to assign"),
		}, []string{"issueId", "agentId"}),
		Handler: h.handleAssignIssue,
	})
}

func (h *Handlers) handleAssignIssue(id json.RawMessage, params json.RawMessage, agentID uint, remoteAddr string) Response {
	var p struct {
		IssueID string `json:"issueId"`
		AgentID string `json:"agentId"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if agentID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	issueID, err := strconv.ParseUint(p.IssueID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid issueId: "+p.IssueID)
	}
	assignAgentID, err := strconv.ParseUint(p.AgentID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid agentId: "+p.AgentID)
	}

	issue, err := h.issueSvc.GetByID(uint(issueID))
	if err != nil {
		return NewError(id, -32602, "Issue not found")
	}
	if _, err := h.projectSvc.GetMemberRole(issue.ProjectID, agentID); err != nil {
		return NewError(id, -32602, "Access denied: not a member of this project")
	}

	_, err = h.issueSvc.AddAssignee(uint(issueID), uint(assignAgentID))
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{"success": true})
}
