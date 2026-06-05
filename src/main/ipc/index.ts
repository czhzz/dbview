import { ConnectionStore } from '../store/connection-store'
import { ConnectionManager } from '../services/connection-manager'
import { registerConnectionIpc } from './connection.ipc'
import { registerDatabaseIpc } from './database.ipc'
import { registerSqlIpc } from './sql.ipc'
import { registerDialogIpc } from './dialog.ipc'
import { registerFileIpc } from './file.ipc'
import { initHistoryStore, registerHistoryIpc } from './history.ipc'

let store: ConnectionStore | null = null
let manager: ConnectionManager | null = null

export async function registerAllIpc(): Promise<void> {
  store = new ConnectionStore()
  await store.init()
  manager = new ConnectionManager(store)

  await initHistoryStore()

  registerDialogIpc()
  registerFileIpc()
  registerConnectionIpc(store, manager)
  registerDatabaseIpc(manager)
  registerSqlIpc(manager)
  registerHistoryIpc()
}

export function getConnectionManager(): ConnectionManager | null {
  return manager
}

export async function closeAllConnections(): Promise<void> {
  if (manager) {
    await manager.closeAll()
  }
}