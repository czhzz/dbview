/**
 * Data export formatters for CSV, JSON, and SQL INSERT formats.
 * All formatters operate on the same row/column data shape used by
 * PaginationResult and SQLResult, making them usable in both DataTable
 * and SqlEditor contexts.
 */

/** Shared input shape for export formatters */
export interface ExportData {
  columns: string[]
  rows: Record<string, unknown>[]
  tableName?: string
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Format data as CSV with UTF-8 BOM for Excel compatibility.
 *
 * Rules:
 *  - Values containing comma, double-quote, or newline are wrapped in quotes
 *  - Double-quote characters inside values are escaped as ""
 */
export function formatCSV(data: ExportData): string {
  const lines: string[] = []

  // Header row
  lines.push(data.columns.map(escapeCSVField).join(','))

  // Data rows
  for (const row of data.rows) {
    const values = data.columns.map((col) => escapeCSVField(String(row[col] ?? '')))
    lines.push(values.join(','))
  }

  // UTF-8 BOM + CSV content
  return '﻿' + lines.join('\n')
}

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * Format data as a pretty-printed JSON array.
 * Each row becomes an object keyed by column names.
 * NULL values are preserved as JSON null.
 */
export function formatJSON(data: ExportData): string {
  const objects = data.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    for (const col of data.columns) {
      obj[col] = row[col] ?? null
    }
    return obj
  })
  return JSON.stringify(objects, null, 2)
}

// ---------------------------------------------------------------------------
// SQL INSERT
// ---------------------------------------------------------------------------

/**
 * Format data as SQL INSERT statements.
 *
 * Rules:
 *  - One INSERT per row (easy to review / execute piecemeal)
 *  - String values are single-quoted with embedded quotes escaped as ''
 *  - NULL values render as the keyword NULL (unquoted)
 *  - Numeric values are rendered unquoted when they look like numbers
 *  - Buffer / Uint8Array values rendered as hex literals (x'...')
 */
export function formatSQLInsert(data: ExportData): string {
  const table = data.tableName || 'exported_data'
  const colList = data.columns.map(quoteIdentifier).join(', ')
  const lines: string[] = []

  for (const row of data.rows) {
    const values = data.columns.map((col) => formatSQLValue(row[col]))
    lines.push(`INSERT INTO ${quoteIdentifier(table)} (${colList}) VALUES (${values.join(', ')});`)
  }

  return lines.join('\n')
}

function quoteIdentifier(name: string): string {
  // Use backtick quoting (MySQL-style) — safe for all supported DBs
  return '`' + name.replace(/`/g, '``') + '`'
}

function formatSQLValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0'
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return "x'" + Buffer.from(value as ArrayBuffer).toString('hex') + "'"
  }
  // Treat everything else as a string
  const str = String(value)
  return "'" + str.replace(/'/g, "''") + "'"
}
