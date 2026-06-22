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

// === v0.3.0 新增类型 ===

export interface ErDiagramTable {
  name: string
  comment?: string
  columns: ColumnInfo[]
  primaryKey: string[]
  foreignKeys: ForeignKeyInfo[]
}

export interface ForeignKeyInfo {
  column: string
  refTable: string
  refColumn: string
  constraintName?: string
}

export interface ErDiagramData {
  tables: ErDiagramTable[]
}

export interface UnifiedExplainPlan {
  operation: string
  nodeType: string
  estimatedRows: number
  estimatedCost: number
  actualRows?: number
  actualTime?: number
  details: Record<string, unknown>
  children: UnifiedExplainPlan[]
}

export interface DiffReport {
  tables: TableDiff[]
}

export interface TableDiff {
  name: string
  status: 'added' | 'removed' | 'modified' | 'identical'
  columns?: ColumnDiff[]
  indexes?: IndexDiff[]
}

export interface ColumnDiff {
  name: string
  status: 'added' | 'removed' | 'modified'
  oldType?: string
  newType?: string
  oldNullable?: boolean
  newNullable?: boolean
  oldDefault?: string | null
  newDefault?: string | null
}

export interface IndexDiff {
  name: string
  status: 'added' | 'removed' | 'modified'
  oldColumns?: string[]
  newColumns?: string[]
  oldUnique?: boolean
  newUnique?: boolean
}

export interface ImportPreview {
  columns: string[]
  rows: Record<string, unknown>[]
  totalRows: number
  detectedTypes: Record<string, string>
  encoding?: string
}

export interface ImportResult {
  importedRows: number
  errors: ImportError[]
}

export interface ImportError {
  row: number
  message: string
}

export interface ConnectionStatus {
  connId: string
  status: 'connected' | 'reconnecting' | 'disconnected' | 'never'
  lastHeartbeat?: number
  reconnectAttempts?: number
}

export interface ShortcutEntry {
  id: string
  label: string
  keys: string
  category: string
  defaultKeys: string
}