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
import { MessageSquare, Send, Plus } from "lucide-react";
import { toast } from "sonner";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { CreateTaskDialog } from "@/components/project/CreateTaskDialog";
import { NoteDialog } from "@/components/shared/NoteDialog";
import { proposalStateLabels, priorityLabels as sharedPriorityLabels, taskStateLabels } from "@/lib/constants";
import { relativeTime } from "@/lib/format";

interface TaskItem {
  id: string;
  number: number;
  title: string;
  state: string;
  priority: string;
  assignee: { id: string; name: string } | null;
}

interface ProposalDetail {
  id: string;
  number: number;
  title: string;
  description: string | null;
  state: string;
  priority: string;
  author: { id: string; name: string };
  reviewer: { id: string; name: string } | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  tasks: TaskItem[];
  labels: Array<{ id: string; name: string; color: string | null }>;
}

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

interface TimelineEvent {
  id: string;
  eventType: string;
  createdAt: string;
  actor: { id: string; name: string };
  payload: Record<string, unknown> | null;
}

const stateLabels = proposalStateLabels;
const priorityLabels = sharedPriorityLabels;

export function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { agent } = useAuth();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [transitions, setTransitions] = useState<string[]>([]);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteDialogTarget, setNoteDialogTarget] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      gql(`query proposal($id: ID!) { proposal(id: $id) { id number title description state priority author { id name } reviewer { id name } reviewNote reviewedAt createdAt tasks { id number title state priority assignee { id name } } labels { id name color } } }`, { id }),
      gql(`query comments($proposalId: ID!) { comments(proposalID: $proposalId) { id body createdAt author { id name } } }`, { proposalId: id }),
      gql(`query timeline($proposalId: ID!) { timeline(proposalID: $proposalId) { id eventType createdAt actor { id name } payload } }`, { proposalId: id }),
    ]).then(([pJson, cJson, tJson]) => {
      if (pJson.errors) { setError(pJson.errors[0].message); return; }
      if (cJson.errors) { setError(cJson.errors[0].message); return; }
      if (tJson.errors) { setError(tJson.errors[0].message); return; }
      setProposal(pJson.data.proposal);
      setComments((cJson.data.comments || []).sort((a: Comment, b: Comment) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setEvents(tJson.data.timeline);
      const state = pJson.data.proposal.state;
      gql(`query vt($state: ProposalState!) { validProposalTransitions(state: $state) }`, { state })
        .then((vJson) => { if (!vJson.errors) setTransitions(vJson.data.validProposalTransitions); });
    }).catch(() => setError("网络错误"))
    .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    document.title = proposal ? `#${proposal.number} ${proposal.title} - Chick` : "Chick";
  }, [proposal]);

  const handleTransition = async (toState: string) => {
    if (!id || !agent) return;
    setNoteDialogTarget(toState);
    setNoteDialogOpen(true);
  };

  const handleNoteSubmit = async (note: string) => {
    if (!id || !agent || !noteDialogTarget) return;
    const toState = noteDialogTarget;
    const label = stateLabels[toState] || toState;
    setNoteDialogTarget(null);
    try {
      const json = await gql(`mutation transitionProposal($id: ID!, $newState: ProposalState!, $actorID: ID!, $note: String) { transitionProposal(id: $id, newState: $newState, actorID: $actorID, note: $note) { state } }`, { id, newState: toState, actorID: agent.agentId, note: note || null });
      if (!json.errors) { setProposal((prev) => prev ? { ...prev, state: json.data.transitionProposal.state } : prev); toast.success(`状态已变更为 ${label}`); fetchData(); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !id || !agent) return;
    try {
      const json = await gql(`mutation addProposalComment($proposalID: ID!, $authorID: ID!, $body: String!, $contentType: CommentContentType!) { addProposalComment(proposalID: $proposalID, authorID: $authorID, body: $body, contentType: $contentType) { id body } }`, { proposalID: id, authorID: agent.agentId, body: newComment, contentType: "markdown" });
      if (!json.errors) { setNewComment(""); fetchData(); toast.success("评论发送成功"); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-6 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;
  if (!proposal) return <EmptyState title="提案不存在" />;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to={-1 as any} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← 返回
      </Link>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{stateLabels[proposal.state]}</Badge>
          <Badge variant="outline" className="text-xs">{priorityLabels[proposal.priority] || proposal.priority}</Badge>
          <span className="text-xs text-muted-foreground">#{proposal.number}</span>
        </div>
        <h1 className="text-2xl font-semibold mt-1.5">{proposal.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{proposal.author.name}</span>
          <span>创建于 {relativeTime(proposal.createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {transitions.length > 0 && agent && transitions.map((s) => (
          <Button key={s} variant="outline" size="xs" onClick={() => handleTransition(s)}>
            转为 {stateLabels[s]}
          </Button>
        ))}
        {(proposal.state === "approved" || proposal.state === "in_execution") && (
          <Button variant="outline" size="xs" onClick={() => setShowTaskDialog(true)}>
            <Plus className="mr-1 size-3" />创建任务
          </Button>
        )}
      </div>

      {proposal.reviewer && (
        <div className="rounded-lg border bg-card p-4 space-y-1">
          <p className="text-sm">评审人: <span className="font-medium">{proposal.reviewer.name}</span></p>
          {proposal.reviewNote && <div className="text-sm"><MarkdownContent content={proposal.reviewNote} /></div>}
          {proposal.reviewedAt && <p className="text-xs text-muted-foreground">{relativeTime(proposal.reviewedAt)}</p>}
        </div>
      )}

      {proposal.description && (
        <div className="rounded-lg border bg-card p-4 text-sm"><MarkdownContent content={proposal.description} /></div>
      )}

      {proposal.tasks && proposal.tasks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-2">任务 ({proposal.tasks.length})</h2>
          <div className="space-y-1.5">
            {proposal.tasks.map((t) => (
              <Link key={t.id} to={`/tasks/${t.id}`} className="block rounded-lg border bg-card p-3 hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs shrink-0">{taskStateLabels[t.state]}</Badge>
                  <span className="text-sm font-medium">#{t.number} {t.title}</span>
                  {t.assignee && <span className="text-xs text-muted-foreground ml-auto">{t.assignee.name}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {proposal.labels && proposal.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {proposal.labels.map((l) => (
            <Badge key={l.id} variant="secondary" className="text-xs">{l.name}</Badge>
          ))}
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

      <Separator />

      <div className="space-y-2">
        <h2 className="text-sm font-medium">动态</h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无动态</p>
        ) : (
          <div className="space-y-0">
            {events.map((ev, idx) => (
              <div key={ev.id} className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div className="mt-1.5 size-4 rounded-full border bg-card flex items-center justify-center text-[8px] text-muted-foreground">●</div>
                  {idx < events.length - 1 && <div className="w-px flex-1 bg-border/50" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{ev.actor.name}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(ev.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ev.payload?.note ? `${ev.payload.note}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateTaskDialog proposalId={id!} open={showTaskDialog} onOpenChange={setShowTaskDialog} onCreated={fetchData} />

      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        title={`变更为「${noteDialogTarget ? stateLabels[noteDialogTarget] : ""}」`}
        description="添加备注说明（可选）"
        placeholder="输入备注…"
        onSubmit={handleNoteSubmit}
      />
    </div>
  );
}
