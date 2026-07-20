import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { relativeTime } from "@/lib/format";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
  parentID?: string | null;
  replies?: Comment[];
}

interface IssueCommentSectionProps {
  issueId: string;
  agentId: string | undefined;
  comments: Comment[];
  onRefresh: () => void;
}

export function IssueCommentSection({ issueId, agentId, comments, onRefresh }: IssueCommentSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [previewComment, setPreviewComment] = useState(false);
  const [previewReply, setPreviewReply] = useState(false);

  const handleComment = async (parentID?: string) => {
    const text = parentID ? replyText : newComment;
    if (!text.trim() || !agentId) return;
    try {
      await gql(
        `mutation addComment($issueID: ID!, $authorID: ID!, $body: String!, $contentType: CommentContentType!, $parentID: ID) {
          addComment(issueID: $issueID, authorID: $authorID, body: $body, contentType: $contentType, parentID: $parentID) { id body createdAt author { id name } parentID replies { id body createdAt author { id name } } }
        }`,
        { issueID: issueId, authorID: agentId, body: text, contentType: "markdown", parentID: parentID || null }
      );
      if (parentID) { setReplyText(""); setReplyingTo(null); }
      else setNewComment("");
      onRefresh();
      toast.success("评论发送成功");
    } catch {
      toast.error("网络错误，评论发送失败");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium">评论 ({comments.length})</h2>
      {comments
        .filter((c) => !c.parentID)
        .map((parent) => (
        <div key={parent.id}>
          <div className="border bg-card p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">{parent.author.name.charAt(0)}</span>
              <span className="text-sm font-medium">{parent.author.name}</span>
              <span className="text-xs text-muted-foreground">{relativeTime(parent.createdAt)}</span>
              {agentId && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs min-h-[44px] min-w-[44px]"
                  aria-label={replyingTo === parent.id ? "取消回复" : `回复 ${parent.author.name}`}
                  onClick={() => { setReplyingTo(replyingTo === parent.id ? null : parent.id); setReplyText(""); }}>
                  {replyingTo === parent.id ? "取消回复" : "回复"}
                </Button>
              )}
            </div>
            <div className="mt-2 text-sm"><MarkdownContent content={parent.body} /></div>
            {replyingTo === parent.id && (
              <div className="mt-2 border-t pt-2">
                <div className="flex gap-2 mb-2">
                  <button className={`text-xs font-medium px-2 py-0.5 rounded ${!previewReply ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setPreviewReply(false)}>编辑</button>
                  <button className={`text-xs font-medium px-2 py-0.5 rounded ${previewReply ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setPreviewReply(true)}>预览</button>
                </div>
                {previewReply ? (
                  <div className="min-h-[60px] rounded-md border bg-background p-2 text-sm">
                    {replyText.trim() ? <MarkdownContent content={replyText} /> : <p className="text-xs text-muted-foreground">暂无内容</p>}
                  </div>
                ) : (
                  <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`回复 ${parent.author.name}... (⌘+Enter 发送)`} rows={2} className="text-sm"
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && replyText.trim()) { e.preventDefault(); handleComment(parent.id); } }} />
                )}
                <div className="mt-1 flex justify-end gap-1">
                  <Button size="xs" aria-label="发送回复" onClick={() => handleComment(parent.id)} disabled={!replyText.trim()}><Send className="h-3 w-3" />发送</Button>
                </div>
              </div>
            )}
          </div>
          {parent.replies && parent.replies.length > 0 && (
            <div className="ml-6 mt-1 space-y-1">
              {parent.replies.map((r) => (
                <div key={r.id} className="border bg-card p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-[9px] font-medium text-primary">{r.author.name.charAt(0)}</span>
                    <span className="text-xs font-medium">{r.author.name}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime(r.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-sm"><MarkdownContent content={r.body} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {agentId && (
        <div className="border bg-card p-4 rounded-lg">
          <div className="flex gap-2 mb-2">
            <button className={`text-xs font-medium px-2 py-1 rounded ${!previewComment ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setPreviewComment(false)}>编辑</button>
            <button className={`text-xs font-medium px-2 py-1 rounded ${previewComment ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setPreviewComment(true)}>预览</button>
          </div>
          {previewComment ? (
            <div className="min-h-[80px] rounded-md border p-3">
              {newComment.trim() ? <MarkdownContent content={newComment} /> : <p className="text-sm text-muted-foreground">暂无内容</p>}
            </div>
          ) : (
            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="输入评论... 支持 Markdown (⌘+Enter 发送)" rows={3}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && newComment.trim()) { e.preventDefault(); handleComment(); } }} />
          )}
          <div className="mt-2 flex justify-end">
            <Button size="xs" aria-label="发送评论" onClick={() => handleComment()} disabled={!newComment.trim()}>
              <Send className="h-3 w-3" />发送
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
