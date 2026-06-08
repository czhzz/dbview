# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DBView 是一个类似 Navicat 的桌面数据库管理工具，基于 Electron + React + TypeScript 构建。支持 MySQL、PostgreSQL、SQLite、Oracle 四种数据库的连接、浏览、查询和 schema 编辑。

## Development Commands

```bash
pnpm dev          # 启动开发模式（electron-vite dev，含 HMR）
pnpm build        # 生产构建（electron-vite build）
pnpm preview      # 预览生产构建
```

安装依赖后需运行 `pnpm install`，postinstall 会自动执行 `electron-builder install-app-app-deps` 重建原生模块。

## Architecture

### 进程模型

```
Main Process (Node.js)          Preload              Renderer (React)
src/main/                       src/preload/          src/renderer/
  index.ts                        index.ts              main.tsx
  db/ (数据库驱动)                 types.ts              App.tsx
  ipc/ (IPC handlers)                                   components/
  services/                                             stores/ (Zustand)
  store/ (sql.js 本地存储)                               services/api.ts
```

- Main 进程运行所有数据库驱动（原生模块）和本地 SQLite 存储（sql.js/WASM）
- `sandbox: false` — 原生模块需要
- Preload 通过 `contextBridge.exposeInMainWorld` 暴露类型安全的 API
- 所有 IPC 通信使用 `ipcRenderer.invoke()` 的 request/response 模式，无 push 事件

### IPC 通道命名

格式：`domain:action`，如 `connection:list`、`database:getTables`、`sql:execute`

IPC 处理器在 `src/main/ipc/` 按 domain 分文件注册，`registerAllIpc()` 在应用启动时统一调用。

完整的 IPC 类型契约定义在 `src/preload/types.ts`（`ElectronAPI` 接口），渲染进程通过 `src/renderer/services/api.ts` 的类型安全包装调用。

### 数据库驱动（Strategy Pattern）

`DatabaseDriver` 接口 (`src/main/db/db-driver.ts`) 定义统一的连接池和元数据查询方法，四种实现：
- `MySQLDriver` — mysql2/promise，INFORMATION_SCHEMA + SHOW
- `PostgreSQLDriver` — pg，pg_catalog + information_schema
- `SQLiteDriver` — better-sqlite3，同步 API 包装为 async，PRAGMA
- `OracleDriver` — oracledb，all_* 视图，OFFSET...FETCH 分页

`DriverFactory` 根据 `ConnectionConfig.type` 创建对应驱动。

### 连接管理

`ConnectionManager` (`src/main/services/connection-manager.ts`) 管理 `Map<string, PoolEntry>`：
- 懒创建连接池，30 分钟空闲自动断开
- 支持 `AbortController` 查询取消（注册 ID -> abort）

### 本地存储

两个 sql.js (WASM) 存储在 main 进程中运行，文件保存在 `app.getPath('userData')`：
- **ConnectionStore** — 连接配置，密码用 AES-256-GCM 加密（优先使用 Electron `safeStorage`）
- **HistoryStore** — 查询历史，上限 1000 条

### 渲染进程状态管理（Zustand）

三个 Store：
- **uiStore** — 侧边栏状态 + Tab 系统（`data | structure | query` 三种类型），Tab 按 key 去重
- **connectionStore** — 连接列表、活跃连接、已连接 ID 集合
- **editorStore** — SQL 编辑器 Tab 内容（id, title, sql, isDirty）

### Tab 系统

`MainLayout.tsx` 基于 Ant Design `Tabs`（`type="editable-card"`）构建的自定义 Tab 系统。三种 Tab：
- `data` → `DataTable`（浏览表数据，支持内联编辑和排序）
- `structure` → `StructurePage`（列/索引/DDL 查看 + schema 编辑）
- `query` → `SqlEditor`（CodeMirror SQL 编辑器）

### 主题与国际化

- 主题：`useTheme` hook，light/dark/system 三模式，持久化到 localStorage
- 国际化：i18next，中文（默认）和英文，语言文件在 `src/renderer/locales/`

## Key Path Aliases

- 渲染进程：`@/*` → `./src/renderer/*`（在 tsconfig.web.json 和 vite config 中配置）

## 构建配置

`electron.vite.config.ts` 定义三个构建目标：
- **main** — `externalizeDepsPlugin()` + 手动标记 `better-sqlite3`、`mysql2`、`oracledb`、`pg` 为 external（原生模块运行时加载）
- **preload** — `externalizeDepsPlugin()`
- **renderer** — `@vitejs/plugin-react`，打包所有依赖

## Known Limitations

- Schema 编辑（ColumnDialog、IndexDialog、DataTable 内联编辑）生成的 DDL 目前仅适配 MySQL（backtick 引用）
- 无路由库 — 纯 Tab 导航
- 无 main→renderer 推送 IPC — 所有通信都是请求/响应模式
