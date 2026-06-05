import { ipcMain } from 'electron'
import { ConnectionManager } from '../services/connection-manager'

export function registerSqlIpc(manager: ConnectionManager): void {
  ipcMain.handle('sql:execute', async (_event, connId: string, sql: string) => {
    const driver = await manager.getConnection(connId)
    return driver.executeQuery(sql)
  })

  ipcMain.handle('sql:cancel', async (_event, connId: string, _queryId: string) => {
    // MySQL doesn't support query cancellation easily via mysql2.
    // For now, we disconnect/reconnect the connection.
    await manager.disconnect(connId)
  })
}