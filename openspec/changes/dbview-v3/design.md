## Context

DBView 当前架构为三层 IPC 模式：Renderer (React 19 + Zustand + Ant Design 5) → Preload Bridge → Main Process (Node.js + 原生数据库驱动)。v0.2.0 将所有改动限制在现有层内，实现了零架构变更。

v0.3.0 的目标是引入四类需要新服务层的能力——可视化查询构建、数据库对比同步、数据导入、查询性能分析——这些能力无法在现有服务层上零成本扩展，需要新增 main 进程服务和 renderer 进程组件。

当前架构约束：
- 所有数据库交互必须经过 main 进程（原生驱动限制）
- IPC 通道格式为 `domain:action`，request/response 模式
- 渲染进程通过 `api.ts` 类型安全包装调用 IPC
- 无 main→renderer 推送机制，状态变化需要 renderer 主动轮询或通过 IPC 响应更新

## Goals / Non-Goals

**Goals:**
- 可视化查询构建器：拖拽构建 SQL SELECT，支持 JOIN/WHERE/ORDER BY/GROUP BY/HAVING
- ER 图可视化：从 INFORMATION_SCHEMA 自动生成 ER 图
- 数据库对比/同步：结构对比（表/列/索引） + 数据对比 + 迁移脚本生成
- 数据导入：CSV/JSON/Excel → 数据库表（字段映射、类型推断、批量写入）
- 查询性能分析：EXPLAIN 可视化、慢查询分析、索引建议
- 虚拟滚动大数据表格：替代分页模式，支持 10 万+行
- 快捷键系统升级：可自定义快捷键映射
- 连接健康监测：心跳检测、自动重连、状态可视化

**Non-Goals:**
- 跨数据库数据迁移（结构对比同步本身是跨库的，但数据迁移不在本次范围）
- 数据库备份/恢复（v4+）
- 实时协作（v4+）
- AI 自然语言查询（v4+）
- 命令行模式（CLI）

## Decisions

### 1. 可视化查询构建器 — React Flow + SQL AST 生成

**决策**：使用 `@xyflow/react` (React Flow) 作为画布引擎，自定义节点类型表示表和 JOIN，从图状态生成 SQL AST 再序列化为 SQL 字符串。

```
[表节点] → [JOIN 连线] → [SQL 生成器] → SQL 字符串
                                          ↓
                                   CodeMirror 预览
                                          ↓
                                   执行 / 发送到编辑器
```

**节点类型**：
- `TableNode`：表实体，显示列名 + checkbox 选择输出列
- `JoinEdge`：表间连线，可点击切换 JOIN 类型
- `FilterPanel`：底部面板，WHERE/HAVING 条件编辑
- `SortPanel`：底部面板，ORDER BY 配置

**SQL 生成策略**：
```
Input: 图状态（选中的表、字段、JOIN、过滤条件、排序）
  → QueryGraph 中间结构（图遍历、拓扑排序）
  → SQLBuilder 生成 SELECT ... FROM ... JOIN ... WHERE ... ORDER BY ... LIMIT
```

**备选方案**：
- 手写 Canvas 实现 → 否决，开发成本过高
- 使用 SQL.js 在 main 进程解析 → 否决，查询构建器是 UI 密集型任务，在 renderer 进程实现更合理

### 2. ER 图 — React Flow + dagre 自动布局

**决策**：复用 React Flow，使用 `dagre` 库进行自动布局计算，数据源为 main 进程返回的 Schema 元数据。

**数据流**：
```
Main Process: 查询 INFORMATION_SCHEMA → 表/列/PK/FK 元数据
  → IPC (schema:getErDiagramData)
  → Renderer: React Flow 渲染
  → dagre: 自动布局算法
```

**备选方案**：
- `react-flow` 单独使用（不 dagre） → 布局结果不可预测，需要自动布局
- D3.js force layout → 更灵活但 React 集成不如 React Flow + dagre 自然

### 3. 数据库对比/同步 — 新的 DiffService

**决策**：在 main 进程创建 `DiffService`，通过驱动层获取元数据后，在 Node.js 中进行 diff 计算。

```
DiffService
├── StructureComparer     # 对比表/列/索引/约束
├── DataComparer          # 按主键逐行对比数据
├── MigrationGenerator    # 从 diff 结果生成 ALTER DDL
└── MigrationExecutor     # 逐语句执行迁移 SQL
```

**IPC 通道**：
- `diff:compare` → 执行结构对比，返回 DiffReport
- `diff:compareData` → 执行数据对比，返回 DataDiffReport
- `diff:generateScript` → 从 DiffReport 生成迁移 SQL
- `diff:executeMigration` → 执行迁移 SQL，返回执行结果

**对比策略**：
- 结构对比：从两个源的 `DatabaseDriver.getTables()` / `getColumns()` / `getIndexes()` 获取元数据，用 key 做集合差集
- 数据对比：以主键为 key，分批拉取数据（每次 1000 行），逐行对比

**备选方案**：
- 在 renderer 进程做 diff → 否决，大量 Schema 数据传输到 renderer 效率低
- 使用第三方 diff 库 → 结构对比逻辑高度定制，自实现更可控

### 4. 数据导入 — ImportService + 批处理

**决策**：在 main 进程创建 `ImportService`，文件解析在 main 进程完成，批处理写入数据库。

```
ImportService
├── CsvParser (内置实现或 papaparse)
├── JsonParser (JSON.parse + 结构推断)
├── ExcelParser (xlsx 库)
├── TypeInferrer (从样本数据推断目标列类型)
└── BatchInserter (分批 INSERT，默认 1000 条/批)
```

**IPC 通道**：
- `import:preview` → 解析文件前 N 行，返回预览数据 + 类型推断
- `import:execute` → 执行导入（含进度回调）
- `import:createTable` → 根据推断的结构生成 CREATE TABLE

**文件解析位置**：main 进程。原因是文件读取需要 Node.js fs 模块，且 CSV/Excel 解析不涉及 DOM，在 main 进程更高效。

**进度反馈**：由于当前架构无 main→renderer 推送，导入进度通过 IPC 响应分块返回（每批完成后返回一条进度更新）。

**备选方案**：
- Renderer 进程解析（通过 Electron file dialog + File API）→ CSV 小文件可接受，Excel 需要 xlsx 库在 browser 环境运行，兼容性不如 Node.js

### 5. 查询性能分析 — 驱动层 EXPLAIN 扩展 + 前端可视化

**决策**：在现有 DatabaseDriver 接口扩展 `explainQuery(sql)` 方法，各驱动返回统一格式的执行计划 JSON，前端用 React Flow 渲染为树形图。

```
DatabaseDriver.explainQuery(sql) → UnifiedExplainPlan[]
  ├── MySQL: EXPLAIN FORMAT=JSON
  ├── PostgreSQL: EXPLAIN (ANALYZE, FORMAT JSON)
  ├── SQLite: EXPLAIN QUERY PLAN
  └── Oracle: EXPLAIN PLAN FOR + DBMS_XPLAN.DISPLAY
```

**统一格式**：
```typescript
interface UnifiedExplainPlan {
  operation: string       // "Seq Scan", "Index Scan", "Nested Loop", etc.
  nodeType: string        // "scan", "join", "sort", "aggregate", etc.
  estimatedRows: number
  estimatedCost: number
  actualRows?: number     // 仅 ANALYZE 模式
  actualTime?: number     // 仅 ANALYZE 模式
  details: Record<string, any>  // 驱动特定详情
  children: UnifiedExplainPlan[]
}
```

**索引建议逻辑**：在 renderer 进程实现（轻量规则引擎），扫描 EXPLAIN 结果中标记为红色的 "Seq Scan" 节点，检查是否有 WHERE 条件列，建议加索引。

### 6. 虚拟滚动 DataTable — TanStack Virtual

**决策**：使用 `@tanstack/react-virtual` 实现虚拟滚动表格，替换现有 Ant Design Table 的分页模式。

**架构**：
- 保留现有 DataTable 组件接口（columns、dataSource），内部渲染从 Ant Design Table 切换为虚拟滚动表格
- 数据一次性加载到内存（通过新的 `sql:executeAll` IPC 查询全部数据）
- 编辑模式与虚拟滚动兼容（编辑缓存独立于滚动）
- 分页模式作为可选替代保留（通过 toggle 按钮切换）

**列冻结实现**：将表格分为 `fixedColumns` + `scrollableColumns` 两个虚拟滚动区域，用 CSS `position: sticky` 实现固定列。

**备选方案**：
- Ant Design Table 自带虚拟滚动（`virtual` prop）→ Ant Design 5 的虚拟滚动在大数据量下性能不稳定
- react-window → 功能完整但 API 不够灵活，TanStack Virtual 社区更活跃

### 7. 快捷键系统 — JSON 配置文件 + Zustand store

**决策**：快捷键映射存储为 JSON 文件（`userData/shortcuts.json`），在 renderer 进程通过 Zustand store 管理，全局 `useEffect` 注册/注销事件监听。

**数据流**：
```
shortcuts.json → load on startup → shortcutsStore (Zustand)
                                     ↓
                            useHotkeys hook → 全局键盘监听
                                     ↓
                            dispatch action
```

**冲突检测**：store 的 `setShortcut` 方法在更新前遍历所有已注册快捷键，检查是否有重复组合键。

### 8. 连接健康监测 — ConnectionManager 扩展

**决策**：在 `ConnectionManager` 中新增心跳定时器管理，通过现有的 IPC 响应通道返回状态变化。

**心跳机制**：
- 每个连接建立后，在 `PoolEntry` 中注册一个 `setInterval` 定时器
- 定时器执行 `SELECT 1` 或等效轻量查询
- 失败时更新连接状态为 "disconnected"，启动自动重连逻辑
- 状态变更通过新的 IPC 通道 `connection:statusChanged` 通知渲染进程

> ⚠️ 由于当前架构无 main→renderer 推送，状态变更通知通过渲染进程定期轮询 `connection:getStatuses` 实现（默认每 30 秒）。未来可迁移到推送模式（如 Electron IPC send + on 或 WebSocket）。

## 架构影响总览

```
Renderer (React)                     Main Process
─────────────────                    ─────────────────────
QueryBuilder (React Flow)            
ERDiagram (React Flow + dagre)       DiffService
DataTable (TanStack Virtual)          ├── StructureComparer
DataImportPanel                        ├── DataComparer
ProfilingPanel                         ├── MigrationGenerator
  ├── ExplainTree (React Flow)         └── MigrationExecutor
  └── IndexAdvisor
                                     ImportService
ShortcutsSettings                      ├── CsvParser
                                       ├── JsonParser
ConnectionStore (扩展)                 ├── ExcelParser
                                       ├── TypeInferrer
                                       └── BatchInserter

                                     ConnectionManager (扩展)
                                       └── HeartbeatManager

Preload (扩展类型声明)
  └── ElectronAPI 增加新 IPC 方法
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| React Flow 在大量节点（50+表）时性能下降 | 限制 ER 图默认显示全部表但支持按名称过滤；使用 React Flow 的 `fitView` 和节点懒加载 |
| 虚拟滚动与 DataTable 编辑模式兼容 | 编辑缓存与行索引解耦（使用主键作为编辑 key），滚动不丢失编辑状态 |
| 大量数据导入（100万+行）可能内存溢出 | 流式解析（CSV 逐行读取），批处理写入，不一次性加载全部文件到内存 |
| SSH 隧道 + 心跳可能产生额外网络开销 | 心跳使用最轻量查询（SELECT 1），间隔可配置或关闭 |
| SQLite 的 EXPLAIN 输出格式与其他 DB 差异大 | SQLite 驱动中做格式转换适配到 `UnifiedExplainPlan` |
| 结构对比在表数量极大时（500+表）可能耗时 | 首次对比后缓存元数据，增量对比仅检查 `last_modified` |
| 快捷键自定义与 Ant Design 内置快捷键冲突 | 自定义快捷键优先级高于 Ant Design 内置；提供冲突检测警告 |

## Open Questions

1. **React Flow 的商业许可**：`@xyflow/react` 在 MIT 许可下对个人和小团队免费，但需要确认商业使用条款。如果需要，备选为 `reactflow`（旧版，MIT）。

2. **导入进度推送**：当前无 main→renderer 推送机制，导入进度通过分块响应模拟。v4 是否应引入 WebSocket 或 IPC push 机制？

3. **大数据量的虚拟滚动**：10万行全部加载到内存的可行性——对于单行有大量列（30+列）的表，10万行 × 30列可能达到 ~200MB+ 内存占用。是否需要分层策略（虚拟滚动 + 按需加载列数据）？
