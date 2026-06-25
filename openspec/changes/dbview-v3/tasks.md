# DBView v0.3.0 任务分解

> 6 周迭代计划，预估总工时约 72 小时

---

## 第1周：基础设施 + 依赖安装（10h）

### 1.1 依赖安装与项目配置

- [x] 1.1.1 安装 `@xyflow/react`、`dagre`、`@tanstack/react-virtual` 依赖
- [x] 1.1.2 安装 `xlsx`、`papaparse` 数据导入依赖
- [x] 1.1.3 更新 `electron.vite.config.ts` 确保新依赖正确打包
- [x] 1.1.4 更新 preload `types.ts` 添加新的 IPC 方法类型声明
- [x] 1.1.5 更新 `api.ts` 添加新的 IPC 调用包装

### 1.2 IPC 通道注册

- [x] 1.2.1 注册 `diff:*` IPC 处理器（compare/compareData/generateScript/executeMigration）
- [x] 1.2.2 注册 `import:*` IPC 处理器（preview/execute/createTable）
- [x] 1.2.3 注册 `profiling:*` IPC 处理器（explain/analyze）
- [x] 1.2.4 注册 `connection:getStatuses` IPC 处理器
- [x] 1.2.5 注册 `shortcut:save` / `shortcut:load` IPC 处理器

---

## 第2周：虚拟滚动 DataTable + 快捷键系统（14h）

### 2.1 虚拟滚动 DataTable

- [x] 2.1.1 创建 `VirtualTable` 组件，集成 `@tanstack/react-virtual`
- [x] 2.1.2 实现列渲染：固定列高、行高、列宽自适应
- [x] 2.1.3 实现列冻结（fixedColumns + scrollableColumns 分区）
- [x] 2.1.4 实现列拖动调整宽度
- [x] 2.1.5 实现列拖动重新排序
- [x] 2.1.6 实现行选择（checkbox + Shift+click 多选）
- [x] 2.1.7 实现复制功能（单单元格、多行 TSV/JSON、带表头）
- [x] 2.1.8 实现 Ctrl+A 全选（全部行，非仅可见行）
- [x] 2.1.9 集成到现有 DataTable 组件，支持分页/虚拟滚动模式切换
- [x] 2.1.10 验证虚拟滚动下编辑模式兼容性

### 2.2 快捷键系统

- [x] 2.2.1 创建 `shortcutStore`（Zustand），管理快捷键映射
- [x] 2.2.2 创建 `useHotkeys` hook，全局键盘事件监听
- [x] 2.2.3 实现快捷键冲突检测逻辑
- [x] 2.2.4 创建 ShortcutSettings 对话框（显示/编辑/重置）
- [x] 2.2.5 实现快捷键配置的导入/导出 JSON
- [x] 2.2.6 实现快捷键持久化（main 进程读写 JSON 文件）
- [x] 2.2.7 注册默认快捷键（Ctrl+Enter 执行、Ctrl+Shift+F 格式化、Ctrl+W 关 Tab、Ctrl+T 新建等）

---

## 第3周：可视化查询构建器（14h）

### 3.1 查询构建器 — 核心

- [x] 3.1.1 创建 QueryBuilder 组件，集成 React Flow 画布
- [x] 3.1.2 实现 `TableNode` 自定义节点（显示表名、列 checkbox、列类型）
- [x] 3.1.3 实现从数据库树拖拽表到画布
- [x] 3.1.4 实现 `JoinEdge` 自定义连线（可点击切换 JOIN 类型）
- [x] 3.1.5 实现自动检测 FK 关系并添加 JOIN
- [x] 3.1.6 实现手动拖拽字段建立 JOIN

### 3.2 查询构建器 — SQL 生成

- [x] 3.2.1 实现 `QueryGraph` 中间结构（拓扑排序）
- [x] 3.2.2 实现 `SQLBuilder` 从 QueryGraph 生成 SQL
- [x] 3.2.3 支持 SELECT 字段选择、WHERE 条件、ORDER BY、GROUP BY、HAVING
- [x] 3.2.4 支持 JOIN 类型切换（INNER/LEFT/RIGHT/FULL/CROSS）
- [x] 3.2.5 实现 SQL 预览（CodeMirror 只读视图）
- [x] 3.2.6 实现"执行"和"发送到编辑器"按钮
- [x] 3.2.7 实现查询构建器状态持久化（切换 Tab 不丢失）

---

## 第4周：ER 图 + 连接健康监测（12h）

### 4.1 ER 图

- [ ] 4.1.1 在 main 进程创建 `getErDiagramData` 查询（获取表/列/PK/FK 元数据）
- [ ] 4.1.2 创建 ERDiagram 组件，集成 React Flow + dagre 自动布局
- [ ] 4.1.3 实现表实体节点渲染（表名、PK 图标、列类型）
- [ ] 4.1.4 实现关系连线（带基数标记 1:1/1:N/N:M）
- [ ] 4.1.5 实现缩放/平移/双击聚焦
- [ ] 4.1.6 实现点击表节点跳转到结构视图
- [ ] 4.1.7 实现搜索过滤表、显示相关表、显示全部
- [ ] 4.1.8 实现布局持久化（保存/恢复节点位置）

### 4.2 连接健康监测

- [ ] 4.2.1 ConnectionManager 增加心跳定时器管理
- [ ] 4.2.2 实现 `SELECT 1` 心跳查询（可配置间隔）
- [ ] 4.2.3 实现自动重连逻辑（3 次重试，10 秒间隔）
- [ ] 4.2.4 实现连接状态指示器（绿/黄/红/灰圆点）
- [ ] 4.2.5 实现状态 tooltip 显示详情
- [ ] 4.2.6 实现断连通知提示

---

## 第5周：数据库对比同步 + 数据导入（12h）

### 5.1 数据库对比/同步

- [ ] 5.1.1 创建 `DiffService`（StructureComparer 组件）
- [ ] 5.1.2 实现表级对比（新增/缺失/修改/相同）
- [ ] 5.1.3 实现列级对比（类型/可空/默认值差异）
- [ ] 5.1.4 实现索引级对比
- [ ] 5.1.5 创建 DiffViewer 组件（结构对比结果展示）
- [ ] 5.1.6 实现 `MigrationGenerator`（从差异生成 ALTER DDL）
- [ ] 5.1.7 实现迁移 SQL 预览和执行
- [ ] 5.1.8 实现 Dry Run 模式
- [ ] 5.1.9 实现数据对比（按主键逐行对比）

### 5.2 数据导入

- [ ] 5.2.1 创建 `ImportService`（CsvParser 组件）
- [ ] 5.2.2 实现 CSV 解析（编码检测、类型推断）
- [ ] 5.2.3 实现 JSON 解析（数组对象、嵌套展平）
- [ ] 5.2.4 实现 Excel 解析（多 sheet 选择）
- [ ] 5.2.5 创建 DataImport 组件（文件选择、预览、字段映射）
- [ ] 5.2.6 实现字段映射 UI（拖拽匹配 CSV 列 → 表列）
- [ ] 5.2.7 实现类型不匹配警告
- [ ] 5.2.8 实现分批导入（可配置批次大小，进度反馈）
- [ ] 5.2.9 实现导入错误处理（跳过/重试/中止）
- [ ] 5.2.10 实现从导入数据创建新表

---

## 第6周：查询性能分析 + 集成测试（10h）

### 6.1 查询性能分析

- [ ] 6.1.1 扩展 DatabaseDriver 接口增加 `explainQuery(sql)` 方法
- [ ] 6.1.2 MySQL 驱动实现 `EXPLAIN FORMAT=JSON`
- [ ] 6.1.3 PostgreSQL 驱动实现 `EXPLAIN (ANALYZE, FORMAT JSON)`
- [ ] 6.1.4 SQLite 驱动实现 `EXPLAIN QUERY PLAN` + 格式转换
- [ ] 6.1.5 Oracle 驱动实现 `EXPLAIN PLAN FOR` + `DBMS_XPLAN.DISPLAY`
- [ ] 6.1.6 创建 ExplainTree 组件（React Flow 树形可视化）
- [ ] 6.1.7 实现节点颜色编码（绿色→黄色→红色按成本）
- [ ] 6.1.8 实现节点详情展开面板
- [ ] 6.1.9 实现慢查询日志面板
- [ ] 6.1.10 实现索引建议（Seq Scan + WHERE 条件 → 建议 CREATE INDEX）

### 6.2 集成验证

- [ ] 6.2.1 端到端验证：查询构建器 → 生成 SQL → 执行 → 结果在虚拟滚动表中显示
- [ ] 6.2.2 端到端验证：ER 图 → 点击表 → 打开结构视图
- [ ] 6.2.3 端到端验证：结构对比 → 生成迁移 → 预览 → 执行
- [ ] 6.2.4 端到端验证：CSV 导入 → 字段映射 → 批量写入 → 验证数据
- [ ] 6.2.5 端到端验证：EXPLAIN → 可视化 → 索引建议

---

## 总汇总

| 周次 | 内容 | 工时 | 累计 |
|------|------|------|------|
| 第1周 | 基础设施 + 依赖安装 | 10h | 10h |
| 第2周 | 虚拟滚动 DataTable + 快捷键系统 | 14h | 24h |
| 第3周 | 可视化查询构建器 | 14h | 38h |
| 第4周 | ER 图 + 连接健康监测 | 12h | 50h |
| 第5周 | 数据库对比同步 + 数据导入 | 12h | 62h |
| 第6周 | 查询性能分析 + 集成测试 | 10h | 72h |
