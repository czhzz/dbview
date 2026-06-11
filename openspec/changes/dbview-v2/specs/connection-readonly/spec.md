## NEW Requirements

### Background

`connection-store.ts` 中 `getById()` 方法的 SELECT 查询列列表未包含 `read_only` 字段（数据库表已有该列），但返回对象中又读取了 `r.read_only`，导致该值始终为 `undefined` → 被默认转为 `false`。`list()` 方法已正确包含该字段。

### Requirement: getById 返回完整的连接配置

系统 SHALL 在 `getById()` 返回的 ConnectionConfig 对象中包含 `readOnly` 字段，且值与数据库中存储的一致。

#### Scenario: 获取已保存的只读连接配置
- **GIVEN** 数据库中有一条 `read_only = 1` 的连接记录
- **WHEN** 调用 `getById(id)`
- **THEN** 返回的 `ConnectionConfig` 对象中 `readOnly` 为 `true`
- **AND** 该连接在前端显示为只读模式

#### Scenario: 复制连接时继承只读设置
- **GIVEN** 用户在 DatabaseTree 中右键复制一个只读连接
- **WHEN** `handleDuplicate` 调用 `connectionApi.getById(id)`
- **THEN** 获取到的配置包含 `readOnly: true`
- **AND** 复制的连接继承只读设置

### Technical Notes

- 修复位置：`connection-store.ts:159`，在 SELECT 列表中加入 `read_only`
- 与 `list()` 方法（第 129 行）的 SELECT 列表保持一致即可
- 单行修复，无需变更接口或类型定义
