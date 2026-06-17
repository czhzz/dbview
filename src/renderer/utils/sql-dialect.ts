import { MySQL, PostgreSQL, SQLite, PLSQL, type SQLDialect } from '@codemirror/lang-sql'

/**
 * Map db type to CodeMirror SQL dialect.
 *
 * @codemirror/lang-sql ships built-in dialects for the four databases we support:
 * - mysql → MySQL
 * - postgresql → PostgreSQL
 * - sqlite → SQLite (custom keywords: PRAGMA, ATTACH, VACUUM, AUTOINCREMENT, etc.)
 * - oracle → PLSQL (PL/SQL keywords: PACKAGE, TRIGGER, SEQUENCE, etc.)
 *
 * Previously SQLite/Oracle fell back to MySQL (design.md noted only two dialects
 * were available at the time). The installed version exposes dedicated dialects,
 * so we use them for accurate keyword highlighting.
 */
export function getCMDialect(dbType: string): SQLDialect {
  switch (dbType) {
    case 'postgresql':
      return PostgreSQL
    case 'sqlite':
      return SQLite
    case 'oracle':
      return PLSQL
    case 'mysql':
    default:
      return MySQL
  }
}
