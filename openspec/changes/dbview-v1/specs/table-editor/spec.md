## ADDED Requirements

### Requirement: 行内编辑单元格
系统 SHALL 支持在数据表格中直接双击单元格进入编辑模式，修改后按 Enter 确认。

#### Scenario: 编辑单元格
- **WHEN** 用户双击某个数据单元格
- **THEN** 该单元格变为输入框/下拉框
- **AND** 按 Enter 保存编辑，按 Esc 取消
- **AND** 修改标记为待保存状态（单元格边框变色）

### Requirement: 添加新行
系统 SHALL 支持在当前表中添加新数据行。

#### Scenario: 添加行
- **WHEN** 用户点击"添加行"按钮
- **THEN** 表格顶部或底部出现空白行，所有可编辑列显示默认值或空输入框
- **AND** 用户填写后点击"保存"提交

### Requirement: 删除行
系统 SHALL 支持在表格中选择行并删除。

#### Scenario: 删除行
- **WHEN** 用户勾选一行或多行，点击"删除"按钮
- **THEN** 弹出确认对话框："确认删除选中的 N 条记录？"
- **AND** 确认后执行 DELETE 语句并刷新表格

### Requirement: 批量保存更改
系统 SHALL 支持将所有待保存的修改批量提交。

#### Scenario: 保存更改
- **WHEN** 用户编辑完成后点击"保存更改"按钮
- **THEN** 系统逐行生成 UPDATE / INSERT / DELETE 语句并执行
- **AND** 全部执行成功后刷新数据表格
- **AND** 若有任意一条失败，显示错误并回滚已执行的更改

### Requirement: 取消所有更改
系统 SHALL 支持撤销所有未提交的编辑。

#### Scenario: 取消编辑
- **WHEN** 用户点击"取消编辑"按钮
- **THEN** 所有待保存的更改被丢弃，表格恢复到原始状态