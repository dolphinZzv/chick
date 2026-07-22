import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Trash2, Copy, Check } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  online: { label: "在线", dot: "bg-green-500" },
  busy: { label: "忙碌", dot: "bg-amber-500" },
  offline: { label: "离线", dot: "bg-gray-400" },
  error: { label: "错误", dot: "bg-red-500" },
};

const KIND_LABELS: Record<string, string> = { ai: "AI", human: "人类", hybrid: "混合" };

export function AgentSettings() {
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Array<{ agent: { id: string; number: number; name: string; kind: string; status: string; capabilities: string[]; deviceInfo?: string; modelInfo?: string; lastIP?: string; externalID: string }; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agentOpen, setAgentOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentKind, setNewAgentKind] = useState("ai");
  const [newAgentRole, setNewAgentRole] = useState("member");
  const [newAgentModel, setNewAgentModel] = useState("");
  const [newAgentDevice, setNewAgentDevice] = useState("");
  const [agentCreating, setAgentCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gql(`query project($id: ID!) { project(id: $id) { members { agent { id number name kind status capabilities deviceInfo modelInfo lastIP externalID } role } } }`, { id });
      if (res.errors) { setError(res.errors[0].message); return; }
      setMembers(res.data.project.members || []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemoveMember = async (agentId: string) => {
    if (!id) return;
    try {
      const res = await gql(`mutation removeProjectMember($pid: ID!, $aid: ID!) { removeProjectMember(projectID: $pid, agentID: $aid) }`, { pid: id, aid: agentId });
      if (res.errors) { toast.error(res.errors[0].message); return; }
      toast.success("成员已移除");
      fetchData();
    } catch { toast.error("网络错误"); }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newAgentName.trim()) return;
    setAgentCreating(true);
    try {
      const res = await gql(
        `mutation createProjectAgent($pid: ID!, $name: String!, $kind: AgentKind!, $role: ProjectRole, $device: String, $model: String) { createProjectAgent(projectID: $pid, name: $name, kind: $kind, role: $role, deviceInfo: $device, modelInfo: $model) { agent { id name } token } }`,
        { pid: id, name: newAgentName, kind: newAgentKind, role: newAgentRole, device: newAgentDevice || null, model: newAgentModel || null }
      );
      if (res.errors) { toast.error(res.errors[0].message); return; }
      const token = res.data?.createProjectAgent?.token;
      if (token) setCreatedToken(token);
      setAgentOpen(false);
      setNewAgentName(""); setNewAgentKind("ai"); setNewAgentRole("member"); setNewAgentModel(""); setNewAgentDevice("");
      fetchData();
    } catch { toast.error("网络错误"); }
    finally { setAgentCreating(false); }
  };

  if (loading) return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;

  const url = typeof window !== "undefined" ? `${window.location.origin}/mcp` : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{members.length} 个 Agent</span>
        <Button size="sm" onClick={() => setAgentOpen(true)}><Plus className="mr-1 h-4 w-4" />新建 Agent</Button>
      </div>

      {members.length === 0 ? (
        <EmptyState title="暂无 Agent" description="创建 Agent 并加入项目" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {members.map((m) => {
            const a = m.agent;
            const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.offline;
            return (
              <Link key={a.id} to={`/agents/${a.id}`} className="block border bg-card p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${st.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">#{a.number} {a.name}</p>
                    <p className="text-xs text-muted-foreground">{KIND_LABELS[a.kind] || a.kind} · {st.label}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{m.role === "owner" ? "拥有者" : "成员"}</Badge>
                  {m.role !== "owner" && (
                    <ConfirmDialog title="确认移除" description={`确定将 #${a.number} ${a.name} 从项目中移除吗？`} confirmLabel="移除" variant="destructive" onConfirm={() => handleRemoveMember(a.id)}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={(e) => e.preventDefault()} aria-label="移除 Agent">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmDialog>
                  )}
                </div>
                {(a.modelInfo || a.deviceInfo) && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    {a.modelInfo && <p>模型: {a.modelInfo}</p>}
                    {a.deviceInfo && <p className="truncate" title={a.deviceInfo}>设备: {a.deviceInfo}</p>}
                  </div>
                )}
                {a.lastIP && <div className="mt-1 text-xs text-muted-foreground"><p>IP: {a.lastIP}</p></div>}
                {a.capabilities && a.capabilities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.capabilities.map((cap) => <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={agentOpen} onOpenChange={setAgentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>新建 Agent</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateAgent} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称 <span className="text-destructive">*</span></label>
              <Input value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="Agent 名称" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <Select value={newAgentKind} onValueChange={setNewAgentKind}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="human">人类</SelectItem>
                  <SelectItem value="hybrid">混合</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色</label>
              <Select value={newAgentRole} onValueChange={setNewAgentRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">成员</SelectItem>
                  <SelectItem value="owner">拥有者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">AI 模型</label>
              <Input value={newAgentModel} onChange={e => setNewAgentModel(e.target.value)} placeholder="例如: GPT-4o, Claude 3.5 Sonnet" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">设备信息</label>
              <Input value={newAgentDevice} onChange={e => setNewAgentDevice(e.target.value)} placeholder="例如: Linux / Chrome 120" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAgentOpen(false)}>取消</Button>
              <Button type="submit" disabled={agentCreating}>{agentCreating ? "创建中..." : "创建并加入项目"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdToken} onOpenChange={(o) => { if (!o) setCreatedToken(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Agent 创建成功</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-200">
              请立即保存此 Token，关闭后将不再显示。
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono break-all select-all">{createdToken}</code>
              <Button size="icon" variant="outline" onClick={async () => { try { await navigator.clipboard?.writeText(createdToken || ""); } catch {} setTokenCopied(true); setTimeout(() => setTokenCopied(false), 2000); }}>
                {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="border-t pt-4">
              <div className="text-xs text-muted-foreground mb-2">Dolphin MCP 配置</div>
              <div className="relative">
                <pre className="rounded-md border bg-muted px-3 py-2.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all select-all leading-relaxed">
{`servers:
  morning-glory:
    type: http-stream
    url: ${url}
    headers:
      Authorization: Bearer ${createdToken}`}
                </pre>
                <Button size="icon" variant="outline" className="absolute top-2 right-2 h-7 w-7"
                  onClick={async () => { try { await navigator.clipboard?.writeText(`servers:\n  morning-glory:\n    type: http-stream\n    url: ${url}\n    headers:\n      Authorization: Bearer ${createdToken}`); } catch {} setCmdCopied(true); setTimeout(() => setCmdCopied(false), 2000); }}>
                  {cmdCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">将配置添加到你的 MCP 客户端配置文件中</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCreatedToken(null)}>关闭</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
