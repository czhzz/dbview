import { ipcMain } from 'electron'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import type { ShortcutEntry } from '../../renderer/types/database'

function getShortcutsPath(): string {
  return path.join(app.getPath('userData'), 'shortcuts.json')
}

export function registerShortcutIpc(): void {
  ipcMain.handle('shortcut:save', async (_event, shortcuts: ShortcutEntry[]) => {
    const filePath = getShortcutsPath()
    await fs.promises.writeFile(filePath, JSON.stringify(shortcuts, null, 2), 'utf-8')
  })

  ipcMain.handle('shortcut:load', async () => {
    const filePath = getShortcutsPath()
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8')
      return JSON.parse(data) as ShortcutEntry[]
    } catch {
      return [] as ShortcutEntry[]
    }
  })
}
