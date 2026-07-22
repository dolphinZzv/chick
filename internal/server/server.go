package server

import (
	"log"

	"chick/internal/auth"
	"chick/internal/config"
	"chick/internal/events"
	"chick/internal/matching"
	"chick/internal/notifications"
	"chick/internal/repository"
	gormrepo "chick/internal/repository/gorm"
	"chick/internal/service"

	"gorm.io/gorm"
)

type Server struct {
	Config   *config.Config
	DB       *gorm.DB
	EventBus *events.Bus

	ProjectService  *service.ProjectService
	AgentService    *service.AgentService
	IssueService    *service.IssueService
	CommentService  *service.CommentService
	ProposalService *service.ProposalService
	TaskService     *service.TaskService
	WorkflowService *service.WorkflowService
	FeedbackService *service.FeedbackService
	WebhookService  *service.WebhookService
	Authenticator   *auth.Authenticator
	NotifService    *notifications.Service
	MatchingEngine  *matching.Engine
}

func New(cfg *config.Config) (*Server, error) {
	db, err := NewDB(cfg)
	if err != nil {
		return nil, err
	}

	if err := AutoMigrate(db); err != nil {
		return nil, err
	}

	bus := events.NewBus()

	// Init repositories
	projectRepo := gormrepo.NewProjectRepo(db)
	memberRepo := gormrepo.NewProjectMemberRepo(db)
	agentRepo := gormrepo.NewAgentRepo(db)
	issueRepo := gormrepo.NewIssueRepo(db)
	assigneeRepo := gormrepo.NewIssueAssigneeRepo(db)
	commentRepo := gormrepo.NewCommentRepo(db)
	timelineRepo := gormrepo.NewTimelineRepo(db)
	labelRepo := gormrepo.NewLabelRepo(db)
	milestoneRepo := gormrepo.NewMilestoneRepo(db)
	feedbackRepo := gormrepo.NewFeedbackRepo(db)
	proposalRepo := gormrepo.NewProposalRepo(db)
	taskRepo := gormrepo.NewTaskRepo(db)
	webhookRepo := gormrepo.NewWebhookRepo(db)

	// Init auth
	authn := auth.New(cfg.JWTSecret)

	// Init matching engine
	matchingEngine := matching.NewEngine(agentRepo, gormrepo.NewLabelRepo(db), assigneeRepo, issueRepo)
	matchingEngine.Subscribe(bus)

	// Init Redis and notification service
	rdb := NewRedis(cfg)
	notifSvc := notifications.NewService(rdb, db)
	notifSvc.Subscribe(bus)

	// Init services
	projectSvc := service.NewProjectService(projectRepo, memberRepo, labelRepo, milestoneRepo)
	agentSvc := service.NewAgentService(agentRepo, bus, authn, cfg.AllowHumanRegistration)

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
		Feedback:      feedbackRepo,
		Proposal:      proposalRepo,
		Task:          taskRepo,
		Webhook:       webhookRepo,
		DB:            db,
	}

	commentSvc := service.NewCommentService(repos, commentRepo, timelineRepo, issueRepo, proposalRepo, taskRepo, bus)
	issueSvc := service.NewIssueService(repos, issueRepo, assigneeRepo, timelineRepo, projectRepo, bus)
	proposalSvc := service.NewProposalService(repos, proposalRepo, taskRepo, timelineRepo, bus)
	taskSvc := service.NewTaskService(repos, taskRepo, timelineRepo, bus)
	workflowSvc := service.NewWorkflowService(issueSvc)
	feedbackSvc := service.NewFeedbackService(feedbackRepo, bus)
	webhookSvc := service.NewWebhookService(repos, webhookRepo, issueRepo)

	srv := &Server{
		Config:          cfg,
		DB:              db,
		EventBus:        bus,
		ProjectService:  projectSvc,
		AgentService:    agentSvc,
		IssueService:    issueSvc,
		CommentService:  commentSvc,
		ProposalService: proposalSvc,
		TaskService:     taskSvc,
		WorkflowService: workflowSvc,
		FeedbackService: feedbackSvc,
		WebhookService:  webhookSvc,
		Authenticator:   authn,
		NotifService:    notifSvc,
		MatchingEngine:  matchingEngine,
	}

	log.Println("[server] initialized")

	if err := SeedData(db, cfg.AdminToken); err != nil {
		log.Printf("[server] seed data: %v", err)
	}

	return srv, nil
}
