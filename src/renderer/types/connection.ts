export interface ConnectionConfig {
  id: string
  name: string
  type: 'mysql' | 'postgresql' | 'sqlite' | 'oracle'
  host: string
  port: number
  username: string
  password: string
  database?: string
  oracleServiceName?: string
  ssl?: boolean
  createdAt: number
  updatedAt: number
}

export type ConnectionConfigInput = Omit<ConnectionConfig, 'id' | 'createdAt' | 'updatedAt'>

export interface ConnectionTestResult {
  success: boolean
  message: string
  serverVersion?: string
}