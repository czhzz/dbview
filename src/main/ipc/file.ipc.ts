import { ipcMain, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export function registerFileIpc(): void {
  ipcMain.handle('file:write', async (_event, filePath: string, content: string, encoding: BufferEncoding = 'utf-8') => {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, content, encoding)
    return { success: true }
  })
}
