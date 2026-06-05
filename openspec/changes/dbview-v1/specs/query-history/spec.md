## ADDED Requirements

### Requirement: 自动记录查询历史
系统 SHALL 自动记录每次通过 SQL 编辑器执行的 SQL 语句，包含执行时间、耗时、连接名称。

#### Scenario: 记录查询
- **WHEN** 用户在 SQL 编辑器中点击执行
- **THEN** 该 SQL 自动保存到历史记录中
- **AND** 记录字段包括：SQL 文本、执行时间、执行耗时（ms）、所属连接

### Requirement: 查看查询历史
系统 SHALL 在侧边栏或独立面板中显示查询历史列表，按时间倒序排列。

#### Scenario: 打开历史面板
- **WHEN** 用户点击"查询历史"按钮
- **THEN** 展开历史面板，显示最近 50 条记录

#### Scenario: 搜索历史
- **WHEN** 用户在历史面板的搜索框中输入关键词
- **THEN** 列表实时过滤，只显示包含该关键词的 SQL

### Requirement: 重用历史查询
系统 SHALL 支持将历史记录中的 SQL 加载到编辑器中。

#### Scenario: 点击加载
- **WHEN** 用户点击某条历史记录
- **THEN** 该 SQL 文本载入当前编辑器或新建编辑器标签页

### Requirement: 历史记录上限
系统 SHALL 限制历史记录最多 1000 条，超过时删除最旧记录。

#### Scenario: 自动清理
- **WHEN** 历史记录达到 1000 条
- **THEN** 新记录插入时删除最早的历史记录