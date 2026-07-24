package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"morning-glory/internal/models"
	"morning-glory/internal/service"
)

func (h *Handlers) registerCreateIssuesBatch(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "create_issues_batch",
		Description: "Batch create multiple issues at once",
		InputSchema: ObjectSchema(map[string]interface{}{
			"projectId": StringParam("Project ID (required if member of multiple projects)"),
			"issues": map[string]interface{}{
				"type":        "array",
				"description": "Array of issues to create",
				"items": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"title":         StringRequiredParam("Issue title"),
						"description":   StringParam("Issue description in Markdown"),
						"priority":      StringParam("Priority: critical / high / medium / low"),
						"assigneeIds":   ArrayParam("Agent IDs to assign", "string"),
						"labelIds":      ArrayParam("Label IDs", "string"),
						"milestoneId":   StringParam("Milestone ID"),
						"environment":   StringParam("Environment name, e.g. staging, production"),
						"branch":        StringParam("Branch name"),
						"links":         ArrayParam("Related links (URLs)", "string"),
						"commits":       ArrayParam("Commit hashes", "string"),
						"fixedInCommit": StringParam("Commit hash that fixed this issue"),
						"solution":      StringParam("Solution description in Markdown"),
						"rootCause":     StringParam("Root cause analysis in Markdown"),
					},
					"required": []string{"title"},
				},
			},
		}, []string{"issues"}),
		Handler: h.handleCreateIssuesBatch,
	})
}

func (h *Handlers) handleCreateIssuesBatch(id json.RawMessage, params json.RawMessage, creatorID uint, remoteAddr string) Response {
	var p struct {
		ProjectID string            `json:"projectId"`
		Issues    []json.RawMessage `json:"issues"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if creatorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	if len(p.Issues) == 0 {
		return NewError(id, -32602, "Missing required param: issues (must be a non-empty array)")
	}

	projectID, err := h.resolveProject(p.ProjectID, creatorID)
	if err != nil {
		return NewError(id, -32602, err.Error())
	}

	var results []map[string]interface{}
	for i, raw := range p.Issues {
		var issue struct {
			Title         string   `json:"title"`
			Description   string   `json:"description"`
			Priority      string   `json:"priority"`
			AssigneeIDs   []string `json:"assigneeIds"`
			LabelIDs      []string `json:"labelIds"`
			MilestoneID   string   `json:"milestoneId"`
			Environment   string   `json:"environment"`
			Branch        string   `json:"branch"`
			Links         []string `json:"links"`
			Commits       []string `json:"commits"`
			FixedInCommit string   `json:"fixedInCommit"`
			Solution      string   `json:"solution"`
			RootCause     string   `json:"rootCause"`
		}
		if err := json.Unmarshal(raw, &issue); err != nil {
			return NewError(id, -32602, fmt.Sprintf("issues[%d]: invalid params: %s", i, err))
		}
		if issue.Title == "" {
			return NewError(id, -32602, fmt.Sprintf("issues[%d]: missing required param: title", i))
		}

		priority := models.PriorityMedium
		if issue.Priority != "" {
			switch issue.Priority {
			case "critical", "high", "medium", "low":
				priority = models.Priority(issue.Priority)
			default:
				return NewError(id, -32602, fmt.Sprintf("issues[%d]: invalid priority: must be critical/high/medium/low", i))
			}
		}

		var assigneeIDs []uint
		for _, a := range issue.AssigneeIDs {
			if aid, err := strconv.ParseUint(a, 10, 64); err == nil {
				assigneeIDs = append(assigneeIDs, uint(aid))
			}
		}

		var labelIDs []uint
		for _, lid := range issue.LabelIDs {
			if id, err := strconv.ParseUint(lid, 10, 64); err == nil {
				labelIDs = append(labelIDs, uint(id))
			}
		}

		var milestoneID *uint
		if issue.MilestoneID != "" {
			if mid, err := strconv.ParseUint(issue.MilestoneID, 10, 64); err == nil {
				v := uint(mid)
				milestoneID = &v
			}
		}

		created, err := h.issueSvc.Create(service.IssueCreateInput{ProjectID: projectID, CreatorID: creatorID, Title: issue.Title, Description: issue.Description, Priority: priority, AssigneeIDs: assigneeIDs, LabelIDs: labelIDs, MilestoneID: milestoneID, Environment: strPtr(issue.Environment), Branch: strPtr(issue.Branch), Link: mcpLinksToJson(issue.Links), Commits: mcpLinksToJson(issue.Commits), FixedInCommit: strPtr(issue.FixedInCommit), Solution: strPtr(issue.Solution), RootCause: strPtr(issue.RootCause)})
		if err != nil {
			return NewInternalError(id, fmt.Sprintf("issues[%d]: %s", i, err.Error()))
		}
		results = append(results, map[string]interface{}{
			"id":     fmt.Sprintf("%d", created.ID),
			"number": created.Number,
			"title":  created.Title,
			"state":  string(created.State),
		})
	}

	return NewResponse(id, map[string]interface{}{
		"items": results,
		"total": len(results),
	})
}
