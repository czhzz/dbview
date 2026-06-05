## ADDED Requirements

### Requirement: 暗色模式切换
系统 SHALL 提供亮色和暗色两种主题，用户可通过设置菜单切换。

#### Scenario: 切换主题
- **WHEN** 用户点击主题切换按钮
- **THEN** 在亮色/暗色模式之间切换
- **AND** 切换平滑无闪烁

### Requirement: 跟随系统主题
系统 SHALL 支持跟随操作系统主题自动切换。

#### Scenario: 跟随系统
- **WHEN** 用户选择"跟随系统"
- **THEN** 系统自动检测 `prefers-color-scheme` 设置
- **AND** 系统切换主题时应用自动跟随

### Requirement: 主题持久化
系统 SHALL 记住用户的主题偏好。

#### Scenario: 重启保持
- **WHEN** 用户选择暗色模式后重启应用
- **THEN** 应用仍然以暗色模式启动

### Requirement: CodeMirror 编辑器主题同步
系统 SHALL 在切换主题时同步切换 CodeMirror 编辑器的主题。

#### Scenario: 编辑器暗色
- **WHEN** 用户切换到暗色模式
- **THEN** SQL 编辑器自动切换到 One Dark 主题