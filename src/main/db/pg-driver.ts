import { Pool, types as pgTypes } from 'pg'
import type { PoolConfig, QueryResult } from 'pg'
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

// Parse numeric/bigint as number instead of string
pgTypes.setTypeParser(pgTypes.builtins.NUMERIC, (val: string) => parseFloat(val))
pgTypes.setTypeParser(pgTypes.builtins.INT8, (val: string) => Number(val))
pgTypes.setTypeParser(pgTypes.builtins.FLOAT8, (val: string) => parseFloat(val))

export class PostgreSQLDriver implements DatabaseDriver {
  private pool: Pool | null = null
  private config: ConnectionConfig | null = null
  private abortMap = new Map<string, AbortController>()

  async createPool(config: ConnectionConfig): Promise<void> {
    if (this.pool) {
      await this.closePool()
    }
    this.config = config

    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    }

    if (config.ssl) {
      poolConfig.ssl = { rejectUnauthorized: false }
    }

    this.pool = new Pool(poolConfig)

    // Verify connection
    const client = await this.pool.connect()
    client.release()
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
    const result = await this.getPool().query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
    )
    return result.rows.map((r) => r.datname)
  }

  async getSchemas(): Promise<string[]> {
    const result = await this.getPool().query<{ schema_name: string }>(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       ORDER BY schema_name`
    )
    return result.rows.map((r) => r.schema_name)
  }

  async getTables(schema?: string): Promise<TableInfo[]> {
    const schemaName = schema || 'public'
    const result = await this.getPool().query<{
      table_name: string
      table_comment: string | null
      row_estimate: string | null
    }>(
      `SELECT c.relname AS table_name,
              COALESCE(obj_description(c.oid), '') AS table_comment,
              c.reltuples::bigint AS row_estimate
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relkind = 'r'
         AND n.nspname = $1
         AND c.relname NOT LIKE 'sql_%'
       ORDER BY c.relname`,
      [schemaName]
    )
    return result.rows.map((r) => ({
      name: r.table_name,
      comment: r.table_comment || '',
      engine: 'pg',
      rowCount: r.row_estimate != null ? Number(r.row_estimate) : undefined
    }))
  }

  async getViews(schema?: string): Promise<ViewInfo[]> {
    const schemaName = schema || 'public'
    const result = await this.getPool().query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.views
       WHERE table_schema = $1
       ORDER BY table_name`,
      [schemaName]
    )
    return result.rows.map((r) => ({ name: r.table_name }))
  }

  async getColumns(table: string, schema?: string): Promise<ColumnInfo[]> {
    const schemaName = schema || 'public'
    const result = await this.getPool().query<{
      column_name: string
      udt_name: string
      character_maximum_length: number | null
      is_nullable: string
      column_default: string | null
      col_description: string | null
      ordinal_position: number
      is_pk: boolean
    }>(
      `SELECT c.column_name,
              c.udt_name,
              c.character_maximum_length,
              c.is_nullable,
              c.column_default,
              pgd.description AS col_description,
              c.ordinal_position,
              pk.column_name IS NOT NULL AS is_pk
       FROM information_schema.columns c
       LEFT JOIN pg_catalog.pg_statio_all_tables st ON st.schemaname = c.table_schema AND st.relname = c.table_name
       LEFT JOIN pg_catalog.pg_description pgd ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
       LEFT JOIN (
         SELECT kcu.column_name, kcu.table_schema, kcu.table_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
         WHERE tc.constraint_type = 'PRIMARY KEY'
       ) pk ON pk.table_schema = c.table_schema
           AND pk.table_name = c.table_name
           AND pk.column_name = c.column_name
       WHERE c.table_schema = $1 AND c.table_name = $2
       ORDER BY c.ordinal_position`,
      [schemaName, table]
    )
    return result.rows.map((r) => {
      const key: ColumnInfo['key'] = r.is_pk ? 'PRI' : ''
      return {
        name: r.column_name,
        type: String(r.udt_name),
        nullable: r.is_nullable === 'YES',
        key,
        defaultValue: r.column_default,
        extra: '',
        comment: r.col_description || '',
        maxLength: r.character_maximum_length != null ? Number(r.character_maximum_length) : undefined
      }
    })
  }

  async getIndexes(table: string, schema?: string): Promise<IndexInfo[]> {
    const schemaName = schema || 'public'
    const result = await this.getPool().query<{
      indexname: string
      indexdef: string
      indisunique: boolean
      indisprimary: boolean
    }>(
      `SELECT i.indexname, i.indexdef,
              ix.indisunique, ix.indisprimary
       FROM pg_indexes i
       JOIN pg_index ix ON ix.indexrelid = (
         SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relname = i.indexname AND n.nspname = i.schemaname
       )
       WHERE i.schemaname = $1 AND i.tablename = $2
       ORDER BY i.indexname`,
      [schemaName, table]
    )
    return result.rows.map((r) => {
      // Parse columns from indexdef
      const colMatch = r.indexdef.match(/\(([^)]+)\)/)
      const columns = colMatch ? colMatch[1].split(',').map((c) => c.trim().replace(/^"|"$/g, '')) : []
      return {
        name: r.indexname,
        columns,
        unique: r.indisunique,
        primary: r.indisprimary,
        type: 'btree'
      }
    })
  }

  async getPrimaryKey(table: string, schema?: string): Promise<string[]> {
    const schemaName = schema || 'public'
    const result = await this.getPool().query<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = $1
         AND tc.table_name = $2
       ORDER BY kcu.ordinal_position`,
      [schemaName, table]
    )
    return result.rows.map((r) => r.column_name)
  }

  async getDDL(table: string, schema?: string): Promise<string> {
    const schemaName = schema || 'public'

    // Reconstruct DDL from metadata
    const columns = await this.getColumns(table, schemaName)
    const pkCols = await this.getPrimaryKey(table, schemaName)
    const indexes = await this.getIndexes(table, schemaName)

    let ddl = `CREATE TABLE "${schemaName}"."${table}" (\n`
    ddl += columns
      .map((col) => {
        let line = `  "${col.name}" ${col.type}`
        if (col.maxLength) line += `(${col.maxLength})`
        if (!col.nullable) line += ' NOT NULL'
        if (col.defaultValue !== null && col.defaultValue !== undefined) {
          line += ` DEFAULT ${col.defaultValue}`
        }
        if (col.comment) line += ` COMMENT '${col.comment}'`
        return line
      })
      .join(',\n')
    if (pkCols.length > 0) {
      ddl += `,\n  PRIMARY KEY (${pkCols.map((c) => `"${c}"`).join(', ')})`
    }
    ddl += '\n);\n'

    for (const idx of indexes) {
      if (idx.primary) continue
      const unique = idx.unique ? 'UNIQUE ' : ''
      ddl += `CREATE ${unique}INDEX "${idx.name}" ON "${schemaName}"."${table}" (${idx.columns.map((c) => `"${c}"`).join(', ')});\n`
    }

    return ddl
  }

  async getRoutines(schema?: string): Promise<RoutineInfo[]> {
    const schemaName = schema || 'public'
    const result = await this.getPool().query<{
      routine_name: string
      routine_type: string
      return_type: string | null
    }>(
      `SELECT p.proname AS routine_name,
              CASE p.prokind
                WHEN 'p' THEN 'PROCEDURE'
                WHEN 'f' THEN 'FUNCTION'
                WHEN 'a' THEN 'FUNCTION'
                WHEN 'w' THEN 'FUNCTION'
              END AS routine_type,
              COALESCE(pg_get_function_result(p.oid), '') AS return_type
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = $1
       ORDER BY p.proname`,
      [schemaName]
    )
    return result.rows.map((r) => ({
      name: r.routine_name,
      type: r.routine_type as 'PROCEDURE' | 'FUNCTION',
      returnType: r.return_type || undefined
    }))
  }

  async getRoutineDefinition(name: string, _type: 'PROCEDURE' | 'FUNCTION', schema?: string): Promise<string> {
    const schemaName = schema || 'public'
    const result = await this.getPool().query<{ definition: string | null }>(
      `SELECT pg_get_functiondef(p.oid) AS definition
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = $1 AND p.proname = $2`,
      [schemaName, name]
    )
    return result.rows[0]?.definition || ''
  }

  async getUsers(_schema?: string): Promise<UserInfo[]> {
    const result = await this.getPool().query<{ usename: string }>(
      'SELECT usename FROM pg_user ORDER BY usename'
    )
    return result.rows.map((r) => ({ name: r.usename }))
  }

  async executeQuery(sql: string, _params?: unknown[], signal?: AbortSignal): Promise<SQLResult> {
    const pool = this.getPool()

    if (signal?.aborted) {
      throw new Error('查询已取消')
    }

    const start = Date.now()

    let result: QueryResult
    if (signal) {
      const client = await pool.connect()
      try {
        const query = client.query(sql)
        signal.addEventListener('abort', () => {
          query.abort().catch(() => {})
        }, { once: true })
        result = await query
      } finally {
        client.release()
      }
    } else {
      result = await pool.query(sql)
    }

    const executionTime = Date.now() - start

    if (result.rows && result.rows.length >= 0) {
      const columns = result.fields ? result.fields.map((f) => f.name) : []
      return {
        columns,
        rows: result.rows as Record<string, unknown>[],
        executionTime
      }
    }

    return {
      columns: [],
      rows: [],
      affectedRows: result.rowCount ?? undefined,
      executionTime,
      message: result.rowCount != null ? `影响行数: ${result.rowCount}` : undefined
    }
  }

  async queryPage(table: string, options: PaginationQuery): Promise<PaginationResult> {
    const pool = this.getPool()
    const schemaName = options.schema || this.config?.database || 'public'
    const offset = (options.page - 1) * options.pageSize

    let whereClause = ''
    const params: unknown[] = []
    let paramIndex = 1

    if (options.filters && options.filters.length > 0) {
      const conditions = options.filters.map((f) => {
        switch (f.operator) {
          case '=':
            params.push(f.value)
            return `"${f.column}" = $${paramIndex++}`
          case '!=':
            params.push(f.value)
            return `"${f.column}" != $${paramIndex++}`
          case '>':
            params.push(f.value)
            return `"${f.column}" > $${paramIndex++}`
          case '<':
            params.push(f.value)
            return `"${f.column}" < $${paramIndex++}`
          case '>=':
            params.push(f.value)
            return `"${f.column}" >= $${paramIndex++}`
          case '<=':
            params.push(f.value)
            return `"${f.column}" <= $${paramIndex++}`
          case 'LIKE':
            params.push(f.value)
            return `"${f.column}" LIKE $${paramIndex++}`
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

    // Count query
    const countResult = await pool.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM "${schemaName}"."${table}" ${whereClause}`,
      params
    )
    const total = Number(countResult.rows[0]?.total || 0)

    // Data query
    const dataResult = await pool.query(
      `SELECT * FROM "${schemaName}"."${table}" ${whereClause} ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, options.pageSize, offset]
    )

    const columns = dataResult.fields ? dataResult.fields.map((f) => f.name) : []

    return {
      rows: dataResult.rows as Record<string, unknown>[],
      total,
      page: options.page,
      pageSize: options.pageSize,
      columns,
      executionTime: Date.now() - start
    }
  }
}