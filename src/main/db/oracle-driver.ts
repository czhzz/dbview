import oracledb from 'oracledb'
import type { Pool, Connection, Result } from 'oracledb'
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

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

export class OracleDriver implements DatabaseDriver {
  private pool: Pool | null = null
  private config: ConnectionConfig | null = null

  async createPool(config: ConnectionConfig): Promise<void> {
    if (this.pool) {
      await this.closePool()
    }
    this.config = config

    const connectString = config.oracleServiceName
      ? `${config.host}:${config.port}/${config.oracleServiceName}`
      : `${config.host}:${config.port}/${config.database}`

    this.pool = await oracledb.createPool({
      user: config.username,
      password: config.password,
      connectString,
      poolMin: 1,
      poolMax: 10,
      poolInactivityTimeout: 30000
    })

    // Verify connection
    const conn = await this.pool.getConnection()
    await conn.close()
  }

  async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.close()
      this.pool = null
      this.config = null
    }
  }

  isConnected(): boolean {
    return this.pool !== null
  }

  private async getConnection(): Promise<Connection> {
    if (!this.pool) {
      throw new Error('数据库未连接')
    }
    return this.pool.getConnection()
  }

  async getDatabases(): Promise<string[]> {
    // Oracle doesn't have databases like MySQL - return users/schemas
    const conn = await this.getConnection()
    try {
      const result = await conn.execute<{ username: string }>(
        `SELECT username FROM all_users ORDER BY username`
      )
      return result.rows ? result.rows.map((r) => r.username) : []
    } finally {
      await conn.close()
    }
  }

  async getTables(schema?: string): Promise<TableInfo[]> {
    const conn = await this.getConnection()
    try {
      const schemaName = (schema || this.config?.username || '').toUpperCase()
      const result = await conn.execute<{
        table_name: string
        comments: string | null
        num_rows: number | null
      }>(
        `SELECT t.table_name, c.comments, t.num_rows
         FROM all_tables t
         LEFT JOIN all_tab_comments c ON t.table_name = c.table_name
           AND t.owner = c.owner
         WHERE t.owner = :schema
         ORDER BY t.table_name`,
        [schemaName]
      )
      return result.rows
        ? result.rows.map((r) => ({
            name: r.table_name,
            comment: r.comments || '',
            engine: 'Oracle',
            rowCount: r.num_rows != null ? Number(r.num_rows) : undefined
          }))
        : []
    } finally {
      await conn.close()
    }
  }

  async getViews(schema?: string): Promise<ViewInfo[]> {
    const conn = await this.getConnection()
    try {
      const schemaName = (schema || this.config?.username || '').toUpperCase()
      const result = await conn.execute<{ view_name: string }>(
        `SELECT view_name FROM all_views
         WHERE owner = :schema
         ORDER BY view_name`,
        [schemaName]
      )
      return result.rows ? result.rows.map((r) => ({ name: r.view_name })) : []
    } finally {
      await conn.close()
    }
  }

  async getColumns(table: string, schema?: string): Promise<ColumnInfo[]> {
    const conn = await this.getConnection()
    try {
      const schemaName = (schema || this.config?.username || '').toUpperCase()
      const result = await conn.execute<{
        column_name: string
        data_type: string
        data_length: number | null
        data_precision: number | null
        data_scale: number | null
        nullable: string
        column_id: number
        data_default: string | null
        comments: string | null
      }>(
        `SELECT c.column_name, c.data_type, c.data_length,
                c.data_precision, c.data_scale, c.nullable,
                c.column_id, c.data_default,
                cm.comments
         FROM all_tab_columns c
         LEFT JOIN all_col_comments cm
           ON c.owner = cm.owner AND c.table_name = cm.table_name
           AND c.column_name = cm.column_name
         WHERE c.owner = :schema AND c.table_name = :table
         ORDER BY c.column_id`,
        [schemaName, table.toUpperCase()]
      )
      return result.rows
        ? result.rows.map((r) => {
            let colType = r.data_type
            if (r.data_type === 'VARCHAR2' && r.data_length) {
              colType += `(${r.data_length})`
            } else if (r.data_type === 'NUMBER' && r.data_precision) {
              colType += `(${r.data_precision}${r.data_scale != null ? ',' + r.data_scale : ''})`
            }
            return {
              name: r.column_name,
              type: colType,
              nullable: r.nullable === 'Y',
              key: '' as const,
              defaultValue: r.data_default,
              extra: '',
              comment: r.comments || '',
              maxLength: r.data_length != null ? Number(r.data_length) : undefined
            }
          })
        : []
    } finally {
      await conn.close()
    }
  }

  async getIndexes(table: string, schema?: string): Promise<IndexInfo[]> {
    const conn = await this.getConnection()
    try {
      const schemaName = (schema || this.config?.username || '').toUpperCase()
      const result = await conn.execute<{
        index_name: string
        column_name: string
        uniqueness: string
        index_type: string
      }>(
        `SELECT i.index_name, ic.column_name, i.uniqueness, i.index_type
         FROM all_indexes i
         JOIN all_ind_columns ic
           ON i.index_name = ic.index_name AND i.owner = ic.index_owner
         WHERE i.table_owner = :schema AND i.table_name = :table
         ORDER BY i.index_name, ic.column_position`,
        [schemaName, table.toUpperCase()]
      )

      const indexMap = new Map<
        string,
        { columns: string[]; unique: boolean; primary: boolean; type: string }
      >()
      for (const r of result.rows || []) {
        if (!indexMap.has(r.index_name)) {
          indexMap.set(r.index_name, {
            columns: [],
            unique: r.uniqueness === 'UNIQUE',
            primary: false,
            type: r.index_type
          })
        }
        indexMap.get(r.index_name)!.columns.push(r.column_name)
      }
      return Array.from(indexMap.entries()).map(([name, info]) => ({
        name,
        columns: info.columns,
        unique: info.unique,
        primary: info.primary,
        type: info.type
      }))
    } finally {
      await conn.close()
    }
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string[]> {
    const conn = await this.getConnection()
    try {
      const schemaName = (schema || this.config?.username || '').toUpperCase()
      const result = await conn.execute<{ column_name: string }>(
        `SELECT acc.column_name
         FROM all_constraints ac
         JOIN all_cons_columns acc
           ON ac.constraint_name = acc.constraint_name
           AND ac.owner = acc.owner
         WHERE ac.constraint_type = 'P'
           AND ac.owner = :schema
           AND ac.table_name = :table
         ORDER BY acc.position`,
        [schemaName, table.toUpperCase()]
      )
      return result.rows ? result.rows.map((r) => r.column_name) : []
    } finally {
      await conn.close()
    }
  }

  async getDDL(table: string, schema?: string): Promise<string> {
    const conn = await this.getConnection()
    try {
      const schemaName = (schema || this.config?.username || '').toUpperCase()
      const tableName = table.toUpperCase()

      // Get columns
      const columns = await this.getColumns(tableName, schemaName)
      const pkCols = await this.getPrimaryKey(tableName, schemaName)

      let ddl = `CREATE TABLE "${schemaName}"."${tableName}" (\n`
      ddl += columns
        .map((col) => {
          let line = `  "${col.name}" ${col.type}`
          if (!col.nullable) line += ' NOT NULL'
          if (col.defaultValue !== null && col.defaultValue !== undefined) {
            line += ` DEFAULT ${col.defaultValue}`
          }
          return line
        })
        .join(',\n')
      if (pkCols.length > 0) {
        ddl += `,\n  CONSTRAINT "${tableName}_PK" PRIMARY KEY (${pkCols.map((c) => `"${c}"`).join(', ')})`
      }
      ddl += '\n);\n'

      // Add comments
      const colRows = await conn.execute<{ column_name: string; comments: string | null }>(
        `SELECT column_name, comments FROM all_col_comments
         WHERE owner = :schema AND table_name = :table
           AND comments IS NOT NULL`,
        [schemaName, tableName]
      )
      for (const r of colRows.rows || []) {
        if (r.comments) {
          ddl += `COMMENT ON COLUMN "${schemaName}"."${tableName}"."${r.column_name}" IS '${r.comments.replace(/'/g, "''")}';\n`
        }
      }

      return ddl
    } finally {
      await conn.close()
    }
  }

  async getRoutines(schema?: string): Promise<RoutineInfo[]> {
    const conn = await this.getConnection()
    try {
      const schemaName = (schema || this.config?.username || '').toUpperCase()
      const result = await conn.execute<{
        object_name: string
        object_type: string
      }>(
        `SELECT o.object_name, o.object_type
         FROM user_procedures p
         JOIN user_objects o ON p.object_name = o.object_name
         WHERE o.object_type IN ('PROCEDURE', 'FUNCTION')
           AND o.status = 'VALID'
         ORDER BY o.object_type, o.object_name`,
        [schemaName]
      )
      return result.rows
        ? result.rows.map((r) => ({
            name: r.object_name,
            type: r.object_type as 'PROCEDURE' | 'FUNCTION'
          }))
        : []
    } finally {
      await conn.close()
    }
  }

  async getRoutineDefinition(name: string, _type: 'PROCEDURE' | 'FUNCTION', schema?: string): Promise<string> {
    const conn = await this.getConnection()
    try {
      const schemaName = (schema || this.config?.username || '').toUpperCase()
      const result = await conn.execute<{ text: string }>(
        `SELECT text FROM user_source
         WHERE name = :name
           AND type = :type
         ORDER BY line`,
        [name.toUpperCase(), _type]
      )
      return result.rows ? result.rows.map((r) => r.text).join('') : ''
    } finally {
      await conn.close()
    }
  }

  async getUsers(_schema?: string): Promise<UserInfo[]> {
    const conn = await this.getConnection()
    try {
      const result = await conn.execute<{ username: string }>(
        'SELECT username FROM all_users ORDER BY username'
      )
      return result.rows ? result.rows.map((r) => ({ name: r.username })) : []
    } finally {
      await conn.close()
    }
  }

  async executeQuery(sql: string, _params?: unknown[], signal?: AbortSignal): Promise<SQLResult> {
    const conn = await this.getConnection()
    try {
      if (signal?.aborted) {
        throw new Error('查询已取消')
      }

      // Listen for abort signal to break the connection mid-query
      const onAbort = () => { conn.break().catch(() => {}) }
      signal?.addEventListener('abort', onAbort, { once: true })

      const start = Date.now()
      const result: Result<{ [key: string]: unknown }> = await conn.execute(sql)
      signal?.removeEventListener('abort', onAbort)

      const executionTime = Date.now() - start

      // Check if it returns rows
      if (result.rows && result.rows.length >= 0 && result.metaData) {
        const columns = result.metaData.map((m) => m.name)
        return {
          columns,
          rows: result.rows as Record<string, unknown>[],
          executionTime
        }
      }

      return {
        columns: [],
        rows: [],
        affectedRows: result.rowsAffected ?? undefined,
        executionTime,
        message: result.rowsAffected != null ? `影响行数: ${result.rowsAffected}` : undefined
      }
    } finally {
      await conn.close()
    }
  }

  async queryPage(table: string, options: PaginationQuery): Promise<PaginationResult> {
    const conn = await this.getConnection()
    try {
      const schemaName = options.schema || this.config?.username || ''
      const offset = (options.page - 1) * options.pageSize
      const tableName = table.toUpperCase()

      let whereClause = ''
      const params: unknown[] = []
      let paramIndex = 1

      if (options.filters && options.filters.length > 0) {
        const conditions = options.filters.map((f) => {
          switch (f.operator) {
            case '=':
              params.push(f.value)
              return `"${f.column}" = :${paramIndex++}`
            case '!=':
              params.push(f.value)
              return `"${f.column}" != :${paramIndex++}`
            case '>':
              params.push(f.value)
              return `"${f.column}" > :${paramIndex++}`
            case '<':
              params.push(f.value)
              return `"${f.column}" < :${paramIndex++}`
            case '>=':
              params.push(f.value)
              return `"${f.column}" >= :${paramIndex++}`
            case '<=':
              params.push(f.value)
              return `"${f.column}" <= :${paramIndex++}`
            case 'LIKE':
              params.push(f.value)
              return `"${f.column}" LIKE :${paramIndex++}`
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
      const countResult = await conn.execute<{ total: number }>(
        `SELECT COUNT(*) as total FROM "${schemaName}"."${tableName}" ${whereClause}`,
        params
      )
      const total = Number(countResult.rows?.[0]?.total || 0)

      // Data - Oracle 12c+ OFFSET FETCH syntax
      const bindParams = [...params, options.pageSize, offset] as never[]
      const dataResult = await conn.execute(
        `SELECT * FROM "${schemaName}"."${tableName}" ${whereClause} ${orderClause}
         OFFSET :${paramIndex++} ROWS FETCH NEXT :${paramIndex++} ROWS ONLY`,
        bindParams
      )

      const columns = dataResult.metaData ? dataResult.metaData.map((m) => m.name) : []
      const rows = dataResult.rows as Record<string, unknown>[]

      return {
        rows,
        total,
        page: options.page,
        pageSize: options.pageSize,
        columns,
        executionTime: Date.now() - start
      }
    } finally {
      await conn.close()
    }
  }
}