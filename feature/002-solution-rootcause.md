# Feature: Issue 解决方案 + 根因分析字段

## 状态: 已完成

## 需求

Issue 目前只有 `description` 描述问题，缺少记录**修复方法**和**根因分析**的字段。需要：

1. `solution` — 解决方案/修复方法（文本，支持 Markdown）
2. `rootCause` — 根因分析（文本，支持 Markdown）

## 影响范围

- 影响 Issue → Agent → Comment 核心协作链路？**影响**（Issue 模型新增字段）
- 走完整流程：**是**

## 方案

### 1. 数据模型

- `models.Issue.Solution *string gorm:"type:text"`
- `models.Issue.RootCause *string gorm:"type:text"`
- 均为可选字段，null 表示未填写

### 2. GraphQL Schema

- `Issue` 类型新增字段：
  - `solution: String`
  - `rootCause: String`
- `createIssue` mutation 新增可选参数：
  - `solution: String`
  - `rootCause: String`
- `updateIssue` mutation 新增可选参数：
  - `solution: String`
  - `rootCause: String`

### 3. Service 层

- `IssueCreateInput` / `IssueUpdateInput` 新增 `Solution *string` 和 `RootCause *string`
- Create/Update 中直接赋值

### 4. 前端

- Issue 详情页显示两个新字段（只读，Markdown 渲染）
- Issue 详情页 sidebar 或编辑区支持编辑
- CreateIssueDialog 高级选项中支持填写（可选）

### 5. MCP tools

- `createIssue` / `updateIssue` 工具新增 `solution` 和 `rootCause` 参数

## 文件修改清单

```
internal/
  models/issue.go                # 新增 Solution, RootCause 字段
  service/issue.go               # CreateInput/UpdateInput 新增字段
  graphql/
    issue.graphqls               # Issue 类型新增 solution, rootCause
    mutation.graphqls            # createIssue/updateIssue 新增参数
    convert.go                   # model→graphql 转换
    mutation.resolvers.go        # resolver 传参
    models_gen.go                # 自动生成
    mutation.generated.go        # 自动生成
    issue.generated.go           # 自动生成
  mcp/
    register.go                  # 注册新参数
    tool_create_issue.go         # 新增参数
    tool_update_issue.go         # 新增参数
ui/src/
  pages/IssueDetailPage.tsx      # 显示 + 编辑 solution/rootCause
  components/issue/
    IssueMetaSidebar.tsx         # 编辑区域
```

## 测试计划

- `go build ./...` 编译通过
- `go test ./internal/... -count=1` 全部通过
- `npx tsc --noEmit` 通过
- 手动验证：Issue 详情页可填写和展示 solution/rootCause
