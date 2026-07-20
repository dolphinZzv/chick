import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { gql } from "@/lib/graphql";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Trash2, Plus, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { useSubscription } from "@/hooks/useSubscription";
import { NoteDialog } from "@/components/shared/NoteDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { IssueMetaSidebar } from "@/components/issue/IssueMetaSidebar";
import { IssueCommentSection } from "@/components/issue/IssueCommentSection";
import { issueStateLabels, issueStateBadgeColors, issuePriorityColors, eventTypeLabels, eventIcons, priorityLabels as sharedPriorityLabels } from "@/lib/constants";
import { relativeTime } from "@/lib/format";

interface IssueDetail {
  id: string; number: number; title: string; description: string | null;
  state: string; priority: string; dueDate: string | null;
  startedAt: string | null; completedAt: string | null; difficulty: number | null;
  environment: string | null; branch: string | null; links: string[];
  createdAt: string; creator: { id: string; name: string };
  assignees: Array<{ id: string; agent: { id: string; name: string }; state: string }>;
  labels: Array<{ id: string; name: string; color: string | null }>;
  milestone: { id: string; title: string } | null;
  projectID: string;
}

interface Comment {
  id: string; body: string; createdAt: string;
  author: { id: string; name: string };
  parentID?: string | null; replies?: Comment[];
}

interface TimelineEvent {
  id: string; eventType: string; createdAt: string;
  actor: { id: string; name: string };
  payload: Record<string, unknown> | null;
}

interface Label { id: string; name: string; color: string | null; }
interface Milestone { id: string; title: string; state: string; }

const stateLabels = issueStateLabels;
const stateBadgeColors = issueStateBadgeColors;
const priorityLabels = sharedPriorityLabels;

const Timeline = ({ events }: { events: TimelineEvent[] }) => (
  <div className="space-y-0">
    {events.map((event, idx) => {
      const note = event.payload && typeof event.payload === "object" && "note" in event.payload ? String(event.payload.note) : null;
      const fromState = event.payload && typeof event.payload === "object" && "from" in event.payload ? String(event.payload.from) : null;
      const toState = event.payload && typeof event.payload === "object" && "to" in event.payload ? String(event.payload.to) : null;
      const transitionDetail = event.eventType === "state_changed" && fromState && toState
        ? `${stateLabels[fromState] || fromState} → ${stateLabels[toState] || toState}` : null;
      return (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="mt-1.5 flex h-5 w-5 items-center justify-center rounded-full border bg-card text-[10px] text-muted-foreground">{eventIcons[event.eventType] || "●"}</div>
            {idx < events.length - 1 && <div className="w-px flex-1 bg-border" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{event.actor.name}</span>
              <span className="text-xs text-muted-foreground">{eventTypeLabels[event.eventType] || event.eventType}</span>
              <span className="text-xs text-muted-foreground">{relativeTime(event.createdAt)}</span>
            </div>
            {transitionDetail && <p className="text-xs text-muted-foreground mt-0.5">{transitionDetail}</p>}
            {note && <p className="mt-1 text-xs bg-muted/50 rounded px-2 py-1 italic">{note}</p>}
          </div>
        </div>
      );
    })}
  </div>
);

export function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { agent } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const navigate = useNavigate();

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectLabels, setProjectLabels] = useState<Label[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<Milestone[]>([]);
  const [transitions, setTransitions] = useState<string[]>([]);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteDialogTarget, setNoteDialogTarget] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchData = useCallback((showLoading = true) => {
    if (!id) return;
    if (showLoading) setLoading(true);
    setError(null);
    Promise.all([
      gql(`query issue($id: ID!) { issue(id: $id) { id number title description state priority dueDate startedAt completedAt difficulty environment branch links createdAt creator { id name } assignees { id agent { id name } state } labels { id name color } milestone { id title } projectID } }`, { id }),
      gql(`query comments($issueId: ID!) { comments(issueID: $issueId) { id body createdAt parentID author { id name } replies { id body createdAt author { id name } } } }`, { issueId: id }),
      gql(`query timeline($issueId: ID!) { timeline(issueID: $issueId) { id eventType createdAt actor { id name } payload } }`, { issueId: id }),
    ]).then(([iJson, cJson, tJson]) => {
      if (iJson.errors) { setError(iJson.errors[0].message); return; }
      if (cJson.errors) { setError(cJson.errors[0].message); return; }
      if (tJson.errors) { setError(tJson.errors[0].message); return; }
      setIssue(iJson.data.issue);
      setComments((cJson.data.comments || []).map((c: Comment) => ({
        ...c, replies: [...(c.replies || [])].sort((a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      })).sort((a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setEvents(tJson.data.timeline);
      gql(`query vt($state: IssueState!) { validTransitions(state: $state) }`, { state: iJson.data.issue.state })
        .then((vJson) => { if (!vJson.errors) setTransitions(vJson.data.validTransitions); });
      const pid = iJson.data.issue.projectID;
      if (pid) {
        gql(`query labels($projectId: ID!) { labels(projectID: $projectId) { id name color } }`, { projectId: pid })
          .then((lJson) => { if (!lJson.errors) setProjectLabels(lJson.data.labels); });
        gql(`query milestones($projectId: ID!) { milestones(projectID: $projectId) { id title state } }`, { projectId: pid })
          .then((mJson) => { if (!mJson.errors) setProjectMilestones(mJson.data.milestones); });
      }
    }).catch(() => setError("网络错误")).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    document.title = issue ? `#${issue.number} ${issue.title} - Chick` : "Chick";
  }, [issue]);

  useSubscription(
    `subscription issueUpdated($issueID: ID!) { issueUpdated(issueID: $issueID) { id number title description state priority dueDate startedAt completedAt difficulty environment branch links createdAt creator { id name } assignees { id agent { id name } state } labels { id name color } milestone { id title } projectID } }`,
    id ? { issueID: id } : undefined,
    (data: any) => { if (data?.issueUpdated) { setIssue((prev) => prev ? { ...prev, ...data.issueUpdated } : prev); fetchData(false); } },
  );

  const handleTransition = async (toState: string) => {
    if (!id || !agent) return;
    setNoteDialogTarget(toState); setNoteDialogOpen(true);
  };

  const handleNoteSubmit = async (note: string) => {
    if (!id || !agent || !noteDialogTarget) return;
    const toState = noteDialogTarget; setNoteDialogTarget(null);
    try {
      const json = await gql(`mutation transitionIssue($id: ID!, $newState: IssueState!, $actorId: ID!, $note: String) { transitionIssue(id: $id, newState: $newState, actorID: $actorId, note: $note) { state } }`,
        { id, newState: toState, actorId: agent.agentId, note: note || null });
      if (!json.errors && json.data) { setIssue((prev) => prev ? { ...prev, state: json.data.transitionIssue.state } : prev); toast.success(`状态已变更为 ${stateLabels[toState]}`); fetchData(false); }
      else { toast.error(json.errors?.[0]?.message || "状态变更失败"); }
    } catch { toast.error("网络错误，状态变更失败"); }
  };

  const confirmDelete = async () => {
    if (!id) return; setDeleteConfirmOpen(false);
    try {
      const json = await gql(`mutation deleteIssue($id: ID!) { deleteIssue(id: $id) }`, { id });
      if (!json.errors) { toast.success("Issue 已删除"); if (issue?.projectID) navigate(`/projects/${issue.projectID}`); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误，删除失败"); }
  };

  const handleUpdateIssue = async (fields: Record<string, unknown>) => {
    if (!id) return;
    try {
      const json = await gql(`mutation updateIssue($id: ID!, $title: String, $description: String, $priority: Priority, $milestoneId: ID, $difficulty: Int, $startedAt: Time, $completedAt: Time, $environment: String, $branch: String, $links: [String!]) {
        updateIssue(id: $id, title: $title, description: $description, priority: $priority, milestoneId: $milestoneId, difficulty: $difficulty, startedAt: $startedAt, completedAt: $completedAt, environment: $environment, branch: $branch, links: $links) {
          id title description priority milestone { id title } difficulty environment branch links startedAt completedAt
        }
      }`, { id, ...fields });
      if (!json.errors && json.data) { setIssue((prev) => prev ? { ...prev, ...json.data.updateIssue } : prev); toast.success("已更新"); }
      else { toast.error(json.errors?.[0]?.message || "更新失败"); }
    } catch { toast.error("网络错误，更新失败"); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-6 w-48" /><Skeleton className="h-8 w-full" /><Skeleton className="h-32 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;
  if (!issue) return <EmptyState title="Issue 不存在" />;

  const mainContent = (
    <div className="space-y-6">
      <Link to={`/projects/${issue.projectID}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">← 返回项目</Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`text-xs ${stateBadgeColors[issue.state]}`}>{stateLabels[issue.state]}</Badge>
          <span className="text-xs text-muted-foreground">#{issue.id}</span>
          <Badge variant="outline" className="text-xs">{priorityLabels[issue.priority] || issue.priority}</Badge>
          {issue.difficulty ? <Badge variant="outline" className="text-xs">{'⭐'.repeat(issue.difficulty)}</Badge> : null}
          {issue.startedAt && <span className="text-xs text-muted-foreground">开始: {new Date(issue.startedAt).toLocaleString()}</span>}
          {issue.completedAt && <span className="text-xs text-muted-foreground">完成: {new Date(issue.completedAt).toLocaleString()}</span>}
          {issue.dueDate && <span className="text-xs text-muted-foreground">截止: {issue.dueDate.slice(0, 10)}</span>}
        </div>
        <h1 className="text-2xl font-semibold mt-2">{issue.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{issue.creator.name}</span>
          <span>创建于 {relativeTime(issue.createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap gap-2">
          {transitions.length > 0 && agent && transitions.map((state) => (
            <Button key={state} variant="outline" size="sm" onClick={() => handleTransition(state)}>转为 {stateLabels[state]}</Button>
          ))}
        </div>
        {agent && (
          <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />删除
          </Button>
        )}
      </div>

      {issue.description && (
        <div className="border bg-card p-4 rounded-lg"><MarkdownContent content={issue.description} /></div>
      )}

      <div className="border-t" />

      <IssueCommentSection issueId={issue.id} agentId={agent?.agentId} comments={comments} onRefresh={() => fetchData(false)} />

      <div className="border-t" />

      <div className="space-y-2">
        <h2 className="text-base font-medium">动态</h2>
        {events.length === 0 ? <p className="text-sm text-muted-foreground">暂无动态</p> : <Timeline events={events} />}
      </div>
    </div>
  );

  const metaSidebar = (
    <IssueMetaSidebar
      issueId={issue.id}
      projectID={issue.projectID}
      agentId={agent?.agentId}
      assignees={issue.assignees}
      labels={issue.labels}
      milestone={issue.milestone}
      environment={issue.environment}
      branch={issue.branch}
      links={issue.links}
      startedAt={issue.startedAt}
      completedAt={issue.completedAt}
      projectLabels={projectLabels}
      projectMilestones={projectMilestones}
      onIssueUpdate={handleUpdateIssue}
      onLabelsChange={(labels) => setIssue((prev) => prev ? { ...prev, labels } : prev)}
      onMilestoneChange={(milestone) => setIssue((prev) => prev ? { ...prev, milestone } : prev)}
      onAssigneesChange={(assignees) => setIssue((prev) => prev ? { ...prev, assignees } : prev)}
    />
  );

  if (isDesktop) {
    return (
      <>
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">{mainContent}</div>
          <div className="w-80 shrink-0">{metaSidebar}</div>
        </div>
        <NoteDialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen} title={`变更为「${noteDialogTarget ? stateLabels[noteDialogTarget] : ""}」`} description="添加备注说明（可选）" placeholder="输入备注…" onSubmit={handleNoteSubmit} />
        <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} title="确定删除这个 Issue？" description="此操作不可撤销。" confirmLabel="删除" variant="destructive" onConfirm={confirmDelete} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {mainContent}
        <div className="border-t" />
        {metaSidebar}
      </div>
      <NoteDialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen} title={`变更为「${noteDialogTarget ? stateLabels[noteDialogTarget] : ""}」`} description="添加备注说明（可选）" placeholder="输入备注…" onSubmit={handleNoteSubmit} />
      <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} title="确定删除这个 Issue？" description="此操作不可撤销。" confirmLabel="删除" variant="destructive" onConfirm={confirmDelete} />
    </>
  );
}
