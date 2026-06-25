import { ipcMain } from 'electron'
import type { ConnectionManager } from '../services/connection-manager'
import { DiffService } from '../services/diff-service'
import { MigrationGenerator } from '../services/migration-generator'

const diffService = new DiffService()
const migrationGenerator = new MigrationGenerator()

export function registerDiffIpc(manager: ConnectionManager): void {
  ipcMain.handle('diff:compare', async (_event, sourceId: string, targetId: string, sourceSchema?: string, targetSchema?: string) => {
    const sourceDriver = await manager.getConnection(sourceId)
    const targetDriver = await manager.getConnection(targetId)
    return diffService.compareStructure(sourceDriver, targetDriver, sourceSchema, targetSchema)
  })

  ipcMain.handle('diff:compareData', async (_event, sourceConnId: string, targetConnId: string, table: string, pkColumns: string[], sourceSchema?: string, targetSchema?: string) => {
    const sourceDriver = await manager.getConnection(sourceConnId)
    const targetDriver = await manager.getConnection(targetConnId)
    return diffService.compareData(sourceDriver, targetDriver, table, pkColumns, sourceSchema, targetSchema)
  })

  ipcMain.handle('diff:generateScript', async (_event, report: string, sourceType: string, targetType: string) => {
    const parsed = typeof report === 'string' ? JSON.parse(report) : report
    return migrationGenerator.generate(parsed, sourceType, targetType)
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
