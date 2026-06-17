import { describe, it, expect } from 'vitest'
import {
  generateDML,
  generateDMLBatch,
  buildWhereClause,
  formatSqlValue,
  type PendingChange
} from '../dml-generator'

describe('formatSqlValue', () => {
  it('renders null/undefined as NULL', () => {
    expect(formatSqlValue(null)).toBe('NULL')
    expect(formatSqlValue(undefined)).toBe('NULL')
  })

  it('renders numbers unquoted', () => {
    expect(formatSqlValue(42)).toBe('42')
    expect(formatSqlValue(3.14)).toBe('3.14')
  })

  it('renders booleans as 1/0', () => {
    expect(formatSqlValue(true)).toBe('1')
    expect(formatSqlValue(false)).toBe('0')
  })

  it('renders strings single-quoted with embedded quotes doubled', () => {
    expect(formatSqlValue('hello')).toBe("'hello'")
    expect(formatSqlValue("O'Brien")).toBe("'O''Brien'")
  })
})

describe('buildWhereClause', () => {
  it('uses provided pk columns', () => {
    const where = buildWhereClause({ id: 1, name: 'x' }, ['id'], 'mysql')
    expect(where).toBe('`id` = 1')
  })

  it('falls back to all row columns when no pk provided', () => {
    const where = buildWhereClause({ id: 1, name: 'x' }, [], 'postgresql')
    expect(where).toBe('"id" = 1 AND "name" = \'x\'')
  })

  it('AND-joins multiple key columns', () => {
    const where = buildWhereClause({ a: 1, b: 2 }, ['a', 'b'], 'mysql')
    expect(where).toBe('`a` = 1 AND `b` = 2')
  })
})

describe('generateDML', () => {
  it('UPDATE: builds SET + WHERE from an update change', () => {
    const change: PendingChange = {
      type: 'update',
      rowIndex: 0,
      originalRow: { id: 1 },
      modifiedValues: { name: 'Alice' }
    }
    expect(generateDML(change, 'users', undefined, 'mysql', ['id'])).toBe(
      "UPDATE `users` SET `name` = 'Alice' WHERE `id` = 1;"
    )
  })

  it('INSERT: builds column list + values', () => {
    const change: PendingChange = {
      type: 'insert',
      rowIndex: 0,
      modifiedValues: { id: 5, name: 'Bob' }
    }
    expect(generateDML(change, 'users', undefined, 'mysql')).toBe(
      "INSERT INTO `users` (`id`, `name`) VALUES (5, 'Bob');"
    )
  })

  it('DELETE: builds WHERE from original row', () => {
    const change: PendingChange = {
      type: 'delete',
      rowIndex: 0,
      originalRow: { id: 3 }
    }
    expect(generateDML(change, 'users', 'public', 'postgresql', ['id'])).toBe(
      'DELETE FROM "public"."users" WHERE "id" = 3;'
    )
  })

  it('returns null for malformed update (missing modifiedValues)', () => {
    const change: PendingChange = { type: 'update', rowIndex: 0, originalRow: { id: 1 } }
    expect(generateDML(change, 'users', undefined, 'mysql')).toBeNull()
  })

  it('returns null for malformed insert (missing modifiedValues)', () => {
    const change: PendingChange = { type: 'insert', rowIndex: 0 }
    expect(generateDML(change, 'users', undefined, 'mysql')).toBeNull()
  })

  it('returns null for malformed delete (missing originalRow)', () => {
    const change: PendingChange = { type: 'delete', rowIndex: 0 }
    expect(generateDML(change, 'users', undefined, 'mysql')).toBeNull()
  })

  it('uses schema-qualified table for non-SQLite', () => {
    const change: PendingChange = {
      type: 'delete',
      rowIndex: 0,
      originalRow: { id: 1 }
    }
    expect(generateDML(change, 'users', 'public', 'postgresql', ['id'])).toContain(
      '"public"."users"'
    )
  })

  it('omits schema for SQLite', () => {
    const change: PendingChange = {
      type: 'delete',
      rowIndex: 0,
      originalRow: { id: 1 }
    }
    expect(generateDML(change, 'users', 'main', 'sqlite', ['id'])).toBe(
      'DELETE FROM "users" WHERE "id" = 1;'
    )
  })
})

describe('generateDMLBatch', () => {
  it('generates statements for all valid changes in order', () => {
    const changes: PendingChange[] = [
      { type: 'insert', rowIndex: 0, modifiedValues: { id: 1, name: 'A' } },
      { type: 'update', rowIndex: 1, originalRow: { id: 2 }, modifiedValues: { name: 'B' } },
      { type: 'delete', rowIndex: 2, originalRow: { id: 3 } }
    ]
    const stmts = generateDMLBatch(changes, 'users', undefined, 'mysql', ['id'])
    expect(stmts).toHaveLength(3)
    expect(stmts[0]).toContain('INSERT INTO')
    expect(stmts[1]).toContain('UPDATE')
    expect(stmts[2]).toContain('DELETE FROM')
  })

  it('skips malformed changes', () => {
    const changes: PendingChange[] = [
      { type: 'insert', rowIndex: 0 }, // malformed
      { type: 'insert', rowIndex: 1, modifiedValues: { id: 1 } }
    ]
    const stmts = generateDMLBatch(changes, 'users', undefined, 'mysql')
    expect(stmts).toHaveLength(1)
    expect(stmts[0]).toContain('INSERT INTO')
  })

  it('returns empty array for empty input', () => {
    expect(generateDMLBatch([], 'users', undefined, 'mysql')).toEqual([])
  })
})
