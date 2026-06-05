## ADDED Requirements

### Requirement: SQLite 文件打开
系统 SHALL 支持通过文件选择对话框打开 .db / .sqlite / .sqlite3 文件，或输入文件路径。

#### Scenario: 通过文件选择器打开
- **WHEN** 用户在连接类型中选择 "SQLite"
- **THEN** 显示文件选择按钮，点击后弹出系统文件对话框
- **AND** 选择文件后自动填入路径

#### Scenario: 输入文件路径
- **WHEN** 用户在连接表单中直接输入 SQLite 文件路径
- **THEN** 验证该路径是否存在且可读

### Requirement: SQLite 元数据查询
系统 SHALL 支持查询 SQLite 数据库的表列表、视图列表、列信息、索引信息。

#### Scenario: 浏览 SQLite 数据库结构
- **WHEN** 用户展开 SQLite 连接
- **THEN** 直接显示该数据库中的表和视图（SQLite 单文件无多数据库概念）

### Requirement: SQLite 数据查询和执行
系统 SHALL 支持对 SQLite 执行标准 SQL 语句。

#### Scenario: 执行查询
- **WHEN** 用户在 SQL 编辑器中执行 SQL 语句
- **THEN** 返回结果集或影响行数

### Requirement: SQLite 只读模式
系统 SHALL 支持以只读模式打开 SQLite 文件，防止意外修改。

#### Scenario: 只读打开
- **WHEN** 用户创建 SQLite 连接时勾选"只读"
- **THEN** 之后的所有写入操作返回错误