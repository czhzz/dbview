import { ipcMain } from 'electron'
import type { ConnectionManager } from '../services/connection-manager'

export function registerProfilingIpc(manager: ConnectionManager): void {
  ipcMain.handle('profiling:explain', async (_event, connId: string, sql: string) => {
    const driver = await manager.getConnection(connId)
    return driver.explainQuery(sql)
  })

  ipcMain.handle('profiling:analyzeSlowQueries', async (_event, _connId: string) => {
    // Collect from SqlLogService — queries over 1 second threshold
    // For now return empty; full implementation can read from log store
    return [] as { sql: string; duration: number; timestamp: number }[]
  })
}
