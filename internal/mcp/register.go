package mcp

// RegisterAll registers all MCP tools with the registry.
func (h *Handlers) RegisterAll(registry *ToolRegistry) {
	h.registerCreateIssue(registry)
	h.registerCreateIssuesBatch(registry)
	h.registerEditIssue(registry)
	h.registerAddComment(registry)
	h.registerAssignIssue(registry)
	h.registerTransitionIssue(registry)
	h.registerTransitionIssuesBatch(registry)
	h.registerSearchIssues(registry)
	h.registerSearchLabels(registry)

	h.registerSubmitRequirement(registry)
	h.registerCreateProposal(registry)
	h.registerTransitionProposal(registry)
	h.registerReviewProposal(registry)
	h.registerAddCommentToProposal(registry)
	h.registerSearchProposals(registry)

	h.registerCreateTask(registry)
	h.registerTransitionTask(registry)
	h.registerAssignTask(registry)
	h.registerLinkIssuesToTask(registry)
	h.registerUnlinkIssueFromTask(registry)
	h.registerAddCommentToTask(registry)
	h.registerSearchTasks(registry)

}
