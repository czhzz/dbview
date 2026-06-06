export interface TableInfo {
  name: string
  comment?: string
  engine?: string
  rowCount?: number
  createTime?: string
  updateTime?: string
}

export interface ViewInfo {
  name: string
  definition?: string
}

export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  key: 'PRI' | 'UNI' | 'MUL' | ''
  defaultValue: string | null
  extra: string
  comment: string
  maxLength?: number
}

export interface IndexInfo {
  name: string
  columns: string[]
  unique: boolean
  primary: boolean
  type: string
  comment?: string
}

export interface TreeNode {
  key: string
  type: 'connection' | 'database' | 'table' | 'view' | 'column' | 'index'
  label: string
  isLeaf: boolean
  iconType?: string
  children?: TreeNode[]
  extra?: Record<string, unknown>
}

export interface PaginationQuery {
  table: string
  schema?: string
  page: number
  pageSize: number
  orderBy?: { column: string; direction: 'ASC' | 'DESC' }
  filters?: FilterCondition[]
}

export interface FilterCondition {
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL'
  value?: string
}

export interface PaginationResult {
  rows: Record<string, unknown>[]
  total: number
  page: number
  pageSize: number
  columns: string[]
  executionTime: number
}

export interface SQLResult {
  columns: string[]
  rows: Record<string, unknown>[]
  affectedRows?: number
  insertId?: number
  executionTime: number
  message?: string
}

export interface UserInfo {
  name: string
  host?: string
}

export interface RoutineInfo {
  name: string
  type: 'PROCEDURE' | 'FUNCTION'
  returnType?: string
  definition?: string
}