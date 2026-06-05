## ADDED Requirements

### Requirement: Oracle 连接配置
系统 SHALL 支持填写 Oracle 连接信息，支持连接字符串模式（主机+端口+服务名）和 SID 模式。

#### Scenario: 创建 Oracle 连接
- **WHEN** 用户在连接类型下拉选择 "Oracle"
- **THEN** 端口自动填入 1521，显示"服务名"和"SID"两个输入框
- **AND** 保存后连接列表中显示类型标签 ORA

### Requirement: Oracle 元数据查询
系统 SHALL 支持查询 Oracle 的表、视图、列、索引、主键信息，通过 ALL_TABLES / ALL_TAB_COLUMNS / ALL_INDEXES 等系统视图。

#### Scenario: 浏览 Oracle 数据库树
- **WHEN** 用户展开 Oracle 连接节点
- **THEN** 显示该用户的 schema 列表及下的表和视图

#### Scenario: 查看表结构
- **WHEN** 用户查看 Oracle 表结构
- **THEN** 正确显示列信息，包括 NUMBER、VARCHAR2、CLOB、DATE 等 Oracle 特有类型

### Requirement: Oracle 数据查询
系统 SHALL 支持对 Oracle 执行 SQL 查询，分页使用 OFFSET FETCH 或 ROWNUM 方式。

#### Scenario: 分页查询
- **WHEN** 用户查看 Oracle 表数据
- **THEN** 使用 OFFSET ? ROWS FETCH NEXT ? ROWS ONLY 分页（Oracle 12c+）
- **AND** 返回总行数