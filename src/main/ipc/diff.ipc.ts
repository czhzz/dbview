import { ipcMain } from 'electron'
import type { ConnectionManager } from '../services/connection-manager'

export function registerDiffIpc(manager: ConnectionManager): void {
  ipcMain.handle('diff:compare', async (_event, sourceId: string, targetId: string) => {
    const sourceDriver = await manager.getConnection(sourceId)
    const targetDriver = await manager.getConnection(targetId)
    // TODO: v0.3.0 Week 5 — implement full DiffService
    // For now, return empty report as scaffolding
    return { tables: [] }
  })

  ipcMain.handle('diff:compareData', async (_event, sourceConnId: string, targetConnId: string, table: string) => {
    // TODO: v0.3.0 Week 5 — implement data comparison
    return { inserts: [], updates: [], deletes: [] }
  })

  ipcMain.handle('diff:generateScript', async (_event, report: unknown, sourceType: string, targetType: string) => {
    // TODO: v0.3.0 Week 5 — implement migration SQL generation
    return '-- Migration script not yet implemented'
  })

  ipcMain.handle('diff:executeMigration', async (_event, connId: string, sql: string) => {
    const driver = await manager.getConnection(connId)
    try {
      await driver.executeQuery(sql)
      return { success: true, errors: [] as string[] }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, errors: [message] }
    }
  })
}
