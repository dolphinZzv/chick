package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"chick/internal/models"
)

func (h *Handlers) registerTransitionIssue(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "transition_issue",
		Description: "Transition an issue to a new state. Common flows: open→in_progress→review→closed_completed. Use 'blocked' when stuck, 'later' to defer. Closed states are terminal.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"issueId": StringRequiredParam("Issue ID"),
			"toState": StringRequiredParam("Target state: open / in_progress / blocked / review / later / reopen / pending_confirmation / closed_completed / closed_not_planned / closed_rejected"),
		}, []string{"issueId", "toState"}),
		Handler: h.handleTransitionIssue,
	})
}

func (h *Handlers) handleTransitionIssue(id json.RawMessage, params json.RawMessage, actorID uint, remoteAddr string) Response {
	var p struct {
		IssueID string `json:"issueId"`
		ToState string `json:"toState"`
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

	issue, err := h.issueSvc.GetByID(uint(issueID))
	if err != nil {
		return NewError(id, -32602, "Issue not found")
	}
	if _, err := h.projectSvc.GetMemberRole(issue.ProjectID, actorID); err != nil {
		return NewError(id, -32602, "Access denied: not a member of this project")
	}

	updated, err := h.workflowSvc.Transition(uint(issueID), models.IssueState(p.ToState), actorID, nil)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":    fmt.Sprintf("%d", updated.ID),
		"state": string(updated.State),
	})
}
