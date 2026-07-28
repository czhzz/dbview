## ADDED Requirements

### Requirement: Export SQL File
系统 SHALL 支持将数据库/表的结构和数据导出为 .sql 文件。

#### Scenario: 导出数据库级别 SQL
- **WHEN** 用户在数据库节点右键选择"导出 SQL"
- **THEN** 系统弹出保存对话框，默认文件名为 `<database>.sql`，导出包含所有表的 DDL + INSERT 语句

#### Scenario: 导出单表级别 SQL
- **WHEN** 用户在表节点右键选择"导出 SQL"
- **THEN** 系统弹出保存对话框，默认文件名为 `<table>.sql`，导出包含该表的 DDL + INSERT 语句

#### Scenario: 导出选项 — 仅结构
- **WHEN** 用户在导出对话框中选择"仅结构（DDL）"
- **THEN** 系统仅导出 CREATE TABLE 语句，不含数据

#### Scenario: 导出选项 — 结构+数据
- **WHEN** 用户在导出对话框中选择"结构+数据"
- **THEN** 系统导出 CREATE TABLE 语句 + INSERT INTO 语句

#### Scenario: 大表导出限制
- **WHEN** 表数据超过 10000 行
- **THEN** 系统提示用户"数据量较大，导出可能耗时较长"，确认后继续

#### Scenario: 导出含特殊字符的数据
- **WHEN** 数据中包含单引号、反斜杠等特殊字符
- **THEN** 生成的 INSERT 语句中值被正确转义

### Requirement: Import SQL File
系统 SHALL 支持从 .sql 文件导入并执行 SQL 脚本。

#### Scenario: 导入 SQL 文件
- **WHEN** 用户在数据库节点右键选择"导入 SQL"，选择 .sql 文件
- **THEN** 系统读取文件内容，按语句分割，逐条执行

#### Scenario: 多语句执行
- **WHEN** SQL 文件包含多条 DDL/DML 语句（以分号分隔）
- **THEN** 系统正确分割并逐条执行，显示执行进度

#### Scenario: 含 DELIMITER 的脚本
- **WHEN** SQL 文件包含 DELIMITER 指令（如存储过程定义）
- **THEN** 系统按 DELIMITER 变更后的分隔符分割语句

#### Scenario: 执行失败处理
- **WHEN** 某条 SQL 语句执行失败
- **THEN** 系统停止后续执行，显示错误信息（语句编号 + 错误详情）

#### Scenario: 空文件导入
- **WHEN** 用户选择的 .sql 文件为空
- **THEN** 系统提示"文件为空"，不执行任何操作

### Requirement: SQL 导出格式
生成的 SQL 文件 SHALL 包含正确的语法和注释。

#### Scenario: 文件头部注释
- **WHEN** 导出 SQL 文件
- **THEN** 文件头部包含生成时间、数据库类型、源数据库名等注释信息

#### Scenario: DDL 分隔
- **WHEN** 导出多个表的 DDL
- **THEN** 每个表的 DDL 之间有空行分隔，并带有表名注释