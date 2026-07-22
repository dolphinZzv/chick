package mcp

import (
	"encoding/json"
	"fmt"
	"strconv"

	"morning-glory/internal/models"
)

func (h *Handlers) registerTransitionIssuesBatch(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "transition_issues_batch",
		Description: "Batch transition multiple issues to a new state",
		InputSchema: ObjectSchema(map[string]interface{}{
			"issueIds": ArrayParam("Array of Issue IDs to transition", "string"),
			"toState":  StringRequiredParam("Target state: open / in_progress / blocked / review / later / reopen / pending_confirmation / closed_completed / closed_not_planned / closed_rejected"),
			"reason":   StringParam("Reason for the transition (applied to all)"),
		}, []string{"issueIds", "toState"}),
		Handler: h.handleTransitionIssuesBatch,
	})
}

func (h *Handlers) handleTransitionIssuesBatch(id json.RawMessage, params json.RawMessage, actorID uint, remoteAddr string) Response {
	var p struct {
		IssueIDs []string `json:"issueIds"`
		ToState  string   `json:"toState"`
		Reason   string   `json:"reason"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if actorID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	if len(p.IssueIDs) == 0 {
		return NewError(id, -32602, "Missing required param: issueIds (must be a non-empty array)")
	}

	var note *string
	if p.Reason != "" {
		note = &p.Reason
	}

	var results []map[string]interface{}
	var hasError bool
	for _, idStr := range p.IssueIDs {
		issueID, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			results = append(results, map[string]interface{}{
				"id":     idStr,
				"error":  "Invalid issueId",
				"status": "failed",
			})
			hasError = true
			continue
		}

		issue, err := h.issueSvc.GetByID(uint(issueID))
		if err != nil {
			results = append(results, map[string]interface{}{
				"id":     idStr,
				"error":  "Issue not found",
				"status": "failed",
			})
			hasError = true
			continue
		}
		if _, err := h.projectSvc.GetMemberRole(issue.ProjectID, actorID); err != nil {
			results = append(results, map[string]interface{}{
				"id":     idStr,
				"error":  "Access denied: not a member of this project",
				"status": "failed",
			})
			hasError = true
			continue
		}

		updated, err := h.workflowSvc.Transition(uint(issueID), models.IssueState(p.ToState), actorID, note)
		if err != nil {
			results = append(results, map[string]interface{}{
				"id":     idStr,
				"error":  err.Error(),
				"status": "failed",
			})
			hasError = true
			continue
		}
		results = append(results, map[string]interface{}{
			"id":     fmt.Sprintf("%d", updated.ID),
			"number": updated.Number,
			"title":  updated.Title,
			"state":  string(updated.State),
			"status": "success",
		})
	}

	return NewResponse(id, map[string]interface{}{
		"items":     results,
		"total":     len(p.IssueIDs),
		"success":   len(results) - countErrors(results),
		"failed":    countErrors(results),
		"hasErrors": hasError,
	})
}

func countErrors(results []map[string]interface{}) int {
	var n int
	for _, r := range results {
		if r["status"] == "failed" {
			n++
		}
	}
	return n
}
