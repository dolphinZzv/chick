package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"
)

func (h *Handlers) registerReviewProposal(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "review_proposal",
		Description: "Review a proposal (approve or reject)",
		InputSchema: ObjectSchema(map[string]interface{}{
			"proposalId": StringRequiredParam("Proposal ID"),
			"approved":   StringRequiredParam("true to approve, false to reject"),
			"note":       StringParam("Review note"),
		}, []string{"proposalId", "approved"}),
		Handler: h.handleReviewProposal,
	})
}

func (h *Handlers) handleReviewProposal(id json.RawMessage, params json.RawMessage, reviewerID uint, remoteAddr string) Response {
	var p struct {
		ProposalID string `json:"proposalId"`
		Approved   string `json:"approved"`
		Note       string `json:"note"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if reviewerID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	proposalID, err := strconv.ParseUint(p.ProposalID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid proposalId: "+p.ProposalID)
	}
	approved := p.Approved == "true"
	var note *string
	if p.Note != "" {
		note = &p.Note
	}
	updated, err := h.proposalSvc.Review(uint(proposalID), reviewerID, approved, note)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":    fmt.Sprintf("%d", updated.ID),
		"state": string(updated.State),
	})
}
