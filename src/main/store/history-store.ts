import initSqlJs, { type Database } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

const DB_PATH = path.join(app.getPath('userData'), 'dbview-history.db')
const MAX_HISTORY = 1000

export interface HistoryEntry {
  id: number
  sql: string
  connId: string
  connType: string
  executionTime: number
  rowCount: number
  executedAt: number
}

export class HistoryStore {
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
      CREATE TABLE IF NOT EXISTS query_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sql TEXT NOT NULL,
        conn_id TEXT NOT NULL,
        conn_type TEXT NOT NULL,
        execution_time INTEGER NOT NULL,
        row_count INTEGER DEFAULT 0,
        executed_at INTEGER NOT NULL
      )
    `)
    this.db!.run(`
      CREATE INDEX IF NOT EXISTS idx_history_executed_at ON query_history(executed_at DESC)
    `)
    this.db!.run(`
      CREATE INDEX IF NOT EXISTS idx_history_conn_id ON query_history(conn_id)
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

  add(entry: Omit<HistoryEntry, 'id' | 'executedAt'>): HistoryEntry {
    const now = Date.now()

    // Enforce max history limit — delete oldest entries
    const count = this.getCount()
    if (count >= MAX_HISTORY) {
      const excess = count - MAX_HISTORY + 1
      this.db!.run(
        `DELETE FROM query_history WHERE id IN (
          SELECT id FROM query_history ORDER BY executed_at ASC LIMIT ?
        )`,
        [excess]
      )
    }

    this.db!.run(
      `INSERT INTO query_history (sql, conn_id, conn_type, execution_time, row_count, executed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entry.sql, entry.connId, entry.connType, entry.executionTime, entry.rowCount, now]
    )
    this.save()

    const id = this.db!.getRowsModified()
    return { id, ...entry, executedAt: now }
  }

  list(connId?: string, search?: string, limit = 50): HistoryEntry[] {
    let query = `SELECT id, sql, conn_id, conn_type, execution_time, row_count, executed_at
                  FROM query_history`
    const conditions: string[] = []
    const params: unknown[] = []

    if (connId) {
      conditions.push('conn_id = ?')
      params.push(connId)
    }
    if (search) {
      conditions.push('sql LIKE ?')
      params.push(`%${search}%`)
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' ORDER BY executed_at DESC LIMIT ?'
    params.push(limit)

    const stmt = this.db!.prepare(query)
    stmt.bind(params)

    const rows: HistoryEntry[] = []
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>
      rows.push({
        id: r.id as number,
        sql: r.sql as string,
        connId: r.conn_id as string,
        connType: r.conn_type as string,
        executionTime: r.execution_time as number,
        rowCount: r.row_count as number,
        executedAt: r.executed_at as number
      })
    }
    stmt.free()
    return rows
  }

  delete(id: number): void {
    this.db!.run('DELETE FROM query_history WHERE id = ?', [id])
    this.save()
  }

  clear(connId?: string): void {
    if (connId) {
      this.db!.run('DELETE FROM query_history WHERE conn_id = ?', [connId])
    } else {
      this.db!.run('DELETE FROM query_history')
    }
    this.save()
  }

  private getCount(): number {
    const stmt = this.db!.prepare('SELECT COUNT(*) as cnt FROM query_history')
    stmt.step()
    const r = stmt.getAsObject() as Record<string, unknown>
    stmt.free()
    return r.cnt as number
  }
}
