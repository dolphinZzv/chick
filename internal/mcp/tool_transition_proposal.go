package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"morning-glory/internal/models"
)

func (h *Handlers) registerTransitionProposal(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "transition_proposal",
		Description: "Transition a proposal to a new state",
		InputSchema: ObjectSchema(map[string]interface{}{
			"proposalId": StringRequiredParam("Proposal ID"),
			"toState":    StringRequiredParam("Target state: draft / submitted / under_review / approved / rejected / in_execution / completed / cancelled"),
		}, []string{"proposalId", "toState"}),
		Handler: h.handleTransitionProposal,
	})
}

func (h *Handlers) handleTransitionProposal(id json.RawMessage, params json.RawMessage, actorID uint, remoteAddr string) Response {
	var p struct {
		ProposalID string `json:"proposalId"`
		ToState    string `json:"toState"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if actorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	proposalID, err := strconv.ParseUint(p.ProposalID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid proposalId: "+p.ProposalID)
	}
	updated, err := h.proposalSvc.TransitionState(uint(proposalID), models.ProposalState(p.ToState), actorID, nil)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":    fmt.Sprintf("%d", updated.ID),
		"state": string(updated.State),
	})
}
