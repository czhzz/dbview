## ADDED Requirements

### Requirement: PostgreSQL 连接配置
系统 SHALL 支持填写 PostgreSQL 连接信息，包括主机、端口（默认 5432）、用户名、密码、默认数据库。

#### Scenario: 创建 PostgreSQL 连接
- **WHEN** 用户在连接类型下拉选择 "PostgreSQL"
- **THEN** 端口自动填入 5432，连接表单显示 SSL 开关
- **AND** 保存后该连接出现在连接列表中，类型标签显示 PG

### Requirement: PostgreSQL 元数据查询
系统 SHALL 支持查询 PostgreSQL 的数据库列表、schema 列表、表列表、视图列表、列信息、索引信息、DDL。

#### Scenario: 浏览 PostgreSQL 数据库树
- **WHEN** 用户展开 PostgreSLQ 连接节点
- **THEN** 显示该连接下的所有数据库
- **WHEN** 展开数据库节点
- **THEN** 按 schema 分组显示表和视图

#### Scenario: 查看表结构
- **WHEN** 用户右键表选择"查看结构"
- **THEN** 显示列名、类型、是否可空、默认值、注释、最大长度

### Requirement: PostgreSQL 数据查询和执行
系统 SHALL 支持对 PostgreSQL 执行 SELECT / INSERT / UPDATE / DELETE 语句，并返回分页结果。

#### Scenario: 执行查询
- **WHEN** 用户在 SQL 编辑器中执行一条 PostgreSQL 兼容的 SQL
- **THEN** 返回结果集或影响行数信息

#### Scenario: 分页查询
- **WHEN** 用户查看 PostgreSQL 表数据
- **THEN** 使用 LIMIT/OFFSET 分页，并返回总行数