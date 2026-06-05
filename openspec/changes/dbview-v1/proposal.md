## Why

DBView 目前是一个仅支持 MySQL 的数据库浏览工具雏形，具备连接管理、数据库树浏览、数据查看和 SQL 执行等基础能力。1.0 版本的目标是将它完善为一个真正可用的多数据库可视化管理工具，补齐缺失的核心功能，提升用户体验，确保基本的生产可用性。

## What Changes

- **多数据库支持**：新增 PostgreSQL 和 SQLite 驱动，Oracle 从预留状态变为可用
- **数据导出**：支持将查询结果导出为 CSV、JSON、SQL INSERT 格式
- **SQL 编辑器增强**：加入快捷键支持、查询历史、SQL 格式化
- **表结构编辑**：支持在线修改表结构（ALTER TABLE），不仅仅是查看
- **数据编辑**：支持在数据表格中直接编辑单元格内容
- **视图/存储过程浏览**：补充视图定义查看、存储过程和函数浏览
- **查询取消**：实现真正的查询中断机制
- **国际化**：支持中英文界面切换
- **暗色主题**：完整暗色模式支持
- **连接分组管理**：支持按文件夹分组管理多个数据库连接

## Capabilities

### New Capabilities
- `pg-support`: PostgreSQL 数据库连接、元数据查询、数据操作
- `sqlite-support`: SQLite 文件数据库的打开和查询
- `oracle-support`: Oracle 数据库连接（从预留变为可用）
- `data-export`: 将查询结果导出为 CSV/JSON/SQL 文件
- `query-history`: SQL 查询历史记录、保存和回放
- `table-editor`: 在线编辑表数据（增删改行）
- `schema-editor`: 可视化修改表结构（添加/修改/删除列和索引）
- `i18n`: 中英文界面国际化支持
- `dark-theme`: 暗色模式主题切换
- `connection-groups`: 连接分组/文件夹管理
- `sql-format`: SQL 语句格式化美化
- `stored-procedures`: 存储过程和函数浏览

### Modified Capabilities
<!-- No existing specs to modify — this is the initial 1.0 planning phase -->

## Impact

- **新增依赖**：`pg` (PostgreSQL)、`sql-formatter`、`i18next`
- **新增后端**：PostgreSQL 驱动、SQLite 驱动、Oracle 驱动（oracledb）
- **架构调整**：查询执行引擎增加取消信号支持；表数据编辑需要额外的事务管理
- **前端扩展**：主题系统重构、国际化框架接入、状态管理扩充
- **Electron 配置**：Oracle 驱动需要原生编译（node-gyp）