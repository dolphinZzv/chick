package models

import (
	"strings"
	"time"
)

// allowedOrderColumns defines safe column names for ORDER BY clauses.
var allowedOrderColumns = map[string]bool{
	"created_at": true,
	"updated_at": true,
	"priority":   true,
	"title":      true,
	"number":     true,
	"state":      true,
}

// SanitizeOrderBy returns a safe ORDER BY column or empty string if invalid.
func SanitizeOrderBy(column string) string {
	column = strings.TrimSpace(strings.ToLower(column))
	if allowedOrderColumns[column] {
		return column
	}
	return ""
}

type IssueFilter struct {
	ProjectID   *uint
	State       []IssueState
	AssigneeIDs []uint
	LabelIDs    []uint
	MilestoneID *uint
	Priority    *Priority
	CreatorID   *uint
	Search      string
	Limit       int
	Offset      int
	OrderBy     string
	OrderDir    string
}

type AgentFilter struct {
	Kind         *AgentKind
	Status       *AgentStatus
	Capabilities []CapabilityType
	ProjectID    *uint
	Limit        int
	Offset       int
}

type FeedbackFilter struct {
	TargetType *FeedbackTargetType
	TargetID   *uint
	AuthorID   *uint
	Limit      int
	Offset     int
}

type ProposalFilter struct {
	ProjectID *uint
	State     []ProposalState
	Priority  *Priority
	AuthorID  *uint
	Search    string
	Limit     int
	Offset    int
	OrderBy   string
	OrderDir  string
}

type TaskFilter struct {
	ProposalID *uint
	State      []TaskState
	AssigneeID *uint
	Priority   *Priority
	Search     string
	Limit      int
	Offset     int
	OrderBy    string
	OrderDir   string
}

// TimelineEvent type constants
const (
	EventIssueCreated         = "issue_created"
	EventIssueStateChanged    = "state_changed"
	EventIssueAssigned        = "assigned"
	EventIssueUnassigned      = "unassigned"
	EventCommentAdded         = "comment_added"
	EventAssigneeStateChanged = "assignee_state_changed"
	EventFeedbackCreated      = "feedback_created"
	EventIssueTimedOut        = "issue_timeout"
	EventProposalCreated      = "proposal_created"
	EventProposalStateChanged = "proposal_state_changed"
	EventTaskCreated          = "task_created"
	EventTaskStateChanged     = "task_state_changed"
)

// UnixNullTime helps with nullable timestamps in SQLite
type UnixNullTime struct {
	Time  time.Time
	Valid bool
}
