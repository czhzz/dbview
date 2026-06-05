import type { ConnectionConfig, ConnectionConfigInput, ConnectionTestResult } from '../renderer/types/connection'
import type { TableInfo, ViewInfo, ColumnInfo, IndexInfo, TreeNode, PaginationQuery, PaginationResult, SQLResult } from '../renderer/types/database'

export interface ElectronAPI {
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
  }
  database: {
    getDatabases: (connId: string) => Promise<string[]>
    getTables: (connId: string, schema?: string) => Promise<TableInfo[]>
    getViews: (connId: string, schema?: string) => Promise<ViewInfo[]>
    getColumns: (connId: string, table: string, schema?: string) => Promise<ColumnInfo[]>
    getIndexes: (connId: string, table: string, schema?: string) => Promise<IndexInfo[]>
    getDDL: (connId: string, table: string, schema?: string) => Promise<string>
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