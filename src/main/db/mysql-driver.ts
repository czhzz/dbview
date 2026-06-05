import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise'
import type { DatabaseDriver } from './db-driver'
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
      await this.pool.end()
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
    return rows
      .map((r: RowDataPacket) => r.Database)
      .filter(
        (db: string) =>
          !['information_schema', 'performance_schema', 'sys', 'mysql'].includes(db)
      )
  }

  async getTables(schema?: string): Promise<TableInfo[]> {
    const db = schema || this.config?.database || ''
    const [rows] = await this.getPool().query<RowDataPacket[]>(
      `SELECT TABLE_NAME, TABLE_COMMENT, ENGINE, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
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

  async getDDL(table: string, schema?: string): Promise<string> {
    const db = schema || this.config?.database || ''
    const [rows] = await this.getPool().query<RowDataPacket[]>(
      `SHOW CREATE TABLE \`${db}\`.\`${table}\``
    )
    return String(rows[0]?.['Create Table'] || '')
  }

  async executeQuery(sql: string, _params?: unknown[]): Promise<SQLResult> {
    const pool = this.getPool()
    const start = Date.now()
    const [result] = await pool.query(sql)

    if (Array.isArray(result)) {
      // SELECT query
      const rows = result as RowDataPacket[]
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      return {
        columns,
        rows: rows as Record<string, unknown>[],
        executionTime: Date.now() - start
      }
    } else {
      // INSERT/UPDATE/DELETE
      const header = result as ResultSetHeader
      return {
        columns: [],
        rows: [],
        affectedRows: header.affectedRows,
        insertId: header.insertId,
        executionTime: Date.now() - start,
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
}