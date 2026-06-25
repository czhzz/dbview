import * as fs from 'fs'
import * as path from 'path'
import type { DatabaseDriver } from '../db/db-driver'
import type { ImportPreview, ImportResult } from '../../renderer/types/database'

interface ColumnMapping {
  fileColumn: string
  tableColumn: string
}

export class ImportService {
  async previewFile(filePath: string): Promise<ImportPreview> {
    const ext = path.extname(filePath).toLowerCase()

    if (ext === '.csv') {
      return this.previewCsv(filePath)
    } else if (ext === '.json') {
      return this.previewJson(filePath)
    } else if (ext === '.xlsx' || ext === '.xls') {
      return this.previewExcel(filePath)
    }

    throw new Error(`Unsupported file format: ${ext}`)
  }

  private async previewCsv(filePath: string): Promise<ImportPreview> {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter((l) => l.trim())

    if (lines.length === 0) {
      return { columns: [], rows: [], totalRows: 0, detectedTypes: {} }
    }

    // Parse header
    const headers = this.parseCsvLine(lines[0])
    const dataLines = lines.slice(1, 21) // Preview first 20 rows
    const rows = dataLines.map((line) => {
      const values = this.parseCsvLine(line)
      const row: Record<string, unknown> = {}
      headers.forEach((h, i) => {
        row[h] = values[i] ?? null
      })
      return row
    })

    // Type inference from first 20 rows
    const detectedTypes: Record<string, string> = {}
    headers.forEach((h) => {
      const sampleValues = rows.map((r) => r[h]).filter((v) => v !== null && v !== '') as string[]
      detectedTypes[h] = this.inferType(sampleValues)
    })

    return {
      columns: headers,
      rows,
      totalRows: lines.length - 1,
      detectedTypes,
      encoding: 'utf-8'
    }
  }

  private async previewJson(filePath: string): Promise<ImportPreview> {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    const data = JSON.parse(content)

    let rows: Record<string, unknown>[]
    if (Array.isArray(data)) {
      rows = data.slice(0, 20)
    } else if (data.data && Array.isArray(data.data)) {
      rows = data.data.slice(0, 20)
    } else {
      throw new Error('JSON file must contain an array of objects or have a "data" array')
    }

    if (rows.length === 0) {
      return { columns: [], rows: [], totalRows: 0, detectedTypes: {} }
    }

    const columns = Object.keys(rows[0])
    const detectedTypes: Record<string, string> = {}
    columns.forEach((col) => {
      const sampleValues = rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined)
      detectedTypes[col] = this.inferType(sampleValues.map(String))
    })

    // Flatten nested objects with dot notation
    const flattened = rows.map((row) => this.flattenObject(row))

    return {
      columns: Object.keys(flattened[0] || {}),
      rows: flattened,
      totalRows: Array.isArray(data) ? data.length : (data.data?.length || 0),
      detectedTypes
    }
  }

  private async previewExcel(_filePath: string): Promise<ImportPreview> {
    // xlsx library support — placeholder for now
    // In production, use the xlsx npm package to read .xlsx files
    throw new Error('Excel import requires xlsx library — install with: pnpm add xlsx')
  }

  async executeImport(
    driver: DatabaseDriver,
    table: string,
    filePath: string,
    columnMapping: Record<string, string>,
    options?: { batchSize?: number }
  ): Promise<ImportResult> {
    const ext = path.extname(filePath).toLowerCase()
    const batchSize = options?.batchSize || 1000

    const content = await fs.promises.readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter((l) => l.trim())

    if (lines.length < 2) {
      return { importedRows: 0, errors: [] }
    }

    const headers = this.parseCsvLine(lines[0])
    const dataLines = lines.slice(1)
    const errors: { row: number; message: string }[] = []
    let importedRows = 0

    // Process in batches
    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize)
      const valuesList: string[] = []

      for (const [batchIdx, line] of batch.entries()) {
        const values = this.parseCsvLine(line)
        const row: Record<string, string> = {}

        headers.forEach((h, idx) => {
          const mappedCol = columnMapping[h]
          if (mappedCol) {
            row[mappedCol] = values[idx] ?? ''
          }
        })

        // Build INSERT statement
        if (Object.keys(row).length > 0) {
          const cols = Object.keys(row).join(', ')
          const vals = Object.values(row)
            .map((v) => (v === '' ? 'NULL' : `'${v.replace(/'/g, "''")}'`))
            .join(', ')
          valuesList.push(`(${vals})`)
        }
      }

      if (valuesList.length > 0) {
        try {
          const cols = Object.keys(columnMapping).map((k) => columnMapping[k]).join(', ')
          const sql = `INSERT INTO ${table} (${cols}) VALUES\n${valuesList.join(',\n')}`
          await driver.executeQuery(sql)
          importedRows += valuesList.length
        } catch (err) {
          errors.push({
            row: i + 1,
            message: err instanceof Error ? err.message : String(err)
          })
        }
      }
    }

    return { importedRows, errors }
  }

  async createTableFromImport(
    driver: DatabaseDriver,
    tableName: string,
    columns: { name: string; type: string }[]
  ): Promise<{ success: boolean; ddl: string }> {
    const colDefs = columns.map((c) => `  ${c.name} ${c.type}`).join(',\n')
    const ddl = `CREATE TABLE ${tableName} (\n${colDefs}\n)`

    try {
      await driver.executeQuery(ddl)
      return { success: true, ddl }
    } catch (err) {
      return {
        success: false,
        ddl: err instanceof Error ? err.message : String(err)
      }
    }
  }

  // --- Helpers ---

  private parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  private inferType(sampleValues: string[]): string {
    if (sampleValues.length === 0) return 'TEXT'

    const allNumbers = sampleValues.every((v) => !isNaN(Number(v)) && v !== '')
    if (allNumbers) {
      const hasDecimal = sampleValues.some((v) => v.includes('.'))
      return hasDecimal ? 'DECIMAL(10,2)' : 'INTEGER'
    }

    const allDates = sampleValues.every((v) => !isNaN(Date.parse(v)))
    if (allDates) return 'TIMESTAMP'

    const maxLen = Math.max(...sampleValues.map((v) => v.length))
    if (maxLen > 255) return 'TEXT'

    return `VARCHAR(${Math.max(maxLen, 50)})`
  }

  private flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value as Record<string, unknown>, newKey))
      } else {
        result[newKey] = value
      }
    }
    return result
  }
}
