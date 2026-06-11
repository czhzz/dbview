## MODIFIED Requirements — query-history (v1 → v2)

### Background

v0.1.0 实现了查询历史持久化存储，但 `HistoryStore.list()` 的默认 limit=50，且 UI 层无分页加载机制。`DatabaseTree` 中查询文件夹始终只显示最近 50 条。`QueryHistory` 组件也未提供"加载更多"功能。

### Requirement: 查询历史分页加载

系统 SHALL 在查询历史面板中支持分页加载，允许用户查看更多历史记录。

#### Scenario: 查询历史面板默认加载
- **GIVEN** 用户打开查询历史面板
- **WHEN** 面板加载
- **THEN** 显示最近 50 条记录（默认 limit）
- **AND** 列表底部显示"共 X 条记录，已加载 50 条"

#### Scenario: 加载更多历史记录
- **GIVEN** 查询历史面板已显示 50 条记录，且总记录数 > 50
- **WHEN** 用户点击"加载更多"按钮
- **THEN** 加载后续 50 条记录并追加到列表
- **AND** "加载更多"按钮持续存在直到全部加载完毕

#### Scenario: 数据库树查询文件夹
- **GIVEN** 用户在侧边栏展开数据库的"查询"文件夹
- **WHEN** 文件夹加载
- **THEN** 显示最近 50 条记录
- **AND** 底部显示"查看更多..."链接，点击打开 QueryHistory 面板

### Technical Notes

- `HistoryStore.list()` 新增 `page` 参数（当前第几页），与现有 `limit` 配合使用
- 已有 `OFFSET` 概念，sql.js 支持 `LIMIT ? OFFSET ?` 语法
- `QueryHistory.tsx` 新增 `page` 状态和"加载更多"按钮
- `DatabaseTree.tsx:378` 调用保持不变，底部的"查看更多"通过 CustomEvent 触发 QueryHistory 面板
