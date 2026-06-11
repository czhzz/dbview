## MODIFIED Requirements — schema-editor (v1 → v2)

### Background

v0.1.0 的 SchemaEditor 中 `COLUMN_TYPES` 数组硬编码了 MySQL 专有类型（TINYINT、LONGTEXT、MEDIUMTEXT、BLOB、LONGBLOB 等），非 MySQL 数据库用户在添加/修改列时会看到不兼容的类型选项。

### Requirement: 列类型列表按数据库类型动态切换

系统 SHALL 根据当前连接的数据库类型，在 ColumnDialog 中显示对应的列类型列表。

#### Scenario: 编辑 MySQL 表的列类型
- **GIVEN** 用户正在编辑 MySQL 表的列
- **WHEN** 添加或修改列时打开类型下拉框
- **THEN** 显示 MySQL 专用类型列表（INT, BIGINT, VARCHAR, TEXT, DATETIME, TINYINT 等）

#### Scenario: 编辑 PostgreSQL 表的列类型
- **GIVEN** 用户正在编辑 PostgreSQL 表的列
- **WHEN** 添加或修改列时打开类型下拉框
- **THEN** 显示 PostgreSQL 专用类型列表（INTEGER, BIGINT, TEXT, VARCHAR, TIMESTAMP, JSONB 等）

#### Scenario: 编辑 Oracle 表的列类型
- **GIVEN** 用户正在编辑 Oracle 表的列
- **WHEN** 添加或修改列时打开类型下拉框
- **THEN** 显示 Oracle 专用类型列表（NUMBER, VARCHAR2, CLOB, DATE, BLOB 等）

#### Scenario: 编辑 SQLite 表的列类型
- **GIVEN** 用户正在编辑 SQLite 表的列
- **WHEN** 添加或修改列时打开类型下拉框
- **THEN** 显示 SQLite 专用类型列表（INTEGER, TEXT, REAL, BLOB, NUMERIC）

### Technical Notes

- 在 `SchemaEditor.tsx` 中将 `COLUMN_TYPES` 重构为 `COLUMN_TYPES_BY_DB: Record<DbType, string[]>`
- ColumnDialog 已有 `dbType` prop，直接使用
- 类型字符串直接透传到 DDL，不做服务端校验——由数据库端决定是否有效
