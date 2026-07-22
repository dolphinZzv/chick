package mcp

import (
	"encoding/json"
	"fmt"

	"morning-glory/internal/models"
	"morning-glory/internal/service"
)

func (h *Handlers) registerSubmitRequirement(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "submit_requirement",
		Description: "Submit a feature request or requirement from an LLM. This creates an issue in the configured requirement project for human review. Use this when an external user or LLM proposes a new feature that needs triage.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"projectId":   StringParam("Project ID (required if member of multiple projects)"),
			"title":       StringRequiredParam("Requirement title"),
			"description": StringRequiredParam("Requirement description / details in Markdown"),
		}, []string{"title", "description"}),
		Handler: h.handleSubmitRequirement,
	})
}

func (h *Handlers) handleSubmitRequirement(id json.RawMessage, params json.RawMessage, authorID uint, remoteAddr string) Response {
	var p struct {
		Title       string `json:"title"`
		Description string `json:"description"`
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
	if p.Description == "" {
		return NewError(id, -32602, "Missing required param: description")
	}

	projectID, err := h.resolveRequirementProject(authorID)
	if err != nil {
		return NewInternalError(id, err.Error())
	}

	issue, err := h.issueSvc.Create(service.IssueCreateInput{ProjectID: projectID, CreatorID: authorID, Title: p.Title, Description: p.Description, Priority: models.PriorityMedium})
	if err != nil {
		return NewInternalError(id, err.Error())
	}

	return NewResponse(id, map[string]interface{}{
		"id":          fmt.Sprintf("%d", issue.ID),
		"number":      issue.Number,
		"title":       issue.Title,
		"description": issue.Description,
		"state":       string(issue.State),
		"projectId":   fmt.Sprintf("%d", projectID),
	})
}
