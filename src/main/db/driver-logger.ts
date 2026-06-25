import type { DatabaseDriver, RoutineInfo } from './db-driver'
import type { ConnectionConfig } from '../../renderer/types/connection'
import type { TableInfo, ViewInfo, ColumnInfo, IndexInfo, UserInfo, PaginationQuery, PaginationResult, SQLResult } from '../../renderer/types/database'
import type { SqlLogService } from '../services/sql-log-service'

/**
 * DriverLogger wraps a DatabaseDriver and logs all method calls through SqlLogService.
 *
 * - executeQuery / queryPage: category = 'user', logs actual SQL text
 * - Metadata methods (getTables, getColumns, etc.): category = 'metadata', logs method description
 */
export class DriverLogger implements DatabaseDriver {
  constructor(
    private driver: DatabaseDriver,
    private connId: string,
    private logService: SqlLogService
  ) {}

  async createPool(config: ConnectionConfig): Promise<void> {
    return this.driver.createPool(config)
  }

  async closePool(): Promise<void> {
    return this.driver.closePool()
  }

  isConnected(): boolean {
    return this.driver.isConnected()
  }

  async executeQuery(sql: string, params?: unknown[], signal?: AbortSignal): Promise<SQLResult> {
    const start = Date.now()
    try {
      const result = await this.driver.executeQuery(sql, params, signal)
      this.logService.log({
        sql,
        connId: this.connId,
        category: 'user',
        source: 'executeQuery',
        executionTime: Date.now() - start,
        rowCount: result.rows?.length ?? 0,
        status: 'success'
      })
      return result
    } catch (e: any) {
      this.logService.log({
        sql,
        connId: this.connId,
        category: 'user',
        source: 'executeQuery',
        executionTime: Date.now() - start,
        rowCount: 0,
        status: 'error',
        error: e?.message ?? String(e)
      })
      throw e
    }
  }

  async queryPage(table: string, options: PaginationQuery): Promise<PaginationResult> {
    const start = Date.now()
    try {
      const result = await this.driver.queryPage(table, options)
      // queryPage builds a SELECT internally — describe it
      const descSql = `SELECT ... FROM ${table} (page ${options.page ?? 1}, limit ${options.pageSize ?? 100})`
      this.logService.log({
        sql: descSql,
        connId: this.connId,
        category: 'user',
        source: 'queryPage',
        executionTime: Date.now() - start,
        rowCount: result.rows?.length ?? 0,
        status: 'success'
      })
      return result
    } catch (e: any) {
      const descSql = `SELECT ... FROM ${table} (page ${options.page ?? 1})`
      this.logService.log({
        sql: descSql,
        connId: this.connId,
        category: 'user',
        source: 'queryPage',
        executionTime: Date.now() - start,
        rowCount: 0,
        status: 'error',
        error: e?.message ?? String(e)
      })
      throw e
    }
  }

  // --- Metadata methods: category = 'metadata', log method description ---

  async getDatabases(): Promise<string[]> {
    return this.wrapMetadata('getDatabases', () => this.driver.getDatabases())
  }

  async getTables(schema?: string): Promise<TableInfo[]> {
    return this.wrapMetadata('getTables', () => this.driver.getTables(schema), { schema })
  }

  async getViews(schema?: string): Promise<ViewInfo[]> {
    return this.wrapMetadata('getViews', () => this.driver.getViews(schema), { schema })
  }

  async getColumns(table: string, schema?: string): Promise<ColumnInfo[]> {
    return this.wrapMetadata('getColumns', () => this.driver.getColumns(table, schema), { table, schema })
  }

  async getIndexes(table: string, schema?: string): Promise<IndexInfo[]> {
    return this.wrapMetadata('getIndexes', () => this.driver.getIndexes(table, schema), { table, schema })
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string[]> {
    return this.wrapMetadata('getPrimaryKey', () => this.driver.getPrimaryKey(table, schema), { table, schema })
  }

  async getForeignKeys(table: string, schema?: string): Promise<{ column: string; refTable: string; refColumn: string; constraintName?: string }[]> {
    return this.wrapMetadata('getForeignKeys', () => this.driver.getForeignKeys(table, schema), { table, schema })
  }

  async getDDL(table: string, schema?: string): Promise<string> {
    return this.wrapMetadata('getDDL', () => this.driver.getDDL(table, schema), { table, schema })
  }

  async getRoutines(schema?: string): Promise<RoutineInfo[]> {
    return this.wrapMetadata('getRoutines', () => this.driver.getRoutines(schema), { schema })
  }

  async getRoutineDefinition(name: string, type: 'PROCEDURE' | 'FUNCTION', schema?: string): Promise<string> {
    return this.wrapMetadata('getRoutineDefinition', () => this.driver.getRoutineDefinition(name, type, schema), { name, type, schema })
  }

  async getUsers(schema?: string): Promise<UserInfo[]> {
    return this.wrapMetadata('getUsers', () => this.driver.getUsers(schema), { schema })
  }

  // v0.3.0: Query profiling
  async explainQuery(sql: string, schema?: string): Promise<UnifiedExplainPlan> {
    const start = Date.now()
    try {
      const result = await this.driver.explainQuery(sql, schema)
      this.logService.log({
        sql: `EXPLAIN ${sql.substring(0, 100)}`,
        connId: this.connId,
        category: 'metadata',
        source: 'explainQuery',
        executionTime: Date.now() - start,
        rowCount: 1,
        status: 'success'
      })
      return result
    } catch (e: any) {
      this.logService.log({
        sql: `EXPLAIN ${sql.substring(0, 100)}`,
        connId: this.connId,
        category: 'metadata',
        source: 'explainQuery',
        executionTime: Date.now() - start,
        rowCount: 0,
        status: 'error',
        error: e?.message ?? String(e)
      })
      throw e
    }
  }

  private async wrapMetadata<T>(
    method: string,
    fn: () => Promise<T>,
    params?: Record<string, any>
  ): Promise<T> {
    const start = Date.now()
    const paramDesc = params
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')
      : ''
    const sql = paramDesc ? `${method}(${paramDesc})` : method

    try {
      const result = await fn()
      const rowCount = Array.isArray(result) ? result.length : 1
      this.logService.log({
        sql,
        connId: this.connId,
        category: 'metadata',
        source: method,
        executionTime: Date.now() - start,
        rowCount,
        status: 'success'
      })
      return result
    } catch (e: any) {
      this.logService.log({
        sql,
        connId: this.connId,
        category: 'metadata',
        source: method,
        executionTime: Date.now() - start,
        rowCount: 0,
        status: 'error',
        error: e?.message ?? String(e)
      })
      throw e
    }
  }
}
