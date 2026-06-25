import type { DatabaseDriver } from '../db/db-driver'
import type { DiffReport, TableDiff, ColumnDiff, IndexDiff } from '../../renderer/types/database'

export class DiffService {
  async compareStructure(
    sourceDriver: DatabaseDriver,
    targetDriver: DatabaseDriver,
    sourceSchema?: string,
    targetSchema?: string
  ): Promise<DiffReport> {
    const sourceTables = await sourceDriver.getTables(sourceSchema)
    const targetTables = await targetDriver.getTables(targetSchema)

    const sourceMap = new Map(sourceTables.map((t) => [t.name, t]))
    const targetMap = new Map(targetTables.map((t) => [t.name, t]))

    const allNames = new Set([...sourceMap.keys(), ...targetMap.keys()])
    const tableDiffs: TableDiff[] = []

    for (const name of allNames) {
      const inSource = sourceMap.has(name)
      const inTarget = targetMap.has(name)

      if (!inSource) {
        tableDiffs.push({ name, status: 'removed', columns: [], indexes: [] })
        continue
      }
      if (!inTarget) {
        tableDiffs.push({ name, status: 'added', columns: [], indexes: [] })
        continue
      }

      // Both exist — compare columns and indexes
      const sourceCols = await sourceDriver.getColumns(name, sourceSchema)
      const targetCols = await targetDriver.getColumns(name, targetSchema)
      const columnDiffs = this.compareColumns(sourceCols, targetCols)

      const sourceIdxs = await sourceDriver.getIndexes(name, sourceSchema)
      const targetIdxs = await targetDriver.getIndexes(name, targetSchema)
      const indexDiffs = this.compareIndexes(sourceIdxs, targetIdxs)

      if (columnDiffs.length > 0 || indexDiffs.length > 0) {
        tableDiffs.push({ name, status: 'modified', columns: columnDiffs, indexes: indexDiffs })
      } else {
        tableDiffs.push({ name, status: 'identical' })
      }
    }

    return { tables: tableDiffs }
  }

  private compareColumns(
    source: { name: string; type: string; nullable: boolean; defaultValue: string | null }[],
    target: { name: string; type: string; nullable: boolean; defaultValue: string | null }[]
  ): ColumnDiff[] {
    const sourceMap = new Map(source.map((c) => [c.name, c]))
    const targetMap = new Map(target.map((c) => [c.name, c]))
    const allNames = new Set([...sourceMap.keys(), ...targetMap.keys()])
    const diffs: ColumnDiff[] = []

    for (const name of allNames) {
      const s = sourceMap.get(name)
      const t = targetMap.get(name)

      if (!s) {
        diffs.push({ name, status: 'added' })
        continue
      }
      if (!t) {
        diffs.push({ name, status: 'removed' })
        continue
      }

      // Check for modifications
      const changes: string[] = []
      if (s.type !== t.type) changes.push('type')
      if (s.nullable !== t.nullable) changes.push('nullable')
      if (s.defaultValue !== t.defaultValue) changes.push('default')

      if (changes.length > 0) {
        diffs.push({
          name,
          status: 'modified',
          oldType: t.type,
          newType: s.type,
          oldNullable: t.nullable,
          newNullable: s.nullable,
          oldDefault: t.defaultValue,
          newDefault: s.defaultValue
        })
      }
    }

    return diffs
  }

  private compareIndexes(
    source: { name: string; columns: string[]; unique: boolean }[],
    target: { name: string; columns: string[]; unique: boolean }[]
  ): IndexDiff[] {
    const sourceMap = new Map(source.map((i) => [i.name, i]))
    const targetMap = new Map(target.map((i) => [i.name, i]))
    const allNames = new Set([...sourceMap.keys(), ...targetMap.keys()])
    const diffs: IndexDiff[] = []

    for (const name of allNames) {
      const s = sourceMap.get(name)
      const t = targetMap.get(name)

      if (!s) {
        diffs.push({ name, status: 'added' })
        continue
      }
      if (!t) {
        diffs.push({ name, status: 'removed' })
        continue
      }

      if (
        JSON.stringify(s.columns) !== JSON.stringify(t.columns) ||
        s.unique !== t.unique
      ) {
        diffs.push({
          name,
          status: 'modified',
          oldColumns: t.columns,
          newColumns: s.columns,
          oldUnique: t.unique,
          newUnique: s.unique
        })
      }
    }

    return diffs
  }

  async compareData(
    sourceDriver: DatabaseDriver,
    targetDriver: DatabaseDriver,
    table: string,
    pkColumns: string[],
    sourceSchema?: string,
    targetSchema?: string
  ): Promise<{ inserts: Record<string, unknown>[]; updates: Record<string, unknown>[]; deletes: Record<string, unknown>[] }> {
    // Fetch all rows from both sources
    const sourceResult = await sourceDriver.executeQuery(
      `SELECT * FROM ${sourceSchema ? `"${sourceSchema}".` : ''}"${table}"`
    )
    const targetResult = await targetDriver.executeQuery(
      `SELECT * FROM ${targetSchema ? `"${targetSchema}".` : ''}"${table}"`
    )

    const sourceRows = sourceResult.rows
    const targetRows = targetResult.rows

    // Build maps by primary key
    const sourceMap = new Map<string, Record<string, unknown>>()
    const targetMap = new Map<string, Record<string, unknown>>()

    const makeKey = (row: Record<string, unknown>): string =>
      pkColumns.map((pk) => String(row[pk] ?? '')).join('|')

    for (const row of sourceRows) sourceMap.set(makeKey(row), row)
    for (const row of targetRows) targetMap.set(makeKey(row), row)

    const allKeys = new Set([...sourceMap.keys(), ...targetMap.keys()])
    const inserts: Record<string, unknown>[] = []
    const updates: Record<string, unknown>[] = []
    const deletes: Record<string, unknown>[] = []

    for (const key of allKeys) {
      const s = sourceMap.get(key)
      const t = targetMap.get(key)

      if (!s) {
        deletes.push(t!)
        continue
      }
      if (!t) {
        inserts.push(s)
        continue
      }

      // Check if any value differs
      const hasDiff = Object.keys(s).some((k) => JSON.stringify(s[k]) !== JSON.stringify(t[k]))
      if (hasDiff) {
        updates.push({ ...s, _original: t })
      }
    }

    return { inserts, updates, deletes }
  }
}
