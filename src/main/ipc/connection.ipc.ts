import { ipcMain } from 'electron'
import { ConnectionStore } from '../store/connection-store'
import { ConnectionManager } from '../services/connection-manager'
import { DriverFactory } from '../db/driver-factory'
import type { ConnectionConfig, ConnectionConfigInput } from '../../renderer/types/connection'

export function registerConnectionIpc(
  store: ConnectionStore,
  manager: ConnectionManager
): void {
  ipcMain.handle('connection:list', async () => {
    return store.list()
  })

  ipcMain.handle('connection:getById', async (_event, id: string) => {
    return store.getById(id)
  })

  ipcMain.handle('connection:create', async (_event, input: ConnectionConfigInput) => {
    return store.create(input)
  })

  ipcMain.handle('connection:update', async (_event, config: ConnectionConfig) => {
    store.update(config)
    // Reconnect if was connected
    if (manager.isConnected(config.id)) {
      await manager.disconnect(config.id)
      await manager.getConnection(config.id)
    }
  })

  ipcMain.handle('connection:delete', async (_event, id: string) => {
    await manager.disconnect(id)
    store.delete(id)
  })

  ipcMain.handle('connection:test', async (_event, input: ConnectionConfigInput) => {
    try {
      const driver = DriverFactory.createDriver(input.type)
      await driver.createPool(input)
      await driver.closePool()
      return { success: true, message: '连接成功' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '连接失败'
      return { success: false, message }
    }
  })

  ipcMain.handle('connection:connect', async (_event, id: string) => {
    const config = store.getById(id)
    if (!config) {
      throw new Error('连接配置不存在')
    }
    await manager.getConnection(id)
  })

  ipcMain.handle('connection:disconnect', async (_event, id: string) => {
    await manager.disconnect(id)
  })

  ipcMain.handle('connection:getActiveConnections', async () => {
    return manager.getActiveConnectionIds()
  })
}