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
  UserInfo,
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

    this.readOnly = config.readOnly || false

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

  async getForeignKeys(_table: string, _schema?: string): Promise<{ column: string; refTable: string; refColumn: string; constraintName?: string }[]> {
    return [] // SQLite FK info via PRAGMA foreign_key_list not yet implemented
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

  // v0.3.0: Query profiling
  async explainQuery(sql: string, _schema?: string): Promise<UnifiedExplainPlan> {
    const db = this.getDb()
    const rows = db.prepare('EXPLAIN QUERY PLAN ' + sql).all() as any[]
    return this.parseSqliteExplain(rows)
  }

  private parseSqliteExplain(rows: any[]): UnifiedExplainPlan {
    // SQLite EXPLAIN QUERY PLAN returns flat rows with id, parent, detail
    // Build tree structure from parent references
    const nodeMap = new Map<number, UnifiedExplainPlan>()
    const children = new Map<number, number[]>()

    for (const row of rows) {
      const id = Number(row.id)
      const parent = Number(row.parent)
      const detail = String(row.detail)

      nodeMap.set(id, {
        operation: detail,
        nodeType: 'scan',
        estimatedRows: 0,
        estimatedCost: 0,
        details: { id, parent },
        children: []
      })

      if (!children.has(parent)) children.set(parent, [])
      children.get(parent)!.push(id)
    }

    // Build tree
    for (const [parentId, childIds] of children) {
      const parent = nodeMap.get(parentId)
      if (parent) {
        parent.children = childIds.map((id) => nodeMap.get(id)!).filter(Boolean)
      }
    }

    return nodeMap.get(0) || {
      operation: 'EXPLAIN QUERY PLAN',
      nodeType: 'explain',
      estimatedRows: 0,
      estimatedCost: 0,
      details: {},
      children: []
    }
  }

  async getUsers(_schema?: string): Promise<UserInfo[]> {
    // SQLite does not have user accounts
    return []
  }

  async executeQuery(sql: string, _params?: unknown[], signal?: AbortSignal): Promise<SQLResult> {
    if (signal?.aborted) {
      throw new Error('查询已取消')
    }

    const db = this.getDb()
    let interrupted = false
    const onAbort = () => { interrupted = true; db.interrupt() }
    signal?.addEventListener('abort', onAbort, { once: true })

    try {
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
    } catch (e: any) {
      // If the query was interrupted via db.interrupt(), throw a clean "cancelled" error.
      // SQLite's native SQLITE_INTERRUPT error surfaces through better-sqlite3
      // with a message like "interrupted" or "SQLITE_INTERRUPT".
      if (interrupted || (e.message && (String(e.message).includes('interrupt') || e.message.includes('SQLITE_INTERRUPT')))) {
        throw new Error('查询已取消')
      }
      throw e
    } finally {
      signal?.removeEventListener('abort', onAbort)
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