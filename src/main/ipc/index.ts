import { ConnectionStore } from '../store/connection-store'
import { ConnectionManager } from '../services/connection-manager'
import { registerConnectionIpc } from './connection.ipc'
import { registerDatabaseIpc } from './database.ipc'
import { registerSqlIpc } from './sql.ipc'

let store: ConnectionStore | null = null
let manager: ConnectionManager | null = null

export async function registerAllIpc(): Promise<void> {
  store = new ConnectionStore()
  await store.init()
  manager = new ConnectionManager(store)

  registerConnectionIpc(store, manager)
  registerDatabaseIpc(manager)
  registerSqlIpc(manager)
}

export function getConnectionManager(): ConnectionManager | null {
  return manager
}

export async function closeAllConnections(): Promise<void> {
  if (manager) {
    await manager.closeAll()
  }
}