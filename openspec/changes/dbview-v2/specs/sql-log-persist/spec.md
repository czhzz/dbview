## NEW Requirements

### Background

`SqlLogService` 的日志仅保存在内存中，上限 500 条。应用重启后所有日志丢失，用户无法回溯之前的 SQL 执行记录。开发调试时需要重复操作来重现问题。

### Requirement: SQL 日志持久化存储

系统 SHALL 将 SQL 日志持久化到本地 SQLite 存储中，支持按时间和连接 ID 查询。

#### Scenario: 日志自动持久化
- **GIVEN** 用户执行了 SQL 查询
- **WHEN** SqlLogService.log() 被调用
- **THEN** 日志条目同时写入内存缓存和 SQLite 持久化存储
- **AND** 日志面板实时显示（从内存缓存读取）

#### Scenario: 重启后查看历史日志
- **GIVEN** 用户重启了 DBView 应用
- **WHEN** 用户打开 SQL 日志面板
- **THEN** 面板显示重启前持久化的日志记录

#### Scenario: 按时间筛选日志
- **GIVEN** SQL 日志面板已打开且有历史记录
- **WHEN** 用户选择日期范围或时间筛选条件
- **THEN** 面板显示筛选后的日志记录

### Technical Notes

- 使用已有的 sql.js 基础设施（参考 `HistoryStore`）
- 新建日志表 `sql_logs`：
  ```sql
  CREATE TABLE IF NOT EXISTS sql_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conn_id TEXT NOT NULL,
    sql TEXT NOT NULL,
    category TEXT NOT NULL,
    source TEXT,
    execution_time INTEGER DEFAULT 0,
    row_count INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    error TEXT,
    timestamp INTEGER NOT NULL
  )
  ```
- 索引：`(conn_id, timestamp)` 和 `(timestamp DESC)`
- 内存缓存保留最近 500 条，持久化存储保留最近 10000 条
- 日志面板新增日期范围筛选控件
- 文件变更：`sql-log-service.ts`（新增存储逻辑）、`logStore.ts`（新增日期筛选状态）、`SqlLogPanel.tsx`（新增筛选 UI）
