import { ipcMain } from 'electron'
import type { ConnectionManager } from '../services/connection-manager'

export function registerImportIpc(manager: ConnectionManager): void {
  ipcMain.handle('import:preview', async (_event, filePath: string) => {
    // TODO: v0.3.0 Week 5 — implement full ImportService
    return {
      columns: [] as string[],
      rows: [] as Record<string, unknown>[],
      totalRows: 0,
      detectedTypes: {} as Record<string, string>
    }
  })

  ipcMain.handle('import:execute', async (_event, connId: string, table: string, filePath: string, columnMapping: Record<string, string>, options?: { batchSize?: number }) => {
    // TODO: v0.3.0 Week 5 — implement batch import
    return { importedRows: 0, errors: [] as { row: number; message: string }[] }
  })

  ipcMain.handle('import:createTable', async (_event, connId: string, tableName: string, columns: { name: string; type: string }[]) => {
    const driver = await manager.getConnection(connId)
    const colDefs = columns.map(c => `${c.name} ${c.type}`).join(', ')
    const ddl = `CREATE TABLE ${tableName} (\n  ${colDefs}\n)`
    try {
      await driver.executeQuery(ddl)
      return { success: true, ddl }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, ddl: '' }
    }
  })
}
