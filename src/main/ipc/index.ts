import { ConnectionStore } from '../store/connection-store'
import { ConnectionManager } from '../services/connection-manager'
import { SqlLogService } from '../services/sql-log-service'
import { registerConnectionIpc } from './connection.ipc'
import { registerDatabaseIpc } from './database.ipc'
import { registerSqlIpc } from './sql.ipc'
import { registerDialogIpc } from './dialog.ipc'
import { registerFileIpc } from './file.ipc'
import { initHistoryStore, registerHistoryIpc } from './history.ipc'
import { registerErDiagramIpc } from './er-diagram.ipc'
import { registerDiffIpc } from './diff.ipc'
import { registerImportIpc } from './import.ipc'
import { registerProfilingIpc } from './profiling.ipc'
import { registerShortcutIpc } from './shortcut.ipc'

let store: ConnectionStore | null = null
let manager: ConnectionManager | null = null

export async function registerAllIpc(): Promise<void> {
  store = new ConnectionStore()
  await store.init()

  const logService = new SqlLogService()
  await logService.init()
  logService.registerIpc()

  manager = new ConnectionManager(store, logService)

  await initHistoryStore()

  registerDialogIpc()
  registerFileIpc()
  registerConnectionIpc(store, manager)
  registerDatabaseIpc(manager)
  registerSqlIpc(manager)
  registerHistoryIpc()

  // v0.3.0 IPC handlers (scaffolding)
  registerErDiagramIpc(manager)
  registerDiffIpc(manager)
  registerImportIpc(manager)
  registerProfilingIpc(manager)
  registerShortcutIpc()
}

export function getConnectionManager(): ConnectionManager | null {
  return manager
}

export async function closeAllConnections(): Promise<void> {
  if (manager) {
    await manager.closeAll()
  }
}