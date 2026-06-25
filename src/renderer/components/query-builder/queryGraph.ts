// Intermediate data structure for the query builder graph state.
// The QueryGraph is the source of truth; SQLBuilder reads from it to generate SQL.

export interface QueryTable {
  id: string
  name: string
  alias?: string
  schema?: string
}

export interface JoinCondition {
  leftTable: string
  leftColumn: string
  rightTable: string
  rightColumn: string
}

export interface JoinClause {
  id: string
  leftTableId: string
  rightTableId: string
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  conditions: JoinCondition[]
}

export interface SelectField {
  tableId: string
  column: string
  alias?: string
  aggregate?: 'NONE' | 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'
}

export interface WhereCondition {
  id: string
  tableId: string
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN'
  value: string
  connector: 'AND' | 'OR'
}

export interface OrderByField {
  tableId: string
  column: string
  direction: 'ASC' | 'DESC'
}

export interface HavingCondition {
  tableId: string
  column: string
  aggregate: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'
  operator: '=' | '!=' | '>' | '<' | '>=' | '<='
  value: string
  connector: 'AND' | 'OR'
}

export interface QueryGraph {
  tables: QueryTable[]
  joins: JoinClause[]
  selectFields: SelectField[]
  whereConditions: WhereCondition[]
  orderByFields: OrderByField[]
  groupByFields: SelectField[]
  havingConditions: HavingCondition[]
  limit: number
  offset: number
}

export function createEmptyQueryGraph(): QueryGraph {
  return {
    tables: [],
    joins: [],
    selectFields: [],
    whereConditions: [],
    orderByFields: [],
    groupByFields: [],
    havingConditions: [],
    limit: 1000,
    offset: 0
  }
}

/** Check if a table is already in the graph */
export function isTableInGraph(graph: QueryGraph, tableName: string): boolean {
  return graph.tables.some((t) => t.name === tableName)
}

/** Add a table to the graph */
export function addTable(graph: QueryGraph, table: QueryTable): QueryGraph {
  if (isTableInGraph(graph, table.name)) return graph
  return { ...graph, tables: [...graph.tables, table] }
}

/** Auto-detect join between two tables based on naming convention (table_id → table.id) */
export function autoDetectJoin(
  tableA: QueryTable,
  tableB: QueryTable,
  allColumns: Map<string, string[]>
): JoinCondition | null {
  const colsA = allColumns.get(tableA.id) || []
  const colsB = allColumns.get(tableB.id) || []

  // Look for tableA_id in tableB or tableB_id in tableA
  const fkA = colsB.find((c) => c === `${tableA.name}_id` || c === `${tableA.name}Id`)
  if (fkA) {
    return { leftTable: tableA.id, leftColumn: 'id', rightTable: tableB.id, rightColumn: fkA }
  }

  const fkB = colsA.find((c) => c === `${tableB.name}_id` || c === `${tableB.name}Id`)
  if (fkB) {
    return { leftTable: tableA.id, leftColumn: fkB, rightTable: tableB.id, rightColumn: 'id' }
  }

  return null
}
