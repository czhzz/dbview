import { describe, it, expect } from 'vitest'
import { quoteId, quoteTable } from '../sql-quote'

describe('quoteId', () => {
  it('wraps identifiers in backticks for MySQL', () => {
    expect(quoteId('users', 'mysql')).toBe('`users`')
    expect(quoteId('order', 'mysql')).toBe('`order`')
  })

  it('wraps identifiers in double quotes for PostgreSQL', () => {
    expect(quoteId('users', 'postgresql')).toBe('"users"')
  })

  it('wraps identifiers in double quotes for SQLite', () => {
    expect(quoteId('users', 'sqlite')).toBe('"users"')
  })

  it('wraps identifiers in double quotes for Oracle', () => {
    expect(quoteId('users', 'oracle')).toBe('"users"')
  })

  it('escapes backticks inside MySQL identifiers by doubling', () => {
    expect(quoteId('weird`name', 'mysql')).toBe('`weird``name`')
  })

  it('escapes double quotes inside non-MySQL identifiers by doubling', () => {
    expect(quoteId('weird"name', 'postgresql')).toBe('"weird""name"')
    expect(quoteId('weird"name', 'sqlite')).toBe('"weird""name"')
    expect(quoteId('weird"name', 'oracle')).toBe('"weird""name"')
  })
})

describe('quoteTable', () => {
  it('quotes schema.table for non-SQLite databases', () => {
    expect(quoteTable('users', 'public', 'postgresql')).toBe('"public"."users"')
    expect(quoteTable('users', 'myschema', 'mysql')).toBe('`myschema`.`users`')
    expect(quoteTable('users', 'scott', 'oracle')).toBe('"scott"."users"')
  })

  it('omits schema prefix for SQLite (schemaless table references)', () => {
    expect(quoteTable('users', 'main', 'sqlite')).toBe('"users"')
    expect(quoteTable('users', undefined, 'sqlite')).toBe('"users"')
  })

  it('quotes only the table when schema is undefined', () => {
    expect(quoteTable('users', undefined, 'mysql')).toBe('`users`')
    expect(quoteTable('users', undefined, 'postgresql')).toBe('"users"')
  })
})
