import type { DiffReport, TableDiff, ColumnDiff, IndexDiff } from '../../renderer/types/database'

function quoteId(name: string, dbType: string): string {
  if (dbType === 'mysql') return `\`${name}\``
  if (dbType === 'postgresql') return `"${name}"`
  return name
}

export class MigrationGenerator {
  generate(report: DiffReport, sourceType: string, targetType: string): string {
    const statements: string[] = [`-- Migration script generated at ${new Date().toISOString()}`]
    statements.push(`-- Source: ${sourceType}, Target: ${targetType}`)
    statements.push('')

    for (const table of report.tables) {
      const stmts = this.generateForTable(table, targetType)
      statements.push(...stmts)
    }

    return statements.join('\n')
  }

  private generateForTable(table: TableDiff, dbType: string): string[] {
    const q = (name: string) => quoteId(name, dbType)
    const stmts: string[] = []

    switch (table.status) {
      case 'added': {
        // Generate CREATE TABLE — we only have name, need columns from diff
        if (table.columns && table.columns.length > 0) {
          const colDefs = table.columns
            .filter((c) => c.status === 'added')
            .map((c) => `  ${q(c.name)} ${c.newType || 'TEXT'}`)
          if (colDefs.length > 0) {
            stmts.push(`CREATE TABLE ${q(table.name)} (`)
            stmts.push(colDefs.join(',\n'))
            stmts.push(');')
          }
        }
        break
      }
      case 'removed':
        stmts.push(`DROP TABLE IF EXISTS ${q(table.name)};`)
        break
      case 'modified': {
        if (table.columns) {
          for (const col of table.columns) {
            switch (col.status) {
              case 'added':
                stmts.push(`ALTER TABLE ${q(table.name)} ADD COLUMN ${q(col.name)} ${col.newType || 'TEXT'};`)
                break
              case 'removed':
                stmts.push(`ALTER TABLE ${q(table.name)} DROP COLUMN ${q(col.name)};`)
                break
              case 'modified': {
                if (dbType === 'mysql') {
                  stmts.push(`ALTER TABLE ${q(table.name)} MODIFY COLUMN ${q(col.name)} ${col.newType || 'TEXT'}${col.newNullable === false ? ' NOT NULL' : ''};`)
                } else if (dbType === 'postgresql') {
                  stmts.push(`ALTER TABLE ${q(table.name)} ALTER COLUMN ${q(col.name)} TYPE ${col.newType || 'TEXT'};`)
                } else {
                  stmts.push(`-- TODO: ALTER COLUMN ${col.name} for ${dbType}`)
                }
                break
              }
            }
          }
        }
        if (table.indexes) {
          for (const idx of table.indexes) {
            switch (idx.status) {
              case 'added':
                stmts.push(`CREATE${idx.newUnique ? ' UNIQUE' : ''} INDEX ${q(idx.name)} ON ${q(table.name)} (${(idx.newColumns || []).map((c) => q(c)).join(', ')});`)
                break
              case 'removed':
                stmts.push(`DROP INDEX IF EXISTS ${q(idx.name)};`)
                break
            }
          }
        }
        break
      }
    }

    if (stmts.length > 0) stmts.push('')
    return stmts
  }
}
