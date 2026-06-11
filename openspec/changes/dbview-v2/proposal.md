## Why

DBView v0.1.0（对应 openspec dbview-v1）实现了完整的 Navicat 风格数据库管理功能基线：四种数据库驱动、数据浏览编辑、SQL 编辑器、Schema 编辑、数据导出、暗色主题、国际化等。但经过一周密集开发和后续审计发现，项目中存在 **18 项已知问题**，包括 7 项 P1（重要功能缺陷）和 11 项 P2（体验优化/技术债务）。

v0.2.0 的目标是将项目从"功能完整"升级到"健壮可靠"，重点解决数据安全风险、多 DB 适配断层、编辑体验缺陷和工程质量短板。

## What Changes

### P1 — 重要功能缺陷修复

| 模块 | 问题 | 影响 |
|------|------|------|
| **DataTable** | 分页/排序/刷新时编辑状态丢失 | 编辑内容无提示直接丢失 |
| **SchemaEditor** | 列类型列表仅含 MySQL 类型 | 非 MySQL 用户可能选到不兼容类型 |
| **DDLViewer** | 语法高亮硬编码 MySQL 方言 | PG/Oracle DDL 高亮不准确 |
| **ConnectionStore** | getById 缺失 read_only 字段 | 复制连接丢失只读设置 |
| **QueryHistory** | 无分页，硬编码 limit=50 | 历史记录超 50 条不可见 |
| **SqlEditor** | 主题/方言切换时编辑器重建丢失内容 | 正在编辑的 SQL 被清空 |
| **ConnectionPage** | 与 DatabaseTree 连接管理功能重复 | 两套 CRUD 逻辑，维护成本翻倍 |

### P2 — 体验优化与技术债务

| 模块 | 问题 | 影响 |
|------|------|------|
| **SqlLog** | 日志仅存内存，重启丢失 | 无法回溯历史 SQL |
| **Build** | 无 electron-builder 打包配置 | 无法分发安装包 |
| **SSH** | 无 SSH 隧道支持 | 无法连接内网数据库 |
| **Test** | 零测试覆盖 | 回归风险极高 |
| **i18n** | 框架完整但组件未使用 | 切换语言无效 |
| **CodeMirror** | 仅 MySQL/PG 方言 | SQLite/Oracle 高亮不完整 |
| **Tree** | 刷新时 children 闪烁 | 体验不够流畅 |

## Capabilities

### New Capabilities
- `connection-readonly`: 修复 getById 缺失 read_only 字段
- `sql-log-persist`: SQL 日志持久化存储
- `build-package`: electron-builder 打包和自动更新
- `ssh-tunnel`: SSH 隧道连接支持
- `test-coverage`: 测试基础设施和核心功能测试

### Modified Capabilities
- `table-editor` (v1 → v2): 增加分页切换时的编辑保护
- `schema-editor` (v1 → v2): 列类型列表按数据库类型动态切换
- `ddl-viewer-dialect`: DDL 查看器根据 dbType 切换语法高亮
- `query-history-pagination`: 查询历史增加分页支持
- `sql-editor-rebuild`: CodeMirror 重建时保留编辑内容
- `connection-entry-unify`: 统一连接管理入口

## Impact

- **零架构变更**：所有改动在现有组件/驱动层内完成，不涉及 IPC 或进程模型变更
- **新增依赖**（P2-3 SSH）：`ssh2` 包用于 SSH 隧道
- **新增依赖**（P2-2 打包）：`electron-builder` 已安装，仅需配置
- **新增依赖**（P2-11 测试）：`vitest` 用于测试
- **代码删除**（P1-7）：`ConnectionPage.tsx` 及相关路由引用将被移除
