import { ipcMain } from 'electron'
import type { ConnectionManager } from '../services/connection-manager'
import { ImportService } from '../services/import-service'

const importService = new ImportService()

export function registerImportIpc(manager: ConnectionManager): void {
  ipcMain.handle('import:preview', async (_event, filePath: string) => {
    return importService.previewFile(filePath)
  })

  ipcMain.handle('import:execute', async (_event, connId: string, table: string, filePath: string, columnMapping: Record<string, string>, options?: { batchSize?: number }) => {
    const driver = await manager.getConnection(connId)
    return importService.executeImport(driver, table, filePath, columnMapping, options)
  })

  ipcMain.handle('import:createTable', async (_event, connId: string, tableName: string, columns: { name: string; type: string }[]) => {
    const driver = await manager.getConnection(connId)
    return importService.createTableFromImport(driver, tableName, columns)
  })
}
