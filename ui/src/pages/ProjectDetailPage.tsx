import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { gql } from "@/lib/graphql";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CreateIssueDialog } from "@/components/project/CreateIssueDialog";
import { KanbanBoard } from "@/components/project/KanbanBoard";
import { ProposalBoard } from "@/components/project/ProposalBoard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ErrorFallback } from "@/components/shared/ErrorFallback";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { priorityLabels as sharedPriorityLabels } from "@/lib/constants";

interface Label {
  id: string;
  name: string;
  color: string | null;
}

interface Milestone {
  id: string;
  title: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
}

const columns = [
  { state: "open", label: "待处理" },
  { state: "in_progress", label: "进行中" },
  { state: "blocked", label: "阻塞" },
  { state: "review", label: "审查" },
  { state: "pending_confirmation", label: "待确认" },
  { state: "later", label: "稍后处理" },
  { state: "reopen", label: "重新打开" },
];

const priorityLabels = sharedPriorityLabels;

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { agent } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [searchParams, setSearchParams] = useSearchParams();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [milestoneFilter, setMilestoneFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [projectLabels, setProjectLabels] = useState<Label[]>([]);
  const [projectMilestones, setProjectMilestones] = useState<Milestone[]>([]);
  const [projectAgents, setProjectAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [validTransitions, setValidTransitions] = useState<Record<string, string[]>>({});
  const activeTab = (searchParams.get("tab") === "proposals" ? "proposals" : "issues") as "issues" | "proposals";
  const setActiveTab = (tab: "issues" | "proposals") => setSearchParams({ tab });
  const [proposals, setProposals] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [transitionConfirm, setTransitionConfirm] = useState<{ open: boolean; issueId: string; toState: string; label: string }>({ open: false, issueId: "", toState: "", label: "" });
  const [removeLabelConfirm, setRemoveLabelConfirm] = useState<{ open: boolean; issueId: string; labelId: string }>({ open: false, issueId: "", labelId: "" });

  // Debounce search input before sending to backend
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      gql(`query project($id: ID!) { project(id: $id) { id name description } }`, { id }),
      gql(`query labels($projectId: ID!) { labels(projectID: $projectId) { id name color } }`, { projectId: id }),
      gql(`query milestones($projectId: ID!) { milestones(projectID: $projectId) { id title } }`, { projectId: id }),
      gql(`query agents($projectID: ID!) { agents(projectID: $projectID) { id name } }`, { projectID: id }),
      gql(
        `query proposals($projectId: ID!) { proposals(projectID: $projectId) { edges { id number title state priority author { id name } reviewer { id name } tasks { id number title state priority assignee { id name } } } } }`,
        { projectId: id }
      ),
      ...columns.map((c) =>
        gql(`query validTransitions($state: IssueState!) { validTransitions(state: $state) }`, { state: c.state })
      ),
    ])
      .then((results) => {
        const pJson = results[0]; const lJson = results[1]; const mJson = results[2];
        const aJson = results[3]; const propJson = results[4];
        const transitionResults = results.slice(5) as Array<{ data?: { validTransitions: string[] }; errors?: any }>;
        if (pJson.errors) { setError(pJson.errors[0].message); return; }
        setProject(pJson.data.project);
        if (!lJson.errors) setProjectLabels(lJson.data.labels);
        if (!mJson.errors) setProjectMilestones(mJson.data.milestones);
        if (!aJson.errors) setProjectAgents(aJson.data.agents);
        if (!propJson.errors) setProposals(propJson.data.proposals.edges);
        const vt: Record<string, string[]> = {};
        transitionResults.forEach((r, i) => {
          if (r.data?.validTransitions) vt[columns[i].state] = r.data.validTransitions;
        });
        setValidTransitions(vt);
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    document.title = project ? `${project.name} - Morning Glory` : "Morning Glory";
  }, [project]);

  // Auto-refresh when tab becomes visible (covers background updates)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchData();
        setRefreshKey((k) => k + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const handleTransition = async (issueId: string, toState: string, note?: string) => {
    const targetLabel = columns.find((c) => c.state === toState)?.label || toState;
    setTransitionConfirm({ open: true, issueId, toState, label: targetLabel });
  };

  const confirmTransition = async () => {
    const { issueId, toState } = transitionConfirm;
    setTransitionConfirm({ open: false, issueId: "", toState: "", label: "" });
    const json = await gql(
      `mutation transitionIssue($id: ID!, $newState: IssueState!, $actorId: ID!, $note: String) {
        transitionIssue(id: $id, newState: $newState, actorID: $actorId, note: $note) { state }
      }`,
      { id: issueId, newState: toState, actorId: agent?.agentId || "", note: null }
    );
    if (json.errors) {
      toast.error(json.errors[0].message);
      throw new Error(json.errors[0].message);
    }
    toast.success("状态变更成功");
    triggerRefresh();
  };

  const handleAddLabel = async (issueId: string, labelId: string) => {
    const json = await gql(
      `mutation addLabels($issueID: ID!, $labelIDs: [ID!]!) { addLabels(issueID: $issueID, labelIDs: $labelIDs) { id labels { id name color } } }`,
      { issueID: issueId, labelIDs: [labelId] }
    );
    if (!json.errors) {
      toast.success("标签已添加");
      triggerRefresh();
    } else {
      toast.error(json.errors[0].message);
    }
  };

  const handleRemoveLabel = async (issueId: string, labelId: string) => {
    setRemoveLabelConfirm({ open: true, issueId, labelId });
  };

  const confirmRemoveLabel = async () => {
    const { issueId, labelId } = removeLabelConfirm;
    setRemoveLabelConfirm({ open: false, issueId: "", labelId: "" });
    const json = await gql(
      `mutation removeLabels($issueID: ID!, $labelIDs: [ID!]!) { removeLabels(issueID: $issueID, labelIDs: $labelIDs) { id labels { id name color } } }`,
      { issueID: issueId, labelIDs: [labelId] }
    );
    if (!json.errors) {
      toast.success("标签已移除");
      triggerRefresh();
    } else {
      toast.error(json.errors[0].message);
    }
  };

  const handleChangeMilestone = async (issueId: string, milestoneId: string) => {
    const json = await gql(
      `mutation updateIssue($id: ID!, $milestoneId: ID) { updateIssue(id: $id, milestoneId: $milestoneId) { id milestone { id title } } }`,
      { id: issueId, milestoneId: milestoneId || null }
    );
    if (!json.errors) {
      toast.success("里程碑已更新");
      triggerRefresh();
    } else {
      toast.error(json.errors[0].message);
    }
  };

  const handleCreateMilestone = async (title: string) => {
    const json = await gql(
      `mutation createMilestone($projectID: ID!, $title: String!) { createMilestone(projectID: $projectID, title: $title) { id title } }`,
      { projectID: id!, title }
    );
    if (!json.errors) {
      setProjectMilestones((prev) => [...prev, json.data.createMilestone]);
      toast.success("里程碑已创建");
      return json.data.createMilestone;
    }
    toast.error(json.errors[0].message);
    return null;
  };

  const handleCreateLabel = async (name: string, color: string) => {
    const json = await gql(
      `mutation createLabel($projectID: ID!, $name: String!, $color: String) { createLabel(projectID: $projectID, name: $name, color: $color) { id name color } }`,
      { projectID: id!, name, color }
    );
    if (!json.errors) {
      setProjectLabels((prev) => [...prev, json.data.createLabel]);
      toast.success("标签已创建");
      return json.data.createLabel;
    }
    toast.error(json.errors[0].message);
    return null;
  };

  const filters = {
    search: debouncedSearch,
    priority: priorityFilter,
    labelIDs: labelFilter,
    assigneeID: assigneeFilter,
    milestoneID: milestoneFilter,
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-3 lg:grid-cols-4">
        {columns.map((c) => (
          <div key={c.state} className="space-y-2">
            <Skeleton className="h-6 w-20" />
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return <ErrorFallback message={error} onRetry={fetchData} />;
  if (!project) return <EmptyState title="项目不存在" />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold">{project.name}</h1>
          {project.description && <DescriptionBlock text={project.description} />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/projects/${id}/settings`}>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">设置</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <button
          className={`text-sm font-medium ${activeTab === "issues" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("issues")}
        >
          Issue
        </button>
        <button
          className={`text-sm font-medium ${activeTab === "proposals" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("proposals")}
        >
          提案
        </button>
      </div>

      {activeTab === "issues" && (
        <>
      <div className="flex flex-wrap items-center gap-2">
        {agent && (
          <CreateIssueDialog
            projectId={id!}
            onCreated={() => { fetchData(); triggerRefresh(); }}
          />
        )}
        <Input
          placeholder="搜索 Issue..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 w-full sm:w-48"
        />
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部优先级</SelectItem>
            {Object.entries(priorityLabels).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Label filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              标签{labelFilter.length > 0 ? ` (${labelFilter.length})` : ""}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="space-y-1">
              {projectLabels.length === 0 && <p className="text-xs text-muted-foreground">暂无标签</p>}
              {projectLabels.map((l) => (
                <label key={l.id} className="flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-accent cursor-pointer">
                  <Checkbox
                    checked={labelFilter.includes(l.id)}
                    onCheckedChange={(checked) => {
                      setLabelFilter(checked ? [...labelFilter, l.id] : labelFilter.filter((id) => id !== l.id));
                    }}
                  />
                  <span className="truncate" style={{ color: l.color || undefined }}>{l.name}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Milestone filter */}
        <Select value={milestoneFilter} onValueChange={setMilestoneFilter}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue placeholder="里程碑" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部里程碑</SelectItem>
            {projectMilestones.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee filter */}
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="指派对象" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部成员</SelectItem>
            {projectAgents.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <KanbanBoard
        projectId={id!}
        columns={columns}
        isDesktop={isDesktop}
        filters={filters}
        refreshKey={refreshKey}
        onTransition={handleTransition}
        projectLabels={projectLabels}
        projectMilestones={projectMilestones}
        onAddLabel={handleAddLabel}
        onRemoveLabel={handleRemoveLabel}
        onChangeMilestone={handleChangeMilestone}
        onCreateLabel={handleCreateLabel}
        onCreateMilestone={handleCreateMilestone}
        validTransitions={validTransitions}
      />
        </>
      )}

      {activeTab === "proposals" && (
        <ProposalBoard projectId={id!} proposals={proposals} onRefresh={fetchData} />
      )}

      <ConfirmDialog
        open={transitionConfirm.open}
        onOpenChange={(open) => setTransitionConfirm((prev) => ({ ...prev, open }))}
        title={`确认将该 Issue 状态变更为「${transitionConfirm.label}」？`}
        confirmLabel="确认"
        onConfirm={confirmTransition}
      />

      <ConfirmDialog
        open={removeLabelConfirm.open}
        onOpenChange={(open) => setRemoveLabelConfirm((prev) => ({ ...prev, open }))}
        title="确认从该 Issue 中移除该标签？"
        confirmLabel="移除"
        variant="destructive"
        onConfirm={confirmRemoveLabel}
      />
    </div>
  );
}

function DescriptionBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 150;
  return (
    <div>
      <p className="mt-1 text-sm text-muted-foreground">
        {long && !expanded ? text.slice(0, 150) + "…" : text}
      </p>
      {long && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground/60 hover:text-muted-foreground"
        >
          {expanded ? <>收起 <ChevronUp className="h-3 w-3" /></> : <>更多 <ChevronDown className="h-3 w-3" /></>}
        </button>
      )}
    </div>
  );
}
