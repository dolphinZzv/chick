package service

import (
	"fmt"
	"log"
	"time"

	"morning-glory/internal/events"
	"morning-glory/internal/models"
	"morning-glory/internal/repository"
	gormrepo "morning-glory/internal/repository/gorm"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type IssueService struct {
	repos        *repository.Repositories
	issueRepo    repository.IssueRepository
	assigneeRepo repository.IssueAssigneeRepository
	timelineRepo repository.TimelineRepository
	projectRepo  repository.ProjectRepository
	eventBus     *events.Bus
}

type IssueCreateInput struct {
	ProjectID     uint
	CreatorID     uint
	Title         string
	Description   string
	Priority      models.Priority
	AssigneeIDs   []uint
	LabelIDs      []uint
	MilestoneID   *uint
	Environment   *string
	Branch        *string
	Link          *string
	Commits       *string
	FixedInCommit *string
	Solution      *string
	RootCause     *string
	Difficulty    *int
	StartedAt     *time.Time
	CompletedAt   *time.Time
}

type IssueUpdateInput struct {
	Title         *string
	Description   *string
	Priority      *models.Priority
	DueDate       *models.UnixNullTime
	MilestoneID   *uint
	Environment   *string
	Branch        *string
	Link          *string
	Commits       *string
	FixedInCommit *string
	Solution      *string
	RootCause     *string
	StartedAt     *time.Time
	CompletedAt   *time.Time
	Difficulty    *int
}

func NewIssueService(
	repos *repository.Repositories,
	issueRepo repository.IssueRepository,
	assigneeRepo repository.IssueAssigneeRepository,
	timelineRepo repository.TimelineRepository,
	projectRepo repository.ProjectRepository,
	eventBus *events.Bus,
) *IssueService {
	return &IssueService{
		repos:        repos,
		issueRepo:    issueRepo,
		assigneeRepo: assigneeRepo,
		timelineRepo: timelineRepo,
		projectRepo:  projectRepo,
		eventBus:     eventBus,
	}
}

func (s *IssueService) Create(input IssueCreateInput) (*models.Issue, error) {
	var issue *models.Issue

	err := s.repos.Transaction(func(tx *gorm.DB) error {
		txIssueRepo := gormrepo.NewIssueRepo(tx)
		txAssigneeRepo := gormrepo.NewIssueAssigneeRepo(tx)

		issue = &models.Issue{
			ProjectID:     input.ProjectID,
			Title:         input.Title,
			Description:   input.Description,
			State:         models.IssueStateOpen,
			Priority:      input.Priority,
			CreatorID:     input.CreatorID,
			MilestoneID:   input.MilestoneID,
			Environment:   input.Environment,
			Branch:        input.Branch,
			Link:          input.Link,
			Commits:       input.Commits,
			FixedInCommit: input.FixedInCommit,
			Solution:      input.Solution,
			RootCause:     input.RootCause,
			Difficulty:    input.Difficulty,
			StartedAt:     input.StartedAt,
			CompletedAt:   input.CompletedAt,
		}
		if err := txIssueRepo.Create(issue); err != nil {
			return fmt.Errorf("create issue: %w", err)
		}

		for _, agentID := range input.AssigneeIDs {
			ia := &models.IssueAssignee{
				IssueID: issue.ID,
				AgentID: agentID,
				State:   models.AssigneeStatePending,
			}
			if err := txAssigneeRepo.Create(ia); err != nil {
				return fmt.Errorf("add assignee %d: %w", agentID, err)
			}
		}

		for _, labelID := range input.LabelIDs {
			if err := txIssueRepo.AddLabel(issue.ID, labelID); err != nil {
				return fmt.Errorf("add label %d: %w", labelID, err)
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Timeline event (best-effort, outside transaction)
	event := &models.TimelineEvent{
		IssueID:   &issue.ID,
		ActorID:   input.CreatorID,
		EventType: models.EventIssueCreated,
		Payload:   nil,
	}
	if err := s.timelineRepo.Create(event); err != nil {
		log.Printf("[issue] failed to create timeline event: %v", err)
	}

	// Publish events (outside transaction)
	if s.eventBus != nil {
		s.eventBus.Publish(events.Event{
			Type: events.EventIssueCreated,
			Payload: events.IssueCreatedPayload{
				IssueID:     issue.ID,
				ProjectID:   input.ProjectID,
				CreatorID:   input.CreatorID,
				LabelIDs:    input.LabelIDs,
				AssigneeIDs: input.AssigneeIDs,
			},
		})

		// Notify each assignee individually
		for _, aid := range input.AssigneeIDs {
			s.eventBus.Publish(events.Event{
				Type: events.EventIssueAssigneeChanged,
				Payload: events.IssueAssigneeChangedPayload{
					IssueID:   issue.ID,
					ProjectID: input.ProjectID,
					AgentID:   aid,
					Action:    "assigned",
				},
			})
		}
	}

	return s.issueRepo.GetByID(issue.ID)
}

func (s *IssueService) GetByID(id uint) (*models.Issue, error) {
	return s.issueRepo.GetByID(id)
}

func (s *IssueService) GetByNumber(projectID uint, number uint) (*models.Issue, error) {
	return s.issueRepo.GetByNumber(projectID, number)
}

func (s *IssueService) List(filter models.IssueFilter) ([]models.Issue, int64, error) {
	return s.issueRepo.List(filter)
}

func (s *IssueService) TransitionState(id uint, newState models.IssueState, actorID uint, note *string) (*models.Issue, error) {
	var oldState models.IssueState
	var projectID uint

	err := s.repos.Transaction(func(tx *gorm.DB) error {
		// Lock the row to prevent concurrent transitions
		var current models.Issue
		if err := tx.Model(&models.Issue{}).Select("state,project_id,creator_id,started_at,completed_at").Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, id).Error; err != nil {
			return fmt.Errorf("get issue for transition: %w", err)
		}
		oldState = current.State
		projectID = current.ProjectID

		// Validate transition within the transaction
		allowed, ok := validTransitions[current.State]
		if !ok {
			return fmt.Errorf("unknown current state: %s", current.State)
		}
		valid := false
		for _, s := range allowed {
			if s == newState {
				valid = true
				break
			}
		}
		if !valid {
			return fmt.Errorf("transition from %s to %s not allowed", current.State, newState)
		}

		// Check project-level transition authorization
		var project models.Project
		if err := tx.Model(&models.Project{}).Select("allow_creator_transition,require_creator_close_approval").First(&project, projectID).Error; err != nil {
			return fmt.Errorf("get project config: %w", err)
		}

		if !project.AllowCreatorTransition && actorID == current.CreatorID {
			// Creator is restricted — check if they are an owner/maintainer or assignee
			var member models.ProjectMember
			if err := tx.Where("project_id = ? AND agent_id = ?", projectID, actorID).First(&member).Error; err != nil {
				return fmt.Errorf("check member role: %w", err)
			}
			if member.Role != models.ProjectRoleOwner && member.Role != models.ProjectRoleMaintainer {
				// Check if they're an assignee
				var assigneeCount int64
				tx.Model(&models.IssueAssignee{}).Where("issue_id = ? AND agent_id = ?", id, actorID).Count(&assigneeCount)
				if assigneeCount == 0 {
					return fmt.Errorf("issue creator is not allowed to transition this issue")
				}
			}
		}

		if project.RequireCreatorCloseApproval && actorID != current.CreatorID {
			switch newState {
			case models.IssueStateClosedCompleted, models.IssueStateClosedNotPlanned, models.IssueStateClosedRejected:
				return fmt.Errorf("only the issue creator can close this issue")
			}
		}

		txIssueRepo := gormrepo.NewIssueRepo(tx)
		if err := txIssueRepo.UpdateState(id, newState); err != nil {
			return err
		}

		// Auto-set started_at when transitioning to in_progress (if not already set)
		now := time.Now()
		if newState == models.IssueStateInProgress && current.StartedAt == nil {
			if err := tx.Model(&models.Issue{}).Where("id = ?", id).Update("started_at", now).Error; err != nil {
				return fmt.Errorf("set started_at: %w", err)
			}
		}

		// Auto-set completed_at when transitioning to closed_completed (if not already set)
		if newState == models.IssueStateClosedCompleted && current.CompletedAt == nil {
			if err := tx.Model(&models.Issue{}).Where("id = ?", id).Update("completed_at", now).Error; err != nil {
				return fmt.Errorf("set completed_at: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Timeline event (best-effort)
	payload := models.JSONMap{"from": string(oldState), "to": string(newState)}
	if note != nil && *note != "" {
		payload["note"] = *note
	}
	event := &models.TimelineEvent{
		IssueID:   &id,
		ActorID:   actorID,
		EventType: models.EventIssueStateChanged,
		Payload:   payload,
	}
	if err := s.timelineRepo.Create(event); err != nil {
		log.Printf("[issue] failed to create timeline event: %v", err)
	}

	if s.eventBus != nil {
		s.eventBus.Publish(events.Event{
			Type: events.EventIssueStateChanged,
			Payload: events.IssueStateChangedPayload{
				IssueID:   id,
				ProjectID: projectID,
				From:      string(oldState),
				To:        string(newState),
				ActorID:   actorID,
			},
		})
	}

	return s.issueRepo.GetByID(id)
}

func (s *IssueService) AddAssignee(issueID, agentID uint) (*models.IssueAssignee, error) {
	// Check if already assigned — idempotent
	existing, err := s.assigneeRepo.GetByIssueAndAgent(issueID, agentID)
	if err == nil && existing != nil {
		return existing, nil
	}

	ia := &models.IssueAssignee{
		IssueID: issueID,
		AgentID: agentID,
		State:   models.AssigneeStatePending,
	}
	if err := s.assigneeRepo.Create(ia); err != nil {
		return nil, fmt.Errorf("add assignee: %w", err)
	}

	projectID := uint(0)
	issue, err := s.issueRepo.GetByID(issueID)
	if err == nil {
		projectID = issue.ProjectID
	}

	if s.eventBus != nil {
		s.eventBus.Publish(events.Event{
			Type: events.EventIssueAssigneeChanged,
			Payload: events.IssueAssigneeChangedPayload{
				IssueID:   issueID,
				ProjectID: projectID,
				AgentID:   agentID,
				Action:    "assigned",
			},
		})
	}

	return ia, nil
}

func (s *IssueService) RemoveAssignee(issueID, agentID uint) error {
	if err := s.assigneeRepo.Remove(issueID, agentID); err != nil {
		return err
	}

	projectID := uint(0)
	issue, err := s.issueRepo.GetByID(issueID)
	if err == nil {
		projectID = issue.ProjectID
	}

	if s.eventBus != nil {
		s.eventBus.Publish(events.Event{
			Type: events.EventIssueAssigneeChanged,
			Payload: events.IssueAssigneeChangedPayload{
				IssueID:   issueID,
				ProjectID: projectID,
				AgentID:   agentID,
				Action:    "removed",
			},
		})
	}

	return nil
}

func (s *IssueService) UpdateAssigneeState(issueID, agentID uint, state models.AssigneeState) (*models.IssueAssignee, error) {
	if err := s.assigneeRepo.UpdateState(issueID, agentID, state); err != nil {
		return nil, fmt.Errorf("update assignee state: %w", err)
	}
	list, err := s.assigneeRepo.ListByIssue(issueID)
	if err != nil {
		return nil, err
	}
	for _, ia := range list {
		if ia.AgentID == agentID {
			return &ia, nil
		}
	}
	return nil, fmt.Errorf("assignee not found")
}

func (s *IssueService) Update(id uint, input IssueUpdateInput) (*models.Issue, error) {
	changes := map[string]interface{}{}
	if input.Title != nil && *input.Title != "" {
		changes["title"] = *input.Title
	}
	if input.Description != nil && *input.Description != "" {
		changes["description"] = *input.Description
	}
	if input.Priority != nil && *input.Priority != "" {
		changes["priority"] = *input.Priority
	}
	if input.DueDate != nil && input.DueDate.Valid {
		changes["due_date"] = input.DueDate.Time
	}
	if input.MilestoneID != nil {
		if *input.MilestoneID == 0 {
			changes["milestone_id"] = nil
		} else {
			changes["milestone_id"] = *input.MilestoneID
		}
	}
	if input.Environment != nil {
		if *input.Environment == "" {
			changes["environment"] = nil
		} else {
			changes["environment"] = *input.Environment
		}
	}
	if input.Branch != nil {
		if *input.Branch == "" {
			changes["branch"] = nil
		} else {
			changes["branch"] = *input.Branch
		}
	}
	if input.Link != nil {
		if *input.Link == "" {
			changes["link"] = nil
		} else {
			changes["link"] = *input.Link
		}
	}
	if input.Commits != nil {
		if *input.Commits == "" {
			changes["commits"] = nil
		} else {
			changes["commits"] = *input.Commits
		}
	}
	if input.FixedInCommit != nil {
		if *input.FixedInCommit == "" {
			changes["fixed_in_commit"] = nil
		} else {
			changes["fixed_in_commit"] = *input.FixedInCommit
		}
	}
	if input.Solution != nil {
		if *input.Solution == "" {
			changes["solution"] = nil
		} else {
			changes["solution"] = *input.Solution
		}
	}
	if input.RootCause != nil {
		if *input.RootCause == "" {
			changes["root_cause"] = nil
		} else {
			changes["root_cause"] = *input.RootCause
		}
	}
	if input.StartedAt != nil {
		changes["started_at"] = *input.StartedAt
	}
	if input.CompletedAt != nil {
		changes["completed_at"] = *input.CompletedAt
	}
	if input.Difficulty != nil {
		changes["difficulty"] = *input.Difficulty
	}
	if len(changes) == 0 {
		return s.issueRepo.GetByID(id)
	}
	if err := s.issueRepo.Update(id, changes); err != nil {
		return nil, fmt.Errorf("update issue: %w", err)
	}
	return s.issueRepo.GetByID(id)
}

func (s *IssueService) Delete(id uint) error {
	return s.issueRepo.Delete(id)
}

func (s *IssueService) ListTimeline(issueID uint) ([]models.TimelineEvent, error) {
	return s.timelineRepo.ListByIssue(issueID)
}

func (s *IssueService) AddLabel(issueID, labelID uint) error {
	return s.issueRepo.AddLabel(issueID, labelID)
}

func (s *IssueService) RemoveLabel(issueID, labelID uint) error {
	return s.issueRepo.RemoveLabel(issueID, labelID)
}
