# DBView v0.2.0 任务分解

> 4 周迭代计划，预估总工时约 56 小时

---

## �?周：P1 核心修复�?.5h�?

### P1-4 connection-readonly�?.5h�?
- [x] 修复 `connection-store.ts` �?`getById()` SELECT 列表补上 `read_only` 字段

### P1-1 datatable-pagination�?h�?
- [x] DataTable 编辑模式下分�?排序/刷新前检�?`pendingChanges`
- [x] 有未保存更改时弹出确认对话框（保存并继续 / 丢弃并继�?/ 取消�?
- [x] 无更改时直接切换

### P1-2 column-type-filter�?h�?
- [x] �?`COLUMN_TYPES` 重构�?`COLUMN_TYPES_BY_DB` 映射�?
- [x] ColumnDialog 根据 `dbType` prop 选择对应类型列表
- [x] 验证四种数据库的类型列表完整�?

### P1-3 ddl-viewer-dialect�?h�?
- [x] DDLViewer 新增 `dbType` prop
- [x] 根据 dbType 选择 CodeMirror SQL 方言
- [x] StructurePage 传入 dbType

### P1-6 sql-editor-rebuild�?h�?
- [x] EditorView destroy 前保�?`doc.toString()`
- [x] 重建时传入保存的内容作为 `doc`
- [x] 验证主题切换和数据库切换场景

## �?周：P1 收尾 + P2 国际化（15h�?

### P1-5 query-history-pagination�?h�?
- [ ] HistoryStore.list() 新增分页参数支持
- [ ] QueryHistory 组件新增"加载更多"按钮
- [ ] DatabaseTree 查询文件夹显示更多入�?

### P1-7 connection-entry-unify�?h�?
- [ ] 逐一比对 ConnectionPage �?DatabaseTree �?CRUD 功能差异
- [ ] 确保 DatabaseTree 覆盖所有功�?
- [ ] 删除 ConnectionPage.tsx 和相关引�?
- [ ] 验证回归

### P2-6 i18n-activation�?h�?
- [ ] 逐个组件扫描硬编码中文，替换�?`t('key')`
- [ ] 补充翻译文件中缺失的条目
- [ ] 验证中英文切换效�?

## �?周：P2 体验优化�?7h�?

### P2-7 codemirror-dialect�?h�?
- [ ] �?SQLite �?Oracle 配置自定�?`SQLConfig` 关键字列�?
- [ ] 注册自定�?CodeMirror 方言

### P2-8 tree-history-more�?h�?
- [ ] 树中查询文件夹底部添�?查看更多"按钮
- [ ] 点击后打开 QueryHistory 面板

### P2-9 oracle-form-improve�?h�?
- [ ] 调整 oracleServiceName 字段位置
- [ ] Oracle 类型下自动填充默认�?`xe`
- [ ] 增加 Tooltip 提示

### P2-10 tree-refresh-flicker�?h�?
- [ ] 刷新时保留旧 children 直到新数据加载完�?
- [ ] 使用 `updateTreeNode` 局部更新代替整体替�?

### P2-1 sql-log-persist�?h�?
- [ ] SqlLogService 增加 sql.js 持久化存�?
- [ ] 新建日志表（conn_id, sql, category, timestamp 等）
- [ ] 日志面板新增日期范围筛�?
- [ ] 保留内存缓存保证实时性能

### P2-5 connection-form-reorder�?h）→ 合并�?P2-9
- [ ] 优化连接表单字段排列顺序

## �?周：P2 工程基建�?4h�?

### P2-11 test-coverage�?6h�?
- [ ] 安装 vitest，配�?`vitest.config.ts`
- [ ] DDL 生成测试：SchemaEditor.generateDDL 四种数据库覆�?
- [ ] DML 生成测试：DataTable �?UPDATE/INSERT/DELETE 语句生成
- [ ] 导出格式化测试：CSV/JSON/SQL 格式�?
- [ ] SQL 引用测试：quoteId / quoteTable 四种数据�?
- [ ] CI 集成：在 GitHub Actions 中运行测�?

### P2-2 build-package�?h�?
- [ ] 配置 `electron-builder.yml`（Windows NSIS + macOS dmg�?
- [ ] 配置应用图标和应用元数据
- [ ] 验证 `pnpm build && electron-builder` 生成安装�?
- [ ] 配置 `electron-updater` 自动更新（可选）

---

## 总汇�?

| 周次 | 内容 | 工时 | 累计 |
|------|------|------|------|
| �?�?| P1 核心修复 | 7.5h | 7.5h |
| �?�?| P1 收尾 + 国际�?| 15h | 22.5h |
| �?�?| P2 体验优化 | 17h | 39.5h |
| �?�?| P2 工程基建 | 24h | 63.5h |
