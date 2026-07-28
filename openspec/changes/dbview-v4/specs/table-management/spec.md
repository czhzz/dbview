## ADDED Requirements

### Requirement: Create Table
系统 SHALL 支持用户通过 GUI 对话框新建数据库表。

#### Scenario: 通过侧边栏数据库节点右键菜单新建表
- **WHEN** 用户在侧边栏数据库节点上右键点击并选择"新建表"
- **THEN** 系统弹出 Create Table 对话框，表名和架构已预填当前数据库信息

#### Scenario: 通过 StructurePage 新建表
- **WHEN** 用户在 StructurePage 中点击"新建表"按钮
- **THEN** 系统弹出 Create Table 对话框

#### Scenario: 定义表结构并创建
- **WHEN** 用户在对话框中输入表名、添加至少一列、可选添加索引，点击"确定"
- **THEN** 系统生成 CREATE TABLE DDL（含列定义、主键、索引、注释），预览后执行，成功后刷新数据库树

#### Scenario: 取消创建表
- **WHEN** 用户在对话框中点击"取消"或关闭对话框
- **THEN** 系统不执行任何操作，对话框关闭

#### Scenario: 表名未填时创建
- **WHEN** 用户未输入表名直接点击"确定"
- **THEN** 系统提示"表名不能为空"，阻止提交

#### Scenario: 无列定义时创建
- **WHEN** 用户未添加任何列定义直接点击"确定"
- **THEN** 系统提示"至少需要一列"，阻止提交

### Requirement: Alter Table Name and Comment
系统 SHALL 支持修改已有表的表名和注释。

#### Scenario: 修改表名
- **WHEN** 用户在 StructurePage 中编辑表名并确认
- **THEN** 系统生成 ALTER TABLE RENAME TO 语句，执行后刷新页面

#### Scenario: 修改表注释
- **WHEN** 用户在 StructurePage 中编辑表注释并确认
- **THEN** 系统生成注释修改语句（MySQL: ALTER TABLE COMMENT, PG: COMMENT ON TABLE），执行后刷新

#### Scenario: 修改表名含特殊字符
- **WHEN** 用户输入的表名包含 SQL 关键字或特殊字符
- **THEN** 系统使用正确的标识符引用（如 MySQL 的 backtick，PG 的双引号）

### Requirement: DDL 方言支持
系统 SHALL 根据数据库类型生成正确的方言 DDL。

#### Scenario: MySQL 方言
- **WHEN** 用户连接 MySQL 数据库并创建表
- **THEN** 生成的 DDL 使用 backtick 引用、ENGINE=InnoDB、CHARSET=utf8mb4

#### Scenario: PostgreSQL 方言
- **WHEN** 用户连接 PostgreSQL 数据库并创建表
- **THEN** 生成的 DDL 使用双引号引用、SERIAL/BIGSERIAL 类型映射

#### Scenario: SQLite 方言
- **WHEN** 用户连接 SQLite 数据库并创建表
- **THEN** 生成的 DDL 使用双引号引用，跳过不支持的 COMMENT 语法

#### Scenario: Oracle 方言
- **WHEN** 用户连接 Oracle 数据库并创建表
- **THEN** 生成的 DDL 使用双引号引用、NUMBER/VARCHAR2 类型映射