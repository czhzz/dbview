## MODIFIED Requirements — SqlEditor (v1 → v2)

### Background

`SqlEditor.tsx` 中 CodeMirror EditorView 的 useEffect 依赖了 `dbType` 和 `cmTheme`。当用户切换数据库连接或切换主题时，EditorView 被 `destroy()` 后重新创建，但销毁前没有保存当前编辑内容，导致正在编写的 SQL 丢失。

### Requirement: 编辑器重建时保留内容

系统 SHALL 在 CodeMirror 编辑器因方言或主题变更而重建时，保留用户当前编辑的 SQL 内容。

#### Scenario: 切换数据库连接时保留 SQL
- **GIVEN** 用户正在 SQL 编辑器中编写一条复杂查询
- **WHEN** 用户切换当前数据库连接（导致 dbType 变化）
- **THEN** 编辑器重建后，之前编写的 SQL 内容保持不变

#### Scenario: 切换主题时保留 SQL
- **GIVEN** 用户正在 SQL 编辑器中编写查询
- **WHEN** 用户从浅色主题切换到深色主题
- **THEN** 编辑器重建后，SQL 内容保持不变

### Technical Notes

- 在 useEffect cleanup 中，destroy 之前读取 `viewRef.current.state.doc.toString()` 保存到局部变量
- 重建时将该变量作为 `doc` 参数传入 `new EditorView({ doc: savedDoc, ... })`
- 仅保存和恢复文档内容，不保存光标位置和选择状态（复杂度高收益低，不做）
- 更好的长期方案：使用 `EditorView.reconfigure()` 替代 destroy+rebuild，但需处理方言切换时的 schema 变更，当前先采用保存/恢复方案
