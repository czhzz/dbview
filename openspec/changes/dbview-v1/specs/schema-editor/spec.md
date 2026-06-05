## ADDED Requirements

### Requirement: 可视化列管理
系统 SHALL 支持在当前表中添加、修改、删除列。

#### Scenario: 添加列
- **WHEN** 用户在表结构页点击"添加列"
- **THEN** 弹出对话框，输入列名、类型、长度、是否可空、默认值、注释
- **AND** 确认后执行 ALTER TABLE ADD COLUMN

#### Scenario: 修改列
- **WHEN** 用户在表结构页点击某列的"编辑"
- **THEN** 弹出修改对话框，预填当前列属性
- **AND** 修改后执行 ALTER TABLE MODIFY COLUMN

#### Scenario: 删除列
- **WHEN** 用户点击某列的"删除"
- **THEN** 弹出确认对话框，确认后执行 ALTER TABLE DROP COLUMN

### Requirement: 索引管理
系统 SHALL 支持在表中添加和删除索引。

#### Scenario: 创建索引
- **WHEN** 用户在索引列表页点击"新建索引"
- **THEN** 弹出对话框，输入索引名、选择列、选择唯一/普通索引
- **AND** 确认后执行 CREATE INDEX

#### Scenario: 删除索引
- **WHEN** 用户点击某索引的"删除"
- **THEN** 弹出确认对话框，确认后执行 DROP INDEX

### Requirement: SQL 预览
系统 SHALL 在执行结构更改前显示将要执行的 DDL 语句，供用户确认。

#### Scenario: 预览 SQL
- **WHEN** 用户完成结构修改配置并点击"确认"
- **THEN** 显示将要执行的 DDL 语句
- **AND** 提供"执行"和"取消"按钮
- **AND** 显示警告："此操作不可逆，建议先备份"