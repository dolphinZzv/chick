# Feature: Issue 多链接支持

## 状态: 进行中

## 需求

Issue 目前的 `link` 字段仅支持单个链接。需要改为支持多个链接，每条链接可单独添加/删除。

## 影响范围

- 影响 Issue → Comment 核心协作链路？**间接相关**（Issue 元数据展示）
- 走完整流程：**否**（跳过步骤 3-4 详细设计，直接实现）

## 方案

### 1. 数据模型

- `models.Issue.Link` 保持 `*string` 类型，存储格式改为 JSON 数组字符串
- 向后兼容：读取时如果值不是合法 JSON 数组，自动包装为单元素数组
- repository/service 层不需要改动（Link 字段原样存储）

### 2. GraphQL Schema

- `Issue` 类型的 `link: String` → `links: [String!]`
- `createIssue` 和 `updateIssue` mutation 的 `link: String` → `links: [String!]`
- resolver 中做格式转换：写入时 array→JSON string，读取时 JSON string→array
- 删除旧的 `link` 查询字段（或保留为 deprecated 过渡）

### 3. 前端

- IssueDetailPage: 链接区域改为列表形式
  - 显示所有链接（每条可点击打开、可删除）
  - 「+ 添加链接」按钮，输入新链接后回车或点击确认添加
  - 空状态显示「+ 添加链接」
- CreateIssueDialog: 高级选项中的 link 改为 links（支持多行输入或动态添加）
- IssueBoard: SimpleIssueCard 上显示链接图标（如有多链接）

### 4. MCP handlers

- `createIssue`/`updateIssue` handler 中 `StringParam("link")` → `ArrayParam("links")`
- 存储时 JSON marshal 为字符串

## 文件修改清单

```
internal/
  graphql/
    issue.graphqls          # link → links
    mutation.graphqls        # link → links
    issue.generated.go      # 自动生成
    mutation.generated.go   # 自动生成
    models_gen.go           # Link → Links ([]string)
    mutation.resolvers.go   # 转换逻辑
    query.generated.go      # 自动生成
    subscription.generated.go # 自动生成
  models/
    issue.go                # Link *string → 不变（存储层不变）
  mcp/
    handlers.go             # link param → links array

ui/src/
  pages/
    IssueDetailPage.tsx     # 多链接 UI
    CreateIssueDialog.tsx   # 多链接输入
  components/
    project/
      IssueBoard.tsx        # 卡片显示链接数
```

## 测试计划

- `go build ./...` 编译通过
- 前端 `npx tsc --noEmit` 通过（不含已有错误）
- 手动验证：Issue 详情页可添加/删除多个链接
