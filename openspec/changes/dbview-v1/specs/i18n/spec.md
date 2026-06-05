## ADDED Requirements

### Requirement: 中文界面
系统 SHALL 提供完整的中文界面，所有 UI 文本使用中文。

#### Scenario: 默认中文
- **WHEN** 系统首次启动
- **THEN** 界面语言为中文

### Requirement: 英文界面
系统 SHALL 提供完整的英文界面切换能力。

#### Scenario: 切换为英文
- **WHEN** 用户在设置或菜单中切换到 English
- **THEN** 所有界面文本立即切换为英文
- **AND** 切换后刷新当前页面

### Requirement: 语言持久化
系统 SHALL 记住用户的语言偏好，重启后保持。

#### Scenario: 重启保持
- **WHEN** 用户切换到英文后关闭并重新打开应用
- **THEN** 界面仍然显示英文

### Requirement: Ant Design 组件国际化
系统 SHALL 确保 Ant Design 组件的内置文本随语言切换。

#### Scenario: 组件文本联动
- **WHEN** 界面语言切换为英文
- **THEN** Ant Design 的弹窗按钮（确认/取消）、日期选择器等跟随切换为英文