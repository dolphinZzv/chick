import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { gql } from "@/lib/graphql";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { Plus, Trash2, Copy, Check, Settings, Workflow, Bot, Tag, Milestone, Bell, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Label {
  id: string;
  name: string;
  color: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  state: string;
  dueDate: string | null;
}

interface MemberAgent {
  id: string;
  number: number;
  name: string;
  kind: string;
  status: string;
  capabilities: string[];
  deviceInfo?: string;
  modelInfo?: string;
  lastIP?: string;
  externalID: string;
}

interface Member {
  agent: MemberAgent;
  role: string;
}

const statusConfig: Record<string, { label: string; dot: string }> = {
  online: { label: "在线", dot: "bg-green-500" },
  busy: { label: "忙碌", dot: "bg-amber-500" },
  offline: { label: "离线", dot: "bg-gray-400" },
  error: { label: "错误", dot: "bg-red-500" },
};

const kindLabels: Record<string, string> = {
  ai: "AI",
  human: "人类",
  hybrid: "混合",
};

const PRESET_COLORS = ["#0366d6", "#28a745", "#d73a49", "#ffd33d", "#6f42c1", "#e4e669", "#f97583", "#888"];

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") || "basic") as "basic" | "workflow" | "agents" | "labels" | "milestones" | "notifications";
  const setTab = (t: typeof tab) => setSearchParams({ tab: t });
  const [labels, setLabels] = useState<Label[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [allowCreatorTransition, setAllowCreatorTransition] = useState(true);
  const [requireCreatorCloseApproval, setRequireCreatorCloseApproval] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // create label
  const [labelOpen, setLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#0366d6");
  const [labelCreating, setLabelCreating] = useState(false);

  // create milestone
  const [msOpen, setMsOpen] = useState(false);
  const [newMsTitle, setNewMsTitle] = useState("");
  const [newMsDesc, setNewMsDesc] = useState("");
  const [newMsDue, setNewMsDue] = useState("");
  const [msCreating, setMsCreating] = useState(false);

  // confirmation dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLabelTarget, setDeleteLabelTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteMsTarget, setDeleteMsTarget] = useState<{ id: string; name: string } | null>(null);

  // create agent
  const [agentOpen, setAgentOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentKind, setNewAgentKind] = useState("ai");
  const [newAgentRole, setNewAgentRole] = useState("member");
  const [newAgentModel, setNewAgentModel] = useState("");
  const [newAgentDevice, setNewAgentDevice] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);

  const [agentCreating, setAgentCreating] = useState(false);

  const fetchData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      gql(
        `query labels($projectId: ID!) { labels(projectID: $projectId) { id name color } }`,
        { projectId: id }
      ),
      gql(
        `query milestones($projectId: ID!) { milestones(projectID: $projectId) { id title description state dueDate } }`,
        { projectId: id }
      ),
      gql(
        `query project($id: ID!) {
          project(id: $id) {
            name description
            allowCreatorTransition
            requireCreatorCloseApproval
members { agent { id number name kind status capabilities deviceInfo modelInfo lastIP externalID } role }
          }
        }`,
        { id }
      ),
    ])
      .then(([lJson, mJson, pJson]) => {
        if (lJson.errors) { setError(lJson.errors[0].message); return; }
        if (mJson.errors) { setError(mJson.errors[0].message); return; }
        if (pJson.errors) { setError(pJson.errors[0].message); return; }
        setLabels(lJson.data.labels);
        setMilestones(mJson.data.milestones);
        setMembers(pJson.data.project.members || []);
        setProjectName(pJson.data.project.name || "");
        setProjectDesc(pJson.data.project.description || "");
        setAllowCreatorTransition(pJson.data.project.allowCreatorTransition ?? true);
        setRequireCreatorCloseApproval(pJson.data.project.requireCreatorCloseApproval ?? false);
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRemoveMember = async (agentId: string) => {
    if (!id) return;
    try {
      const json = await gql(
        `mutation removeProjectMember($pid: ID!, $aid: ID!) {
          removeProjectMember(projectID: $pid, agentID: $aid)
        }`,
        { pid: id, aid: agentId }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      toast.success("成员已移除");
      fetchData();
    } catch {
      toast.error("网络错误");
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newLabelName.trim()) return;
    setLabelCreating(true);
    try {
      const json = await gql(
        `mutation createLabel($pid: ID!, $name: String!, $color: String) {
          createLabel(projectID: $pid, name: $name, color: $color) { id name color }
        }`,
        { pid: id, name: newLabelName, color: newLabelColor || null }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      toast.success("标签已创建");
      setLabelOpen(false);
      setNewLabelName("");
      setNewLabelColor("#0366d6");
      fetchData();
    } catch {
      toast.error("网络错误");
    } finally {
      setLabelCreating(false);
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    try {
      const json = await gql(
        `mutation deleteLabel($id: ID!) { deleteLabel(id: $id) }`,
        { id: labelId }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      toast.success("标签已删除");
      fetchData();
    } catch {
      toast.error("网络错误");
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMsTitle.trim()) return;
    setMsCreating(true);
    try {
      const json = await gql(
        `mutation createMilestone($pid: ID!, $title: String!, $desc: String, $due: Time) {
          createMilestone(projectID: $pid, title: $title, description: $desc, dueDate: $due) { id title state }
        }`,
        {
          pid: id,
          title: newMsTitle,
          desc: newMsDesc || null,
          due: newMsDue ? new Date(newMsDue).toISOString() : null,
        }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      toast.success("里程碑已创建");
      setMsOpen(false);
      setNewMsTitle("");
      setNewMsDesc("");
      setNewMsDue("");
      fetchData();
    } catch {
      toast.error("网络错误");
    } finally {
      setMsCreating(false);
    }
  };

  const handleDeleteMilestone = async (msId: string) => {
    try {
      const json = await gql(
        `mutation deleteMilestone($id: ID!) { deleteMilestone(id: $id) }`,
        { id: msId }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      toast.success("里程碑已删除");
      fetchData();
    } catch {
      toast.error("网络错误");
    }
  };

  const handleDeleteProject = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const json = await gql(
        `mutation deleteProject($id: ID!) { deleteProject(id: $id) }`,
        { id }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      toast.success("项目已删除");
      navigate("/projects", { replace: true });
    } catch {
      toast.error("网络错误");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveProject = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const json = await gql(
        `mutation updateProject($id: ID!, $name: String!, $desc: String) {
          updateProject(id: $id, name: $name, description: $desc) { id name description }
        }`,
        { id, name: projectName, desc: projectDesc || null }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      toast.success("项目已更新");
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkflowConfig = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const json = await gql(
        `mutation updateProjectConfig($id: ID!, $allowCreatorTransition: Boolean, $requireCreatorCloseApproval: Boolean) {
          updateProjectConfig(id: $id, allowCreatorTransition: $allowCreatorTransition, requireCreatorCloseApproval: $requireCreatorCloseApproval) { id }
        }`,
        { id, allowCreatorTransition, requireCreatorCloseApproval }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      toast.success("工作流配置已更新");
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newAgentName.trim()) return;
    setAgentCreating(true);
    try {
            const json = await gql(
        `mutation createProjectAgent($pid: ID!, $name: String!, $kind: AgentKind!, $role: ProjectRole, $device: String, $model: String) {
          createProjectAgent(projectID: $pid, name: $name, kind: $kind, role: $role, deviceInfo: $device, modelInfo: $model) { agent { id name } token }
        }`,
        {
          pid: id,
          name: newAgentName,
          kind: newAgentKind,
          role: newAgentRole,
          device: newAgentDevice || null,
          model: newAgentModel || null,
        }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }

      const token = json.data?.createProjectAgent?.token;
      if (token) setCreatedToken(token);
      setAgentOpen(false);
      setNewAgentName("");
      setNewAgentKind("ai");
      setNewAgentRole("member");
      setNewAgentModel("");
      setNewAgentDevice("");
      fetchData();
    } catch {
      toast.error("网络错误");
    } finally {
      setAgentCreating(false);
    }
  };

  const tabs = [
    { key: "basic" as const, label: "基本", icon: Settings },
    { key: "workflow" as const, label: "工作流", icon: Workflow },
    { key: "agents" as const, label: "Agent", icon: Bot },
    { key: "labels" as const, label: "标签", icon: Tag },
    { key: "milestones" as const, label: "里程碑", icon: Milestone },
    { key: "notifications" as const, label: "通知", icon: Bell },
  ];

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-4">
      <Link to={`/projects/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← 返回项目
      </Link>
      <h1 className="text-2xl font-semibold">项目设置</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left sidebar navigation */}
        <nav className="w-full shrink-0 lg:w-48" aria-label="设置导航">
          <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-x-visible">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => setTab(t.key)}
                  aria-current={tab === t.key ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right content area */}
        <div className="flex-1 min-w-0">
      {tab === "basic" && (
        <div className="border bg-card rounded-lg divide-y">
          <div className="p-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">项目名称</label>
            <input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="项目名称"
              className="w-full rounded-md text-xl font-semibold placeholder:text-muted-foreground/40 bg-transparent border-none outline-none focus:ring-0"
            />
          </div>
          <div className="p-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">项目描述</label>
            <textarea
              value={projectDesc}
              onChange={e => setProjectDesc(e.target.value)}
              placeholder="项目的简要说明..."
              rows={3}
              className="w-full resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40 bg-transparent border-none outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center justify-end gap-2 px-4 py-3">
            <Button onClick={handleSaveProject} size="sm" disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      )}

      {/* Workflow config tab */}
      {tab === "workflow" && (
<div className="border bg-card p-4 rounded-lg space-y-4">
          <h2 className="text-base font-semibold">工作流配置</h2>
          <p className="text-sm text-muted-foreground">配置 Issue 的状态流转权限。</p>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">允许创建者自己流转</label>
              <p className="text-xs text-muted-foreground">启用后，Issue 创建者可以自行变更状态（需为项目拥有者/维护者或被指派人）</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={allowCreatorTransition}
                onChange={e => setAllowCreatorTransition(e.target.checked)}
              />
              <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">创建者审批后才能关闭</label>
              <p className="text-xs text-muted-foreground">启用后，只有 Issue 创建者才能关闭 Issue（转为已关闭状态）</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={requireCreatorCloseApproval}
                onChange={e => setRequireCreatorCloseApproval(e.target.checked)}
              />
              <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveWorkflowConfig} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
      )}

      {/* Agents tab */}
      {tab === "agents" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{members.length} 个 Agent</span>
            <Button size="sm" onClick={() => setAgentOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />新建 Agent
            </Button>
          </div>

          {members.length === 0 ? (
            <EmptyState title="暂无 Agent" description="创建 Agent 并加入项目" />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {members.map((m) => {
                const a = m.agent;
                const st = statusConfig[a.status] || statusConfig.offline;
                return (
                  <Link key={a.id} to={`/agents/${a.id}`} className="block border bg-card p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${st.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">#{a.number} {a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {kindLabels[a.kind] || a.kind} · {st.label}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {m.role === "owner" ? "拥有者" : m.role === "member" ? "成员" : m.role}
                      </Badge>
                      {m.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setRemoveMemberTarget({ id: a.id, name: `#${a.number} ${a.name}` });
                          }}
                          aria-label="移除 Agent"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {(a.modelInfo || a.deviceInfo) && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        {a.modelInfo && <p>模型: {a.modelInfo}</p>}
                        {a.deviceInfo && <p className="truncate" title={a.deviceInfo}>设备: {a.deviceInfo}</p>}
                      </div>
                    )}
                    {a.lastIP && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <p>IP: {a.lastIP}</p>
                      </div>
                    )}
                    {a.capabilities && a.capabilities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Create agent dialog */}
          <Dialog open={agentOpen} onOpenChange={setAgentOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>新建 Agent</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">名称 <span className="text-destructive">*</span></label>
                  <Input value={newAgentName} onChange={e => setNewAgentName(e.target.value)} placeholder="Agent 名称" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">类型 <span className="text-destructive">*</span></label>
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

          {/* Token display dialog */}
          <Dialog open={!!createdToken} onOpenChange={(o) => { if (!o) setCreatedToken(null); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Agent 创建成功</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-800 dark:text-amber-200">
                  请立即保存此 Token，关闭后将不再显示。
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono break-all select-all">
                    {createdToken}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={async () => {
                      try { await navigator.clipboard?.writeText(createdToken || ""); } catch {}
                      setTokenCopied(true);
                      setTimeout(() => setTokenCopied(false), 2000);
                    }}
                  >
                    {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {/* One-click install */}
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground mb-2">Dolphin MCP 配置</div>
                  <DolphinCmd createdToken={createdToken!} cmdCopied={cmdCopied} setCmdCopied={setCmdCopied} />
                  <p className="text-xs text-muted-foreground mt-1.5">将配置添加到你的 MCP 客户端配置文件中</p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setCreatedToken(null)}>关闭</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Labels tab */}
      {tab === "labels" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{labels.length} 个标签</span>
            <Button size="sm" onClick={() => setLabelOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />新建标签
            </Button>
          </div>

          {labels.length === 0 ? (
            <EmptyState title="暂无标签" description="创建标签来标记 Issue" />
          ) : (
            <div className="space-y-2">
              {labels.map((label) => (
                <div key={label.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                  <div
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: label.color || "#888" }}
                  />
                  <span className="text-sm flex-1">{label.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteLabelTarget({ id: label.id, name: label.name })}
                    aria-label="删除标签"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Create label dialog */}
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
                      <button
                        key={c}
                        type="button"
                        className={`h-7 w-7 rounded-full border-2 ${newLabelColor === c ? "border-foreground" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setNewLabelColor(c)}
                      />
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
      )}

      {/* Milestones tab */}
      {tab === "milestones" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{milestones.length} 个里程碑</span>
            <Button size="sm" onClick={() => setMsOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />新建里程碑
            </Button>
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
                      {ms.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{ms.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary">{ms.state === "open" ? "进行中" : ms.state}</Badge>
                        {ms.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            截止: {new Date(ms.dueDate).toLocaleDateString("zh-CN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteMsTarget({ id: ms.id, name: ms.title })}
                      aria-label="删除里程碑"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create milestone dialog */}
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
      )}

      {/* Danger Zone */}
      <div className="border border-destructive/30 bg-destructive/5 p-4 rounded-lg">
        <h2 className="text-base font-semibold text-destructive mb-3">危险区域</h2>
        <p className="text-sm text-muted-foreground mb-3">删除项目后不可恢复，所有 Issue、标签、里程碑和成员关系将被永久删除。</p>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} disabled={deleting}>
          {deleting ? "删除中..." : "删除项目"}
        </Button>
      </div>

      {/* Remove member confirmation */}
      <AlertDialog open={!!removeMemberTarget} onOpenChange={(o) => { if (!o) setRemoveMemberTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除 Agent？</AlertDialogTitle>
            <AlertDialogDescription>
              确定将 {removeMemberTarget?.name} 从项目中移除吗？此操作不会删除该 Agent 的账号。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (removeMemberTarget) handleRemoveMember(removeMemberTarget.id); setRemoveMemberTarget(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete label confirmation */}
      <AlertDialog open={!!deleteLabelTarget} onOpenChange={(o) => { if (!o) setDeleteLabelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签？</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除标签「{deleteLabelTarget?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteLabelTarget) handleDeleteLabel(deleteLabelTarget.id); setDeleteLabelTarget(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete milestone confirmation */}
      <AlertDialog open={!!deleteMsTarget} onOpenChange={(o) => { if (!o) setDeleteMsTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除里程碑？</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除里程碑「{deleteMsTarget?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteMsTarget) handleDeleteMilestone(deleteMsTarget.id); setDeleteMsTarget(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notifications tab */}
      {tab === "notifications" && (
        <ProjectNotificationsTab projectId={id!} members={members} />
      )}

      {/* Delete project confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销。项目中的所有 Issue、标签、里程碑和成员关系都将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─── Install command helper components ─── */

interface CmdProps {
  createdToken: string;
  cmdCopied: boolean;
  setCmdCopied: (v: boolean) => void;
}

function CopyBlock({ cmd, cmdCopied, setCmdCopied }: { cmd: string; cmdCopied: boolean; setCmdCopied: (v: boolean) => void }) {
  return (
    <div className="relative">
      <pre className="rounded-md border bg-muted px-3 py-2.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all select-all leading-relaxed">
        {cmd}
      </pre>
      <Button
        size="icon"
        variant="outline"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={async () => {
          try { await navigator.clipboard?.writeText(cmd); } catch {}
          setCmdCopied(true);
          setTimeout(() => setCmdCopied(false), 2000);
        }}
      >
        {cmdCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}



function DolphinCmd({ cmdCopied, setCmdCopied, createdToken }: CmdProps) {
  const url = `${window.location.origin}/mcp`;
  const config = `servers:
  chick:
    type: http-stream
    url: ${url}
    headers:
      Authorization: Bearer ${createdToken}`;
  return <CopyBlock cmd={config} cmdCopied={cmdCopied} setCmdCopied={setCmdCopied} />;
}

interface NotifTypeInfo {
  type: string;
  description: string;
}

interface NotifSetting {
  id: string;
  agentID: string;
  notificationType: string;
  enabled: boolean;
  channel: string;
}

function ProjectNotificationsTab({ members }: { projectId: string; members: Member[] }) {
  const [notifTypes, setNotifTypes] = useState<NotifTypeInfo[]>([]);
  const [notifSettings, setNotifSettings] = useState<NotifSetting[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [notifLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [notifUpdating, setNotifUpdating] = useState<string | null>(null);

  useEffect(() => {
    gql(`query { notificationTypes { type description } }`)
      .then(json => { if (!json.errors) setNotifTypes(json.data?.notificationTypes || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMember) { setNotifSettings([]); return; }
    setSettingsLoading(true);
    gql(
      `query notifSettings($aid: ID!) { notificationSettings(agentID: $aid) { id agentID notificationType enabled channel } }`,
      { aid: selectedMember }
    )
      .then(json => { if (!json.errors) setNotifSettings(json.data?.notificationSettings || []); })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, [selectedMember]);

  const handleToggle = useCallback(async (notifType: string, enabled: boolean) => {
    if (!selectedMember) return;
    setNotifUpdating(notifType);
    try {
      const json = await gql(
        `mutation updateNotifSetting($aid: ID!, $type: String!, $enabled: Boolean!) {
          updateNotificationSetting(agentID: $aid, notificationType: $type, enabled: $enabled) { id enabled }
        }`,
        { aid: selectedMember, type: notifType, enabled }
      );
      if (json.errors) { toast.error(json.errors[0].message); return; }
      setNotifSettings(prev => {
        const existing = prev.find(s => s.notificationType === notifType);
        if (existing) return prev.map(s => s.notificationType === notifType ? { ...s, enabled } : s);
        return [...prev, { id: "", agentID: selectedMember, notificationType: notifType, enabled, channel: "in_app" }];
      });
    } catch { toast.error("网络错误"); }
    finally { setNotifUpdating(null); }
  }, [selectedMember]);

  return (
    <div className="border bg-card p-4 rounded-lg space-y-4">
      <h2 className="text-base font-semibold">通知设置</h2>
      <p className="text-sm text-muted-foreground">选择项目成员，配置其通知偏好。未配置的类型默认开启。</p>

      {/* Member selector */}
      <div className="flex flex-wrap gap-2">
        {members.map(m => (
          <button
            key={m.agent.id}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              selectedMember === m.agent.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-accent"
            }`}
            onClick={() => setSelectedMember(m.agent.id)}
          >
            #{m.agent.number} {m.agent.name}
          </button>
        ))}
      </div>

      {!selectedMember ? (
        <p className="text-sm text-muted-foreground">请选择一个成员查看通知设置</p>
      ) : settingsLoading || notifTypes.length === 0 && notifLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : notifTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无通知类型</p>
      ) : (
        <div className="divide-y border">
          {notifTypes.map(nt => {
            const setting = notifSettings.find(s => s.notificationType === nt.type);
            const enabled = setting ? setting.enabled : true;
            const updating = notifUpdating === nt.type;
            return (
              <div key={nt.type} className="flex items-center justify-between gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{nt.description}</p>
                  <p className="text-xs text-muted-foreground font-mono">{nt.type}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={enabled}
                    disabled={!!updating}
                    onChange={() => handleToggle(nt.type, !enabled)}
                  />
                  <div className={`w-10 h-5 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all ${
                    updating
                      ? "bg-muted cursor-wait"
                      : "bg-muted peer-checked:bg-primary cursor-pointer"
                  } peer-checked:after:translate-x-5`} />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
