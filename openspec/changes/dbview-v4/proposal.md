## Why

DBView v3.0 已具备数据浏览、查询、结构查看和基本的列/索引编辑能力，但缺少完整的表管理流程和 SQL 文件操作。用户无法在侧边栏新建数据库/表，无法快速查看 DDL，导航栏 Tab 标题也未完全国际化。补全这些基础能力可以消除日常使用中的痛点。

## What Changes

### 1. 基础功能优化
- **新增表（Create Table）**：在 StructurePage 中新增"新建表"入口，通过对话框定义列和索引，生成并执行 CREATE TABLE DDL
- **修改表（Alter Table）**：支持修改表名和表注释（当前仅支持列/索引的增删改）
- **SQL 导出**：支持将数据库/表的结构（DDL）+ 数据导出为 .sql 文件
- **SQL 导入**：支持从 .sql 文件导入执行多语句 SQL 脚本

### 2. 侧边栏右键菜单扩展
- **连接节点 → 新建数据库**：弹出输入框，执行 CREATE DATABASE
- **数据库节点 → 新增表**：打开 Create Table 对话框
- **表节点 → 查看 DDL**：在 SQL 编辑器 Tab 中打开该表的 DDL

### 3. 应用菜单中文化
- 当前项目使用 Electron 默认英文菜单（File/Edit/View/Window/Help），无自定义菜单
- 新建自定义应用菜单，支持中英文切换
- 菜单项：文件（新建连接/退出）、编辑（撤销/重做/剪切/复制/粘贴/全选）、视图（重新加载/开发者工具/缩放）、帮助（关于）

## Capabilities

### New Capabilities
- `table-management`: 新增表、修改表名/注释的完整流程
- `sql-import-export`: SQL 文件的导入和导出
- `sidebar-context-menu`: 侧边栏右键菜单扩展（新建数据库、新增表、查看 DDL）
- `app-menu`: 自定义应用菜单栏，支持中英文切换

### Modified Capabilities
<!-- 无现有 spec，全部为新增 -->

## Impact

- `src/main/db/db-driver.ts` — 接口新增 `createDatabase()` 方法
- `src/main/db/` 四种驱动 — 实现 `createDatabase()`
- `src/main/ipc/database.ipc.ts` — 新增 IPC 通道
- `src/renderer/components/database-tree/DatabaseTree.tsx` — 扩展 `getContextMenu()`
- `src/renderer/components/structure/SchemaEditor.tsx` — 新增 CreateTableDialog
- `src/renderer/utils/ddl-generator.ts` — 新增 `generateCreateTableDDL()`
- `src/renderer/locales/` — 新增翻译键
- `src/main/menu.ts` — 新建应用菜单定义模块
- `src/main/index.ts` — 注册自定义菜单
- `src/main/ipc/menu.ipc.ts` — 新增语言切换 IPC 通道
- `src/preload/types.ts` — 新增 API 类型