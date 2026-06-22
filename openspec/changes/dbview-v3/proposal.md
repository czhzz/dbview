## Why

DBView v0.1.0 完成了从"雏形"到"功能完整"的跨越（四种数据库驱动、数据编辑、Schema 编辑、国际化、暗色主题），v0.2.0 修复了 18 项已知问题将产品提升到"健壮可靠"。但当前产品在"高效使用"层面仍有明显断层：用户只能手写 SQL、无法直观理解数据库关系、缺少对比/导入等配套工具链。

v0.3.0 的目标是将 DBView 从"数据库浏览器"升级为"数据库生产力工具"——降低使用门槛（可视化查询构建器）、提升数据理解效率（ER 图）、补齐数据管理闭环（对比同步 + 数据导入）、优化大规模数据操作体验（虚拟滚动 + 性能分析）。

## What Changes

- **可视化查询构建器**：拖拽式多表 JOIN 查询构建器，自动生成 SQL，降低非 SQL 专家使用门槛
- **ER 图可视化**：从数据库 Schema 自动生成实体关系图，支持交互式浏览
- **数据库对比/同步**：结构对比（表/列/索引差异）和数据对比，生成迁移脚本并执行
- **数据导入**：从 CSV/JSON/Excel 导入数据到表，与 v1 的数据导出形成闭环
- **查询性能分析**：EXPLAIN 可视化（执行计划树）、慢查询分析、索引建议
- **DataTable 大数据量**：虚拟滚动替代分页，支持 10 万+行流畅浏览；列冻结、批量复制
- **快捷键系统升级**：可自定义快捷键映射、更多全局快捷键
- **连接健康监测**：连接池心跳检测、断线自动重连、连接状态可视化

## Capabilities

### New Capabilities
- `query-builder`: 可视化查询构建器，支持拖拽选择表/字段、自动 JOIN、条件过滤、排序、分组
- `er-diagram`: 从数据库 Schema 自动生成 ER 图，支持交互缩放、点击跳转表结构
- `db-compare-sync`: 数据库结构/数据对比，生成差异报告和迁移脚本
- `data-import`: 从 CSV/JSON/Excel 文件导入数据到表（字段映射、预览、类型推断）
- `query-profiling`: EXPLAIN 执行计划可视化、慢查询分析、索引建议
- `virtual-scroll-table`: 虚拟滚动大数据表格（替代现有分页模式，列冻结、批量复制）
- `shortcut-system`: 可自定义快捷键映射系统
- `connection-health`: 连接池心跳监测、断线自动重连、连接状态可视化

### Modified Capabilities
<!-- No existing specs require requirement-level changes. DataTable 的实现会从分页切换到虚拟滚动，但这属于实现层面的替换，不影响外部行为规范。 -->

## Impact

- **新增依赖**：`@xyflow/react`（流程图/ER 图）、`xlsx`（Excel 导入）、虚拟滚动库
- **新增服务层**：`DiffService`（对比引擎）、`ImportService`（导入管道）、`ProfilingService`（执行计划解析）
- **新增 IPC 通道**：`diff:compare`、`diff:execute`、`import:preview`、`import:execute`、`explain:parse`、`profiling:analyze`、`shortcut:save`
- **架构影响**：中等——新增服务层，不改变现有三层 IPC 模式
- **前端扩展**：流程图组件、虚拟滚动表格、ER 图渲染
- **无破坏性变更**：所有新增功能为可选增强，不影响现有功能
