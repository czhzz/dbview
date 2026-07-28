## Context

DBView v3.0 已完成数据浏览、查询、结构查看、列/索引编辑等核心功能。当前缺失的能力集中在"表级管理"和"SQL 文件操作"两个维度。本设计基于现有架构（Strategy Pattern 驱动、IPC 请求/响应、Ant Design UI），在最小侵入的前提下补全这些能力。

**关键约束：**
- 现有 4 种数据库驱动（MySQL/PG/SQLite/Oracle），新功能需全部适配
- IPC 通信为请求/响应模式，无推送
- 渲染进程使用 Zustand 管理状态，Ant Design 组件库
- DDL 生成器 `ddl-generator.ts` 已支持 4 种方言的列/索引 DDL 生成

## Goals / Non-Goals

**Goals:**
- 支持新建数据库（通过连接节点右键菜单）
- 支持新建表（通过数据库节点右键菜单 + StructurePage 入口）
- 支持修改表名和表注释
- 支持导出数据库/表结构+数据为 .sql 文件
- 支持导入 .sql 文件并执行
- 表节点右键菜单快速查看 DDL
- 应用菜单中文化（File/Edit/View/Help → 文件/编辑/视图/帮助）

**Non-Goals:**
- 不实现 GUI 可视化建表向导（如 ER 图拖拽建表）
- 不支持导出为其他格式（CSV/JSON 已有）
- 不实现 `DROP TABLE`/`DROP DATABASE`（安全考虑，暂不暴露）
- 不实现 mysqldump/pg_dump 等外部工具调用（纯 JS 实现）

## Decisions

### 1. createDatabase 架构

**决定：** 在 `DatabaseDriver` 接口新增 `createDatabase(name: string): Promise<void>` 方法，四种驱动各自实现。

**各驱动实现：**
| 驱动 | 实现方式 |
|------|---------|
| MySQL | `CREATE DATABASE \`name\` CHARACTER SET utf8mb4` |
| PostgreSQL | 连接到 `postgres` 默认库，执行 `CREATE DATABASE "name"` |
| SQLite | 在配置的目录下创建新的 `.sqlite` 文件（不建立连接） |
| Oracle | 跳过（Oracle 无 CREATE DATABASE 概念，需使用不同的 PDB/用户） |

**替代方案考虑：** 在 IPC 层用 `sql:execute` 直接执行 SQL，但这样无法处理 PostgreSQL 需要切换数据库的特殊逻辑，且不符合 Strategy Pattern。

### 2. Create Table 对话框

**决定：** 复用现有 `SchemaEditor.tsx` 中的 `ColumnDialog` + `IndexDialog` 模式，新增 `CreateTableDialog` 组件。

**流程：**
```
用户点击"新建表" → CreateTableDialog 弹出
  ├── 输入表名、表注释
  ├── 添加列（复用 ColumnDialog 的列定义表单）
  ├── 添加索引（复用 IndexDialog 的索引定义表单）
  └── 预览 DDL → 确认执行
```

**DDL 生成：** 新增 `generateCreateTableDDL()` 函数，按方言生成完整的 CREATE TABLE 语句（含列定义、主键、索引、注释）。

### 3. SQL 导出

**决定：** 在 main 进程新增 `ExportService`，分两步导出：
1. 收集 DDL：遍历表列表，调用 `driver.getDDL()` 获取所有表的 CREATE TABLE
2. 收集数据：遍历表列表，`SELECT * FROM table` 获取所有行，格式化为 INSERT 语句

**文件保存：** 复用现有 `dialog:showSaveDialog` + `file:write` 通道。

**风险：** 大表导出可能占用大量内存。→ 限制单次导出行数（默认 10000 行），超过时提示用户。

### 4. SQL 导入

**决定：** 在 main 进程 `ImportService` 扩展 `executeScript()` 方法。渲染进程读取文件内容，通过 IPC 发送到 main 进程执行。

**多语句拆分：** 使用简单的分号分割（按 `;` + 换行），不做完整 SQL 解析。对于含 `DELIMITER` 的存储过程/函数脚本，按 `DELIMITER` 指令调整分隔符。

**替代方案考虑：** 使用 node-sql-parser 做完整解析，但引入新依赖增加了复杂度。简单分号分割覆盖 90% 场景，够用。

### 5. 侧边栏右键菜单扩展

**决定：** 在现有的 `getContextMenu()` 函数中扩展三个新菜单项，不改变菜单架构。

```
connection 节点新增:
  └── New Database → Modal 输入框 → database:createDatabase IPC

database 节点新增:
  └── New Table → 打开 CreateTableDialog（预填 schema）

table 节点新增:
  └── View DDL → 调用 database:getDDL → 在 SQL Editor 中打开
```

### 6. 应用菜单中文化

**决定：** 新建 `src/main/menu.ts`，使用 `Menu.buildFromTemplate()` 创建自定义菜单，在 `app.whenReady()` 时注册。

**语言同步机制：**
```
渲染进程 i18n 切换语言
  → 通过 IPC 发送当前语言到 main 进程
  → main 进程重建菜单（Menu.buildFromTemplate + setApplicationMenu）
```

**菜单结构（中文环境）：**
```
文件          编辑          视图          帮助
├ 新建连接    ├ 撤销       ├ 重新加载     ├ 关于 DBView
├ ────────    ├ 重做       ├ 开发者工具   ├ 切换开发者工具
├ 退出        ├ ────────   ├ ────────
              ├ 剪切       ├ 放大
              ├ 复制       ├ 缩小
              ├ 粘贴       ├ 重置缩放
              ├ 全选
```

**实现方式：** 菜单模板定义为一个函数 `buildMenu(locale: 'zh' | 'en')`，返回 `MenuItemConstructorOptions[]`。每个菜单项使用 Electron 内置 `role`（如 `undo`, `redo`, `copy`, `paste`）以复用系统原生行为，仅自定义 `label`。

**Non-Goal：** 应用菜单不包含数据库特定操作（如导入/导出），这些操作放在侧边栏右键菜单中。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| SQL 导入多语句解析不完整（存储过程含分号） | 支持 DELIMITER 指令，存储过程体不按分号拆分 |
| 大表导出 OOM | 限制单次导出行数，超过时流式写入文件 |
| Oracle 不支持 CREATE DATABASE | 连接节点右键菜单中隐藏该项，或提示用户 Oracle 不支持 |
| SQLite 新建数据库需创建文件 | 通过 `dialog:showSaveDialog` 让用户选择文件路径 |
| PostgreSQL CREATE DATABASE 需断开当前连接 | 先连接到 `postgres` 库执行，再恢复原连接 |

## Open Questions

1. SQLite 的"新建数据库"是否应该让用户选择文件路径，还是直接在配置目录下创建？→ **建议弹出保存对话框让用户选择路径**
2. 导出时需要支持导出视图、存储过程、函数的 DDL 吗？→ **第一期仅导出表，后续迭代扩展**
3. Oracle 的 CREATE DATABASE 如何处理？→ **Oracle 连接节点右键菜单不显示"新建数据库"项**