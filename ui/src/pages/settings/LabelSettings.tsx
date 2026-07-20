import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Trash2 } from "lucide-react";

const PRESET_COLORS = ["#0366d6", "#28a745", "#d73a49", "#ffd33d", "#6f42c1", "#e4e669", "#f97583", "#888"];

export function LabelSettings() {
  const { id } = useParams<{ id: string }>();
  const [labels, setLabels] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [labelOpen, setLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#0366d6");
  const [labelCreating, setLabelCreating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql(`query labels($projectId: ID!) { labels(projectID: $projectId) { id name color } }`, { projectId: id });
      if (res.errors) { setError(res.errors[0].message); return; }
      setLabels(res.data.labels);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newLabelName.trim()) return;
    setLabelCreating(true);
    try {
      const res = await gql(
        `mutation createLabel($pid: ID!, $name: String!, $color: String) { createLabel(projectID: $pid, name: $name, color: $color) { id name color } }`,
        { pid: id, name: newLabelName, color: newLabelColor || null }
      );
      if (res.errors) { toast.error(res.errors[0].message); return; }
      toast.success("标签已创建");
      setLabelOpen(false);
      setNewLabelName("");
      setNewLabelColor("#0366d6");
      fetchData();
    } catch { toast.error("网络错误"); }
    finally { setLabelCreating(false); }
  };

  const handleDeleteLabel = async (labelId: string) => {
    try {
      const res = await gql(`mutation deleteLabel($id: ID!) { deleteLabel(id: $id) }`, { id: labelId });
      if (res.errors) { toast.error(res.errors[0].message); return; }
      toast.success("标签已删除");
      fetchData();
    } catch { toast.error("网络错误"); }
  };

  if (loading) return <div className="border bg-card p-4 rounded-lg space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{labels.length} 个标签</span>
        <Button size="sm" onClick={() => setLabelOpen(true)}><Plus className="mr-1 h-4 w-4" />新建标签</Button>
      </div>

      {labels.length === 0 ? (
        <EmptyState title="暂无标签" description="创建标签来标记 Issue" />
      ) : (
        <div className="space-y-2">
          {labels.map((label) => (
            <div key={label.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: label.color || "#888" }} />
              <span className="text-sm flex-1">{label.name}</span>
              <ConfirmDialog title="确认删除标签" description={`确定删除标签「${label.name}」吗？此操作不可撤销。`} confirmLabel="删除" variant="destructive" onConfirm={() => handleDeleteLabel(label.id)}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="删除标签">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ConfirmDialog>
            </div>
          ))}
        </div>
      )}

      <Dialog open={labelOpen} onOpenChange={setLabelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建标签</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateLabel} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称</label>
              <Input value={newLabelName} onChange={e => setNewLabelName(e.target.value)} placeholder="标签名称" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">颜色</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`h-7 w-7 rounded-full border-2 ${newLabelColor === c ? "border-foreground" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewLabelColor(c)} />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLabelOpen(false)}>取消</Button>
              <Button type="submit" disabled={labelCreating}>{labelCreating ? "创建中..." : "创建"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
