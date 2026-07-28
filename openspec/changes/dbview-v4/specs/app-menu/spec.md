## ADDED Requirements

### Requirement: 自定义应用菜单
系统 SHALL 使用自定义应用菜单替代 Electron 默认菜单。

#### Scenario: 应用启动时加载自定义菜单
- **WHEN** 应用启动
- **THEN** 显示自定义菜单栏，包含文件、编辑、视图、帮助四个菜单

### Requirement: 菜单中文化
系统 SHALL 在中文环境下显示中文菜单标签。

#### Scenario: 中文环境菜单
- **WHEN** 当前语言为中文（zh）
- **THEN** 菜单栏显示"文件"、"编辑"、"视图"、"帮助"

#### Scenario: 英文环境菜单
- **WHEN** 当前语言为英文（en）
- **THEN** 菜单栏显示"File"、"Edit"、"View"、"Help"

### Requirement: 语言切换时菜单同步更新
系统 SHALL 在用户切换语言时同步更新应用菜单。

#### Scenario: 渲染进程切换语言
- **WHEN** 用户在设置中切换语言
- **THEN** 渲染进程通过 IPC 通知 main 进程，main 进程重建菜单并更新标签

#### Scenario: 应用启动时读取语言设置
- **WHEN** 应用启动
- **THEN** main 进程从渲染进程获取当前语言设置，构建对应语言的菜单

### Requirement: 文件菜单
系统 SHALL 提供文件菜单包含新建连接和退出功能。

#### Scenario: 新建连接
- **WHEN** 用户点击"文件 → 新建连接"
- **THEN** 触发新建连接流程（与点击侧边栏"+ 新建连接"按钮效果一致）

#### Scenario: 退出应用
- **WHEN** 用户点击"文件 → 退出"
- **THEN** 应用正常退出

### Requirement: 编辑菜单
系统 SHALL 提供编辑菜单包含标准编辑操作。

#### Scenario: 编辑操作
- **WHEN** 用户点击编辑菜单项
- **THEN** 撤销、重做、剪切、复制、粘贴、全选使用 Electron 内置 role，行为与系统原生一致

### Requirement: 视图菜单
系统 SHALL 提供视图菜单包含窗口控制操作。

#### Scenario: 视图操作
- **WHEN** 用户点击视图菜单项
- **THEN** 重新加载、开发者工具、缩放功能使用 Electron 内置 role，行为与系统原生一致

### Requirement: 帮助菜单
系统 SHALL 提供帮助菜单。

#### Scenario: 关于
- **WHEN** 用户点击"帮助 → 关于 DBView"
- **THEN** 显示应用版本信息