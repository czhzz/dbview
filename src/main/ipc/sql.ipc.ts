import { ipcMain } from 'electron'
import { ConnectionManager } from '../services/connection-manager'

export function registerSqlIpc(manager: ConnectionManager): void {
  ipcMain.handle('sql:execute', async (_event, connId: string, sql: string, queryId?: string) => {
    const driver = await manager.getConnection(connId)
    const signal = queryId ? manager.getAbortSignal(queryId) : undefined

    try {
      const result = await driver.executeQuery(sql, [], signal)
      return result
    } finally {
      if (queryId) {
        manager.cleanupQuery(queryId)
      }
    }
  })

  ipcMain.handle('sql:registerQuery', async (_event, connId: string) => {
    return manager.registerQuery(connId)
  })

  ipcMain.handle('sql:cancel', async (_event, _connId: string, queryId: string) => {
    const cancelled = manager.cancelQuery(queryId)
    return { success: cancelled }
  })
}