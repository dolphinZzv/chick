package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"morning-glory/internal/models"
)

func (h *Handlers) registerAddCommentToTask(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "add_comment_to_task",
		Description: "Add a comment to a task",
		InputSchema: ObjectSchema(map[string]interface{}{
			"taskId": StringRequiredParam("Task ID"),
			"body":   StringRequiredParam("Comment body (Markdown)"),
		}, []string{"taskId", "body"}),
		Handler: h.handleAddCommentToTask,
	})
}

func (h *Handlers) handleAddCommentToTask(id json.RawMessage, params json.RawMessage, authorID uint, remoteAddr string) Response {
	var p struct {
		TaskID string `json:"taskId"`
		Body   string `json:"body"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if authorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	taskID, err := strconv.ParseUint(p.TaskID, 10, 64)
	if err != nil {
		return NewError(id, -32602, "Invalid taskId: "+p.TaskID)
	}
	comment, err := h.commentSvc.CreateForTask(uint(taskID), authorID, p.Body, models.CommentMarkdown, nil)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":   fmt.Sprintf("%d", comment.ID),
		"body": comment.Body,
	})
}
