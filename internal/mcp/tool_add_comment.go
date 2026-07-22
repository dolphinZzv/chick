package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"chick/internal/models"
)

func (h *Handlers) registerAddComment(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "add_comment",
		Description: "Add a comment to an issue. Use this to discuss, ask for clarification, provide updates, or share findings. Supports Markdown formatting.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"issueId": StringRequiredParam("Issue ID"),
			"body":    StringRequiredParam("Comment body (Markdown, supports **bold**, *italic*, code blocks, lists)"),
		}, []string{"issueId", "body"}),
		Handler: h.handleAddComment,
	})
}

func (h *Handlers) handleAddComment(id json.RawMessage, params json.RawMessage, authorID uint, remoteAddr string) Response {
	var p struct {
		IssueID string `json:"issueId"`
		Body    string `json:"body"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if authorID == 0 {
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
	if _, err := h.projectSvc.GetMemberRole(issue.ProjectID, authorID); err != nil {
		return NewError(id, -32602, "Access denied: not a member of this project")
	}

	comment, err := h.commentSvc.Create(uint(issueID), authorID, p.Body, models.CommentMarkdown, nil)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":   fmt.Sprintf("%d", comment.ID),
		"body": comment.Body,
	})
}
