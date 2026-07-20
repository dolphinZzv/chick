import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { gql } from "@/lib/graphql";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollGradient } from "./ScrollGradient";
import { DraggableIssue, SimpleIssueCard, type Issue, type Label, type Milestone } from "./IssueBoard";

const PAGE_SIZE = 20;

const stateLabels: Record<string, string> = {
  open: "待处理",
  in_progress: "进行中",
  blocked: "阻塞",
  review: "审查",
  pending_confirmation: "待确认",
  later: "稍后处理",
  closed_completed: "已完成",
  closed_not_planned: "已关闭",
  closed_rejected: "已拒绝",
  reopen: "重新打开",
};

interface ColumnDef {
  state: string;
  label: string;
}

interface ColumnData {
  issues: Issue[];
  offset: number;
  total: number;
  loading: boolean;
}

interface KanbanBoardProps {
  projectId: string;
  columns: ColumnDef[];
  isDesktop: boolean;
  filters: {
    search: string;
    priority: string;
    labelIDs: string[];
    assigneeID: string;
    milestoneID: string;
  };
  onTransition: (issueId: string, toState: string, note?: string) => Promise<void>;
  projectLabels: Label[];
  projectMilestones: Milestone[];
  onAddLabel: (issueId: string, labelId: string) => Promise<void>;
  onRemoveLabel: (issueId: string, labelId: string) => Promise<void>;
  onChangeMilestone: (issueId: string, milestoneId: string) => Promise<void>;
  onCreateLabel: (name: string, color: string) => Promise<Label | null>;
  onCreateMilestone: (title: string) => Promise<Milestone | null>;
  validTransitions: Record<string, string[]>;
  refreshKey?: number;
  refreshColumnStates?: string[];
}

function KanbanColumn({
  column,
  projectId,
  filters,
  isDesktop,
  onTransition,
  projectLabels,
  projectMilestones,
  onAddLabel,
  onRemoveLabel,
  onChangeMilestone,
  onCreateLabel,
  onCreateMilestone,
  validTransitions,
  refreshKey,
  onOptimisticMove,
}: {
  column: ColumnDef;
  projectId: string;
  filters: KanbanBoardProps["filters"];
  isDesktop: boolean;
  onTransition: KanbanBoardProps["onTransition"];
  projectLabels: Label[];
  projectMilestones: Milestone[];
  onAddLabel: KanbanBoardProps["onAddLabel"];
  onRemoveLabel: KanbanBoardProps["onRemoveLabel"];
  onChangeMilestone: KanbanBoardProps["onChangeMilestone"];
  onCreateLabel: KanbanBoardProps["onCreateLabel"];
  onCreateMilestone: KanbanBoardProps["onCreateMilestone"];
  validTransitions: Record<string, string[]>;
  refreshKey: number;
  onOptimisticMove: (fromState: string, toState: string) => void;
}) {
  const [data, setData] = useState<ColumnData>({
    issues: [],
    offset: 0,
    total: 0,
    loading: true,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchIssues = useCallback(
    async (reset: boolean) => {
      const vars: Record<string, unknown> = {
        projectId,
        state: column.state,
        limit: PAGE_SIZE,
        offset: reset ? 0 : data.offset,
      };
      if (filters.search) vars.search = filters.search;
      if (filters.priority !== "all") vars.priority = filters.priority;
      if (filters.labelIDs.length > 0) vars.labelIDs = filters.labelIDs;
      if (filters.assigneeID !== "all") vars.assigneeID = filters.assigneeID;

      if (reset) setData((d) => ({ ...d, loading: true }));

      const json = await gql(
        `query columnIssues($projectId: ID!, $state: IssueState!, $search: String, $priority: Priority, $labelIDs: [ID!], $assigneeID: ID, $limit: Int, $offset: Int) {
          issues(projectID: $projectId, state: $state, search: $search, priority: $priority, labelIDs: $labelIDs, assigneeID: $assigneeID, limit: $limit, offset: $offset) {
            edges { id number title state priority startedAt completedAt links assignees { agent { id name } } labels { id name color } milestone { id title } }
            total
          }
        }`,
        vars
      );

      const newIssues: Issue[] = json.data?.issues.edges || [];
      const total: number = json.data?.issues.total || 0;
      const newOffset = (reset ? 0 : data.offset) + newIssues.length;

      const result: ColumnData = {
        issues: reset ? newIssues : [...data.issues, ...newIssues],
        offset: newOffset,
        total,
        loading: false,
      };
      setData(result);
    },
    [projectId, column.state, filters.search, filters.priority, filters.labelIDs, filters.assigneeID, data.offset, data.issues]
  );

  useEffect(() => {
    fetchIssues(true);
  }, [filters.search, filters.priority, filters.labelIDs, filters.assigneeID]);

  useEffect(() => {
    if (refreshKey > 0) fetchIssues(true);
  }, [refreshKey]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollEl = scrollRef.current;
    if (!sentinel || !scrollEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && data.offset < data.total && !loadingMore && !data.loading) {
          fetchIssues(false);
        }
      },
      { root: scrollEl, rootMargin: "100px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [data.offset, data.total, loadingMore, data.loading, fetchIssues]);

  const filteredIssues = data.issues.filter((issue) => {
    if (filters.milestoneID !== "all") {
      if (!issue.milestone || issue.milestone.id !== filters.milestoneID) return false;
    }
    return true;
  });

  const virtualizer = useVirtualizer({
    count: filteredIssues.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  const { setNodeRef, isOver } = useDroppable({
    id: column.state,
    data: { column },
  });

  const columnHeader = (
    <h2 className="flex items-center gap-2 text-sm font-medium px-1">
      <span className="text-muted-foreground">{column.label}</span>
      <Badge variant="secondary" className="text-xs">
        {filteredIssues.length}
        {data.total > filteredIssues.length && (
          <span className="text-muted-foreground"> / {data.total}</span>
        )}
      </Badge>
    </h2>
  );

  if (isDesktop) {
    return (
      <div
        ref={setNodeRef}
        className={`min-w-[260px] w-72 shrink-0 flex flex-col rounded-lg transition-colors ${
          isOver ? "bg-accent/50 ring-2 ring-primary/30" : ""
        }`}
      >
        <div className="space-y-2 rounded-lg p-2">{columnHeader}</div>
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto max-h-[calc(100vh-300px)] rounded-lg"
        >
          {data.loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">无</p>
          ) : (
            <div
              className="relative w-full"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((vItem) => (
                <div
                  key={vItem.key}
                  className="absolute top-0 left-0 w-full p-1"
                  style={{
                    height: vItem.size,
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  <DraggableIssue issue={filteredIssues[vItem.index]} />
                </div>
              ))}
              <div ref={sentinelRef} className="h-1" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[300px] w-[85vw] snap-start shrink-0">
      <div className="space-y-2 rounded-lg p-2">{columnHeader}</div>
      <div
        ref={scrollRef}
        className="overflow-auto max-h-[calc(100vh-300px)] rounded-lg"
      >
        {data.loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredIssues.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">无</p>
        ) : (
          <div className="space-y-2 p-2">
            {filteredIssues.map((issue) => (
              <SimpleIssueCard
                key={issue.id}
                issue={issue}
                onTransition={onTransition}
                projectLabels={projectLabels}
                projectMilestones={projectMilestones}
                onAddLabel={onAddLabel}
                onRemoveLabel={onRemoveLabel}
                onChangeMilestone={onChangeMilestone}
                onCreateLabel={onCreateLabel}
                onCreateMilestone={onCreateMilestone}
                validTransitions={validTransitions}
              />
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="h-1" />
      </div>
    </div>
  );
}

export function KanbanBoard({
  projectId,
  columns,
  isDesktop,
  filters,
  onTransition,
  projectLabels,
  projectMilestones,
  onAddLabel,
  onRemoveLabel,
  onChangeMilestone,
  onCreateLabel,
  onCreateMilestone,
  validTransitions,
  refreshKey = 0,
  refreshColumnStates,
}: KanbanBoardProps) {
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [closedIssues, setClosedIssues] = useState<Issue[]>([]);
  const [closedOffset, setClosedOffset] = useState(0);
  const [closedTotal, setClosedTotal] = useState(0);
  const [closedLoading, setClosedLoading] = useState(true);
  const [closedLoadingMore, setClosedLoadingMore] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const boardScrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const effectiveRefreshKey = refreshKey + localRefreshKey;

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { issue: Issue } | undefined;
    if (data) setActiveIssue(data.issue);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { issue: Issue } | undefined;
    if (!activeData) return;
    const overData = over.data.current as { column: ColumnDef } | undefined;
    if (!overData) return;

    const fromState = activeData.issue.state;
    const toState = overData.column.state;
    if (fromState === toState) return;

    const note = window.prompt(`请输入拖拽到「${overData.column.label}」的备注说明（可选）：`);
    if (note === null) return;

    try {
      await onTransition(activeData.issue.id, toState, note);
    } catch {
      // Error handled by onTransition
    }
  };

  const handleOptimisticMove = useCallback((_from: string, _to: string) => {
    setLocalRefreshKey((k) => k + 1);
  }, []);

  // Fetch closed issues
  useEffect(() => {
    const fetchClosed = async () => {
      setClosedLoading(true);
      const vars: Record<string, unknown> = {
        projectId,
        states: ["closed_completed", "closed_not_planned", "closed_rejected"],
        limit: 50,
        offset: 0,
      };
      if (filters.search) vars.search = filters.search;
      if (filters.priority !== "all") vars.priority = filters.priority;
      if (filters.labelIDs.length > 0) vars.labelIDs = filters.labelIDs;
      if (filters.assigneeID !== "all") vars.assigneeID = filters.assigneeID;

      const json = await gql(
        `query closedIssues($projectId: ID!, $states: [IssueState!]!, $search: String, $priority: Priority, $labelIDs: [ID!], $assigneeID: ID, $limit: Int, $offset: Int) {
          issues(projectID: $projectId, states: $states, search: $search, priority: $priority, labelIDs: $labelIDs, assigneeID: $assigneeID, limit: $limit, offset: $offset) {
            edges { id number title state priority startedAt completedAt links assignees { agent { id name } } labels { id name color } milestone { id title } }
            total
          }
        }`,
        vars
      );

      setClosedIssues(json.data?.issues.edges || []);
      setClosedOffset((json.data?.issues.edges || []).length);
      setClosedTotal(json.data?.issues.total || 0);
      setClosedLoading(false);
    };
    fetchClosed();
  }, [projectId, filters.search, filters.priority, filters.labelIDs, filters.assigneeID, effectiveRefreshKey]);

  const handleLoadMoreClosed = async () => {
    setClosedLoadingMore(true);
    const vars: Record<string, unknown> = {
      projectId,
      states: ["closed_completed", "closed_not_planned", "closed_rejected"],
      limit: 50,
      offset: closedOffset,
    };
    if (filters.search) vars.search = filters.search;
    if (filters.priority !== "all") vars.priority = filters.priority;
    if (filters.labelIDs.length > 0) vars.labelIDs = filters.labelIDs;
    if (filters.assigneeID !== "all") vars.assigneeID = filters.assigneeID;

    const json = await gql(
      `query closedIssues($projectId: ID!, $states: [IssueState!]!, $search: String, $priority: Priority, $labelIDs: [ID!], $assigneeID: ID, $limit: Int, $offset: Int) {
        issues(projectID: $projectId, states: $states, search: $search, priority: $priority, labelIDs: $labelIDs, assigneeID: $assigneeID, limit: $limit, offset: $offset) {
          edges { id number title state priority startedAt completedAt links assignees { agent { id name } } labels { id name color } milestone { id title } }
          total
        }
      }`,
      vars
    );

    const newIssues: Issue[] = json.data?.issues.edges || [];
    setClosedIssues((prev) => [...prev, ...newIssues]);
    setClosedOffset((prev) => prev + newIssues.length);
    setClosedLoadingMore(false);
  };

  const filteredClosed = closedIssues.filter((issue) => {
    if (filters.milestoneID !== "all") {
      if (!issue.milestone || issue.milestone.id !== filters.milestoneID) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollGradient scrollRef={boardScrollRef}>
          <div
            ref={boardScrollRef}
            className={
              isDesktop
                ? "flex gap-3 overflow-x-auto pb-2 scrollbar-none"
                : "flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
            }
          >
          {columns.map((col) => (
            <KanbanColumn
              key={col.state}
              column={col}
              projectId={projectId}
              filters={filters}
              isDesktop={isDesktop}
              onTransition={onTransition}
              projectLabels={projectLabels}
              projectMilestones={projectMilestones}
              onAddLabel={onAddLabel}
              onRemoveLabel={onRemoveLabel}
              onChangeMilestone={onChangeMilestone}
              onCreateLabel={onCreateLabel}
              onCreateMilestone={onCreateMilestone}
              validTransitions={validTransitions}
              refreshKey={effectiveRefreshKey}
              onOptimisticMove={handleOptimisticMove}
            />
          ))}
          </div>
        </ScrollGradient>
        <DragOverlay>
          {activeIssue ? (
            <div
              className={`rounded-lg border bg-card p-3 border-l-2 ${
                activeIssue.state === "open" ? "border-l-gray-500" : "border-l-border"
              }`}
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>#{activeIssue.id}</span>
                <Badge className="text-xs">
                  {activeIssue.priority}
                </Badge>
              </div>
              <p className="mt-1 text-sm line-clamp-2">{activeIssue.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Closed issues */}
      {closedLoading ? (
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : filteredClosed.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            已关闭 ({filteredClosed.length}
            {closedTotal > filteredClosed.length ? ` / ${closedTotal}` : ""})
          </summary>
          <div className="mt-1 space-y-0.5">
            {filteredClosed.map((issue) => (
              <Link
                key={issue.id}
                to={`/issues/${issue.id}`}
                className="block rounded px-2 py-0.5 text-sm hover:bg-accent"
              >
                <span className="text-muted-foreground line-through">
                  #{issue.id}
                </span>{" "}
                <span className="text-muted-foreground line-through">
                  {issue.title}
                </span>
              </Link>
            ))}
            {closedOffset < closedTotal && (
              <button
                onClick={handleLoadMoreClosed}
                disabled={closedLoadingMore}
                className="w-full rounded border px-3 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                {closedLoadingMore ? "加载中..." : "加载更多"}
              </button>
            )}
          </div>
        </details>
      ) : null}
    </div>
  );
}
