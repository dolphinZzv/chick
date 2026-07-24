/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Map: { input: any; output: any; }
  Time: { input: any; output: any; }
};

export type Agent = {
  __typename?: 'Agent';
  allowedCIDRs?: Maybe<Array<Scalars['String']['output']>>;
  assignedIssues?: Maybe<Array<IssueAssignee>>;
  capabilities?: Maybe<Array<Scalars['String']['output']>>;
  createdAt: Scalars['Time']['output'];
  createdIssues?: Maybe<Array<Issue>>;
  deviceInfo?: Maybe<Scalars['String']['output']>;
  disabled: Scalars['Boolean']['output'];
  externalID: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: AgentKind;
  lastIP?: Maybe<Scalars['String']['output']>;
  lastSeenAt?: Maybe<Scalars['Time']['output']>;
  metadata?: Maybe<Scalars['Map']['output']>;
  modelInfo?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  number: Scalars['Int']['output'];
  status: AgentStatus;
  systemPrompt?: Maybe<Scalars['String']['output']>;
  tokenPreview?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Time']['output'];
};

export enum AgentKind {
  Ai = 'ai',
  Human = 'human',
  Hybrid = 'hybrid'
}

export enum AgentStatus {
  Busy = 'busy',
  Error = 'error',
  Offline = 'offline',
  Online = 'online'
}

export type AgentStatusEvent = {
  __typename?: 'AgentStatusEvent';
  agentID: Scalars['ID']['output'];
  status: AgentStatus;
  timestamp: Scalars['Time']['output'];
};

export enum AssigneeState {
  Blocked = 'blocked',
  Completed = 'completed',
  InProgress = 'in_progress',
  Pending = 'pending'
}

export type Comment = {
  __typename?: 'Comment';
  author: Agent;
  authorID: Scalars['ID']['output'];
  body: Scalars['String']['output'];
  contentType: CommentContentType;
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  issueID?: Maybe<Scalars['ID']['output']>;
  number: Scalars['Int']['output'];
  parent?: Maybe<Comment>;
  parentID?: Maybe<Scalars['ID']['output']>;
  proposalID?: Maybe<Scalars['ID']['output']>;
  replies?: Maybe<Array<Comment>>;
  taskID?: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['Time']['output'];
};

export enum CommentContentType {
  Approval = 'approval',
  CodeDiff = 'code_diff',
  Decision = 'decision',
  Markdown = 'markdown',
  Rejection = 'rejection',
  Structured = 'structured',
  ToolCall = 'tool_call',
  ToolResult = 'tool_result'
}

export type Feedback = {
  __typename?: 'Feedback';
  author: Agent;
  authorID: Scalars['ID']['output'];
  body?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  number: Scalars['Int']['output'];
  rating: FeedbackRating;
  targetID: Scalars['ID']['output'];
  targetType: FeedbackTargetType;
};

export enum FeedbackRating {
  Five = 'five',
  Four = 'four',
  One = 'one',
  Three = 'three',
  Two = 'two'
}

export enum FeedbackTargetType {
  Agent = 'agent',
  Assignment = 'assignment',
  Comment = 'comment',
  Issue = 'issue'
}

export type Issue = {
  __typename?: 'Issue';
  assignees?: Maybe<Array<IssueAssignee>>;
  branch?: Maybe<Scalars['String']['output']>;
  children?: Maybe<Array<Issue>>;
  closedAt?: Maybe<Scalars['Time']['output']>;
  commits?: Maybe<Array<Scalars['String']['output']>>;
  completedAt?: Maybe<Scalars['Time']['output']>;
  createdAt: Scalars['Time']['output'];
  creator: Agent;
  creatorID: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  difficulty?: Maybe<Scalars['Int']['output']>;
  dueDate?: Maybe<Scalars['Time']['output']>;
  environment?: Maybe<Scalars['String']['output']>;
  fixedInCommit?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  labels?: Maybe<Array<Label>>;
  links?: Maybe<Array<Scalars['String']['output']>>;
  milestone?: Maybe<Milestone>;
  number: Scalars['Int']['output'];
  parentID?: Maybe<Scalars['ID']['output']>;
  priority: Priority;
  projectID: Scalars['ID']['output'];
  rootCause?: Maybe<Scalars['String']['output']>;
  solution?: Maybe<Scalars['String']['output']>;
  startedAt?: Maybe<Scalars['Time']['output']>;
  state: IssueState;
  structuredOutput?: Maybe<Scalars['Map']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

export type IssueAssignee = {
  __typename?: 'IssueAssignee';
  agent: Agent;
  agentID: Scalars['ID']['output'];
  assignedAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  issueID: Scalars['ID']['output'];
  number: Scalars['Int']['output'];
  state: AssigneeState;
};

export type IssueConnection = {
  __typename?: 'IssueConnection';
  edges: Array<Issue>;
  total: Scalars['Int']['output'];
};

export enum IssueState {
  Blocked = 'blocked',
  ClosedCompleted = 'closed_completed',
  ClosedNotPlanned = 'closed_not_planned',
  ClosedRejected = 'closed_rejected',
  InProgress = 'in_progress',
  Later = 'later',
  Open = 'open',
  PendingConfirmation = 'pending_confirmation',
  Reopen = 'reopen',
  Review = 'review'
}

export type Label = {
  __typename?: 'Label';
  capability?: Maybe<Scalars['String']['output']>;
  color?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  group?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  number: Scalars['Int']['output'];
  projectID: Scalars['ID']['output'];
};

export type LoginResult = {
  __typename?: 'LoginResult';
  agent: Agent;
  token: Scalars['String']['output'];
};

export type Milestone = {
  __typename?: 'Milestone';
  createdAt: Scalars['Time']['output'];
  description?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Scalars['Time']['output']>;
  id: Scalars['ID']['output'];
  number: Scalars['Int']['output'];
  projectID: Scalars['ID']['output'];
  state: MilestoneState;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

export enum MilestoneState {
  Closed = 'closed',
  Open = 'open'
}

export type Mutation = {
  __typename?: 'Mutation';
  addAssignee: IssueAssignee;
  addComment: Comment;
  addLabels: Issue;
  addProjectMember: ProjectMember;
  addProposalComment: Comment;
  addTaskComment: Comment;
  assignTask: Task;
  createFeedback: Feedback;
  createIssue: Issue;
  createLabel: Label;
  createMilestone: Milestone;
  createProject: Project;
  createProjectAgent: RegisterResult;
  createProposal: Proposal;
  createTask: Task;
  createWebhook: WebhookPayload;
  deleteAgent: Scalars['Boolean']['output'];
  deleteComment: Scalars['Boolean']['output'];
  deleteIssue: Scalars['Boolean']['output'];
  deleteLabel: Scalars['Boolean']['output'];
  deleteMilestone: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  deleteProposal: Scalars['Boolean']['output'];
  deleteTask: Scalars['Boolean']['output'];
  deleteWebhook: Scalars['Boolean']['output'];
  linkIssuesToTask: Task;
  loginAgent: LoginResult;
  markAllNotificationsRead: Scalars['Boolean']['output'];
  markNotificationRead: NotificationEvent;
  registerAgent: RegisterResult;
  removeAssignee: Scalars['Boolean']['output'];
  removeLabels: Issue;
  removeProjectMember: Scalars['Boolean']['output'];
  reviewProposal: Proposal;
  transitionIssue: Issue;
  transitionProposal: Proposal;
  unlinkIssueFromTask: Task;
  updateAgent: Agent;
  updateAgentAllowedCIDRs: Agent;
  updateAgentDisabled: Agent;
  updateAgentStatus: Agent;
  updateAssigneeState: IssueAssignee;
  updateComment: Comment;
  updateIssue: Issue;
  updateLabel: Label;
  updateMilestone: Milestone;
  updateNotificationSetting: NotificationSetting;
  updateProject: Project;
  updateProjectConfig: Project;
  updateProjectMember: ProjectMember;
  updateProposal: Proposal;
  updateTask: Task;
};


export type MutationAddAssigneeArgs = {
  agentID: Scalars['ID']['input'];
  issueID: Scalars['ID']['input'];
};


export type MutationAddCommentArgs = {
  authorID: Scalars['ID']['input'];
  body: Scalars['String']['input'];
  contentType: CommentContentType;
  issueID: Scalars['ID']['input'];
  parentID?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationAddLabelsArgs = {
  issueID: Scalars['ID']['input'];
  labelIDs: Array<Scalars['ID']['input']>;
};


export type MutationAddProjectMemberArgs = {
  agentID: Scalars['ID']['input'];
  projectID: Scalars['ID']['input'];
  role: ProjectRole;
};


export type MutationAddProposalCommentArgs = {
  authorID: Scalars['ID']['input'];
  body: Scalars['String']['input'];
  contentType: CommentContentType;
  proposalID: Scalars['ID']['input'];
};


export type MutationAddTaskCommentArgs = {
  authorID: Scalars['ID']['input'];
  body: Scalars['String']['input'];
  contentType: CommentContentType;
  taskID: Scalars['ID']['input'];
};


export type MutationAssignTaskArgs = {
  assigneeID: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
};


export type MutationCreateFeedbackArgs = {
  authorID: Scalars['ID']['input'];
  body?: InputMaybe<Scalars['String']['input']>;
  rating: FeedbackRating;
  targetID: Scalars['ID']['input'];
  targetType: FeedbackTargetType;
};


export type MutationCreateIssueArgs = {
  assigneeIDs?: InputMaybe<Array<Scalars['ID']['input']>>;
  branch?: InputMaybe<Scalars['String']['input']>;
  commits?: InputMaybe<Array<Scalars['String']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  fixedInCommit?: InputMaybe<Scalars['String']['input']>;
  labelIDs?: InputMaybe<Array<Scalars['ID']['input']>>;
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  milestoneId?: InputMaybe<Scalars['ID']['input']>;
  priority: Priority;
  projectID: Scalars['ID']['input'];
  rootCause?: InputMaybe<Scalars['String']['input']>;
  solution?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};


export type MutationCreateLabelArgs = {
  capability?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<Scalars['String']['input']>;
  group?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectID: Scalars['ID']['input'];
};


export type MutationCreateMilestoneArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['Time']['input']>;
  projectID: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};


export type MutationCreateProjectArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationCreateProjectAgentArgs = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  deviceInfo?: InputMaybe<Scalars['String']['input']>;
  externalID?: InputMaybe<Scalars['String']['input']>;
  kind: AgentKind;
  modelInfo?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectID: Scalars['ID']['input'];
  role?: InputMaybe<ProjectRole>;
  secret?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateProposalArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  labelIDs?: InputMaybe<Array<Scalars['ID']['input']>>;
  priority: Priority;
  projectID: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};


export type MutationCreateTaskArgs = {
  assigneeID?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Priority>;
  proposalID: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};


export type MutationCreateWebhookArgs = {
  name: Scalars['String']['input'];
  projectID: Scalars['ID']['input'];
};


export type MutationDeleteAgentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCommentArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteIssueArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLabelArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMilestoneArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteProposalArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTaskArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLinkIssuesToTaskArgs = {
  issueIDs: Array<Scalars['ID']['input']>;
  taskID: Scalars['ID']['input'];
};


export type MutationLoginAgentArgs = {
  externalID: Scalars['String']['input'];
  secret: Scalars['String']['input'];
};


export type MutationMarkAllNotificationsReadArgs = {
  agentID: Scalars['ID']['input'];
};


export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRegisterAgentArgs = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  deviceInfo?: InputMaybe<Scalars['String']['input']>;
  externalID: Scalars['String']['input'];
  kind: AgentKind;
  modelInfo?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  secret: Scalars['String']['input'];
};


export type MutationRemoveAssigneeArgs = {
  agentID: Scalars['ID']['input'];
  issueID: Scalars['ID']['input'];
};


export type MutationRemoveLabelsArgs = {
  issueID: Scalars['ID']['input'];
  labelIDs: Array<Scalars['ID']['input']>;
};


export type MutationRemoveProjectMemberArgs = {
  agentID: Scalars['ID']['input'];
  projectID: Scalars['ID']['input'];
};


export type MutationReviewProposalArgs = {
  approved: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  reviewerID: Scalars['ID']['input'];
};


export type MutationTransitionIssueArgs = {
  actorID: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  newState: IssueState;
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationTransitionProposalArgs = {
  actorID: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
  newState: ProposalState;
  note?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUnlinkIssueFromTaskArgs = {
  issueID: Scalars['ID']['input'];
  taskID: Scalars['ID']['input'];
};


export type MutationUpdateAgentArgs = {
  id: Scalars['ID']['input'];
  systemPrompt?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateAgentAllowedCidRsArgs = {
  allowedCIDRs: Array<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
};


export type MutationUpdateAgentDisabledArgs = {
  disabled: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationUpdateAgentStatusArgs = {
  id: Scalars['ID']['input'];
  status: AgentStatus;
};


export type MutationUpdateAssigneeStateArgs = {
  agentID: Scalars['ID']['input'];
  issueID: Scalars['ID']['input'];
  state: AssigneeState;
};


export type MutationUpdateCommentArgs = {
  body: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


export type MutationUpdateIssueArgs = {
  branch?: InputMaybe<Scalars['String']['input']>;
  commits?: InputMaybe<Array<Scalars['String']['input']>>;
  completedAt?: InputMaybe<Scalars['Time']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  difficulty?: InputMaybe<Scalars['Int']['input']>;
  dueDate?: InputMaybe<Scalars['Time']['input']>;
  environment?: InputMaybe<Scalars['String']['input']>;
  fixedInCommit?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  milestoneId?: InputMaybe<Scalars['ID']['input']>;
  priority?: InputMaybe<Priority>;
  rootCause?: InputMaybe<Scalars['String']['input']>;
  solution?: InputMaybe<Scalars['String']['input']>;
  startedAt?: InputMaybe<Scalars['Time']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateLabelArgs = {
  color?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateMilestoneArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['Time']['input']>;
  id: Scalars['ID']['input'];
  state?: InputMaybe<MilestoneState>;
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateNotificationSettingArgs = {
  agentID: Scalars['ID']['input'];
  channel?: InputMaybe<Scalars['String']['input']>;
  enabled: Scalars['Boolean']['input'];
  notificationType: Scalars['String']['input'];
};


export type MutationUpdateProjectArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateProjectConfigArgs = {
  allowCreatorTransition?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  requireCreatorCloseApproval?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUpdateProjectMemberArgs = {
  agentID: Scalars['ID']['input'];
  projectID: Scalars['ID']['input'];
  role: ProjectRole;
};


export type MutationUpdateProposalArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  priority?: InputMaybe<Priority>;
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateTaskArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  priority?: InputMaybe<Priority>;
  state?: InputMaybe<TaskState>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type NotificationEvent = {
  __typename?: 'NotificationEvent';
  agentID: Scalars['ID']['output'];
  createdAt: Scalars['Time']['output'];
  id: Scalars['ID']['output'];
  issueID?: Maybe<Scalars['ID']['output']>;
  message: Scalars['String']['output'];
  notificationType: Scalars['String']['output'];
  number: Scalars['Int']['output'];
  projectID?: Maybe<Scalars['ID']['output']>;
  proposalID?: Maybe<Scalars['ID']['output']>;
  read: Scalars['Boolean']['output'];
  taskID?: Maybe<Scalars['ID']['output']>;
};

export type NotificationSetting = {
  __typename?: 'NotificationSetting';
  agentID: Scalars['ID']['output'];
  channel: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  notificationType: Scalars['String']['output'];
};

export type NotificationTypeInfo = {
  __typename?: 'NotificationTypeInfo';
  description: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export enum Priority {
  Critical = 'critical',
  High = 'high',
  Low = 'low',
  Medium = 'medium'
}

export type Project = {
  __typename?: 'Project';
  allowCreatorTransition: Scalars['Boolean']['output'];
  createdAt: Scalars['Time']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  labels?: Maybe<Array<Label>>;
  members?: Maybe<Array<ProjectMember>>;
  milestones?: Maybe<Array<Milestone>>;
  name: Scalars['String']['output'];
  number: Scalars['Int']['output'];
  requireCreatorCloseApproval: Scalars['Boolean']['output'];
  updatedAt: Scalars['Time']['output'];
};

export type ProjectMember = {
  __typename?: 'ProjectMember';
  agent: Agent;
  agentID: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  number: Scalars['Int']['output'];
  projectID: Scalars['ID']['output'];
  role: ProjectRole;
};

export enum ProjectRole {
  Maintainer = 'maintainer',
  Member = 'member',
  Observer = 'observer',
  Owner = 'owner'
}

export type Proposal = {
  __typename?: 'Proposal';
  approvedAt?: Maybe<Scalars['Time']['output']>;
  author: Agent;
  authorID: Scalars['ID']['output'];
  cancelledAt?: Maybe<Scalars['Time']['output']>;
  comments?: Maybe<Array<Comment>>;
  completedAt?: Maybe<Scalars['Time']['output']>;
  createdAt: Scalars['Time']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  labels?: Maybe<Array<Label>>;
  number: Scalars['Int']['output'];
  priority: Priority;
  projectID: Scalars['ID']['output'];
  reviewNote?: Maybe<Scalars['String']['output']>;
  reviewedAt?: Maybe<Scalars['Time']['output']>;
  reviewer?: Maybe<Agent>;
  reviewerID?: Maybe<Scalars['ID']['output']>;
  startedAt?: Maybe<Scalars['Time']['output']>;
  state: ProposalState;
  submittedAt?: Maybe<Scalars['Time']['output']>;
  tasks?: Maybe<Array<Task>>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

export type ProposalConnection = {
  __typename?: 'ProposalConnection';
  edges: Array<Proposal>;
  total: Scalars['Int']['output'];
};

export enum ProposalState {
  Approved = 'approved',
  Cancelled = 'cancelled',
  Completed = 'completed',
  Draft = 'draft',
  InExecution = 'in_execution',
  Rejected = 'rejected',
  Submitted = 'submitted',
  UnderReview = 'under_review'
}

export type Query = {
  __typename?: 'Query';
  agent?: Maybe<Agent>;
  agents: Array<Agent>;
  allowHumanRegistration: Scalars['Boolean']['output'];
  comments: Array<Comment>;
  commonDeviceInfo: Array<Scalars['String']['output']>;
  feedback: Array<Feedback>;
  issue?: Maybe<Issue>;
  issues: IssueConnection;
  labels: Array<Label>;
  milestones: Array<Milestone>;
  notificationSettings: Array<NotificationSetting>;
  notificationTypes: Array<NotificationTypeInfo>;
  notifications: Array<NotificationEvent>;
  project?: Maybe<Project>;
  projects: Array<Project>;
  proposal?: Maybe<Proposal>;
  proposals: ProposalConnection;
  supportedModels: Array<Scalars['String']['output']>;
  task?: Maybe<Task>;
  tasks: TaskConnection;
  timeline: Array<TimelineEvent>;
  validProposalTransitions: Array<ProposalState>;
  validTaskTransitions: Array<TaskState>;
  validTransitions: Array<IssueState>;
  webhooks: Array<Webhook>;
};


export type QueryAgentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAgentsArgs = {
  capabilities?: InputMaybe<Array<Scalars['String']['input']>>;
  kind?: InputMaybe<AgentKind>;
  projectID?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<AgentStatus>;
};


export type QueryCommentsArgs = {
  issueID?: InputMaybe<Scalars['ID']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  proposalID?: InputMaybe<Scalars['ID']['input']>;
  taskID?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryFeedbackArgs = {
  targetID: Scalars['ID']['input'];
  targetType: FeedbackTargetType;
};


export type QueryIssueArgs = {
  id: Scalars['ID']['input'];
};


export type QueryIssuesArgs = {
  assigneeID?: InputMaybe<Scalars['ID']['input']>;
  labelIDs?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  priority?: InputMaybe<Priority>;
  projectID: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<IssueState>;
  states?: InputMaybe<Array<IssueState>>;
};


export type QueryLabelsArgs = {
  group?: InputMaybe<Scalars['String']['input']>;
  projectID: Scalars['ID']['input'];
};


export type QueryMilestonesArgs = {
  projectID: Scalars['ID']['input'];
  state?: InputMaybe<MilestoneState>;
};


export type QueryNotificationSettingsArgs = {
  agentID: Scalars['ID']['input'];
};


export type QueryNotificationsArgs = {
  agentID: Scalars['ID']['input'];
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProposalArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProposalsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  priority?: InputMaybe<Priority>;
  projectID: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<ProposalState>;
};


export type QueryTaskArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTasksArgs = {
  assigneeID?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  proposalID: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  state?: InputMaybe<TaskState>;
};


export type QueryTimelineArgs = {
  issueID?: InputMaybe<Scalars['ID']['input']>;
  proposalID?: InputMaybe<Scalars['ID']['input']>;
  taskID?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryValidProposalTransitionsArgs = {
  state: ProposalState;
};


export type QueryValidTaskTransitionsArgs = {
  state: TaskState;
};


export type QueryValidTransitionsArgs = {
  state: IssueState;
};


export type QueryWebhooksArgs = {
  projectID: Scalars['ID']['input'];
};

export type RegisterResult = {
  __typename?: 'RegisterResult';
  agent: Agent;
  token: Scalars['String']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  agentNotifications: NotificationEvent;
  agentStatusChanged: AgentStatusEvent;
  issueUpdated: Issue;
};


export type SubscriptionAgentNotificationsArgs = {
  agentID: Scalars['ID']['input'];
};


export type SubscriptionIssueUpdatedArgs = {
  issueID: Scalars['ID']['input'];
};

export type Task = {
  __typename?: 'Task';
  assignee?: Maybe<Agent>;
  assigneeID?: Maybe<Scalars['ID']['output']>;
  comments?: Maybe<Array<Comment>>;
  completedAt?: Maybe<Scalars['Time']['output']>;
  createdAt: Scalars['Time']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  issues?: Maybe<Array<Issue>>;
  number: Scalars['Int']['output'];
  priority: Priority;
  proposal: Proposal;
  proposalID: Scalars['ID']['output'];
  startedAt?: Maybe<Scalars['Time']['output']>;
  state: TaskState;
  title: Scalars['String']['output'];
  updatedAt: Scalars['Time']['output'];
};

export type TaskConnection = {
  __typename?: 'TaskConnection';
  edges: Array<Task>;
  total: Scalars['Int']['output'];
};

export enum TaskState {
  Blocked = 'blocked',
  Cancelled = 'cancelled',
  Completed = 'completed',
  InProgress = 'in_progress',
  Pending = 'pending'
}

export type TimelineEvent = {
  __typename?: 'TimelineEvent';
  actor: Agent;
  actorID: Scalars['ID']['output'];
  createdAt: Scalars['Time']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  issueID?: Maybe<Scalars['ID']['output']>;
  number: Scalars['Int']['output'];
  payload?: Maybe<Scalars['Map']['output']>;
  proposalID?: Maybe<Scalars['ID']['output']>;
  taskID?: Maybe<Scalars['ID']['output']>;
};

export type Webhook = {
  __typename?: 'Webhook';
  agent: Agent;
  agentID: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  projectID: Scalars['ID']['output'];
  secret: Scalars['String']['output'];
};

export type WebhookPayload = {
  __typename?: 'WebhookPayload';
  curlExample: Scalars['String']['output'];
  webhook: Webhook;
};
