## Context

DBView 当前架构为三层 IPC 模式：Renderer (React 19 + Zustand + Ant Design 5) → Preload Bridge → Main Process (Node.js + 原生数据库驱动)。v0.2.0 的改动全部在现有组件层和驱动层内完成，不涉及架构层面的调整。

v0.1.0 遗留的主要技术债务：

1. **快速迭代导致的代码重复**：ConnectionPage 和 DatabaseTree 的两套 CRUD
2. **MySQL 中心主义**：SchemaEditor 类型列表、DDLViewer 方言等
3. **编辑体验断层**：DataTable 分页切换丢失编辑、SqlEditor 重建丢失内容
4. **工程基线缺失**：零测试、无打包配置

## Goals / Non-Goals

**Goals:**
- 修复全部 7 项 P1 功能缺陷
- 修复 4 项核心 P2 技术债务（日志持久化、打包、SSH 隧道、测试覆盖）
- 所有改动零架构侵入

**Non-Goals:**
- 数据库对比/同步功能（v0.3.0）
- 可视化查询构建器（v0.3.0）
- 数据库备份/恢复
- 多 Tab 同时编辑同一张表
- 性能优化（当前无性能瓶颈报告）

## Decisions

### 1. DataTable 分页编辑保护 — 确认对话框

**决策**：编辑模式下切换分页/排序时弹出确认对话框

- 用户在编辑模式下点击分页/排序 → 检查 `pendingChanges.size > 0`
- 有未保存更改 → 弹出 Modal："有 N 项未保存的更改，切换将丢弃这些更改"
- 提供"保存并继续"、"丢弃并继续"、"取消"三个选项
- 无未保存更改 → 直接切换

**备选方案**：
- 禁用分页切换 → 用户体验不佳，卡住操作
- 自动保存 → 未经确认的自动写入有数据安全风险

### 2. 列类型按 DB 类型动态切换

**决策**：`COLUMN_TYPES` 改为 `Record<DbType, string[]>` 映射表

```typescript
const COLUMN_TYPES_BY_DB: Record<DbType, string[]> = {
  mysql: ['INT', 'BIGINT', 'VARCHAR', 'TEXT', 'DATETIME', ...],
  postgresql: ['INTEGER', 'BIGINT', 'VARCHAR', 'TEXT', 'TIMESTAMP', 'JSONB', ...],
  oracle: ['NUMBER', 'VARCHAR2', 'CLOB', 'DATE', 'BLOB', ...],
  sqlite: ['INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC']
}
```

ColumnDialog 根据传入的 `dbType` prop 从映射表中选择对应列表。

### 3. DDLViewer 方言适配 — 新增 dbType prop

**决策**：DDLViewer 新增 `dbType` prop，根据类型选择 CodeMirror SQL 方言

- MySQL → `sql({ dialect: MySQL })`
- PostgreSQL → `sql({ dialect: PostgreSQL })`
- SQLite/Oracle → `sql({ dialect: MySQL })`（保留，因 @codemirror/lang-sql 仅内置两种方言）
- 未来可通过自定义 `SQLConfig` 扩展 SQLite/Oracle 关键字

### 4. ConnectionPage 废弃

**决策**：移除 ConnectionPage.tsx，所有连接管理统一由 DatabaseTree 提供

- DatabaseTree 已有完整的连接 CRUD（右键菜单 + 顶部工具栏按钮）
- 删除 `ConnectionPage.tsx` 文件
- 检查 `MainLayout.tsx` 和路由引用，移除相关导入
- 树中右键菜单增加"编辑连接"快捷入口（已有）

### 5. SqlEditor 重建保护 — 保存并恢复文档内容

**决策**：EditorView destroy 前保存 `doc.toString()`，重建时恢复

```typescript
// destroy 前
const currentDoc = viewRef.current.state.doc.toString()
viewRef.current.destroy()

// 重建时
new EditorView({
  doc: currentDoc, // 恢复内容
  ...
})
```

### 6. SSH 隧道 — ConnectionManager 层集成

**决策**：在 ConnectionManager 中使用 `ssh2` 建立本地端口转发

- ConnectionConfig 新增可选 SSH 配置字段
- 连接时先建立 SSH 隧道（本地随机端口 → 远程数据库端口）
- 数据库连接池指向本地隧道端口
- 断开时关闭隧道

```
Renderer → ConnectionManager → SSH Tunnel (ssh2) → Remote DB
                                     ↓
                            Local port forwarding
```

### 7. 测试策略 — vitest + mock 驱动

**决策**：使用 vitest 作为测试框架，mock 数据库驱动层

- **单元测试**：测试 DDL 生成逻辑（SchemaEditor.generateDDL）、DML 生成逻辑（DataTable 的 UPDATE/INSERT/DELETE）、导出格式化（CSV/JSON/SQL）
- **集成测试**：mock DatabaseDriver 接口，测试 ConnectionManager 和 IPC 处理器的编排逻辑
- **不覆盖**：E2E（Electron 环境复杂，留到 v0.3.0）

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| SSH 隧道 (ssh2) 增加原生编译复杂度 | ssh2 为纯 JS，无需原生编译；但私有密钥解析需注意格式兼容 |
| 移除 ConnectionPage 可能遗漏功能 | 逐一比对两套 CRUD 的差异，确保 DatabaseTree 覆盖所有场景 |
| 测试引入初期可能发现隐藏 bug | 预期内，修复发现的 bug 也是 v0.2.0 的目标之一 |
| SqlEditor 重建保护可能引入内存泄漏 | 确保 useEffect cleanup 正确销毁旧 EditorView |
