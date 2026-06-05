import type { ConnectionConfig } from '../../renderer/types/connection'
import type { TableInfo, ViewInfo, ColumnInfo, IndexInfo, PaginationQuery, PaginationResult, SQLResult } from '../../renderer/types/database'

export interface RoutineInfo {
  name: string
  type: 'PROCEDURE' | 'FUNCTION'
  returnType?: string
  definition?: string
}

export interface DatabaseDriver {
  createPool(config: ConnectionConfig): Promise<void>
  closePool(): Promise<void>
  isConnected(): boolean

  // Metadata queries
  getDatabases(): Promise<string[]>
  getTables(schema?: string): Promise<TableInfo[]>
  getViews(schema?: string): Promise<ViewInfo[]>
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>
  getIndexes(table: string, schema?: string): Promise<IndexInfo[]>
  getPrimaryKey(table: string, schema?: string): Promise<string[]>
  getDDL(table: string, schema?: string): Promise<string>
  getRoutines(schema?: string): Promise<RoutineInfo[]>
  getRoutineDefinition(name: string, type: 'PROCEDURE' | 'FUNCTION', schema?: string): Promise<string>

  // Data operations
  executeQuery(sql: string, params?: unknown[], signal?: AbortSignal): Promise<SQLResult>
  queryPage(table: string, options: PaginationQuery): Promise<PaginationResult>
}
export type { ConnectionConfig, TableInfo, ViewInfo, ColumnInfo, IndexInfo, PaginationQuery, PaginationResult, SQLResult }