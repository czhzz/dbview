## 1. 数据库驱动扩展

- [x] 1.1 新增 PostgreSQL 驱动 `pg-driver.ts`，实现 DatabaseDriver 接口全部方法
- [x] 1.2 新增 SQLite 驱动 `sqlite-driver.ts`，基于 better-sqlite3 实现
- [x] 1.3 新增 Oracle 驱动 `oracle-driver.ts`，基于 oracledb 实现
- [x] 1.4 更新 DriverFactory，支持注册和创建 PostgreSQL / SQLite / Oracle 驱动
- [x] 1.5 更新 `electron.vite.config.ts`，正确 externalize 新增的原生驱动
- [x] 1.6 更新连接表单，按数据库类型动态显示配置字段（Oracle 服务名/SID、SQLite 文件选择）

## 2. 查询取消机制

- [x] 2.1 在 DatabaseDriver 接口中添加可选的 `AbortSignal` 参数到 `executeQuery`
- [x] 2.2 在 ConnectionManager 中维护查询 ID → AbortController 映射
- [x] 2.3 实现 MySQL 驱动的查询取消（通过重建连接）
- [x] 2.4 实现 PostgreSQL 驱动的查询取消（通过 `client.query().abort()`）
- [x] 2.5 更新 `sql:cancel` IPC 处理器使用 AbortController
- [x] 2.6 前端 SQL 编辑器添加"取消执行"按钮，绑定取消信号

## 3. 数据导出

- [ ] 3.1 实现 CSV 格式化工具函数（含 BOM 头、特殊字符转义）
- [ ] 3.2 实现 JSON 格式化工具函数
- [ ] 3.3 实现 SQL INSERT 格式化工具函数
- [ ] 3.4 创建 DataExport 组件，包含导出按钮和下拉菜单
- [ ] 3.5 实现"导出当前页"功能
- [ ] 3.6 实现"导出全部"功能（分页拉取 + 进度显示）
- [ ] 3.7 集成 Electron dialog.showSaveDialog 选择保存路径

## 4. SQL 编辑器增强

- [ ] 4.1 集成 `sql-formatter` 库，添加 SQL 格式化按钮
- [ ] 4.2 按数据库类型（MySQL/PG/Oracle/SQLite）选择格式化方言
- [ ] 4.3 添加常用快捷键支持（Ctrl+Enter 执行、Ctrl+S 格式化）
- [ ] 4.4 查询历史持久化存储（主进程 sql.js 新建历史表）
- [ ] 4.5 创建 QueryHistory 侧边面板组件（列表、搜索、点击加载）

## 5. 表数据编辑

- [ ] 5.1 DataTable 组件增加编辑模式切换
- [ ] 5.2 实现单元格双击进入编辑（输入框/下拉框切换）
- [ ] 5.3 实现修改追踪：记录变更的单元格、原始值、新值
- [ ] 5.4 实现添加行功能
- [ ] 5.5 实现删除行功能（含确认对话框）
- [ ] 5.6 实现批量保存更改（生成 UPDATE/INSERT/DELETE 并顺序执行）
- [ ] 5.7 实现取消编辑（丢弃所有待保存更改）
- [ ] 5.8 DataTable 增加编辑工具栏按钮（保存/取消/添加/删除）

## 6. 表结构编辑

- [ ] 6.1 创建 SchemaEditor 组件，显示当前表结构并支持编辑
- [ ] 6.2 实现添加列的对话框和 DDL 生成
- [ ] 6.3 实现修改列的对话框和 DDL 生成
- [ ] 6.4 实现删除列（含确认对话框）
- [ ] 6.5 实现添加/删除索引
- [ ] 6.6 实现 SQL 预览对话框（执行前显示 DDL 并确认）

## 7. 国际化 (i18n)

- [ ] 7.1 安装 i18next + react-i18next 依赖
- [ ] 7.2 创建中文翻译文件 `locales/zh/translation.json`
- [ ] 7.3 创建英文翻译文件 `locales/en/translation.json`
- [ ] 7.4 初始化 i18next 实例，集成到 React 应用入口
- [ ] 7.5 Ant Design ConfigProvider 语言联动
- [ ] 7.6 创建设置界面语言切换入口
- [ ] 7.7 语言偏好持久化（localStorage）

## 8. 暗色主题

- [ ] 8.1 创建 useTheme Hook，管理亮色/暗色/跟随系统三种模式
- [ ] 8.2 Ant Design ConfigProvider 主题算法切换
- [ ] 8.3 CodeMirror 编辑器主题联动（One Dark / 亮色）
- [ ] 8.4 自定义 CSS 变量覆盖暗色模式样式
- [ ] 8.5 主题偏好持久化
- [ ] 8.6 主题切换按钮集成到界面

## 9. 连接分组管理

- [ ] 9.1 数据库 schema 增加分组表（group 表 + connection 的分组字段）
- [ ] 9.2 主进程增加分组 CRUD 的 IPC 处理器
- [ ] 9.3 创建 ConnectionGroups 组件（创建/重命名/删除分组）
- [ ] 9.4 连接表单增加分组选择下拉框
- [ ] 9.5 连接列表按分组显示/折叠

## 10. 存储过程和函数浏览

- [ ] 10.1 MySQL 驱动扩展：查询存储过程和函数列表
- [ ] 10.2 MySQL 驱动扩展：获取存储过程和函数的定义源码
- [ ] 10.3 PostgreSQL 驱动扩展：查询存储过程和函数
- [ ] 10.4 Oracle 驱动扩展：查询存储过程和函数
- [ ] 10.5 数据库树增加"存储过程"和"函数"分类节点
- [ ] 10.6 实现存储过程/函数定义查看（只读编辑器标签页）
- [ ] 10.7 实现存储过程执行对话框（参数输入 + 结果显示）