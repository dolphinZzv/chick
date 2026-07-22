import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { gql } from "@/lib/graphql";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { taskStateLabels, priorityLabels as sharedPriorityLabels } from "@/lib/constants";
import { relativeTime } from "@/lib/format";

interface IssueRef {
  id: string;
  number: number;
  title: string;
  state: string;
}

interface TaskDetail {
  id: string;
  number: number;
  title: string;
  description: string | null;
  state: string;
  priority: string;
  assignee: { id: string; name: string } | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  proposal: { id: string; number: number; title: string };
  issues: IssueRef[];
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

const stateLabels = taskStateLabels;
const priorityLabels = sharedPriorityLabels;

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { agent } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [transitions, setTransitions] = useState<string[]>([]);
  const [transitionConfirm, setTransitionConfirm] = useState<{ open: boolean; toState: string; label: string }>({ open: false, toState: "", label: "" });
  const [unlinkConfirm, setUnlinkConfirm] = useState<{ open: boolean; issueId: string }>({ open: false, issueId: "" });
  const [linkIssueInput, setLinkIssueInput] = useState<{ open: boolean; value: string }>({ open: false, value: "" });

  const fetchData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      gql(`query task($id: ID!) { task(id: $id) { id number title description state priority assignee { id name } startedAt completedAt createdAt proposal { id number title } issues { id number title state } } }`, { id }),
      gql(`query comments($taskId: ID!) { comments(taskID: $taskId) { id body createdAt author { id name } } }`, { taskId: id }),
    ]).then(([tJson, cJson]) => {
      if (tJson.errors) { setError(tJson.errors[0].message); return; }
      if (cJson.errors) { setError(cJson.errors[0].message); return; }
      setTask(tJson.data.task);
      setComments((cJson.data.comments || []).sort((a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      const state = tJson.data.task.state;
      gql(`query vt($state: TaskState!) { validTaskTransitions(state: $state) }`, { state })
        .then((vJson) => { if (!vJson.errors) setTransitions(vJson.data.validTaskTransitions); });
    }).catch(() => setError("网络错误"))
    .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    document.title = task ? `${task.title} - Morning Glory` : "Morning Glory";
  }, [task]);

  const handleTransition = async (toState: string) => {
    if (!id || !agent) return;
    const label = stateLabels[toState] || toState;
    setTransitionConfirm({ open: true, toState, label });
  };

  const confirmTransition = async () => {
    if (!id || !agent) return;
    const { toState, label } = transitionConfirm;
    setTransitionConfirm({ open: false, toState: "", label: "" });
    try {
      const json = await gql(`mutation transitionTask($id: ID!, $toState: TaskState!) { transitionTask(id: $id, toState: $toState) { state } }`, { id, toState });
      if (!json.errors) {
        setTask((prev) => prev ? { ...prev, state: json.data.transitionTask.state } : prev);
        toast.success(`状态已变为 ${label}`);
        fetchData();
      } else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !id || !agent) return;
    try {
      const json = await gql(
        `mutation addTaskComment($taskID: ID!, $authorID: ID!, $body: String!, $contentType: CommentContentType!) { addTaskComment(taskID: $taskID, authorID: $authorID, body: $body, contentType: $contentType) { id body } }`,
        { taskID: id, authorID: agent.agentId, body: newComment, contentType: "markdown" }
      );
      if (!json.errors) { setNewComment(""); fetchData(); toast.success("评论发送成功"); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleLinkIssue = async () => {
    if (!id || !agent) return;
    setLinkIssueInput({ open: true, value: "" });
  };

  const confirmLinkIssue = async () => {
    if (!id || !agent || !linkIssueInput.value.trim()) return;
    const issueId = linkIssueInput.value.trim();
    setLinkIssueInput({ open: false, value: "" });
    try {
      const json = await gql(`mutation linkIssuesToTask($taskID: ID!, $issueIDs: [ID!]!) { linkIssuesToTask(taskID: $taskID, issueIDs: $issueIDs) { id issues { id number title state } } }`, { taskID: id, issueIDs: [issueId] });
      if (!json.errors) { setTask((prev) => prev ? { ...prev, issues: json.data.linkIssuesToTask.issues } : prev); toast.success("Issue 已关联"); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleUnlinkIssue = async (issueId: string) => {
    if (!id) return;
    setUnlinkConfirm({ open: true, issueId });
  };

  const confirmUnlinkIssue = async () => {
    if (!id) return;
    const { issueId } = unlinkConfirm;
    setUnlinkConfirm({ open: false, issueId: "" });
    try {
      const json = await gql(`mutation unlinkIssueFromTask($taskID: ID!, $issueID: ID!) { unlinkIssueFromTask(taskID: $taskID, issueID: $issueID) { id issues { id number title state } } }`, { taskID: id, issueID: issueId });
      if (!json.errors) { setTask((prev) => prev ? { ...prev, issues: json.data.unlinkIssueFromTask.issues } : prev); toast.success("Issue 已取消关联"); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-6 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;
  if (!task) return <EmptyState title="任务不存在" />;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to={`/proposals/${task.proposal.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← 返回提案
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{stateLabels[task.state]}</Badge>
          <Badge variant="outline" className="text-xs">{priorityLabels[task.priority] || task.priority}</Badge>
          <span className="text-xs text-muted-foreground">#{task.number}</span>
        </div>
        <h1 className="text-2xl font-semibold mt-1.5">{task.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>提案: <Link to={`/proposals/${task.proposal.id}`} className="hover:underline">{task.proposal.title}</Link></span>
          <span>创建于 {relativeTime(task.createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {transitions.length > 0 && agent && transitions.map((s) => (
          <Button key={s} variant="outline" size="xs" onClick={() => handleTransition(s)}>
            转为 {stateLabels[s]}
          </Button>
        ))}
        {agent && (
          <Button variant="outline" size="xs" onClick={handleLinkIssue}>关联 Issue</Button>
        )}
      </div>

      {task.assignee && <p className="text-sm">负责人: <span className="font-medium">{task.assignee.name}</span></p>}

      {task.description && (
        <div className="rounded-lg border bg-card p-4 text-sm"><MarkdownContent content={task.description} /></div>
      )}

      {task.issues && task.issues.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-2">关联 Issue ({task.issues.length})</h2>
          <div className="space-y-1">
            {task.issues.map((iss) => (
              <div key={iss.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Link to={`/issues/${iss.id}`} className="text-sm hover:underline flex-1">#{iss.id} {iss.title}</Link>
                <Badge variant="secondary" className="text-xs">{iss.state}</Badge>
                {agent && (
                  <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => handleUnlinkIssue(iss.id)}>移除</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="size-3.5" />评论 ({comments.length})
        </h2>
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Avatar className="size-5"><AvatarFallback className="text-[10px]">{c.author.name.charAt(0)}</AvatarFallback></Avatar>
              <span className="text-xs font-medium">{c.author.name}</span>
              <span className="text-xs text-muted-foreground">{relativeTime(c.createdAt)}</span>
            </div>
            <div className="mt-1.5 text-sm"><MarkdownContent content={c.body} /></div>
          </div>
        ))}
        {agent && (
          <div className="rounded-lg border bg-card p-4">
            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="输入评论... (⌘+Enter 发送)" rows={2} className="text-sm"
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && newComment.trim()) { e.preventDefault(); handleComment(); } }} />
            <div className="mt-2 flex justify-end">
              <Button size="sm" className="min-h-[44px]" aria-label="发送评论" onClick={handleComment} disabled={!newComment.trim()}>
                <Send className="mr-1 size-3.5" />发送
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={transitionConfirm.open}
        onOpenChange={(open) => setTransitionConfirm((prev) => ({ ...prev, open }))}
        title={`确认将任务状态变更为「${transitionConfirm.label}」？`}
        confirmLabel="确认"
        onConfirm={confirmTransition}
      />

      <ConfirmDialog
        open={unlinkConfirm.open}
        onOpenChange={(open) => setUnlinkConfirm((prev) => ({ ...prev, open }))}
        title="确认取消关联该 Issue？"
        confirmLabel="确认取消关联"
        variant="destructive"
        onConfirm={confirmUnlinkIssue}
      />

      <Dialog open={linkIssueInput.open} onOpenChange={(open) => setLinkIssueInput((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>关联 Issue</DialogTitle>
            <DialogDescription>输入要关联的 Issue ID</DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={linkIssueInput.value}
            onChange={(e) => setLinkIssueInput((prev) => ({ ...prev, value: e.target.value }))}
            placeholder="Issue ID"
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") confirmLinkIssue(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkIssueInput({ open: false, value: "" })}>取消</Button>
            <Button onClick={confirmLinkIssue} disabled={!linkIssueInput.value.trim()}>关联</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
