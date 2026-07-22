import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { gql } from "@/lib/graphql";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { issueStateLabels, issueStateBadgeColors, issuePriorityColors } from "@/lib/constants";
import type { Issue, Label, Milestone } from "./IssueBoard";

const PAGE_SIZE = 20;

interface IssueListViewProps {
  projectId: string;
  filters: {
    search: string;
    state: string[];
    priority: string;
    labelIDs: string[];
    assigneeID: string;
    milestoneID: string;
  };
  refreshKey: number;
}

export function IssueListView({ projectId, filters, refreshKey }: IssueListViewProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchIssues = useCallback(async (newOffset: number) => {
    setLoading(true);
    const vars: Record<string, unknown> = {
      projectId,
      limit: PAGE_SIZE,
      offset: newOffset,
    };
    if (filters.search) vars.search = filters.search;
    if (filters.state.length > 0) vars.states = filters.state;
    if (filters.priority !== "all") vars.priority = filters.priority;
    if (filters.labelIDs.length > 0) vars.labelIDs = filters.labelIDs;
    if (filters.assigneeID !== "all") vars.assigneeID = filters.assigneeID;

    const json = await gql(
      `query listIssues($projectId: ID!, $states: [IssueState!], $search: String, $priority: Priority, $labelIDs: [ID!], $assigneeID: ID, $limit: Int, $offset: Int) {
        issues(projectID: $projectId, states: $states, search: $search, priority: $priority, labelIDs: $labelIDs, assigneeID: $assigneeID, limit: $limit, offset: $offset) {
          edges { id number title state priority startedAt completedAt links assignees { agent { id name } } labels { id name color } milestone { id title } }
          total
        }
      }`,
      vars
    );
    setIssues(json.data?.issues.edges || []);
    setTotal(json.data?.issues.total || 0);
    setLoading(false);
  }, [projectId, filters]);

  useEffect(() => {
    setOffset(0);
    fetchIssues(0);
  }, [filters.search, filters.state, filters.priority, filters.labelIDs, filters.assigneeID, filters.milestoneID, refreshKey]);

  const goToPage = (newOffset: number) => {
    setOffset(newOffset);
    fetchIssues(newOffset);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <p className="text-sm">暂无 Issue</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <div className="divide-y">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              to={`/issues/${issue.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors"
            >
              <span className="text-xs text-muted-foreground w-12 shrink-0">#{issue.number}</span>
              <span className="flex-1 text-sm truncate min-w-0">{issue.title}</span>
              <Badge className={`text-xs shrink-0 ${issueStateBadgeColors[issue.state] || ""}`}>
                {issueStateLabels[issue.state] || issue.state}
              </Badge>
              {issue.priority && (
                <span className={`text-xs shrink-0 ${issuePriorityColors[issue.priority] || "text-muted-foreground"}`}>
                  {issue.priority}
                </span>
              )}
              {issue.assignees && issue.assignees.length > 0 && (
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                  {issue.assignees.map((a) => a.agent.name).join(", ")}
                </span>
              )}
              {issue.milestone && (
                <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">
                  {issue.milestone.title}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => goToPage(offset - PAGE_SIZE)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => goToPage(offset + PAGE_SIZE)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
