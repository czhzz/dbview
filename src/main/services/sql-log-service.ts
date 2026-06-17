import { BrowserWindow, ipcMain } from 'electron'
import type { SqlLogEntry } from '../../preload/types'
import { SqlLogStore, type SqlLogRecord } from '../store/sql-log-store'

const MAX_LOG_ENTRIES = 500

export class SqlLogService {
  private logs: SqlLogEntry[] = []
  private idCounter = 0
  private store: SqlLogStore | null = null

  async init(): Promise<void> {
    this.store = new SqlLogStore()
    await this.store.init()

    // Restore recent logs from persistent storage into the in-memory cache so
    // the panel shows history immediately after restart.
    const recent = this.store.list({ limit: MAX_LOG_ENTRIES })
    // store.list returns newest-first; reverse so the in-memory array is
    // oldest-first (matching how new entries are appended).
    this.logs = recent.reverse().map(this.recordToEntry.bind(this))
    // Keep idCounter ahead of restored numeric ids to avoid collisions
    // (in-memory ids are string-prefixed, so no real collision, but be safe).
    for (const log of this.logs) {
      const num = Number(log.id.replace('log-', ''))
      if (!Number.isNaN(num) && num >= this.idCounter) {
        this.idCounter = num + 1
      }
    }
  }

  registerIpc(): void {
    ipcMain.handle('sql-log:clear', async () => {
      this.logs = []
      this.store?.clear()
    })

    ipcMain.handle(
      'sql-log:list',
      async (
        _event,
        params: { startTime?: number; endTime?: number; connId?: string; category?: SqlLogEntry['category']; limit?: number }
      ) => {
        if (!this.store) return []
        const records = this.store.list(params)
        return records.map((r) => this.recordToEntry(r))
      }
    )
  }

  log(params: {
    sql: string
    connId: string
    category: SqlLogEntry['category']
    source: string
    executionTime: number
    rowCount: number
    status: SqlLogEntry['status']
    error?: string
  }): void {
    const entry: SqlLogEntry = {
      id: `log-${this.idCounter++}`,
      sql: params.sql,
      connId: params.connId,
      category: params.category,
      source: params.source,
      executionTime: params.executionTime,
      rowCount: params.rowCount,
      timestamp: Date.now(),
      status: params.status,
      error: params.error
    }

    // Persist to SQLite (best-effort — never block logging on storage failure)
    try {
      this.store?.add(params)
    } catch {
      // Storage failure should not affect realtime logging
    }

    this.logs.push(entry)
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES)
    }

    this.emitLog(entry)
  }

  private recordToEntry(r: SqlLogRecord): SqlLogEntry {
    return {
      id: `log-${r.id}`,
      sql: r.sql,
      connId: r.connId,
      category: r.category,
      source: r.source,
      executionTime: r.executionTime,
      rowCount: r.rowCount,
      timestamp: r.timestamp,
      status: r.status,
      error: r.error ?? undefined
    }
  }

  private emitLog(entry: SqlLogEntry): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('sql-log', entry)
      }
    }
  }

  getLogs(): SqlLogEntry[] {
    return this.logs
  }

  clear(): void {
    this.logs = []
    this.store?.clear()
  }
}
