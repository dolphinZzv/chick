import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { gql } from "@/lib/graphql";

interface Label {
  id: string;
  name: string;
  color: string | null;
}

interface Milestone {
  id: string;
  title: string;
  state: string;
}

interface IssueMetaSidebarProps {
  issueId: string;
  projectID: string;
  agentId: string | undefined;
  assignees: Array<{ id: string; agent: { id: string; name: string }; state: string }>;
  labels: Array<{ id: string; name: string; color: string | null }>;
  milestone: { id: string; title: string } | null;
  environment: string | null;
  branch: string | null;
  links: string[];
  commits: string[];
  startedAt: string | null;
  completedAt: string | null;
  projectLabels: Label[];
  projectMilestones: Milestone[];
  onIssueUpdate: (fields: Record<string, unknown>) => Promise<void>;
  onLabelsChange: (labels: Array<{ id: string; name: string; color: string | null }>) => void;
  onMilestoneChange: (milestone: { id: string; title: string } | null) => void;
  onAssigneesChange: (assignees: Array<{ id: string; agent: { id: string; name: string }; state: string }>) => void;
}

export function IssueMetaSidebar({
  issueId,
  projectID,
  agentId,
  assignees,
  labels,
  milestone,
  environment,
  branch,
  links,
  commits,
  startedAt,
  completedAt,
  projectLabels,
  projectMilestones,
  onIssueUpdate,
  onLabelsChange,
  onMilestoneChange,
  onAssigneesChange,
}: IssueMetaSidebarProps) {
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6366f1");
  const [projectAgents, setProjectAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [editingEnv, setEditingEnv] = useState(false);
  const [editEnv, setEditEnv] = useState("");
  const [editingBranch, setEditingBranch] = useState(false);
  const [editBranch, setEditBranch] = useState("");
  const [editingLinks, setEditingLinks] = useState(false);
  const [editLinks, setEditLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [editingCommits, setEditingCommits] = useState(false);
  const [editCommits, setEditCommits] = useState<string[]>([]);
  const [newCommit, setNewCommit] = useState("");
  const [showTimeFields, setShowTimeFields] = useState(false);
  const [editStartedAt, setEditStartedAt] = useState("");
  const [editCompletedAt, setEditCompletedAt] = useState("");

  const currentMilestoneId = milestone?.id || "";
  const availableLabels = projectLabels.filter(
    (pl) => !(labels || []).some((l) => l.id === pl.id)
  );

  const fetchAgents = async () => {
    if (projectAgents.length > 0) return;
    const json = await gql(
      `query agents($projectID: ID!) { agents(projectID: $projectID) { id name } }`,
      { projectID }
    );
    if (!json.errors) setProjectAgents(json.data.agents);
  };

  const handleAddAssignee = async (agentId: string) => {
    try {
      const json = await gql(
        `mutation addAssignee($issueID: ID!, $agentID: ID!) {
          addAssignee(issueID: $issueID, agentID: $agentID) { id agent { id name } state }
        }`,
        { issueID: issueId, agentID: agentId }
      );
      if (!json.errors) {
        onAssigneesChange([...assignees, json.data.addAssignee]);
        toast.success("已添加负责人");
      } else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleRemoveAssignee = async (agentId: string) => {
    try {
      const json = await gql(
        `mutation removeAssignee($issueID: ID!, $agentID: ID!) { removeAssignee(issueID: $issueID, agentID: $agentID) }`,
        { issueID: issueId, agentID: agentId }
      );
      if (!json.errors) {
        onAssigneesChange(assignees.filter((a) => a.agent.id !== agentId));
        toast.success("已移除负责人");
      } else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleAddLabel = async (labelId: string) => {
    try {
      const json = await gql(
        `mutation addLabels($issueID: ID!, $labelIDs: [ID!]!) { addLabels(issueID: $issueID, labelIDs: $labelIDs) { id labels { id name color } } }`,
        { issueID: issueId, labelIDs: [labelId] }
      );
      if (!json.errors) { onLabelsChange(json.data.addLabels.labels); toast.success("标签已添加"); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleRemoveLabel = async (labelId: string) => {
    try {
      const json = await gql(
        `mutation removeLabels($issueID: ID!, $labelIDs: [ID!]!) { removeLabels(issueID: $issueID, labelIDs: $labelIDs) { id labels { id name color } } }`,
        { issueID: issueId, labelIDs: [labelId] }
      );
      if (!json.errors) { onLabelsChange(json.data.removeLabels.labels); toast.success("标签已移除"); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleChangeMilestone = async (milestoneId: string) => {
    try {
      const json = await gql(
        `mutation updateIssue($id: ID!, $milestoneId: ID) { updateIssue(id: $id, milestoneId: $milestoneId) { id milestone { id title } } }`,
        { id: issueId, milestoneId: milestoneId || null }
      );
      if (!json.errors && json.data) { onMilestoneChange(json.data.updateIssue.milestone); toast.success("里程碑已更新"); }
      else { toast.error(json.errors?.[0]?.message || "更新失败"); }
    } catch { toast.error("网络错误"); }
  };

  const handleCreateMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    try {
      const json = await gql(
        `mutation createMilestone($projectID: ID!, $title: String!) { createMilestone(projectID: $projectID, title: $title) { id title state } }`,
        { projectID, title: newMilestoneTitle.trim() }
      );
      if (!json.errors) { setNewMilestoneTitle(""); setShowNewMilestone(false); toast.success("里程碑已创建"); }
      else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const json = await gql(
        `mutation createLabel($projectID: ID!, $name: String!, $color: String) { createLabel(projectID: $projectID, name: $name, color: $color) { id name color } }`,
        { projectID, name: newLabelName.trim(), color: newLabelColor || null }
      );
      if (!json.errors) {
        const label = json.data.createLabel;
        setNewLabelName(""); setShowNewLabel(false);
        await handleAddLabel(label.id);
        toast.success("标签已创建");
      } else { toast.error(json.errors[0].message); }
    } catch { toast.error("网络错误"); }
  };

  const handleSaveEnv = () => { onIssueUpdate({ environment: editEnv || null }); setEditingEnv(false); };
  const handleSaveBranch = () => { onIssueUpdate({ branch: editBranch || null }); setEditingBranch(false); };
  const handleSaveLinks = () => { const allLinks = newLink.trim() ? [...editLinks, newLink.trim()] : editLinks; onIssueUpdate({ links: allLinks }); setEditingLinks(false); };
  const handleSaveCommits = () => { const allCommits = newCommit.trim() ? [...editCommits, newCommit.trim()] : editCommits; onIssueUpdate({ commits: allCommits }); setEditingCommits(false); };
  const handleSaveTimeFields = () => { onIssueUpdate({ startedAt: editStartedAt || null, completedAt: editCompletedAt || null }); setShowTimeFields(false); };

  return (
    <div className="space-y-4">
      {/* Assignees */}
      <div className="border bg-card p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">负责人</span>
          {agentId && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs min-h-[44px]" aria-label="添加负责人" onClick={() => { setShowAssigneePicker(!showAssigneePicker); fetchAgents(); }}>
              <Plus className="h-3 w-3 mr-1" />添加
            </Button>
          )}
        </div>
        {(!assignees || assignees.length === 0) && !showAssigneePicker ? (
          <p className="text-sm text-muted-foreground">无</p>
        ) : (
          <div className="space-y-2">
            {assignees.map((a) => (
              <div key={a.id} className="flex items-center gap-2 group">
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">{a.agent.name.charAt(0)}</span>
                <span className="text-sm">{a.agent.name}</span>
                <Badge variant="outline" className="text-xs ml-auto">{a.state === "accepted" ? "已接受" : a.state === "declined" ? "已拒绝" : "待处理"}</Badge>
                {agentId && (
                  <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={`移除负责人 ${a.agent.name}`} onClick={() => handleRemoveAssignee(a.agent.id)}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {showAssigneePicker && (
          <div className="mt-2 pt-2 border-t space-y-1">
            {projectAgents.filter((ag) => !(assignees || []).some((a) => a.agent.id === ag.id)).length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无可用成员</p>
            ) : (
              projectAgents.filter((ag) => !(assignees || []).some((a) => a.agent.id === ag.id)).map((ag) => (
                <div key={ag.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-accent rounded px-1"
                  onClick={() => { handleAddAssignee(ag.id); setShowAssigneePicker(false); }}>
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-[9px] font-medium text-primary">{ag.name.charAt(0)}</span>
                  <span className="text-sm">{ag.name}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Milestone */}
      <div className="border bg-card p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">里程碑</span>
          {agentId && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs min-h-[44px]" aria-label="创建里程碑" onClick={() => setShowNewMilestone(!showNewMilestone)}>
              <Plus className="h-3 w-3 mr-1" />创建
            </Button>
          )}
        </div>
        {showNewMilestone ? (
          <div className="space-y-2">
            <Input value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)} placeholder="里程碑名称" className="h-8 text-sm" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateMilestone(); if (e.key === "Escape") setShowNewMilestone(false); }} />
            <div className="flex justify-end gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleCreateMilestone} disabled={!newMilestoneTitle.trim()}><Check className="h-3 w-3 mr-1" />创建</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowNewMilestone(false); setNewMilestoneTitle(""); }}>取消</Button>
            </div>
          </div>
        ) : projectMilestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">无</p>
        ) : (
          <Select value={currentMilestoneId || "_none"} onValueChange={(v) => handleChangeMilestone(v === "_none" ? "" : v)}>
            <SelectTrigger className="w-full"><SelectValue placeholder="不关联" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">不关联</SelectItem>
              {projectMilestones.map((m) => (<SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Labels */}
      <div className="border bg-card p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">标签</span>
          <div className="flex gap-1">
            {agentId && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs min-h-[44px]" aria-label="创建标签" onClick={() => setShowNewLabel(!showNewLabel)}>
                <Plus className="h-3 w-3 mr-1" />创建
              </Button>
            )}
            {availableLabels.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs min-h-[44px]" aria-label="添加标签" onClick={() => setShowLabelPicker(!showLabelPicker)}>
                <Plus className="h-3 w-3 mr-1" />添加
              </Button>
            )}
          </div>
        </div>
        {showNewLabel && (
          <div className="space-y-2 mb-2">
            <Input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="标签名称" className="h-8 text-sm" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleCreateLabel(); }} />
            <div className="flex items-center gap-2">
              <input type="color" value={newLabelColor} onChange={(e) => setNewLabelColor(e.target.value)} className="h-7 w-10 rounded-md border cursor-pointer" />
              <Button size="sm" className="h-7 text-xs" onClick={handleCreateLabel} disabled={!newLabelName.trim()}><Check className="h-3 w-3 mr-1" />创建</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowNewLabel(false); setNewLabelName(""); }}>取消</Button>
              <Badge className="text-xs ml-auto" style={{ backgroundColor: `${newLabelColor}20`, color: newLabelColor }}>{newLabelName || "预览"}</Badge>
            </div>
          </div>
        )}
        {(!labels || labels.length === 0) && !showLabelPicker ? (
          <p className="text-sm text-muted-foreground">无</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {labels.map((l) => (
              <Badge key={l.id} className="text-xs cursor-pointer hover:opacity-80" style={{ backgroundColor: l.color ? `${l.color}20` : undefined, color: l.color || undefined }}
                onClick={() => handleRemoveLabel(l.id)} title="点击移除">{l.name} ✕</Badge>
            ))}
          </div>
        )}
        {showLabelPicker && availableLabels.length > 0 && (
          <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
            {availableLabels.map((l) => (
              <Badge key={l.id} variant="outline" className="text-xs cursor-pointer hover:bg-accent" style={{ borderColor: l.color || undefined, color: l.color || undefined }}
                onClick={() => { handleAddLabel(l.id); setShowLabelPicker(false); }}>+ {l.name}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Environment */}
      <div className="border bg-card p-4 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">环境</div>
        {editingEnv ? (
          <div className="flex gap-1">
            <Input value={editEnv} onChange={(e) => setEditEnv(e.target.value)} className="h-7 text-xs flex-1" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveEnv(); if (e.key === "Escape") setEditingEnv(false); }} />
            <Button size="sm" className="h-7 text-xs" onClick={handleSaveEnv}>确定</Button>
          </div>
        ) : (
          <span className="text-sm cursor-pointer hover:text-primary" onClick={() => { setEditEnv(environment || ""); setEditingEnv(true); }}>
            {environment || <span className="text-muted-foreground">未设置</span>}
          </span>
        )}
      </div>

      {/* Branch */}
      <div className="border bg-card p-4 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">分支</div>
        {editingBranch ? (
          <div className="flex gap-1">
            <Input value={editBranch} onChange={(e) => setEditBranch(e.target.value)} className="h-7 text-xs flex-1" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveBranch(); if (e.key === "Escape") setEditingBranch(false); }} />
            <Button size="sm" className="h-7 text-xs" onClick={handleSaveBranch}>确定</Button>
          </div>
        ) : (
          <span className="text-sm cursor-pointer hover:text-primary" onClick={() => { setEditBranch(branch || ""); setEditingBranch(true); }}>
            {branch || <span className="text-muted-foreground">未设置</span>}
          </span>
        )}
      </div>

      {/* Links */}
      <div className="border bg-card p-4 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">链接</span>
          {!editingLinks && agentId && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs min-h-[44px]" aria-label={links.length > 0 ? "编辑链接" : "添加链接"} onClick={() => { setEditLinks([...links]); setEditingLinks(true); }}>
              <Plus className="h-3 w-3 mr-1" />{links.length > 0 ? "编辑" : "添加"}
            </Button>
          )}
        </div>
        {editingLinks ? (
          <div className="space-y-2">
            {editLinks.map((url, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <Input value={url} onChange={(e) => { const u = [...editLinks]; u[idx] = e.target.value; setEditLinks(u); }} className="h-7 text-xs flex-1" />
                <Button size="sm" variant="ghost" className="h-7 px-1 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setEditLinks(editLinks.filter((_, i) => i !== idx))}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <Input value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="https://..." className="h-7 text-xs flex-1" onKeyDown={(e) => { if (e.key === "Enter" && newLink.trim()) { setEditLinks([...editLinks, newLink.trim()]); setNewLink(""); } }} />
              <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => { if (newLink.trim()) { setEditLinks([...editLinks, newLink.trim()]); setNewLink(""); } }} disabled={!newLink.trim()}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="flex justify-end gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleSaveLinks}>确定</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingLinks(false)}>取消</Button>
            </div>
          </div>
        ) : links.length > 0 ? (
          <div className="space-y-1">
            {links.map((url, idx) => (
              <div key={idx} className="flex items-center gap-1 text-sm">
                <a href={url} target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary/80 truncate flex-1">{url}</a>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">未设置</span>
        )}
      </div>

      {/* Commits */}
      <div className="border bg-card p-4 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">提交</span>
          {!editingCommits && agentId && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs min-h-[44px]" aria-label={commits.length > 0 ? "编辑提交" : "添加提交"} onClick={() => { setEditCommits([...commits]); setEditingCommits(true); }}>
              <Plus className="h-3 w-3 mr-1" />{commits.length > 0 ? "编辑" : "添加"}
            </Button>
          )}
        </div>
        {editingCommits ? (
          <div className="space-y-2">
            {editCommits.map((hash, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <Input value={hash} onChange={(e) => { const u = [...editCommits]; u[idx] = e.target.value; setEditCommits(u); }} className="h-7 text-xs flex-1 font-mono" />
                <Button size="sm" variant="ghost" className="h-7 px-1 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setEditCommits(editCommits.filter((_, i) => i !== idx))}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <Input value={newCommit} onChange={(e) => setNewCommit(e.target.value)} placeholder="commit hash" className="h-7 text-xs flex-1 font-mono" onKeyDown={(e) => { if (e.key === "Enter" && newCommit.trim()) { setEditCommits([...editCommits, newCommit.trim()]); setNewCommit(""); } }} />
              <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => { if (newCommit.trim()) { setEditCommits([...editCommits, newCommit.trim()]); setNewCommit(""); } }} disabled={!newCommit.trim()}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="flex justify-end gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleSaveCommits}>确定</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingCommits(false)}>取消</Button>
            </div>
          </div>
        ) : commits.length > 0 ? (
          <div className="space-y-1">
            {commits.map((hash, idx) => (
              <div key={idx} className="flex items-center gap-1 text-sm font-mono">
                <span className="truncate flex-1">{hash}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">未设置</span>
        )}
      </div>

      {/* Edit Time */}
      <div className="border bg-card p-4 rounded-lg">
        <div className="text-sm font-medium mb-2">编辑时间</div>
        {showTimeFields ? (
          <div className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">开始时间</span>
              <Input type="datetime-local" value={editStartedAt ? new Date(editStartedAt).toISOString().slice(0, 16) : ""} onChange={(e) => setEditStartedAt(e.target.value ? new Date(e.target.value).toISOString() : "")} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">完成时间</span>
              <Input type="datetime-local" value={editCompletedAt ? new Date(editCompletedAt).toISOString().slice(0, 16) : ""} onChange={(e) => setEditCompletedAt(e.target.value ? new Date(e.target.value).toISOString() : "")} className="h-8 text-sm mt-1" />
            </div>
            <div className="flex justify-end gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleSaveTimeFields}>保存</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowTimeFields(false)}>取消</Button>
            </div>
          </div>
        ) : agentId ? (
          <button className="text-xs text-primary hover:underline w-full text-left" onClick={() => { setEditStartedAt(startedAt || ""); setEditCompletedAt(completedAt || ""); setShowTimeFields(true); }}>编辑时间</button>
        ) : (
          <div className="text-xs text-muted-foreground">
            {startedAt && <div>开始: {new Date(startedAt).toLocaleString()}</div>}
            {completedAt && <div>完成: {new Date(completedAt).toLocaleString()}</div>}
            {!startedAt && !completedAt && <span>未设置</span>}
          </div>
        )}
      </div>
    </div>
  );
}
