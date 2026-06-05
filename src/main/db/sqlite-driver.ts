import Database from 'better-sqlite3'
import type { Database as DatabaseType, Statement } from 'better-sqlite3'
import path from 'path'
import type { DatabaseDriver, RoutineInfo } from './db-driver'
import type { ConnectionConfig } from '../../renderer/types/connection'
import type {
  TableInfo,
  ViewInfo,
  ColumnInfo,
  IndexInfo,
  PaginationQuery,
  PaginationResult,
  SQLResult
} from '../../renderer/types/database'

export class SQLiteDriver implements DatabaseDriver {
  private db: DatabaseType | null = null
  private config: ConnectionConfig | null = null
  private readOnly = false

  async createPool(config: ConnectionConfig): Promise<void> {
    if (this.db) {
      await this.closePool()
    }
    this.config = config

    const filePath = config.host || config.database || ''
    if (!filePath) {
      throw new Error('SQLite 文件路径不能为空')
    }

    this.readOnly = config.ssl || false // reuse ssl flag as readonly

    this.db = new Database(filePath, {
      readonly: this.readOnly,
      fileMustExist: true
    })

    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  async closePool(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.config = null
    }
  }

  isConnected(): boolean {
    return this.db !== null
  }

  private getDb(): DatabaseType {
    if (!this.db) {
      throw new Error('数据库未连接')
    }
    return this.db
  }

  async getDatabases(): Promise<string[]> {
    // SQLite is a single-file database - return filename as database name
    if (!this.config) return []
    const filePath = this.config.host || this.config.database || ''
    const basename = path.basename(filePath)
    return [basename]
  }

  async getTables(_schema?: string): Promise<TableInfo[]> {
    const db = this.getDb()
    const rows = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
      )
      .all() as { name: string }[]

    const tables: TableInfo[] = []
    for (const row of rows) {
      const countResult = db
        .prepare(`SELECT COUNT(*) as count FROM "${row.name}"`)
        .get() as { count: number }
      tables.push({
        name: row.name,
        engine: 'SQLite',
        rowCount: countResult.count
      })
    }
    return tables
  }

  async getViews(_schema?: string): Promise<ViewInfo[]> {
    const db = this.getDb()
    const rows = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'view'
         ORDER BY name`
      )
      .all() as { name: string }[]
    return rows.map((r) => ({ name: r.name }))
  }

  async getColumns(table: string, _schema?: string): Promise<ColumnInfo[]> {
    const db = this.getDb()
    const columns = db.pragma(`table_info("${table}")`) as Array<{
      cid: number
      name: string
      type: string
      notnull: number
      dflt_value: string | null
      pk: number
    }>

    return columns.map((col) => ({
      name: col.name,
      type: col.type || 'TEXT',
      nullable: col.notnull === 0,
      key: col.pk > 0 ? 'PRI' as const : '' as const,
      defaultValue: col.dflt_value,
      extra: col.pk > 0 ? 'auto increment' : '',
      comment: ''
    }))
  }

  async getIndexes(table: string, _schema?: string): Promise<IndexInfo[]> {
    const db = this.getDb()
    const indexList = db.pragma(`index_list("${table}")`) as Array<{
      seq: number
      name: string
      unique: number
      origin: string
      partial: number
    }>

    const indexes: IndexInfo[] = []
    for (const idx of indexList) {
      const indexInfo = db.pragma(`index_info("${idx.name}")`) as Array<{
        seqno: number
        cid: number
        name: string
      }>
      indexes.push({
        name: idx.name,
        columns: indexInfo.map((i) => i.name),
        unique: idx.unique === 1,
        primary: idx.origin === 'pk',
        type: 'btree'
      })
    }
    return indexes
  }

  async getPrimaryKey(table: string, _schema?: string): Promise<string[]> {
    const columns = await this.getColumns(table)
    return columns.filter((col) => col.key === 'PRI').map((col) => col.name)
  }

  async getDDL(table: string, _schema?: string): Promise<string> {
    const db = this.getDb()
    const row = db
      .prepare(
        `SELECT sql FROM sqlite_master
         WHERE type = 'table' AND name = ?`
      )
      .get(table) as { sql: string } | undefined

    if (row?.sql) {
      return row.sql + ';'
    }

    return `-- DDL not available for table: ${table}`
  }

  async getRoutines(_schema?: string): Promise<RoutineInfo[]> {
    // SQLite does not support stored procedures or functions
    return []
  }

  async getRoutineDefinition(_name: string, _type: 'PROCEDURE' | 'FUNCTION', _schema?: string): Promise<string> {
    // SQLite does not support stored procedures or functions
    return ''
  }

  async executeQuery(sql: string, _params?: unknown[], signal?: AbortSignal): Promise<SQLResult> {
    const db = this.getDb()

    if (signal?.aborted) {
      throw new Error('查询已取消')
    }

    const start = Date.now()
    const trimmedSql = sql.trim().toUpperCase()

    if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('PRAGMA') || trimmedSql.startsWith('WITH') || trimmedSql.startsWith('EXPLAIN')) {
      // Query - returns rows
      const stmt = db.prepare(sql)
      const rows = stmt.all() as Record<string, unknown>[]
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []

      return {
        columns,
        rows,
        executionTime: Date.now() - start
      }
    } else {
      // Write operation
      const result = db.prepare(sql).run()
      return {
        columns: [],
        rows: [],
        affectedRows: result.changes,
        insertId: result.lastInsertRowid as number | undefined,
        executionTime: Date.now() - start,
        message: `影响行数: ${result.changes}`
      }
    }
  }

  async queryPage(table: string, options: PaginationQuery): Promise<PaginationResult> {
    const db = this.getDb()
    const offset = (options.page - 1) * options.pageSize

    let whereClause = ''
    const params: unknown[] = []

    if (options.filters && options.filters.length > 0) {
      const conditions = options.filters.map((f) => {
        switch (f.operator) {
          case '=':
            params.push(f.value)
            return `"${f.column}" = ?`
          case '!=':
            params.push(f.value)
            return `"${f.column}" != ?`
          case '>':
            params.push(f.value)
            return `"${f.column}" > ?`
          case '<':
            params.push(f.value)
            return `"${f.column}" < ?`
          case '>=':
            params.push(f.value)
            return `"${f.column}" >= ?`
          case '<=':
            params.push(f.value)
            return `"${f.column}" <= ?`
          case 'LIKE':
            params.push(f.value)
            return `"${f.column}" LIKE ?`
          case 'IS NULL':
            return `"${f.column}" IS NULL`
          case 'IS NOT NULL':
            return `"${f.column}" IS NOT NULL`
          default:
            return ''
        }
      })
      whereClause = 'WHERE ' + conditions.join(' AND ')
    }

    const orderClause = options.orderBy
      ? `ORDER BY "${options.orderBy.column}" ${options.orderBy.direction}`
      : ''

    const start = Date.now()

    // Count
    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM "${table}" ${whereClause}`)
      .get(...params) as { total: number }
    const total = countResult.total

    // Data
    const rows = db
      .prepare(
        `SELECT * FROM "${table}" ${whereClause} ${orderClause} LIMIT ? OFFSET ?`
      )
      .all(...params, options.pageSize, offset) as Record<string, unknown>[]

    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    return {
      rows,
      total,
      page: options.page,
      pageSize: options.pageSize,
      columns,
      executionTime: Date.now() - start
    }
  }
}