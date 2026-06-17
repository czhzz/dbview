import { quoteId, quoteTable, type DbType } from './sql-quote'

/** Input shape for column DDL generation (mirrors SchemaEditor's ColumnFormValues). */
export interface ColumnFormValues {
  name: string
  type: string
  length?: number
  nullable: boolean
  defaultValue?: string
  comment?: string
}

export type ColumnEditMode = 'add' | 'edit'

/**
 * Build a COMMENT ON COLUMN statement for PostgreSQL / Oracle.
 * MySQL uses inline COMMENT syntax in column definition (handled separately).
 * SQLite does not support column comments.
 */
export function buildCommentSql(
  table: string,
  schema: string | undefined,
  column: string,
  comment: string,
  dbType: DbType
): string {
  const escaped = comment.replace(/'/g, "''")
  if (dbType === 'oracle') {
    return `COMMENT ON COLUMN "${schema || ''}"."${table}"."${column}" IS '${escaped}'`
  }
  // PostgreSQL
  return `COMMENT ON COLUMN ${quoteTable(table, schema, dbType)}.${quoteId(column, dbType)} IS '${escaped}'`
}

/**
 * Generate ALTER TABLE DDL for adding or modifying a column.
 *
 * Handles per-database dialect differences:
 *  - MySQL: MODIFY COLUMN + inline COMMENT
 *  - PostgreSQL: ALTER COLUMN SET DATA TYPE / SET DEFAULT / SET NOT NULL + COMMENT ON COLUMN
 *  - Oracle: ADD COLUMN + COMMENT ON COLUMN (edit reuses ADD COLUMN path)
 *  - SQLite: ADD COLUMN (no comment support)
 *
 * Extracted from SchemaEditor.tsx for unit testing.
 */
export function generateColumnDDL(
  values: ColumnFormValues,
  mode: ColumnEditMode,
  table: string,
  schema: string | undefined,
  dbType: DbType
): string {
  const typeStr = values.length ? `${values.type}(${values.length})` : values.type
  const nullable = values.nullable ? '' : ' NOT NULL'
  const hasDefault = values.defaultValue !== undefined && values.defaultValue !== ''
  const rawDefault = hasDefault ? values.defaultValue as string : ''
  const defaultVal = hasDefault ? ` DEFAULT ${rawDefault}` : ''

  if (mode === 'add') {
    let ddl = `ALTER TABLE ${quoteTable(table, schema, dbType)} ADD COLUMN ${quoteId(values.name, dbType)} ${typeStr}${nullable}${defaultVal}`
    // MySQL supports inline COMMENT in column definition
    if (values.comment && dbType === 'mysql') {
      ddl += ` COMMENT '${values.comment.replace(/'/g, "''")}'`
    }
    ddl += ';'
    // PostgreSQL / Oracle: use COMMENT ON COLUMN (separate statement)
    if (values.comment && (dbType === 'postgresql' || dbType === 'oracle')) {
      ddl += `\n${buildCommentSql(table, schema, values.name, values.comment, dbType)};`
    }
    // SQLite: no column comment support, silently skip
    return ddl
  }

  // MODIFY COLUMN is MySQL-specific syntax
  if (dbType === 'mysql') {
    let ddl = `ALTER TABLE ${quoteTable(table, schema, dbType)} MODIFY COLUMN ${quoteId(values.name, dbType)} ${typeStr}${nullable}${defaultVal}`
    if (values.comment) {
      ddl += ` COMMENT '${values.comment.replace(/'/g, "''")}'`
    }
    ddl += ';'
    return ddl
  }

  // PostgreSQL: ALTER COLUMN ... SET DATA TYPE / SET DEFAULT / SET NOT NULL
  if (dbType === 'postgresql') {
    let pgDdl = `ALTER TABLE ${quoteTable(table, schema, dbType)} ALTER COLUMN ${quoteId(values.name, dbType)} SET DATA TYPE ${typeStr};`
    if (!values.nullable) {
      pgDdl += `\nALTER TABLE ${quoteTable(table, schema, dbType)} ALTER COLUMN ${quoteId(values.name, dbType)} SET NOT NULL;`
    }
    if (hasDefault) {
      pgDdl += `\nALTER TABLE ${quoteTable(table, schema, dbType)} ALTER COLUMN ${quoteId(values.name, dbType)} SET DEFAULT ${rawDefault};`
    }
    if (values.comment) {
      pgDdl += `\n${buildCommentSql(table, schema, values.name, values.comment, dbType)};`
    }
    return pgDdl
  }

  // SQLite / Oracle (edit): ADD COLUMN cannot add NOT NULL column (table must be empty)
  let ddl = `ALTER TABLE ${quoteTable(table, schema, dbType)} ADD COLUMN ${quoteId(values.name, dbType)} ${typeStr}${defaultVal};`
  // Oracle supports COMMENT ON COLUMN
  if (values.comment && dbType === 'oracle') {
    ddl += `\n${buildCommentSql(table, schema, values.name, values.comment, dbType)};`
  }
  // SQLite: no column comment support, silently skip
  return ddl
}

/**
 * Generate CREATE INDEX DDL.
 * Extracted from SchemaEditor.tsx's IndexDialog for unit testing.
 */
export interface IndexFormValues {
  name: string
  columns: string[]
  unique: boolean
}

export function generateIndexDDL(
  values: IndexFormValues,
  table: string,
  schema: string | undefined,
  dbType: DbType
): string {
  const unique = values.unique ? 'UNIQUE ' : ''
  const colList = values.columns.map((c) => quoteId(c, dbType)).join(', ')
  return `CREATE ${unique}INDEX ${quoteId(values.name, dbType)} ON ${quoteTable(table, schema, dbType)} (${colList});`
}
