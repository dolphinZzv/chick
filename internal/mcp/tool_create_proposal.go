package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"morning-glory/internal/models"
)

func (h *Handlers) registerCreateProposal(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "create_proposal",
		Description: "Create a new proposal in draft state. Proposals represent structured change plans that can contain multiple tasks. Use this for feature designs, refactoring plans, or multi-step improvements. Start in 'draft', then transition to 'submitted' for review.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"projectId":   StringParam("Project ID (required if member of multiple projects)"),
			"title":       StringRequiredParam("Proposal title"),
			"description": StringParam("Proposal description in Markdown"),
			"priority":    StringParam("Priority: critical / high / medium / low"),
			"labelIds":    ArrayParam("Label IDs", "string"),
		}, []string{"title"}),
		Handler: h.handleCreateProposal,
	})
}

func (h *Handlers) handleCreateProposal(id json.RawMessage, params json.RawMessage, authorID uint, remoteAddr string) Response {
	var p struct {
		ProjectID   string   `json:"projectId"`
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Priority    string   `json:"priority"`
		LabelIDs    []string `json:"labelIds"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if authorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	if p.Title == "" {
		return NewError(id, -32602, "Missing required param: title")
	}
	projectID, err := h.resolveProject(p.ProjectID, authorID)
	if err != nil {
		return NewError(id, -32602, err.Error())
	}
	priority := models.PriorityMedium
	if p.Priority != "" {
		switch p.Priority {
		case "critical", "high", "medium", "low":
			priority = models.Priority(p.Priority)
		default:
			return NewError(id, -32602, "Invalid priority: must be critical/high/medium/low")
		}
	}
	var labelIDs []uint
	for _, lid := range p.LabelIDs {
		if id, err := strconv.ParseUint(lid, 10, 64); err == nil {
			labelIDs = append(labelIDs, uint(id))
		}
	}
	proposal, err := h.proposalSvc.Create(projectID, authorID, p.Title, p.Description, priority, labelIDs)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	return NewResponse(id, map[string]interface{}{
		"id":        fmt.Sprintf("%d", proposal.ID),
		"number":    proposal.Number,
		"title":     proposal.Title,
		"state":     string(proposal.State),
		"priority":  string(proposal.Priority),
		"projectId": fmt.Sprintf("%d", projectID),
	})
}
