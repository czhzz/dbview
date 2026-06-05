import { ipcMain } from 'electron'
import { HistoryStore, type HistoryEntry } from '../store/history-store'

let store: HistoryStore | null = null

export async function initHistoryStore(): Promise<void> {
  store = new HistoryStore()
  await store.init()
}

export function registerHistoryIpc(): void {
  ipcMain.handle('history:add', async (_event, entry: Omit<HistoryEntry, 'id' | 'executedAt'>) => {
    if (!store) throw new Error('HistoryStore not initialized')
    return store.add(entry)
  })

  ipcMain.handle('history:list', async (_event, connId?: string, search?: string, limit?: number) => {
    if (!store) throw new Error('HistoryStore not initialized')
    return store.list(connId, search, limit)
  })

  ipcMain.handle('history:delete', async (_event, id: number) => {
    if (!store) throw new Error('HistoryStore not initialized')
    store.delete(id)
    return { success: true }
  })

  ipcMain.handle('history:clear', async (_event, connId?: string) => {
    if (!store) throw new Error('HistoryStore not initialized')
    store.clear(connId)
    return { success: true }
  })
}
