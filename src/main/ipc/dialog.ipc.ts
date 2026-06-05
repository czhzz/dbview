import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { SaveDialogOptions } from '../../preload/types'

export function registerDialogIpc(): void {
  ipcMain.handle('dialog:showSaveDialog', async (event, options: SaveDialogOptions) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      return { canceled: true }
    }
    const result = await dialog.showSaveDialog(win, {
      defaultPath: options.defaultPath,
      filters: options.filters
    })
    return {
      canceled: result.canceled,
      filePath: result.filePath
    }
  })
}
