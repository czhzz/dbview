import initSqlJs, { type Database } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import type { SqlLogEntry } from '../../preload/types'

const DB_PATH = path.join(app.getPath('userData'), 'dbview-sql-logs.db')
const MAX_LOGS = 10000

export interface SqlLogRecord {
  id: number
  connId: string
  sql: string
  category: SqlLogEntry['category']
  source: string
  executionTime: number
  rowCount: number
  status: SqlLogEntry['status']
  error: string | null
  timestamp: number
}

export class SqlLogStore {
  private db: Database | null = null

  async init(): Promise<void> {
    const SQL = await initSqlJs()
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH)
      this.db = new SQL.Database(buffer)
    } else {
      this.db = new SQL.Database()
    }
    this.db.run('PRAGMA journal_mode=WAL')
    this.initSchema()
    this.save()
  }

  private initSchema(): void {
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS sql_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conn_id TEXT NOT NULL,
        sql TEXT NOT NULL,
        category TEXT NOT NULL,
        source TEXT,
        execution_time INTEGER DEFAULT 0,
        row_count INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        error TEXT,
        timestamp INTEGER NOT NULL
      )
    `)
    this.db!.run(`
      CREATE INDEX IF NOT EXISTS idx_sql_logs_conn_ts ON sql_logs(conn_id, timestamp)
    `)
    this.db!.run(`
      CREATE INDEX IF NOT EXISTS idx_sql_logs_ts ON sql_logs(timestamp DESC)
    `)
  }

  private save(): void {
    if (!this.db) return
    const data = this.db.export()
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DB_PATH, Buffer.from(data))
  }

  add(params: {
    sql: string
    connId: string
    category: SqlLogEntry['category']
    source: string
    executionTime: number
    rowCount: number
    status: SqlLogEntry['status']
    error?: string
  }): number {
    const timestamp = Date.now()

    // Enforce max logs limit — delete oldest entries
    const count = this.getCount()
    if (count >= MAX_LOGS) {
      const excess = count - MAX_LOGS + 1
      this.db!.run(
        `DELETE FROM sql_logs WHERE id IN (
          SELECT id FROM sql_logs ORDER BY timestamp ASC LIMIT ?
        )`,
        [excess]
      )
    }

    this.db!.run(
      `INSERT INTO sql_logs (conn_id, sql, category, source, execution_time, row_count, status, error, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.connId,
        params.sql,
        params.category,
        params.source || '',
        params.executionTime,
        params.rowCount,
        params.status,
        params.error ?? null,
        timestamp
      ]
    )
    this.save()

    // last_insert_rowid() gives the autoincrement id
    const stmt = this.db!.prepare('SELECT last_insert_rowid() as id')
    stmt.step()
    const row = stmt.getAsObject() as Record<string, unknown>
    stmt.free()
    return row.id as number
  }

  /**
   * List persisted logs, optionally filtered by time range.
   * Returns most-recent-first.
   */
  list(params: {
    startTime?: number
    endTime?: number
    connId?: string
    category?: SqlLogEntry['category']
    limit?: number
  } = {}): SqlLogRecord[] {
    const conditions: string[] = []
    const sqlParams: unknown[] = []

    if (params.startTime !== undefined) {
      conditions.push('timestamp >= ?')
      sqlParams.push(params.startTime)
    }
    if (params.endTime !== undefined) {
      conditions.push('timestamp <= ?')
      sqlParams.push(params.endTime)
    }
    if (params.connId) {
      conditions.push('conn_id = ?')
      sqlParams.push(params.connId)
    }
    if (params.category) {
      conditions.push('category = ?')
      sqlParams.push(params.category)
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
    const limit = params.limit ?? 500

    const query =
      `SELECT id, conn_id, sql, category, source, execution_time, row_count, status, error, timestamp
       FROM sql_logs` +
      whereClause +
      ' ORDER BY timestamp DESC LIMIT ?'

    const stmt = this.db!.prepare(query)
    stmt.bind([...sqlParams, limit])

    const rows: SqlLogRecord[] = []
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>
      rows.push({
        id: r.id as number,
        connId: r.conn_id as string,
        sql: r.sql as string,
        category: r.category as SqlLogEntry['category'],
        source: (r.source as string) || '',
        executionTime: r.execution_time as number,
        rowCount: r.row_count as number,
        status: r.status as SqlLogEntry['status'],
        error: (r.error as string) || null,
        timestamp: r.timestamp as number
      })
    }
    stmt.free()
    return rows
  }

  clear(): void {
    this.db!.run('DELETE FROM sql_logs')
    this.save()
  }

  private getCount(): number {
    const stmt = this.db!.prepare('SELECT COUNT(*) as cnt FROM sql_logs')
    stmt.step()
    const r = stmt.getAsObject() as Record<string, unknown>
    stmt.free()
    return r.cnt as number
  }
}
