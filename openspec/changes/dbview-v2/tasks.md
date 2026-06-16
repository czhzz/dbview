# DBView v0.2.0 任务分解

> 4 周迭代计划，预估总工时约 56 小时

---

## 第1周：P1 核心修复（7.5h）

### P1-4 connection-readonly（0.5h）
- [x] 修复 `connection-store.ts` 中 `getById()` SELECT 列表补上 `read_only` 字段

### P1-1 datatable-pagination（2h）
- [x] DataTable 编辑模式下分页/排序/刷新前检查 `pendingChanges`
- [x] 有未保存更改时弹出确认对话框（保存并继续 / 丢弃并继续 / 取消）
- [x] 无更改时直接切换

### P1-2 column-type-filter（2h）
- [x] 将 `COLUMN_TYPES` 重构为 `COLUMN_TYPES_BY_DB` 映射表
- [x] ColumnDialog 根据 `dbType` prop 选择对应类型列表
- [x] 验证四种数据库的类型列表完整性

### P1-3 ddl-viewer-dialect（1h）
- [x] DDLViewer 新增 `dbType` prop
- [x] 根据 dbType 选择 CodeMirror SQL 方言
- [x] StructurePage 传入 dbType

### P1-6 sql-editor-rebuild（2h）
- [x] EditorView destroy 前保存 `doc.toString()`
- [x] 重建时传入保存的内容作为 `doc`
- [x] 验证主题切换和数据库切换场景

## 第2周：P1 收尾 + P2 国际化（15h）

### P1-5 query-history-pagination（3h）
- [x] HistoryStore.list() 新增分页参数支持
- [x] QueryHistory 组件新增"加载更多"按钮
- [x] DatabaseTree 查询文件夹显示更多入口

### P1-7 connection-entry-unify（4h）
- [x] 逐一比对 ConnectionPage 和 DatabaseTree 的 CRUD 功能差异
- [x] 确保 DatabaseTree 覆盖所有功能
- [x] 删除 ConnectionPage.tsx 和相关引用
- [x] 验证回归

### P2-6 i18n-activation（8h）
- [ ] 逐个组件扫描硬编码中文，替换为 `t('key')`
- [ ] 补充翻译文件中缺失的条目
- [ ] 验证中英文切换效果

## 第3周：P2 体验优化（17h）

### P2-7 codemirror-dialect（2h）
- [ ] 为 SQLite 和 Oracle 配置自定义 `SQLConfig` 关键字列表
- [ ] 注册自定义 CodeMirror 方言

### P2-8 tree-history-more（2h）
- [ ] 树中查询文件夹底部添加"查看更多"按钮
- [ ] 点击后打开 QueryHistory 面板

### P2-9 oracle-form-improve（1h）
- [ ] 调整 oracleServiceName 字段位置
- [ ] Oracle 类型下自动填充默认值 `xe`
- [ ] 增加 Tooltip 提示

### P2-10 tree-refresh-flicker（2h）
- [ ] 刷新时保留旧 children 直到新数据加载完成
- [ ] 使用 `updateTreeNode` 局部更新代替整体替换

### P2-1 sql-log-persist（6h）
- [ ] SqlLogService 增加 sql.js 持久化存储
- [ ] 新建日志表（conn_id, sql, category, timestamp 等）
- [ ] 日志面板新增日期范围筛选
- [ ] 保留内存缓存保证实时性能

### P2-5 connection-form-reorder（1h）→ 合并到 P2-9
- [ ] 优化连接表单字段排列顺序

## 第4周：P2 工程基建（24h）

### P2-11 test-coverage（16h）
- [ ] 安装 vitest，配置 `vitest.config.ts`
- [ ] DDL 生成测试：SchemaEditor.generateDDL 四种数据库覆盖
- [ ] DML 生成测试：DataTable 的 UPDATE/INSERT/DELETE 语句生成
- [ ] 导出格式化测试：CSV/JSON/SQL 格式化
- [ ] SQL 引用测试：quoteId / quoteTable 四种数据库
- [ ] CI 集成：在 GitHub Actions 中运行测试

### P2-2 build-package（8h）
- [ ] 配置 `electron-builder.yml`（Windows NSIS + macOS dmg）
- [ ] 配置应用图标和应用元数据
- [ ] 验证 `pnpm build && electron-builder` 生成安装包
- [ ] 配置 `electron-updater` 自动更新（可选）

---

## 总汇总

| 周次 | 内容 | 工时 | 累计 |
|------|------|------|------|
| 第1周 | P1 核心修复 | 7.5h | 7.5h |
| 第2周 | P1 收尾 + 国际化 | 15h | 22.5h |
| 第3周 | P2 体验优化 | 17h | 39.5h |
| 第4周 | P2 工程基建 | 24h | 63.5h |
