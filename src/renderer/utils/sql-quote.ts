export type DbType = 'mysql' | 'postgresql' | 'sqlite' | 'oracle'

/**
 * Quote an identifier (table name, column name, index name, etc.)
 * according to the database type.
 *
 * - MySQL: backtick `` ` ``
 * - PostgreSQL / SQLite / Oracle: double-quote `"`
 */
export function quoteId(name: string, dbType: DbType): string {
  switch (dbType) {
    case 'mysql':
      return '`' + name.replace(/`/g, '``') + '`'
    case 'postgresql':
    case 'sqlite':
    case 'oracle':
      return '"' + name.replace(/"/g, '""') + '"'
  }
}

/**
 * Quote a full table reference: schema.table or just table.
 * SQLite does not use schema prefixes in table references.
 */
export function quoteTable(table: string, schema: string | undefined, dbType: DbType): string {
  if (schema && dbType !== 'sqlite') {
    return quoteId(schema, dbType) + '.' + quoteId(table, dbType)
  }
  return quoteId(table, dbType)
}
