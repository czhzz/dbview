## ADDED Requirements

### Requirement: SQL 格式化
系统 SHALL 支持对 SQL 编辑器中的 SQL 语句进行格式化美化。

#### Scenario: 格式化当前 SQL
- **WHEN** 用户在 SQL 编辑器中点击"格式化"按钮（或使用快捷键）
- **THEN** 当前编辑器中的 SQL 被格式化为标准缩进风格
- **AND** 关键字大写，子查询缩进，JOIN 条件对齐

#### Scenario: 空选择处理
- **WHEN** 编辑器中无 SQL 内容时点击格式化
- **THEN** 不做任何操作

### Requirement: 多数据库 SQL 方言支持
系统 SHALL 根据当前连接的数据库类型选择合适的 SQL 格式化风格。

#### Scenario: 按数据库类型格式化
- **WHEN** 用户连接到 MySQL 并点击格式化
- **THEN** 使用 MySQL 方言格式化
- **WHEN** 用户连接到 PostgreSQL 并点击格式化
- **THEN** 使用 PostgreSQL 方言格式化