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
  // Heartbeat
  status: 'connected' | 'reconnecting' | 'disconnected' | 'never'
  lastHeartbeatAt: number
  reconnectAttempts: number
  heartbeatTimer?: ReturnType<typeof setInterval>
  reconnectTimer?: ReturnType<typeof setTimeout>
}

interface QueryEntry {
  controller: AbortController
  startedAt: number
}

export type { PoolEntry }

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
    this.pools.set(connId, {
      driver,
      config,
      lastUsedAt: Date.now(),
      status: 'connected',
      lastHeartbeatAt: Date.now(),
      reconnectAttempts: 0
    })
    this.startHeartbeat(connId)
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
      if (entry.heartbeatTimer) clearInterval(entry.heartbeatTimer)
      if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer)
      try {
        await entry.driver.closePool()
      } catch {
        // closePool may fail if pool is already closed — clean up state anyway
      }
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
    // Stop idle checker first to prevent races
    if (this.idleTimer) {
      clearInterval(this.idleTimer)
      this.idleTimer = null
    }
    // Cancel all active queries
    for (const [qid] of this.activeQueries) {
      this.cancelQuery(qid)
    }
    for (const [id] of this.pools) {
      await this.disconnect(id)
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

  // --- v0.3.0: Heartbeat & Reconnect ---

  private readonly HEARTBEAT_INTERVAL = 60 * 1000 // 60s
  private readonly MAX_RECONNECT_ATTEMPTS = 3
  private readonly RECONNECT_INTERVAL = 10 * 1000 // 10s

  private startHeartbeat(connId: string): void {
    const entry = this.pools.get(connId)
    if (!entry) return

    if (entry.heartbeatTimer) clearInterval(entry.heartbeatTimer)
    entry.heartbeatTimer = setInterval(async () => {
      try {
        await entry.driver.executeQuery('SELECT 1')
        entry.status = 'connected'
        entry.lastHeartbeatAt = Date.now()
        entry.reconnectAttempts = 0
      } catch {
        entry.status = 'disconnected'
        this.attemptReconnect(connId)
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  private attemptReconnect(connId: string): void {
    const entry = this.pools.get(connId)
    if (!entry) return

    if (entry.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      entry.status = 'disconnected'
      return
    }

    entry.status = 'reconnecting'
    entry.reconnectAttempts++

    if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer)
    entry.reconnectTimer = setTimeout(async () => {
      try {
        await entry.driver.closePool()
        const rawDriver = DriverFactory.createDriver(entry.config.type)
        await rawDriver.createPool(entry.config)
        // Re-wrap with logger
        const newLogger = new DriverLogger(rawDriver, connId, this.logService)
        // Replace the driver in the pool entry
        entry.driver = newLogger
        entry.status = 'connected'
        entry.lastHeartbeatAt = Date.now()
        entry.reconnectAttempts = 0
        // Restart heartbeat
        this.startHeartbeat(connId)
      } catch {
        this.attemptReconnect(connId)
      }
    }, this.RECONNECT_INTERVAL)
  }

  /** Get status for all tracked connections */
  getStatuses(): { connId: string; status: string; lastHeartbeat?: number; reconnectAttempts?: number }[] {
    return Array.from(this.pools.entries()).map(([connId, entry]) => ({
      connId,
      status: entry.status,
      lastHeartbeat: entry.lastHeartbeatAt,
      reconnectAttempts: entry.reconnectAttempts
    }))
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