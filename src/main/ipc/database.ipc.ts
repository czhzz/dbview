import { ipcMain } from 'electron'
import { ConnectionManager } from '../services/connection-manager'
import type { PaginationQuery } from '../../renderer/types/database'

export function registerDatabaseIpc(manager: ConnectionManager): void {
  ipcMain.handle('database:getDatabases', async (_event, connId: string) => {
    const driver = await manager.getConnection(connId)
    return driver.getDatabases()
  })

  ipcMain.handle('database:getTables', async (_event, connId: string, schema?: string) => {
    const driver = await manager.getConnection(connId)
    return driver.getTables(schema)
  })

  ipcMain.handle('database:getViews', async (_event, connId: string, schema?: string) => {
    const driver = await manager.getConnection(connId)
    return driver.getViews(schema)
  })

  ipcMain.handle('database:getColumns', async (_event, connId: string, table: string, schema?: string) => {
    const driver = await manager.getConnection(connId)
    return driver.getColumns(table, schema)
  })

  ipcMain.handle('database:getIndexes', async (_event, connId: string, table: string, schema?: string) => {
    const driver = await manager.getConnection(connId)
    return driver.getIndexes(table, schema)
  })

  ipcMain.handle('database:getDDL', async (_event, connId: string, table: string, schema?: string) => {
    const driver = await manager.getConnection(connId)
    return driver.getDDL(table, schema)
  })

  ipcMain.handle('data:query', async (_event, connId: string, params: PaginationQuery) => {
    const driver = await manager.getConnection(connId)
    return driver.queryPage(params.table, params)
  })

  ipcMain.handle('database:getRoutines', async (_event, connId: string, schema?: string) => {
    const driver = await manager.getConnection(connId)
    return driver.getRoutines(schema)
  })

  ipcMain.handle('database:getRoutineDefinition', async (_event, connId: string, name: string, type: 'PROCEDURE' | 'FUNCTION', schema?: string) => {
    const driver = await manager.getConnection(connId)
    return driver.getRoutineDefinition(name, type, schema)
  })
}