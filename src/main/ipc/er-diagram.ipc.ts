import { ipcMain } from 'electron'
import type { ConnectionManager } from '../services/connection-manager'
import type { ErDiagramData, ErDiagramTable, ForeignKeyInfo } from '../../renderer/types/database'

export function registerErDiagramIpc(manager: ConnectionManager): void {
  ipcMain.handle('erDiagram:getData', async (_event, connId: string, schema?: string) => {
    const driver = await manager.getConnection(connId)
    const tables = await driver.getTables(connId, schema)
    const erTables: ErDiagramTable[] = []

    for (const table of tables) {
      const columns = await driver.getColumns(connId, table.name, schema)
      const primaryKey = columns.filter(c => c.key === 'PRI').map(c => c.name)
      const foreignKeys: ForeignKeyInfo[] = await driver.getForeignKeys(table.name, schema)

      erTables.push({ name: table.name, comment: table.comment, columns, primaryKey, foreignKeys })
    }

    return { tables: erTables } satisfies ErDiagramData
  })
}
