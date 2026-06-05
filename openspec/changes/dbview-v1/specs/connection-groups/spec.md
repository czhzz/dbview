## ADDED Requirements

### Requirement: 连接分组
系统 SHALL 支持将数据库连接按分组（文件夹）组织。

#### Scenario: 创建分组
- **WHEN** 用户在连接管理页面点击"新建分组"
- **THEN** 弹出输入框，输入分组名称后创建
- **AND** 分组显示在连接列表上方，可展开/折叠

#### Scenario: 移动连接到分组
- **WHEN** 用户编辑连接时或拖拽连接
- **THEN** 可以选择该连接所属的分组
- **AND** 连接列表按分组显示

### Requirement: 分组编辑
系统 SHALL 支持重命名和删除分组。

#### Scenario: 删除分组
- **WHEN** 用户删除一个分组
- **THEN** 分组内的连接变为无分组状态
- **AND** 分组及其包含关系被移除

### Requirement: 分组持久化
系统 SHALL 将分组信息持久化存储。

#### Scenario: 重启保持
- **WHEN** 用户创建分组后重启应用
- **THEN** 分组结构和连接的分组归属保持不变