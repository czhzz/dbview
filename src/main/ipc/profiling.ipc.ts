import { ipcMain } from 'electron'
import type { ConnectionManager } from '../services/connection-manager'

export function registerProfilingIpc(manager: ConnectionManager): void {
  ipcMain.handle('profiling:explain', async (_event, connId: string, sql: string) => {
    const driver = await manager.getConnection(connId)
    // TODO: v0.3.0 Week 6 — implement per-driver EXPLAIN with unified format
    // For now, attempt raw EXPLAIN and wrap result
    try {
      const result = await driver.executeQuery(`EXPLAIN ${sql}`)
      return {
        operation: 'EXPLAIN',
        nodeType: 'explain',
        estimatedRows: 0,
        estimatedCost: 0,
        details: { raw: result.rows },
        children: []
      }
    } catch {
      return {
        operation: 'EXPLAIN (fallback)',
        nodeType: 'explain',
        estimatedRows: 0,
        estimatedCost: 0,
        details: {},
        children: []
      }
    }
  })

  ipcMain.handle('profiling:analyzeSlowQueries', async (_event, _connId: string) => {
    // TODO: v0.3.0 Week 6 — collect from SqlLogService
    return [] as { sql: string; duration: number; timestamp: number }[]
  })
}
