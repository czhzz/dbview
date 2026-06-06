import type { ConnectionConfig, ConnectionConfigInput, ConnectionTestResult, ConnectionGroup } from '../renderer/types/connection'
import type { TableInfo, ViewInfo, ColumnInfo, IndexInfo, TreeNode, UserInfo, PaginationQuery, PaginationResult, SQLResult, RoutineInfo } from '../renderer/types/database'

export interface SaveDialogOptions {
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
}

export interface HistoryEntry {
  id: number
  sql: string
  connId: string
  connType: string
  executionTime: number
  rowCount: number
  executedAt: number
}

export interface ElectronAPI {
  dialog: {
    showSaveDialog: (options: SaveDialogOptions) => Promise<{ canceled: boolean; filePath?: string }>
  }
  file: {
    write: (filePath: string, content: string, encoding?: BufferEncoding) => Promise<{ success: boolean }>
  }
  history: {
    add: (entry: Omit<HistoryEntry, 'id' | 'executedAt'>) => Promise<HistoryEntry>
    list: (connId?: string, search?: string, limit?: number) => Promise<HistoryEntry[]>
    delete: (id: number) => Promise<{ success: boolean }>
    clear: (connId?: string) => Promise<{ success: boolean }>
  }
  connection: {
    list: () => Promise<ConnectionConfig[]>
    getById: (id: string) => Promise<ConnectionConfig | null>
    create: (config: ConnectionConfigInput) => Promise<ConnectionConfig>
    update: (config: ConnectionConfig) => Promise<void>
    delete: (id: string) => Promise<void>
    test: (config: ConnectionConfigInput) => Promise<ConnectionTestResult>
    connect: (id: string) => Promise<void>
    disconnect: (id: string) => Promise<void>
    getActiveConnections: () => Promise<string[]>
    listGroups: () => Promise<ConnectionGroup[]>
    createGroup: (name: string) => Promise<ConnectionGroup>
    renameGroup: (id: string, name: string) => Promise<void>
    deleteGroup: (id: string) => Promise<void>
  }
  database: {
    getDatabases: (connId: string) => Promise<string[]>
    getTables: (connId: string, schema?: string) => Promise<TableInfo[]>
    getViews: (connId: string, schema?: string) => Promise<ViewInfo[]>
    getColumns: (connId: string, table: string, schema?: string) => Promise<ColumnInfo[]>
    getIndexes: (connId: string, table: string, schema?: string) => Promise<IndexInfo[]>
    getDDL: (connId: string, table: string, schema?: string) => Promise<string>
    getRoutines: (connId: string, schema?: string) => Promise<RoutineInfo[]>
    getRoutineDefinition: (connId: string, name: string, type: 'PROCEDURE' | 'FUNCTION', schema?: string) => Promise<string>
    getUsers: (connId: string, schema?: string) => Promise<UserInfo[]>
  }
  data: {
    query: (connId: string, params: PaginationQuery) => Promise<PaginationResult>
  }
  sql: {
    execute: (connId: string, sql: string, queryId?: string) => Promise<SQLResult>
    registerQuery: (connId: string) => Promise<string>
    cancel: (connId: string, queryId: string) => Promise<{ success: boolean }>
  }
}