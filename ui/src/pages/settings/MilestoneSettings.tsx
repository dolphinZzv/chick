import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Trash2 } from "lucide-react";

export function MilestoneSettings() {
  const { id } = useParams<{ id: string }>();
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; description: string | null; state: string; dueDate: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [msOpen, setMsOpen] = useState(false);
  const [newMsTitle, setNewMsTitle] = useState("");
  const [newMsDesc, setNewMsDesc] = useState("");
  const [newMsDue, setNewMsDue] = useState("");
  const [msCreating, setMsCreating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql(`query milestones($projectId: ID!) { milestones(projectID: $projectId) { id title description state dueDate } }`, { projectId: id });
      if (res.errors) { setError(res.errors[0].message); return; }
      setMilestones(res.data.milestones);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMsTitle.trim()) return;
    setMsCreating(true);
    try {
      const res = await gql(
        `mutation createMilestone($pid: ID!, $title: String!, $desc: String, $due: Time) { createMilestone(projectID: $pid, title: $title, description: $desc, dueDate: $due) { id title state } }`,
        { pid: id, title: newMsTitle, desc: newMsDesc || null, due: newMsDue ? new Date(newMsDue).toISOString() : null }
      );
      if (res.errors) { toast.error(res.errors[0].message); return; }
      toast.success("里程碑已创建");
      setMsOpen(false);
      setNewMsTitle(""); setNewMsDesc(""); setNewMsDue("");
      fetchData();
    } catch { toast.error("网络错误"); }
    finally { setMsCreating(false); }
  };

  const handleDeleteMilestone = async (msId: string) => {
    try {
      const res = await gql(`mutation deleteMilestone($id: ID!) { deleteMilestone(id: $id) }`, { id: msId });
      if (res.errors) { toast.error(res.errors[0].message); return; }
      toast.success("里程碑已删除");
      fetchData();
    } catch { toast.error("网络错误"); }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{milestones.length} 个里程碑</span>
        <Button size="sm" onClick={() => setMsOpen(true)}><Plus className="mr-1 h-4 w-4" />新建里程碑</Button>
      </div>

      {milestones.length === 0 ? (
        <EmptyState title="暂无里程碑" description="创建里程碑来规划版本" />
      ) : (
        <div className="space-y-2">
          {milestones.map((ms) => (
            <div key={ms.id} className="border bg-card p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{ms.title}</h3>
                  {ms.description && <p className="mt-1 text-sm text-muted-foreground">{ms.description}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">{ms.state === "open" ? "进行中" : ms.state}</Badge>
                    {ms.dueDate && <span className="text-xs text-muted-foreground">截止: {new Date(ms.dueDate).toLocaleDateString("zh-CN")}</span>}
                  </div>
                </div>
                <ConfirmDialog title="确认删除里程碑" description={`确定删除里程碑「${ms.title}」吗？此操作不可撤销。`} confirmLabel="删除" variant="destructive" onConfirm={() => handleDeleteMilestone(ms.id)}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="删除里程碑">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </ConfirmDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={msOpen} onOpenChange={setMsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建里程碑</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateMilestone} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标题</label>
              <Input value={newMsTitle} onChange={e => setNewMsTitle(e.target.value)} placeholder="里程碑标题" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述（可选）</label>
              <Input value={newMsDesc} onChange={e => setNewMsDesc(e.target.value)} placeholder="描述" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">截止日期（可选）</label>
              <Input type="date" value={newMsDue} onChange={e => setNewMsDue(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMsOpen(false)}>取消</Button>
              <Button type="submit" disabled={msCreating}>{msCreating ? "创建中..." : "创建"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
