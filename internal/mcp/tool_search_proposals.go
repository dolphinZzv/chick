package mcp

import (
	"encoding/json"
	"fmt"

	"morning-glory/internal/models"
)

func (h *Handlers) registerSearchProposals(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "search_proposals",
		Description: "Search proposals with filters",
		InputSchema: ObjectSchema(map[string]interface{}{
			"projectId": StringParam("Project ID (required if member of multiple projects)"),
			"state":     StringParam("Filter by state: draft / submitted / under_review / approved / rejected / in_execution / completed / cancelled"),
			"search":    StringParam("Full text search"),
			"limit":     NumberParam("Max results (default 20)"),
			"offset":    NumberParam("Offset for pagination"),
		}, nil),
		Handler: h.handleSearchProposals,
	})
}

func (h *Handlers) handleSearchProposals(id json.RawMessage, params json.RawMessage, agentID uint, remoteAddr string) Response {
	var p struct {
		ProjectID string `json:"projectId"`
		State     string `json:"state"`
		Search    string `json:"search"`
		Limit     int    `json:"limit"`
		Offset    int    `json:"offset"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if agentID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	projectID, err := h.resolveProject(p.ProjectID, agentID)
	if err != nil {
		return NewError(id, -32602, err.Error())
	}
	filter := models.ProposalFilter{
		ProjectID: &projectID,
		Search:    p.Search,
		Limit:     p.Limit,
		Offset:    p.Offset,
	}
	if p.Limit <= 0 {
		filter.Limit = 20
	}
	if p.State != "" {
		filter.State = []models.ProposalState{models.ProposalState(p.State)}
	}
	proposals, total, err := h.proposalSvc.List(filter)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	items := make([]map[string]interface{}, len(proposals))
	for i, prop := range proposals {
		items[i] = map[string]interface{}{
			"id":     fmt.Sprintf("%d", prop.ID),
			"number": prop.Number,
			"title":  prop.Title,
			"state":  string(prop.State),
		}
	}
	return NewResponse(id, map[string]interface{}{
		"items": items,
		"total": total,
	})
}
