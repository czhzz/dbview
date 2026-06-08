import type { DatabaseDriver } from '../db/db-driver'
import { DriverFactory } from '../db/driver-factory'
import { DriverLogger } from '../db/driver-logger'
import { ConnectionStore } from '../store/connection-store'
import type { ConnectionConfig } from '../../renderer/types/connection'
import type { SqlLogService } from './sql-log-service'

interface PoolEntry {
  driver: DatabaseDriver
  config: ConnectionConfig
  lastUsedAt: number
}

interface QueryEntry {
  controller: AbortController
  startedAt: number
}

export class ConnectionManager {
  private pools = new Map<string, PoolEntry>()
  private store: ConnectionStore
  private logService: SqlLogService
  private idleTimer: ReturnType<typeof setInterval> | null = null
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private activeQueries = new Map<string, QueryEntry>()
  private queryCounter = 0

  constructor(store: ConnectionStore, logService: SqlLogService) {
    this.store = store
    this.logService = logService
    this.startIdleChecker()
  }

  async getConnection(connId: string): Promise<DatabaseDriver> {
    const entry = this.pools.get(connId)
    if (entry) {
      entry.lastUsedAt = Date.now()
      return entry.driver
    }
    return this.createConnection(connId)
  }

  private async createConnection(connId: string): Promise<DatabaseDriver> {
    const config = this.store.getById(connId)
    if (!config) {
      throw new Error(`连接配置不存在: ${connId}`)
    }
    const rawDriver = DriverFactory.createDriver(config.type)
    await rawDriver.createPool(config)
    const driver = new DriverLogger(rawDriver, connId, this.logService)
    this.pools.set(connId, { driver, config, lastUsedAt: Date.now() })
    return driver
  }

  async connect(config: ConnectionConfigInput): Promise<DatabaseDriver> {
    const driver = DriverFactory.createDriver(config.type)
    await driver.createPool(config)
    return driver
  }

  async disconnect(connId: string): Promise<void> {
    const entry = this.pools.get(connId)
    if (entry) {
      await entry.driver.closePool()
      this.pools.delete(connId)
    }
  }

  isConnected(connId: string): boolean {
    const entry = this.pools.get(connId)
    return entry ? entry.driver.isConnected() : false
  }

  getActiveConnectionIds(): string[] {
    return Array.from(this.pools.keys())
  }

  async closeAll(): Promise<void> {
    // Cancel all active queries
    for (const [qid] of this.activeQueries) {
      this.cancelQuery(qid)
    }
    for (const [id] of this.pools) {
      await this.disconnect(id)
    }
    if (this.idleTimer) {
      clearInterval(this.idleTimer)
      this.idleTimer = null
    }
  }

  // Query cancellation support
  registerQuery(connId: string): string {
    const controller = new AbortController()
    const queryId = `q-${this.queryCounter++}-${Date.now()}`
    this.activeQueries.set(queryId, { controller, startedAt: Date.now() })

    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      this.activeQueries.delete(queryId)
    }, 5 * 60 * 1000)

    return queryId
  }

  cancelQuery(queryId: string): boolean {
    const entry = this.activeQueries.get(queryId)
    if (!entry) return false
    entry.controller.abort()
    this.activeQueries.delete(queryId)
    return true
  }

  getAbortSignal(queryId: string): AbortSignal | undefined {
    const entry = this.activeQueries.get(queryId)
    return entry?.controller.signal
  }

  cleanupQuery(queryId: string): void {
    this.activeQueries.delete(queryId)
  }

  private startIdleChecker(): void {
    this.idleTimer = setInterval(() => {
      const now = Date.now()
      for (const [id, entry] of this.pools) {
        if (now - entry.lastUsedAt > this.IDLE_TIMEOUT) {
          entry.driver.closePool().catch(() => {})
          this.pools.delete(id)
        }
      }
    }, 5 * 60 * 1000)
  }
}

// Type for connection config input
interface ConnectionConfigInput {
  name: string
  type: 'mysql' | 'oracle'
  host: string
  port: number
  username: string
  password: string
  database?: string
  ssl?: boolean
}