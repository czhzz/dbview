import { BrowserWindow, ipcMain } from 'electron'
import type { SqlLogEntry } from '../../preload/types'

const MAX_LOG_ENTRIES = 500

export class SqlLogService {
  private logs: SqlLogEntry[] = []
  private idCounter = 0

  registerIpc(): void {
    ipcMain.handle('sql-log:clear', async () => {
      this.logs = []
    })
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

    this.logs.push(entry)
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES)
    }

    this.emitLog(entry)
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
  }
}
