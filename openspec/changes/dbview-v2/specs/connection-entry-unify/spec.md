## NEW Requirements

### Background

`ConnectionPage.tsx` 是一个卡片式连接管理页面，提供连接的增删改查和连接/断开操作。但 `DatabaseTree.tsx` 在重构为 Navicat 风格时已实现了完整的连接 CRUD（右键菜单 + 顶部工具栏按钮 + 连接表单）。两套代码操作同一数据源（`useConnectionStore`），但维护了两套独立的 CRUD 逻辑。

### Requirement: 统一连接管理入口

系统 SHALL 只保留一个连接管理入口，移除冗余的 ConnectionPage。

#### Scenario: 通过 DatabaseTree 管理连接
- **GIVEN** 用户在 DatabaseTree 中右键点击连接节点
- **THEN** 显示上下文菜单，包含：连接/断开、编辑连接、复制连接、删除连接
- **AND** 点击"编辑连接"打开 ConnectionForm 编辑对话框
- **AND** 点击"复制连接"基于当前配置创建副本

#### Scenario: 新建连接
- **GIVEN** 用户点击侧边栏顶部的"+"按钮（或分组右键"新建连接"）
- **THEN** 打开 ConnectionForm 新建对话框
- **AND** 创建成功后连接出现在树中

#### Scenario: 分组管理
- **GIVEN** 用户点击侧边栏顶部的分组管理按钮（📁 图标）
- **THEN** 打开分组管理 Modal（已有，在 MainLayout 中实现）
- **AND** 支持创建/重命名/删除分组

### Technical Notes

- 删除 `ConnectionPage.tsx` 文件
- 检查 `MainLayout.tsx` 是否有对 ConnectionPage 的引用（当前 Tab 系统不包含路由，但需要确认）
- DatabaseTree 已有完整 CRUD，但需确认以下功能是否覆盖：
  - ✅ 创建连接（顶部 + 按钮 + 分组右键）
  - ✅ 编辑连接（右键菜单 → ConnectionForm）
  - ✅ 删除连接（右键菜单，含确认）
  - ✅ 复制连接（右键菜单）
  - ✅ 连接/断开（右键菜单 + 双击）
  - ❌ 卡片式视觉展示（非必需，树形展示更紧凑）
