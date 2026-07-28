## ADDED Requirements

### Requirement: 连接节点右键 — 新建数据库
系统 SHALL 在连接节点的右键菜单中提供"新建数据库"选项。

#### Scenario: MySQL/PG 连接新建数据库
- **WHEN** 用户在 MySQL 或 PostgreSQL 连接节点上右键并选择"新建数据库"
- **THEN** 系统弹出输入框，用户输入数据库名后执行 CREATE DATABASE，成功后刷新数据库列表

#### Scenario: SQLite 连接新建数据库
- **WHEN** 用户在 SQLite 连接节点上右键并选择"新建数据库"
- **THEN** 系统弹出保存文件对话框，用户选择路径后创建 .sqlite 文件

#### Scenario: Oracle 连接隐藏新建数据库
- **WHEN** 用户右键点击 Oracle 连接节点
- **THEN** 右键菜单不显示"新建数据库"选项

#### Scenario: 数据库名已存在
- **WHEN** 用户输入的数据库名已存在
- **THEN** 系统提示"数据库已存在"，阻止创建

### Requirement: 数据库节点右键 — 新增表
系统 SHALL 在数据库节点的右键菜单中提供"新增表"选项。

#### Scenario: 通过数据库右键新建表
- **WHEN** 用户在数据库节点上右键并选择"新建表"
- **THEN** 系统打开 Create Table 对话框，schema 预填为当前数据库名

#### Scenario: 创建成功后刷新
- **WHEN** 新建表成功
- **THEN** 数据库树刷新，新表显示在 Tables 文件夹下

### Requirement: 表节点右键 — 查看 DDL
系统 SHALL 在表节点的右键菜单中提供"查看 DDL"选项。

#### Scenario: 查看表 DDL
- **WHEN** 用户在表节点上右键并选择"查看 DDL"
- **THEN** 系统在 SQL 编辑器 Tab 中打开该表的 DDL

#### Scenario: 视图节点查看 DDL
- **WHEN** 用户在视图节点上右键并选择"查看 DDL"
- **THEN** 系统在 SQL 编辑器 Tab 中打开视图定义