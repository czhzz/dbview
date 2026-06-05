import type { DatabaseDriver } from '../db/db-driver'
import { DriverFactory } from '../db/driver-factory'
import { ConnectionStore } from '../store/connection-store'
import type { ConnectionConfig } from '../../renderer/types/connection'

interface PoolEntry {
  driver: DatabaseDriver
  config: ConnectionConfig
  lastUsedAt: number
}

export class ConnectionManager {
  private pools = new Map<string, PoolEntry>()
  private store: ConnectionStore
  private idleTimer: ReturnType<typeof setInterval> | null = null
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000 // 30 minutes

  constructor(store: ConnectionStore) {
    this.store = store
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
    const driver = DriverFactory.createDriver(config.type)
    await driver.createPool(config)
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
    for (const [id] of this.pools) {
      await this.disconnect(id)
    }
    if (this.idleTimer) {
      clearInterval(this.idleTimer)
      this.idleTimer = null
    }
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