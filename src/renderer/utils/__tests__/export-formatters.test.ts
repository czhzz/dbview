import { describe, it, expect } from 'vitest'
import { formatCSV, formatJSON, formatSQLInsert, type ExportData } from '../export-formatters'

const sampleData: ExportData = {
  columns: ['id', 'name', 'age'],
  rows: [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: null }
  ],
  tableName: 'users',
  dbType: 'mysql'
}

describe('formatCSV', () => {
  it('produces a header row followed by data rows', () => {
    const csv = formatCSV(sampleData)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('﻿id,name,age')
    expect(lines[1]).toBe('1,Alice,30')
    expect(lines[2]).toBe('2,Bob,')
  })

  it('prepends a UTF-8 BOM for Excel compatibility', () => {
    const csv = formatCSV(sampleData)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('quotes fields containing commas', () => {
    const data: ExportData = {
      columns: ['name'],
      rows: [{ name: 'Smith, John' }],
      dbType: 'mysql'
    }
    expect(formatCSV(data).split('\n')[1]).toBe('"Smith, John"')
  })

  it('escapes embedded double quotes by doubling them', () => {
    const data: ExportData = {
      columns: ['name'],
      rows: [{ name: 'say "hi"' }],
      dbType: 'mysql'
    }
    expect(formatCSV(data).split('\n')[1]).toBe('"say ""hi"""')
  })

  it('quotes fields containing newlines', () => {
    const data: ExportData = {
      columns: ['text'],
      rows: [{ text: 'line1\nline2' }],
      dbType: 'mysql'
    }
    const csv = formatCSV(data)
    // The newline inside the field is preserved within the quoted value
    expect(csv).toContain('"line1\nline2"')
  })
})

describe('formatJSON', () => {
  it('produces a pretty-printed JSON array keyed by column names', () => {
    const json = formatJSON(sampleData)
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({ id: 1, name: 'Alice', age: 30 })
    expect(parsed[1]).toEqual({ id: 2, name: 'Bob', age: null })
  })

  it('preserves null values as JSON null', () => {
    const data: ExportData = {
      columns: ['a', 'b'],
      rows: [{ a: null, b: 'x' }],
      dbType: 'mysql'
    }
    expect(JSON.parse(formatJSON(data))).toEqual([{ a: null, b: 'x' }])
  })

  it('emits an empty array for no rows', () => {
    const data: ExportData = {
      columns: ['a'],
      rows: [],
      dbType: 'mysql'
    }
    expect(formatJSON(data)).toBe('[]')
  })
})

describe('formatSQLInsert', () => {
  it('generates one INSERT per row with backtick quoting for MySQL', () => {
    const sql = formatSQLInsert(sampleData)
    const lines = sql.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(
      "INSERT INTO `users` (`id`, `name`, `age`) VALUES (1, 'Alice', 30);"
    )
    expect(lines[1]).toBe(
      "INSERT INTO `users` (`id`, `name`, `age`) VALUES (2, 'Bob', NULL);"
    )
  })

  it('uses double-quote identifiers for PostgreSQL', () => {
    const data: ExportData = {
      columns: ['id', 'name'],
      rows: [{ id: 1, name: 'Alice' }],
      tableName: 'users',
      dbType: 'postgresql'
    }
    expect(formatSQLInsert(data)).toBe(
      'INSERT INTO "users" ("id", "name") VALUES (1, \'Alice\');'
    )
  })

  it('escapes single quotes in string values by doubling them', () => {
    const data: ExportData = {
      columns: ['name'],
      rows: [{ name: "O'Brien" }],
      tableName: 'users',
      dbType: 'mysql'
    }
    expect(formatSQLInsert(data)).toBe(
      "INSERT INTO `users` (`name`) VALUES ('O''Brien');"
    )
  })

  it('renders booleans as 1/0', () => {
    const data: ExportData = {
      columns: ['active'],
      rows: [{ active: true }, { active: false }],
      tableName: 't',
      dbType: 'mysql'
    }
    const lines = formatSQLInsert(data).split('\n')
    expect(lines[0]).toContain('VALUES (1)')
    expect(lines[1]).toContain('VALUES (0)')
  })

  it('defaults table name to exported_data when not provided', () => {
    const data: ExportData = {
      columns: ['a'],
      rows: [{ a: 1 }],
      dbType: 'mysql'
    }
    expect(formatSQLInsert(data)).toContain('INSERT INTO `exported_data`')
  })
})
