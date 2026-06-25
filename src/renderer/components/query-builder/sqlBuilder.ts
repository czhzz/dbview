// Generates SQL SELECT statements from a QueryGraph.
import type { QueryGraph, JoinClause, SelectField, WhereCondition, OrderByField } from './queryGraph'

function quoteId(name: string, dbType: string = 'mysql'): string {
  if (dbType === 'mysql') return `\`${name}\``
  if (dbType === 'postgresql') return `"${name}"`
  return name
}

function buildSelectClause(graph: QueryGraph, dbType: string): string {
  if (graph.selectFields.length === 0) {
    // Default: select all columns from the first table
    const firstTable = graph.tables[0]
    if (!firstTable) return '*'
    return `${quoteId(firstTable.name, dbType)}.*`
  }

  return graph.selectFields
    .map((f) => {
      const table = graph.tables.find((t) => t.id === f.tableId)
      const col = table ? `${quoteId(table.name, dbType)}.${quoteId(f.column, dbType)}` : quoteId(f.column, dbType)
      const expr = f.aggregate && f.aggregate !== 'NONE' ? `${f.aggregate}(${col})` : col
      return f.alias ? `${expr} AS ${quoteId(f.alias, dbType)}` : expr
    })
    .join(', ')
}

function buildFromClause(graph: QueryGraph, dbType: string): string {
  return graph.tables
    .map((t) => {
      const name = t.schema ? `${quoteId(t.schema, dbType)}.${quoteId(t.name, dbType)}` : quoteId(t.name, dbType)
      return t.alias ? `${name} AS ${quoteId(t.alias, dbType)}` : name
    })
    .join(', ')
}

function buildJoinClause(join: JoinClause, dbType: string): string {
  if (join.type === 'CROSS') {
    return `CROSS JOIN ${quoteId(join.rightTableId, dbType)}`
  }

  const conditions = join.conditions
    .map((c) => `${quoteId(c.leftTable, dbType)}.${quoteId(c.leftColumn, dbType)} = ${quoteId(c.rightTable, dbType)}.${quoteId(c.rightColumn, dbType)}`)
    .join(' AND ')

  return `${join.type} JOIN ${quoteId(join.rightTableId, dbType)} ON ${conditions}`
}

function buildWhereClause(graph: QueryGraph, dbType: string): string {
  if (graph.whereConditions.length === 0) return ''

  const parts = graph.whereConditions.map((w, i) => {
    const prefix = i === 0 ? '' : ` ${w.connector} `
    const col = `${quoteId(w.tableId, dbType)}.${quoteId(w.column, dbType)}`
    switch (w.operator) {
      case 'IS NULL': return `${prefix}${col} IS NULL`
      case 'IS NOT NULL': return `${prefix}${col} IS NOT NULL`
      case 'IN': {
        const items = w.value.split(',').map((v) => quoteValue(v.trim(), dbType)).join(', ')
        return `${prefix}${col} IN (${items})`
      }
      case 'BETWEEN': {
        const parts = w.value.split(/\s+AND\s+/i)
        if (parts.length === 2) {
          return `${prefix}${col} BETWEEN ${quoteValue(parts[0].trim(), dbType)} AND ${quoteValue(parts[1].trim(), dbType)}`
        }
        return `${prefix}${col} BETWEEN ${quoteValue(w.value, dbType)}`
      }
      default: return `${prefix}${col} ${w.operator} ${quoteValue(w.value, dbType)}`
    }
  })

  return `WHERE ${parts.join('')}`
}

function quoteValue(val: string, _dbType: string): string {
  // Simple string quoting — for SQL generation, use parameterized in production
  if (val === '' || val === 'NULL') return 'NULL'
  const num = Number(val)
  if (!isNaN(num) && val.trim() !== '') return val
  return `'${val.replace(/'/g, "''")}'`
}

function buildGroupByClause(graph: QueryGraph, dbType: string): string {
  if (graph.groupByFields.length === 0) return ''
  const cols = graph.groupByFields
    .map((f) => {
      const table = graph.tables.find((t) => t.id === f.tableId)
      return table ? `${quoteId(table.name, dbType)}.${quoteId(f.column, dbType)}` : quoteId(f.column, dbType)
    })
  return `GROUP BY ${cols.join(', ')}`
}

function buildHavingClause(graph: QueryGraph, _dbType: string): string {
  if (graph.havingConditions.length === 0) return ''
  const parts = graph.havingConditions.map((h, i) => {
    const prefix = i === 0 ? '' : ` ${h.connector} `
    return `${prefix}${h.aggregate}(${h.column}) ${h.operator} ${quoteValue(h.value, _dbType)}`
  })
  return `HAVING${parts.join('')}`
}

function buildOrderByClause(graph: QueryGraph, dbType: string): string {
  if (graph.orderByFields.length === 0) return ''
  const cols = graph.orderByFields
    .map((f) => {
      const table = graph.tables.find((t) => t.id === f.tableId)
      const col = table ? `${quoteId(table.name, dbType)}.${quoteId(f.column, dbType)}` : quoteId(f.column, dbType)
      return `${col} ${f.direction}`
    })
  return `ORDER BY ${cols.join(', ')}`
}

export function buildSql(graph: QueryGraph, dbType: string = 'mysql'): string {
  if (graph.tables.length === 0) return ''

  const clauses: string[] = ['SELECT']

  clauses.push(buildSelectClause(graph, dbType))
  clauses.push(`FROM ${buildFromClause(graph, dbType)}`)

  // JOINs
  for (const join of graph.joins) {
    clauses.push(buildJoinClause(join, dbType))
  }

  // WHERE
  const where = buildWhereClause(graph, dbType)
  if (where) clauses.push(where)

  // GROUP BY
  const groupBy = buildGroupByClause(graph, dbType)
  if (groupBy) clauses.push(groupBy)

  // HAVING
  const having = buildHavingClause(graph, dbType)
  if (having) clauses.push(having)

  // ORDER BY
  const orderBy = buildOrderByClause(graph, dbType)
  if (orderBy) clauses.push(orderBy)

  // LIMIT / OFFSET
  if (graph.limit > 0) {
    clauses.push(`LIMIT ${graph.limit}`)
    if (graph.offset > 0) {
      clauses.push(`OFFSET ${graph.offset}`)
    }
  }

  return clauses.join('\n') + ';'
}
