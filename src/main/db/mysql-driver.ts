import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise'
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

export class MySQLDriver implements DatabaseDriver {
  private pool: Pool | null = null
  private config: ConnectionConfig | null = null
  private queryIdCounter = 0

  async createPool(config: ConnectionConfig): Promise<void> {
    if (this.pool) {
      await this.closePool()
    }
    this.config = config
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    })
    // Verify connection
    const conn = await this.pool.getConnection()
    conn.release()
  }

  async closePool(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end()
      } catch {
        // pool may already be closed — ignore
      }
      this.pool = null
      this.config = null
    }
  }

  isConnected(): boolean {
    return this.pool !== null
  }

  private getPool(): Pool {
    if (!this.pool) {
      throw new Error('数据库未连接')
    }
    return this.pool
  }

  async getDatabases(): Promise<string[]> {
    const [rows] = await this.getPool().query<RowDataPacket[]>('SHOW DATABASES')
    return rows.map((r: RowDataPacket) => r.Database as string).sort((a, b) => {
      // Sort: system databases last
      const SYSTEM_DBS = ['information_schema', 'performance_schema', 'sys', 'mysql']
      const aIsSys = SYSTEM_DBS.includes(a) ? 1 : 0
      const bIsSys = SYSTEM_DBS.includes(b) ? 1 : 0
      if (aIsSys !== bIsSys) return aIsSys - bIsSys
      return a.localeCompare(b)
    })
  }

  async getTables(schema?: string): Promise<TableInfo[]> {
    const db = schema || this.config?.database || ''
    const [rows] = await this.getPool().query<RowDataPacket[]>(
      `SELECT TABLE_NAME, TABLE_COMMENT, ENGINE, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE IN ('BASE TABLE', 'SYSTEM VIEW')
       ORDER BY TABLE_NAME`,
      [db]
    )
    return rows.map((r: RowDataPacket) => ({
      name: String(r.TABLE_NAME),
      comment: r.TABLE_COMMENT || '',
      engine: r.ENGINE || '',
      rowCount: r.TABLE_ROWS != null ? Number(r.TABLE_ROWS) : undefined,
      createTime: r.CREATE_TIME ? String(r.CREATE_TIME) : undefined,
      updateTime: r.UPDATE_TIME ? String(r.UPDATE_TIME) : undefined
    }))
  }

  async getViews(schema?: string): Promise<ViewInfo[]> {
    const db = schema || this.config?.database || ''
    const [rows] = await this.getPool().query<RowDataPacket[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'VIEW'
       ORDER BY TABLE_NAME`,
      [db]
    )
    return rows.map((r: RowDataPacket) => ({ name: String(r.TABLE_NAME) }))
  }

  async getColumns(table: string, schema?: string): Promise<ColumnInfo[]> {
    const db = schema || this.config?.database || ''
    const [rows] = await this.getPool().query<RowDataPacket[]>(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY,
              COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT, CHARACTER_MAXIMUM_LENGTH
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [db, table]
    )
    return rows.map((r: RowDataPacket) => ({
      name: String(r.COLUMN_NAME),
      type: String(r.COLUMN_TYPE),
      nullable: r.IS_NULLABLE === 'YES',
      key: (r.COLUMN_KEY as 'PRI' | 'UNI' | 'MUL' | '') || '',
      defaultValue: r.COLUMN_DEFAULT,
      extra: r.EXTRA || '',
      comment: r.COLUMN_COMMENT || '',
      maxLength: r.CHARACTER_MAXIMUM_LENGTH != null ? Number(r.CHARACTER_MAXIMUM_LENGTH) : undefined
    }))
  }

  async getIndexes(table: string, schema?: string): Promise<IndexInfo[]> {
    const db = schema || this.config?.database || ''
    try {
      const [rows] = await this.getPool().query<RowDataPacket[]>(
        `SHOW INDEX FROM \`${table}\` FROM \`${db}\``
      )
      const indexMap = new Map<
        string,
        { columns: string[]; unique: boolean; primary: boolean; type: string }
      >()
      for (const r of rows) {
        const name = String(r.Key_name)
        if (!indexMap.has(name)) {
          indexMap.set(name, {
            columns: [],
            unique: !r.Non_unique,
            primary: name === 'PRIMARY',
            type: String(r.Index_type)
          })
        }
        indexMap.get(name)!.columns.push(String(r.Column_name))
      }
      return Array.from(indexMap.entries()).map(([name, info]) => ({
        name,
        columns: info.columns,
        unique: info.unique,
        primary: info.primary,
        type: info.type
      }))
    } catch {
      // SHOW INDEX may fail for system views (e.g. information_schema)
      return []
    }
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string[]> {
    const db = schema || this.config?.database || ''
    const [rows] = await this.getPool().query<RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_KEY = 'PRI'
       ORDER BY ORDINAL_POSITION`,
      [db, table]
    )
    return rows.map((r: RowDataPacket) => String(r.COLUMN_NAME))
  }

  async getForeignKeys(table: string, schema?: string): Promise<{ column: string; refTable: string; refColumn: string; constraintName?: string }[]> {
    const db = schema || this.config?.database || ''
    try {
      const [rows] = await this.getPool().query<RowDataPacket[]>(
        `SELECT k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, k.CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
         WHERE k.TABLE_SCHEMA = ? AND k.TABLE_NAME = ? AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
        [db, table]
      )
      return rows.map((r: RowDataPacket) => ({
        column: String(r.COLUMN_NAME),
        refTable: String(r.REFERENCED_TABLE_NAME),
        refColumn: String(r.REFERENCED_COLUMN_NAME),
        constraintName: String(r.CONSTRAINT_NAME)
      }))
    } catch {
      return []
    }
  }

  async getDDL(table: string, schema?: string): Promise<string> {
    const db = schema || this.config?.database || ''
    try {
      const [rows] = await this.getPool().query<RowDataPacket[]>(
        `SHOW CREATE TABLE \`${db}\`.\`${table}\``
      )
      return String(rows[0]?.['Create Table'] || rows[0]?.['Create View'] || '')
    } catch {
      // SHOW CREATE TABLE may fail for system views
      return `-- 无法获取 ${db}.${table} 的 DDL（系统视图）`
    }
  }

  async executeQuery(sql: string, _params?: unknown[], signal?: AbortSignal): Promise<SQLResult> {
    const pool = this.getPool()

    if (signal?.aborted) {
      throw new Error('查询已取消')
    }

    const start = Date.now()

    let result: RowDataPacket[] | RowDataPacket[][] | ResultSetHeader
    if (signal) {
      const conn = await pool.getConnection()
      try {
        signal.addEventListener('abort', () => {
          conn.destroy().catch(() => {})
        }, { once: true })
        ;[result] = await conn.query(sql)
      } finally {
        if (!conn.destroyed) {
          conn.release()
        }
      }
    } else {
      ;[result] = await pool.query(sql)
    }

    const executionTime = Date.now() - start

    if (Array.isArray(result)) {
      // SELECT query
      const rows = result as RowDataPacket[]
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      return {
        columns,
        rows: rows as Record<string, unknown>[],
        executionTime
      }
    } else {
      // INSERT/UPDATE/DELETE
      const header = result as ResultSetHeader
      return {
        columns: [],
        rows: [],
        affectedRows: header.affectedRows,
        insertId: header.insertId,
        executionTime,
        message: `影响行数: ${header.affectedRows}`
      }
    }
  }

  async queryPage(table: string, options: PaginationQuery): Promise<PaginationResult> {
    const pool = this.getPool()
    const db = options.schema || this.config?.database || ''
    const offset = (options.page - 1) * options.pageSize

    let whereClause = ''
    if (options.filters && options.filters.length > 0) {
      const conditions = options.filters.map((f) => {
        switch (f.operator) {
          case '=':
            return `\`${f.column}\` = ?`
          case '!=':
            return `\`${f.column}\` != ?`
          case '>':
            return `\`${f.column}\` > ?`
          case '<':
            return `\`${f.column}\` < ?`
          case '>=':
            return `\`${f.column}\` >= ?`
          case '<=':
            return `\`${f.column}\` <= ?`
          case 'LIKE':
            return `\`${f.column}\` LIKE ?`
          case 'IS NULL':
            return `\`${f.column}\` IS NULL`
          case 'IS NOT NULL':
            return `\`${f.column}\` IS NOT NULL`
          default:
            return ''
        }
      })
      whereClause = 'WHERE ' + conditions.join(' AND ')
    }

    const orderClause = options.orderBy
      ? `ORDER BY \`${options.orderBy.column}\` ${options.orderBy.direction}`
      : ''

    const filterValues =
      options.filters
        ?.filter((f) => f.value !== undefined && !['IS NULL', 'IS NOT NULL'].includes(f.operator))
        .map((f) => f.value) || []

    const start = Date.now()

    // Count query
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM \`${db}\`.\`${table}\` ${whereClause}`,
      filterValues
    )
    const total = Number(countRows[0]?.total || 0)

    // Data query
    const [dataRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM \`${db}\`.\`${table}\` ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...filterValues, options.pageSize, offset]
    )

    const columns = dataRows.length > 0 ? Object.keys(dataRows[0]) : []

    return {
      rows: dataRows as Record<string, unknown>[],
      total,
      page: options.page,
      pageSize: options.pageSize,
      columns,
      executionTime: Date.now() - start
    }
  }

  async getRoutines(schema?: string): Promise<RoutineInfo[]> {
    const db = schema || this.config?.database || ''
    const [rows] = await this.getPool().query<RowDataPacket[]>(
      `SELECT ROUTINE_NAME, ROUTINE_TYPE, DTD_IDENTIFIER
       FROM INFORMATION_SCHEMA.ROUTINES
       WHERE ROUTINE_SCHEMA = ?
       ORDER BY ROUTINE_TYPE, ROUTINE_NAME`,
      [db]
    )
    return rows.map((r: RowDataPacket) => ({
      name: String(r.ROUTINE_NAME),
      type: r.ROUTINE_TYPE === 'FUNCTION' ? 'FUNCTION' as const : 'PROCEDURE' as const,
      returnType: r.DTD_IDENTIFIER ? String(r.DTD_IDENTIFIER) : undefined
    }))
  }

  async getRoutineDefinition(name: string, _type: 'PROCEDURE' | 'FUNCTION', schema?: string): Promise<string> {
    const db = schema || this.config?.database || ''
    const [rows] = await this.getPool().query<RowDataPacket[]>(
      `SELECT ROUTINE_DEFINITION FROM INFORMATION_SCHEMA.ROUTINES
       WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME = ?`,
      [db, name]
    )
    return String(rows[0]?.ROUTINE_DEFINITION || '')
  }

  // v0.3.0: Query profiling
  async explainQuery(sql: string, _schema?: string): Promise<UnifiedExplainPlan> {
    const pool = this.getPool()
    const [rows] = await pool.query<RowDataPacket[]>('EXPLAIN FORMAT=JSON ' + sql)
    const explainJson = rows[0] as Record<string, any>
    return this.parseMysqlExplain(explainJson)
  }

  private parseMysqlExplain(json: Record<string, any>): UnifiedExplainPlan {
    const queryBlock = json.query_block || json
    const node: UnifiedExplainPlan = {
      operation: (queryBlock.select_type || queryBlock.operation_type || 'QUERY') + ' (' + (queryBlock.table || '') + ')',
      nodeType: queryBlock.select_type === 'SIMPLE' ? 'scan' : 'query',
      estimatedRows: Number(queryBlock.rows || 0),
      estimatedCost: Number(queryBlock.cost_info?.query_cost || queryBlock.cost || 0),
      details: { selectType: queryBlock.select_type, table: queryBlock.table, type: queryBlock.access_type, possibleKeys: queryBlock.possible_keys, key: queryBlock.key, keyLen: queryBlock.key_len, ref: queryBlock.ref, extra: queryBlock.Extra || queryBlock.attached_condition },
      children: []
    }

    // Nested loop joins have nested_loop children
    if (queryBlock.nested_loop) {
      node.children = queryBlock.nested_loop.map((nl: any) => this.parseMysqlExplain(nl.table || nl))
    }

    // Materialized subqueries
    if (queryBlock.materialized_from_subquery) {
      node.children.push(this.parseMysqlExplain(queryBlock.materialized_from_subquery))
    }

    return node
  }

  async getUsers(_schema?: string): Promise<UserInfo[]> {
    try {
      const [rows] = await this.getPool().query<RowDataPacket[]>(
        'SELECT User, Host FROM mysql.user ORDER BY User'
      )
      return rows.map((r: RowDataPacket) => ({
        name: String(r.User),
        host: String(r.Host)
      }))
    } catch {
      // May not have privilege to query mysql.user
      return []
    }
  }
}