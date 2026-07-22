package verif

import (
	"encoding/json"
	"testing"

	"chick/internal/config"
	"chick/internal/events"
	"chick/internal/models"
	"chick/internal/repository"
	gormrepo "chick/internal/repository/gorm"
	"chick/internal/server"
	"chick/internal/service"
)

func Test_LinksCreateAndUpdate(t *testing.T) {
	db, err := server.NewDB(&config.Config{DBDriver: "sqlite3", DBDSN: "file::memory:"})
	if err != nil {
		t.Fatalf("db: %v", err)
	}
	if err := server.AutoMigrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	projectRepo := gormrepo.NewProjectRepo(db)
	memberRepo := gormrepo.NewProjectMemberRepo(db)
	agentRepo := gormrepo.NewAgentRepo(db)
	issueRepo := gormrepo.NewIssueRepo(db)
	assigneeRepo := gormrepo.NewIssueAssigneeRepo(db)
	commentRepo := gormrepo.NewCommentRepo(db)
	timelineRepo := gormrepo.NewTimelineRepo(db)
	labelRepo := gormrepo.NewLabelRepo(db)
	milestoneRepo := gormrepo.NewMilestoneRepo(db)
	bus := events.NewBus()

	projectSvc := service.NewProjectService(projectRepo, memberRepo, labelRepo, milestoneRepo)
	agentSvc := service.NewAgentService(agentRepo, bus, nil, true)
	proposalRepo := gormrepo.NewProposalRepo(db)
	taskRepo := gormrepo.NewTaskRepo(db)

	repos := &repository.Repositories{
		Project:       projectRepo,
		ProjectMember: memberRepo,
		Agent:         agentRepo,
		Issue:         issueRepo,
		IssueAssignee: assigneeRepo,
		Comment:       commentRepo,
		Label:         labelRepo,
		Milestone:     milestoneRepo,
		Timeline:      timelineRepo,
		Proposal:      proposalRepo,
		Task:          taskRepo,
		DB:            db,
	}

	issueSvc := service.NewIssueService(repos, issueRepo, assigneeRepo, timelineRepo, projectRepo, bus)

	p, _ := projectSvc.Create("Test", "")
	agent, _ := agentSvc.Register("user", models.AgentKindHuman, "user-1", "pass", nil, "", "")
	_ = memberRepo.Add(&models.ProjectMember{ProjectID: p.ID, AgentID: agent.ID, Role: models.ProjectRoleOwner})

	t.Run("create with 2 links", func(t *testing.T) {
		linkJSON := linksToJSON([]string{"http://example.com/1", "http://example.com/2"})
		issue, err := issueSvc.Create(service.IssueCreateInput{
			ProjectID: p.ID,
			CreatorID: agent.ID,
			Title:     "Two links",
			Priority:  models.PriorityMedium,
			Link:      linkJSON,
		})
		if err != nil {
			t.Fatalf("create: %v", err)
		}

		if issue.Link == nil {
			t.Fatal("Link is nil")
		}
		parsed := parseLinks(issue.Link)
		if len(parsed) != 2 {
			t.Fatalf("expected 2 links, got %d: %v", len(parsed), parsed)
		}
	})

	t.Run("create with 3 links", func(t *testing.T) {
		linkJSON := linksToJSON([]string{"http://example.com/a", "http://example.com/b", "http://example.com/c"})
		issue, err := issueSvc.Create(service.IssueCreateInput{
			ProjectID: p.ID,
			CreatorID: agent.ID,
			Title:     "Three links",
			Priority:  models.PriorityMedium,
			Link:      linkJSON,
		})
		if err != nil {
			t.Fatalf("create: %v", err)
		}

		if issue.Link == nil {
			t.Fatal("Link is nil")
		}
		parsed := parseLinks(issue.Link)
		if len(parsed) != 3 {
			t.Fatalf("expected 3 links, got %d: %v", len(parsed), parsed)
		}
	})

	t.Run("update links from 2 to 1", func(t *testing.T) {
		issue, err := issueSvc.Create(service.IssueCreateInput{
			ProjectID: p.ID,
			CreatorID: agent.ID,
			Title:     "Update links",
			Priority:  models.PriorityMedium,
			Link:      linksToJSON([]string{"http://example.com/1", "http://example.com/2"}),
		})
		if err != nil {
			t.Fatalf("create: %v", err)
		}

		updated, err := issueSvc.Update(issue.ID, service.IssueUpdateInput{
			Link: linksToJSON([]string{"http://example.com/only"}),
		})
		if err != nil {
			t.Fatalf("update: %v", err)
		}

		parsed := parseLinks(updated.Link)
		if len(parsed) != 1 {
			t.Fatalf("expected 1 link after update, got %d: %v", len(parsed), parsed)
		}
	})

	t.Run("links survive GetByID round-trip", func(t *testing.T) {
		linkJSON := linksToJSON([]string{"http://example.com/x", "http://example.com/y"})
		created, err := issueSvc.Create(service.IssueCreateInput{
			ProjectID: p.ID,
			CreatorID: agent.ID,
			Title:     "Round-trip",
			Priority:  models.PriorityMedium,
			Link:      linkJSON,
		})
		if err != nil {
			t.Fatalf("create: %v", err)
		}

		// Re-read from DB
		got, err := issueSvc.GetByID(created.ID)
		if err != nil {
			t.Fatalf("get: %v", err)
		}

		parsed := parseLinks(got.Link)
		if len(parsed) != 2 {
			t.Fatalf("expected 2 links after re-read, got %d: %v", len(parsed), parsed)
		}
	})
}

// Simulate linksToJson (same logic as internal/graphql/convert.go)
func linksToJSON(links []string) *string {
	if len(links) == 0 {
		return nil
	}
	b, err := json.Marshal(links)
	if err != nil {
		return nil
	}
	s := string(b)
	return &s
}

// Simulate parseLinks (same logic as internal/graphql/convert.go)
func parseLinks(link *string) []string {
	if link == nil || *link == "" {
		return []string{}
	}
	var links []string
	if err := json.Unmarshal([]byte(*link), &links); err == nil {
		return links
	}
	return []string{*link}
}
