## MODIFIED Requirements — DDLViewer

### Background

`DDLViewer.tsx` 当前硬编码 `sql({ dialect: MySQL })` 作为 CodeMirror 语法高亮方言，查看 PostgreSQL/Oracle/SQLite 的 DDL 时语法高亮不准确。

### Requirement: DDL 查看器根据数据库类型切换语法高亮

系统 SHALL 在 DDL 查看器中根据当前表的数据库类型选择合适的 SQL 方言进行语法高亮。

#### Scenario: 查看 MySQL 表 DDL
- **GIVEN** 用户在结构页查看 MySQL 表的 DDL
- **THEN** DDL 使用 MySQL 方言高亮

#### Scenario: 查看 PostgreSQL 表 DDL
- **GIVEN** 用户在结构页查看 PostgreSQL 表的 DDL
- **THEN** DDL 使用 PostgreSQL 方言高亮

#### Scenario: 查看 Oracle/SQLite 表 DDL
- **GIVEN** 用户在结构页查看 Oracle 或 SQLite 表的 DDL
- **THEN** DDL 使用 MySQL 方言高亮（@codemirror/lang-sql 仅内置两种方言，回退行为）

### Technical Notes

- DDLViewer 新增 `dbType` prop（类型 `DbType`，默认 `'mysql'`）
- 引用 `SqlEditor.tsx` 中的 `getCMDialect` 辅助函数，避免重复定义
- @codemirror/lang-sql 仅内置 MySQL 和 PostgreSQL 方言，SQLite/Oracle 回退到 MySQL
- 文件变更：`DDLViewer.tsx`、`StructurePage.tsx`
