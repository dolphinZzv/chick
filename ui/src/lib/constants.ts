// ─── Issue 状态 ──────────────────────────────────────────
export const issueStateLabels: Record<string, string> = {
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

export const issueStateColors: Record<string, string> = {
  open: "border-l-blue-500",
  in_progress: "border-l-amber-500",
  blocked: "border-l-red-500",
  review: "border-l-purple-500",
  pending_confirmation: "border-l-orange-500",
  later: "border-l-gray-400",
  reopen: "border-l-teal-500",
  closed_completed: "border-l-gray-300",
  closed_not_planned: "border-l-gray-300",
  closed_rejected: "border-l-gray-300",
};

export const issueStateBadgeColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  review: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  pending_confirmation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  later: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  reopen: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  closed_completed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  closed_not_planned: "bg-gray-50 text-gray-400 dark:bg-gray-900 dark:text-gray-500",
  closed_rejected: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

// ─── Proposal 状态 ───────────────────────────────────────
export const proposalStateLabels: Record<string, string> = {
  draft: "草稿",
  submitted: "已提交",
  under_review: "评审中",
  approved: "已通过",
  rejected: "已驳回",
  in_execution: "执行中",
  completed: "已完成",
  cancelled: "已取消",
};

export const proposalColumns = [
  { state: "draft", label: "草稿" },
  { state: "submitted", label: "已提交" },
  { state: "under_review", label: "评审中" },
  { state: "approved", label: "已通过" },
  { state: "in_execution", label: "执行中" },
  { state: "completed", label: "已完成" },
  { state: "rejected", label: "已驳回" },
  { state: "cancelled", label: "已取消" },
] as const;

// ─── Task 状态 ───────────────────────────────────────────
export const taskStateLabels: Record<string, string> = {
  pending: "待处理",
  in_progress: "进行中",
  completed: "已完成",
  blocked: "阻塞",
  cancelled: "已取消",
};

// ─── 通用 ────────────────────────────────────────────────
export const priorityLabels: Record<string, string> = {
  critical: "关键",
  high: "高",
  medium: "中",
  low: "低",
};

export const issuePriorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

export const proposalPriorityDotColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-gray-400",
};

// ─── Timeline 事件 ───────────────────────────────────────
export const eventTypeLabels: Record<string, string> = {
  issue_created: "创建 Issue",
  issue_updated: "更新 Issue",
  issue_transitioned: "状态变更",
  assignee_added: "分配",
  assignee_removed: "移除分配",
  comment_added: "评论",
  label_added: "添加标签",
  label_removed: "移除标签",
};

export const eventIcons: Record<string, string> = {
  issue_created: "●",
  issue_updated: "↻",
  issue_transitioned: "→",
  assignee_added: "+",
  assignee_removed: "−",
  comment_added: "◆",
  label_added: "#",
  label_removed: "✕",
};
