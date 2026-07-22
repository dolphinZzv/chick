package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"morning-glory/internal/models"
)

func (h *Handlers) registerAddCommentToProposal(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "add_comment_to_proposal",
		Description: "Add a comment to a proposal",
		InputSchema: ObjectSchema(map[string]interface{}{
			"proposalId": StringRequiredParam("Proposal ID"),
			"body":       StringRequiredParam("Comment body (Markdown)"),
		}, []string{"proposalId", "body"}),
		Handler: h.handleAddCommentToProposal,
	})
}

func (h *Handlers) handleAddCommentToProposal(id json.RawMessage, params json.RawMessage, authorID uint, remoteAddr string) Response {
	var p struct {
		ProposalID string `json:"proposalId"`
		Body       string `json:"body"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if authorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	proposalID, err := strconv.ParseUint(p.ProposalID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid proposalId: "+p.ProposalID)
	}
	comment, err := h.commentSvc.CreateForProposal(uint(proposalID), authorID, p.Body, models.CommentMarkdown, nil)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":   fmt.Sprintf("%d", comment.ID),
		"body": comment.Body,
	})
}
