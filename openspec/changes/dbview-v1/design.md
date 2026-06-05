## Context

DBView 是目前基于 Electron + React 的数据库可视化工具，后端采用 mysql2 驱动连接 MySQL。架构为经典的三层 IPC 模式：Renderer (React) → Preload Bridge → Main Process (Node.js)。现有功能包括连接管理（CRUD + AES 加密存储）、数据库树浏览、分页数据查看、结构查看（列/索引/DDL）、SQL 编辑执行。

1.0 版本将在此基础上扩展数据库支持、补充数据编辑和导出能力、完善 SQL 工具链、以及提升用户体验（国际化、暗色主题）。

## Goals / Non-Goals

**Goals:**
- PostgreSQL、SQLite、Oracle 三种数据库驱动的完整实现
- 数据导出为 CSV、JSON、SQL INSERT 三种格式
- SQL 查询历史持久化存储和浏览
- 表级数据在线编辑（增删改行）
- 可视化表结构编辑（添加/修改/删除列、索引）
- 中英文界面国际化
- 完整暗色主题
- 连接分组管理
- SQL 格式化
- 存储过程和函数浏览

**Non-Goals:**
- 跨数据库数据迁移（v2+）
- ER 图可视化（v2+）
- 用户权限管理（Electron 桌面端无意义）
- 实时协作（v3+）
- 数据库备份/恢复
- 命令行模式

## Decisions

### 1. 数据库驱动架构 — 扩展工厂模式

**决策**：在 `DriverFactory` 的基础上保持接口一致，新增驱动注册机制

```
DatabaseDriver (interface)
├── MySQLDriver    (mysql2, 已有)
├── PostgreSQLDriver (pg, 新增)
├── SQLiteDriver   (better-sqlite3, 新增)
└── OracleDriver   (oracledb, 新增)
```

**备选方案**：使用 knex.js 统一查询构建 → 否决，额外一层抽象反而增加复杂度，且 knex 不直接暴露连接池管理。直接使用原生驱动更灵活。

### 2. 查询取消 — AbortController

**决策**：利用 `AbortController` 模式，在 ConnectionManager 中维护查询信号映射

- 每个查询分配唯一 queryId
- `sql:cancel` → 中止信号 → 驱动层检查信号并中断查询
- MySQL 通过 `pool.getConnection()` + `connection.execute()` 逐条执行，取消时 `connection.destroy()`
- PostgreSQL 通过 `client.query().abort()` 直接支持

### 3. 数据导出 — 纯前端实现

**决策**：导出在 Renderer 进程完成，不经过主进程。数据已通过 IPC 加载到前端，前端直接格式化为 CSV/JSON/SQL 后通过 Electron dialog 保存

- CSV: 使用简单的转义拼接，不引入第三方库
- JSON: JSON.stringify + 缩进格式化
- SQL: 元数据（表名/列名）从查询结果中提取，生成 INSERT 语句

### 4. 国际化 — i18next + react-i18next

**决策**：使用 i18next 作为国际化框架，支持中英文翻译文件

- 翻译文件位于 `src/renderer/locales/{zh,en}/translation.json`
- 通过 Zustand store 持久化用户的语言偏好
- Ant Design 的国际化通过 `ConfigProvider` + `dayjs` locale 联动

### 5. 暗色主题 — Ant Design 5 CSS-in-JS + CSS 变量

**决策**：Ant Design 5 原生通过 `ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}` 支持暗色切换。自定义部分通过 CSS 变量覆盖

- 主题偏好持久化到 localStorage
- 跟随系统主题作为可选项（`prefers-color-scheme`）
- 不需要第三方主题库

### 6. 表数据编辑 — 乐观更新 + 批量提交

**决策**：数据表格行内编辑，修改缓存在前端，点击"保存"后生成对应的 UPDATE/INSERT/DELETE 语句通过 SQL 接口执行

- 编辑模式：点击单元格直接编辑（类似 Excel）
- 变更追踪：记录修改的行、原始值和新值
- 提交事务：逐行生成 SQL 语句，按顺序执行
- 冲突处理：执行后重新加载当前页数据

### 7. 查询历史 — SQLite 本地存储

**决策**：利用主进程已有的 sql.js（SQLite），复用同一个连接数据库文件 `dbview-connections.db` 或新建 `dbview-history.db`

- 仅记录 SQL 文本、执行时间、连接类型
- 按时间倒序，支持搜索过滤
- 最多保留 1000 条历史

## Driver 架构扩展

```
src/main/db/
├── db-driver.ts          # DatabaseDriver 接口（已有，扩展取消信号）
├── driver-factory.ts     # 工厂类（已有，新增注册机制）
├── mysql-driver.ts       # MySQL 驱动（已有）
├── pg-driver.ts          # PostgreSQL 驱动（新增）
├── sqlite-driver.ts      # SQLite 驱动（新增）
└── oracle-driver.ts      # Oracle 驱动（新增，从预留变为实现）
```

DatabaseDriver 接口新增方法：
```typescript
executeQuery(sql: string, signal?: AbortSignal): Promise<SQLResult>
// 原 executeQuery 保留兼容，新增可选 signal 参数
```

## 渲染层架构扩展

```
src/renderer/
├── components/
│   ├── data-table/
│   │   ├── DataTable.tsx        # 重构为支持编辑模式
│   │   └── DataExport.tsx       # 导出按钮和菜单 (新增)
│   ├── sql-editor/
│   │   ├── SqlEditor.tsx        # 重构
│   │   └── QueryHistory.tsx     # 历史面板 (新增)
│   ├── structure/
│   │   ├── SchemaEditor.tsx     # 可视化结构编辑 (新增)
│   │   └── ... (已有)
│   └── connection/
│       ├── ConnectionForm.tsx   # 新增 Oracle/SQLite 配置字段
│       └── ConnectionGroups.tsx # 分组管理 (新增)
├── stores/
│   ├── connectionStore.ts       # 扩充分组字段
│   ├── editorStore.ts           # 扩充历史相关
│   ├── uiStore.ts               # 扩充主题偏好
│   └── i18nStore.ts             # 国际化状态 (新增)
├── locales/
│   ├── zh/translation.json      # 中文 (新增)
│   └── en/translation.json      # 英文 (新增)
└── hooks/
    └── useTheme.ts              # 主题 Hook (新增)
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| Oracle 驱动 (oracledb) 需要原生编译环境 (node-gyp) | 开发文档中明确 Windows/macOS/Linux 编译前置条件；CI 配置对应环境 |
| better-sqlite3 为原生模块，打包需注意 | electron-vite 已有 external 配置，需确认 native 模块的打包方式 |
| 暗色模式下 Ant Design 自定义样式覆盖不全 | 逐组件验收，维护一份暗色覆盖清单 |
| 表数据编辑并发冲突 | 单用户桌面应用冲突概率低；提交后刷新数据页 |
| 查询历史数据膨胀 | 上限 1000 条，超过时删除最旧记录 |