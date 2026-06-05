## ADDED Requirements

### Requirement: 导出为 CSV
系统 SHALL 支持将当前查询结果或表数据导出为 CSV 文件，包含 BOM 头以兼容 Excel 中文显示。

#### Scenario: 导出 CSV
- **WHEN** 用户点击导出 → CSV
- **THEN** 打开系统保存对话框，默认文件名 `{表名}_{时间戳}.csv`
- **AND** 生成的文件包含 UTF-8 BOM 头和列名行
- **AND** 字段值包含逗号或引号时正确转义

### Requirement: 导出为 JSON
系统 SHALL 支持将查询结果导出为 JSON 数组文件。

#### Scenario: 导出 JSON
- **WHEN** 用户点击导出 → JSON
- **THEN** 打开系统保存对话框，默认文件名 `{表名}_{时间戳}.json`
- **AND** 生成格式化 JSON，每行一个对象或紧凑格式可选

### Requirement: 导出为 SQL INSERT
系统 SHALL 支持将查询结果导出为 SQL INSERT 语句文件。

#### Scenario: 导出 SQL
- **WHEN** 用户点击导出 → SQL INSERT
- **THEN** 打开系统保存对话框，默认文件名 `{表名}_{时间戳}.sql`
- **AND** 生成 `INSERT INTO 表名 (列1, 列2) VALUES (值1, 值2);` 格式
- **AND** 字符串值正确转义单引号

### Requirement: 导出范围控制
系统 SHALL 支持导出当前页或全部数据。

#### Scenario: 选择导出范围
- **WHEN** 用户点击导出按钮
- **THEN** 显示菜单选项："导出当前页" / "导出全部"
- **WHEN** 选择"导出全部"
- **THEN** 系统分页拉取全部数据后生成文件，过程中显示进度