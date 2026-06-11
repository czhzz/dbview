## MODIFIED Requirements — table-editor (v1 → v2)

### Background

v0.1.0 实现了表格行内编辑功能，但编辑状态在分页/排序/刷新时无保护。用户编辑多行后不小心切换分页，所有修改直接丢失。

### Requirement: 分页/排序前编辑状态保护

系统 SHALL 在用户切换分页、修改排序或点击刷新时，如果有未保存的编辑更改，弹出确认对话框。

#### Scenario: 切换分页时有未保存更改
- **GIVEN** 用户处于编辑模式，且有 N 项待保存的更改（pendingChanges.size > 0）
- **WHEN** 用户点击分页按钮或排序按钮
- **THEN** 弹出 Modal 对话框，包含：
  - 标题："有 N 项未保存的更改"
  - 描述："切换页面将丢弃这些更改"
  - 三个按钮："保存并继续" / "丢弃并继续" / "取消"
- **AND** 点击"保存并继续" → 先执行 `handleSaveChanges()`，成功后切换
- **AND** 点击"丢弃并继续" → 清除编辑状态后切换
- **AND** 点击"取消" → 关闭弹窗，不切换

#### Scenario: 切换分页时无未保存更改
- **GIVEN** 用户处于编辑模式，且无待保存更改
- **WHEN** 用户点击分页按钮或排序按钮
- **THEN** 直接退出编辑模式并切换页面

### Technical Notes

- `DataTable.tsx` 中分页和排序由 `page` / `pageSize` / `sortColumn` / `sortDirection` 状态驱动
- `handleSaveChanges` 已实现并可复用
- 注意：排序切换时也应触发检查，因为排序后数据行位置变化，编辑状态无法对应
