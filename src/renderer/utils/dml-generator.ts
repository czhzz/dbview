import { quoteId, quoteTable, type DbType } from './sql-quote'

/** A tracked pending edit on a table row (mirrors DataTable's PendingChange). */
export type ChangeType = 'update' | 'insert' | 'delete'

export interface PendingChange {
  type: ChangeType
  rowIndex: number
  originalRow?: Record<string, unknown>
  modifiedValues?: Record<string, unknown>
}

/**
 * Format a JS value as a SQL literal.
 *  - null/undefined → NULL
 *  - number → unquoted
 *  - boolean → 1/0
 *  - string → single-quoted with '' escaping
 */
export function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  const str = String(value)
  return "'" + str.replace(/'/g, "''") + "'"
}

/**
 * Build a WHERE clause identifying a row. Uses primary-key columns when
 * provided, otherwise falls back to all columns of the row.
 */
export function buildWhereClause(
  row: Record<string, unknown>,
  pkColumns: string[],
  dbType: DbType
): string {
  const keyCols = pkColumns.length > 0 ? pkColumns : Object.keys(row)
  return keyCols
    .map((col) => `${quoteId(col, dbType)} = ${formatSqlValue(row[col])}`)
    .join(' AND ')
}

/**
 * Generate a single DML statement (UPDATE/INSERT/DELETE) for one pending change.
 * Returns null if the change is malformed (missing data).
 *
 * Extracted from DataTable.tsx for unit testing.
 */
export function generateDML(
  change: PendingChange,
  table: string,
  schema: string | undefined,
  dbType: DbType,
  pkColumns: string[] = []
): string | null {
  switch (change.type) {
    case 'update': {
      if (!change.modifiedValues || !change.originalRow) return null
      const setClauses = Object.entries(change.modifiedValues)
        .map(([col, val]) => `${quoteId(col, dbType)} = ${formatSqlValue(val)}`)
        .join(', ')
      const whereClause = buildWhereClause(change.originalRow, pkColumns, dbType)
      return `UPDATE ${quoteTable(table, schema, dbType)} SET ${setClauses} WHERE ${whereClause};`
    }
    case 'insert': {
      if (!change.modifiedValues) return null
      const cols = Object.keys(change.modifiedValues)
      const vals = Object.values(change.modifiedValues).map(formatSqlValue)
      return `INSERT INTO ${quoteTable(table, schema, dbType)} (${cols
        .map((c) => quoteId(c, dbType))
        .join(', ')}) VALUES (${vals.join(', ')});`
    }
    case 'delete': {
      if (!change.originalRow) return null
      const whereClause = buildWhereClause(change.originalRow, pkColumns, dbType)
      return `DELETE FROM ${quoteTable(table, schema, dbType)} WHERE ${whereClause};`
    }
  }
}

/**
 * Generate all DML statements for a batch of pending changes.
 * Skips malformed changes (returns statements only for valid ones).
 */
export function generateDMLBatch(
  changes: PendingChange[],
  table: string,
  schema: string | undefined,
  dbType: DbType,
  pkColumns: string[] = []
): string[] {
  const statements: string[] = []
  for (const change of changes) {
    const stmt = generateDML(change, table, schema, dbType, pkColumns)
    if (stmt !== null) {
      statements.push(stmt)
    }
  }
  return statements
}
