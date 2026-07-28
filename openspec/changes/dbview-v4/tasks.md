## 1. Driver 层 — createDatabase 接口

- [ ] 1.1 在 `DatabaseDriver` 接口中新增 `createDatabase(name: string): Promise<void>` 方法
- [ ] 1.2 MySQL 驱动实现 `createDatabase()` — `CREATE DATABASE \`name\` CHARACTER SET utf8mb4`
- [ ] 1.3 PostgreSQL 驱动实现 `createDatabase()` — 连接 `postgres` 库执行 `CREATE DATABASE`
- [ ] 1.4 SQLite 驱动实现 `createDatabase()` — 由 IPC 层处理文件创建，驱动层不做额外操作
- [ ] 1.5 Oracle 驱动实现 `createDatabase()` — 抛出"不支持"错误

## 2. IPC 层 — 新增通道

- [ ] 2.1 新增 `database:createDatabase` IPC 通道（SQLite 特殊处理：先弹保存对话框创建文件）
- [ ] 2.2 新增 `database:exportSQL` IPC 通道 — 收集 DDL + 数据，返回 SQL 文本
- [ ] 2.3 新增 `database:importSQL` IPC 通道 — 接收 SQL 文本，分割并执行多语句
- [ ] 2.5 在 `src/preload/types.ts` 中新增对应类型定义（database + menu）
- [ ] 2.6 在 `src/renderer/services/api.ts` 中新增对应 API 包装函数

## 3. 侧边栏右键菜单扩展

- [ ] 3.1 连接节点右键菜单新增"新建数据库"项（Oracle 连接隐藏），弹窗输入数据库名，调用 `database:createDatabase`
- [ ] 3.2 数据库节点右键菜单新增"新增表"项，打开 CreateTableDialog 并预填 schema
- [ ] 3.3 表节点右键菜单新增"查看 DDL"项，调用 `database:getDDL` 并在 SQL 编辑器 Tab 打开
- [ ] 3.4 新增翻译键：`databaseTree.newDatabase`、`databaseTree.newTable`、`databaseTree.viewDDL`、`databaseTree.exportSQL`、`databaseTree.importSQL`

## 4. Create Table 对话框

- [ ] 4.1 新增 `CreateTableDialog` 组件 — 表名/注释输入 + 列定义列表 + 索引定义列表
- [ ] 4.2 在 `ddl-generator.ts` 中新增 `generateCreateTableDDL()` 函数，支持 4 种方言
- [ ] 4.3 在 `StructurePage` 中新增"新建表"按钮入口
- [ ] 4.4 新增翻译键：`table.createTable`、`table.tableName`、`table.tableComment`、`table.addColumn`、`table.addIndex`

## 5. Alter Table 表名/注释修改

- [ ] 5.1 在 `StructurePage` 表头区域新增表名和表注释的编辑功能
- [ ] 5.2 在 `ddl-generator.ts` 中新增 `generateRenameTableDDL()` 和 `generateTableCommentDDL()` 函数
- [ ] 5.3 新增翻译键：`table.renameTable`、`table.editTableComment`

## 6. SQL 导出

- [ ] 6.1 新增 `ExportService`（main 进程），实现 `exportDatabase()` 和 `exportTable()` 方法
- [ ] 6.2 数据库节点右键菜单新增"导出 SQL"项，弹出保存对话框
- [ ] 6.3 表节点右键菜单新增"导出 SQL"项，弹出保存对话框
- [ ] 6.4 新增翻译键：`dataExport.sqlExport`、`dataExport.structureOnly`、`dataExport.structureAndData`

## 7. SQL 导入

- [ ] 7.1 在 `ImportService` 中扩展 `executeScript()` 方法，支持多语句分割和执行
- [ ] 7.2 实现 DELIMITER 指令解析（处理存储过程/函数中的分号）
- [ ] 7.3 数据库节点右键菜单新增"导入 SQL"项，弹出文件选择对话框
- [ ] 7.4 新增翻译键：`dataImport.sqlImport`、`dataImport.importSuccess`、`dataImport.importFailed`

## 8. 应用菜单中文化

- [ ] 8.1 新建 `src/main/menu.ts` — 定义 `buildMenu(locale)` 函数，返回中/英文菜单模板
- [ ] 8.2 在 `src/main/index.ts` 中 `app.whenReady()` 时调用 `Menu.setApplicationMenu(buildMenu('zh'))`
- [ ] 8.3 新增 IPC 通道 `app:setLanguage` — 渲染进程切换语言时通知 main 进程重建菜单
- [ ] 8.4 在 `src/renderer/i18n/index.ts` 的语言切换函数中调用 `app:setLanguage` IPC
- [ ] 8.5 菜单结构：文件（新建连接/退出）、编辑（撤销/重做/剪切/复制/粘贴/全选）、视图（重载/开发者工具/缩放）、帮助（关于）

## 9. 验证与测试

- [ ] 9.1 MySQL 连接测试：新建数据库、新建表、修改表名/注释、导出 SQL、导入 SQL
- [ ] 9.2 PostgreSQL 连接测试：同上
- [ ] 9.3 SQLite 连接测试：新建数据库（文件创建）、新建表、导出 SQL、导入 SQL
- [ ] 9.4 切换中英文验证应用菜单栏标签同步更新
- [ ] 9.5 运行 `pnpm build` 确保无编译错误