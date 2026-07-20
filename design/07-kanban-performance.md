# Issue 看板性能优化

## 问题

当前看板一次性拉取项目所有 issue 并全部渲染为 DOM 节点，无分页、无虚拟滚动。

| 问题 | 严重度 | 位置 |
|---|---|---|
| 前端一次拉取全部 issue，无分页 | 🔴 | `ProjectDetailPage.tsx:120-125` |
| 所有 issue 全部渲染为真实 DOM 节点，无虚拟滚动 | 🔴 | `IssueBoard.tsx:447-449` |
| 每次 render 对所有 column 做 `.filter()` 分组 | 🟡 | `IssueBoard.tsx:594-597` |
| Tab 切回时全量 refetch | 🟡 | `ProjectDetailPage.tsx:161-167` |

## 现状分析

- 看板有 7 列（open / in_progress / blocked / review / pending_confirmation / later / reopen），每列对应一个 state
- 已关闭 issues 以扁平列表展示在 `<details>` 折叠区，不参与看板列
- 后端 GraphQL 已支持 `state` / `limit` / `offset` 参数，但前端从未传入
- `IssueFilter.State` 是 `[]IssueState`（支持多 state），但 GraphQL schema 只暴露了单个 `state` 参数

## 方案

### 1. 后端：GraphQL 支持多 state 筛选

为 `issues` query 新增 `states: [IssueState!]` 参数，与现有 `state` 并存（优先用 `states`）。

用于已关闭 issues 的批量查询（closed_completed / closed_not_planned / closed_rejected）。

**变更**：
- `internal/graphql/query.graphqls` — 新增 `states` 参数
- `internal/graphql/query.resolvers.go` — 处理 `states` 参数，转换为 `filter.State`
- `go run github.com/99designs/gqlgen generate` — 重新生成

### 2. 前端：每列独立分页加载

每个看板列独立发 GraphQL query，使用 `state` + `limit: 20` + `offset`。进入看板时只拉每列前 20 条，底部"加载更多"按钮递增加载。

**变更**：新建 `ui/src/components/project/KanbanBoard.tsx`

```
KanbanBoard
├── KanbanColumn × 7      ← 每列独立 fetch + 虚拟滚动
│   ├── useVirtualizer    ← @tanstack/react-virtual
│   ├── IssueCard × N     ← 只渲染可视区域
│   └── Load More 按钮
└── ClosedSection         ← 扁平列表，独立 fetch，Load More
```

每列独立维护：`issues[]`、`offset`、`total`、`loading`。筛选变化时重置 offset 为 0 重新拉取。

### 3. 前端：虚拟滚动

安装 `@tanstack/react-virtual`，每列用 `useVirtualizer`：
- 列容器固定高度 `max-h-[calc(100vh-280px)]` + `overflow-auto`
- 卡片预估高度 ~120px
- `overscan: 5`（多渲染 5 个）
- 拖拽兼容：`@dnd-kit` 的 `DragOverlay` 渲染拖拽副本，原卡片可安全卸载

### 4. 前端：ProjectDetailPage 简化

- 移除一次性拉全部 issue 的 query
- 移除 `issues` state 和 `activeIssues` / `closed` 计算
- 传 `projectId` + `filters` 给 `KanbanBoard`，由它自行管理数据
- 保留 project / labels / milestones / proposals / validTransitions 查询
- milestone 过滤：`KanbanBoard` 在每列 fetch 结果上做客户端 `.filter()`（每列最多 20 条，开销忽略不计）

## 文件变更

| 文件 | 操作 | 说明 |
|---|---|---|
| `internal/graphql/query.graphqls` | 修改 | `issues` 新增 `states: [IssueState!]` |
| `internal/graphql/query.resolvers.go` | 修改 | 处理 `states` 参数 |
| `ui/package.json` | 修改 | 添加 `@tanstack/react-virtual` |
| `ui/src/components/project/KanbanBoard.tsx` | **新建** | 看板主组件（分列分页 + 虚拟滚动） |
| `ui/src/pages/ProjectDetailPage.tsx` | 修改 | 移除全量 issue 查询，使用 `KanbanBoard` |
| `ui/src/components/project/IssueBoard.tsx` | **保留** | `DraggableIssue`、`SimpleIssueCard` 等卡片组件 |

## 不变

- 拖拽交互（`@dnd-kit`）
- 移动端适配（`SimpleIssueCard`）
- 卡片样式和功能
- Labels / Milestones / Assignees 的 CRUD 操作
