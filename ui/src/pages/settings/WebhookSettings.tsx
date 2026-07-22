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
import { Plus, Trash2, Copy, Check, Webhook } from "lucide-react";

interface WebhookItem {
  id: string;
  name: string;
  secret: string;
  enabled: boolean;
  createdAt: string;
  agent: { id: string; name: string };
}

export function WebhookSettings() {
  const { id } = useParams<{ id: string }>();
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const [resultOpen, setResultOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState("");
  const [createdCurl, setCreatedCurl] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql(`query webhooks($projectId: ID!) { webhooks(projectID: $projectId) { id name secret enabled createdAt agent { id name } } }`, { projectId: id });
      if (res.errors) { setError(res.errors[0].message); return; }
      setWebhooks(res.data.webhooks || []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newName.trim()) return;
    setCreating(true);
    try {
      const res = await gql(
        `mutation createWebhook($pid: ID!, $name: String!) { createWebhook(projectID: $pid, name: $name) { webhook { secret } curlExample } }`,
        { pid: id, name: newName }
      );
      if (res.errors) { toast.error(res.errors[0].message); return; }
      const payload = res.data.createWebhook;
      setCreatedSecret(payload.webhook.secret);
      setCreatedCurl(payload.curlExample);
      setResultOpen(true);
      setCreateOpen(false);
      setNewName("");
      fetchData();
    } catch { toast.error("网络错误"); }
    finally { setCreating(false); }
  };

  const handleDelete = async (webhookId: string) => {
    try {
      const res = await gql(`mutation deleteWebhook($id: ID!) { deleteWebhook(id: $id) }`, { id: webhookId });
      if (res.errors) { toast.error(res.errors[0].message); return; }
      toast.success("Webhook 已删除");
      fetchData();
    } catch { toast.error("网络错误"); }
  };

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  if (loading) return <div className="border bg-card p-4 rounded-lg space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{webhooks.length} 个 Webhook</span>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" />新建 Webhook</Button>
      </div>

      {webhooks.length === 0 ? (
        <EmptyState title="暂无 Webhook" description="创建 Webhook 后可通过 HTTP API 创建 Issue" />
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
              <Webhook className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{wh.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {wh.agent.name} · {wh.secret.slice(0, 8)}…{wh.secret.slice(-4)}
                </div>
              </div>
              <ConfirmDialog title="确认删除 Webhook" description="删除后，使用此 Webhook 的外部服务将无法创建 Issue。此操作不可撤销。" confirmLabel="删除" variant="destructive" onConfirm={() => handleDelete(wh.id)}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="删除 Webhook">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ConfirmDialog>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建 Webhook</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="例如：GitHub CI" required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" disabled={creating}>{creating ? "创建中..." : "创建"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Webhook 已创建</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Secret（仅显示一次）</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all">{createdSecret}</code>
                <Button size="icon" variant="ghost" className="shrink-0" onClick={() => copyToClipboard(createdSecret, setSecretCopied)}>
                  {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">cURL 示例</label>
              <div className="relative min-w-0">
                <pre className="text-xs bg-muted px-3 py-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-40">{createdCurl}</pre>
                <Button size="icon" variant="ghost" className="absolute top-1 right-1" onClick={() => copyToClipboard(createdCurl, setCurlCopied)}>
                  {curlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setResultOpen(false)}>完成</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
