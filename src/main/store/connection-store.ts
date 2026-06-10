import initSqlJs, { type Database } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app, safeStorage } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import type { ConnectionConfig, ConnectionConfigInput } from '../../renderer/types/connection'

const DB_PATH = path.join(app.getPath('userData'), 'dbview-connections.db')

export interface ConnectionGroup {
  id: string
  name: string
  sortOrder: number
  createdAt: number
}

export class ConnectionStore {
  private db: Database | null = null
  private encryptionKey: Buffer | null = null

  async init(): Promise<void> {
    const SQL = await initSqlJs()
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH)
      this.db = new SQL.Database(buffer)
    } else {
      this.db = new SQL.Database()
    }
    this.db.run('PRAGMA journal_mode=WAL')
    this.initSchema()
    this.save()
  }

  private initSchema(): void {
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        username TEXT NOT NULL,
        password_encrypted TEXT NOT NULL,
        database_name TEXT,
        ssl INTEGER DEFAULT 0,
        oracle_service_name TEXT,
        group_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS connection_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `)
    // Migrations: add columns that may be missing in existing databases
    const migrations = [
      'ALTER TABLE connections ADD COLUMN oracle_service_name TEXT',
      'ALTER TABLE connections ADD COLUMN group_id TEXT',
      'ALTER TABLE connections ADD COLUMN read_only INTEGER DEFAULT 0'
    ]
    for (const sql of migrations) {
      try {
        this.db!.run(sql)
      } catch {
        // Column already exists, ignore
      }
    }
  }

  private save(): void {
    if (!this.db) return
    const data = this.db.export()
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(DB_PATH, Buffer.from(data))
  }

  private getKey(): Buffer {
    if (this.encryptionKey) return this.encryptionKey

    if (safeStorage.isEncryptionAvailable()) {
      const keyPath = path.join(app.getPath('userData'), '.dbview-key')
      if (fs.existsSync(keyPath)) {
        const encrypted = fs.readFileSync(keyPath)
        const rawKeyHex = safeStorage.decryptString(encrypted)
        this.encryptionKey = Buffer.from(rawKeyHex, 'hex')
      } else {
        const rawKey = crypto.randomBytes(32)
        const encrypted = safeStorage.encryptString(rawKey.toString('hex'))
        fs.writeFileSync(keyPath, Buffer.from(encrypted))
        this.encryptionKey = rawKey
      }
    } else {
      this.encryptionKey = crypto
        .createHash('sha256')
        .update(app.getPath('userData'))
        .digest()
    }
    return this.encryptionKey
  }

  private encrypt(text: string): string {
    const key = this.getKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  private decrypt(encrypted: string): string {
    const key = this.getKey()
    const [ivHex, authTagHex, dataHex] = encrypted.split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8')
  }

  list(): ConnectionConfig[] {
    const stmt = this.db!.prepare(
      `SELECT id, name, type, host, port, username, password_encrypted,
              database_name, ssl, read_only, oracle_service_name, group_id, created_at, updated_at
       FROM connections ORDER BY updated_at DESC`
    )
    const rows: ConnectionConfig[] = []
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>
      rows.push({
        id: r.id as string,
        name: r.name as string,
        type: r.type as ConnectionConfig['type'],
        host: r.host as string,
        port: r.port as number,
        username: r.username as string,
        password: this.decrypt(r.password_encrypted as string),
        database: (r.database_name as string) || undefined,
        ssl: (r.ssl as number) === 1,
        readOnly: (r.read_only as number) === 1,
        oracleServiceName: (r.oracle_service_name as string) || undefined,
        groupId: (r.group_id as string) || undefined,
        createdAt: r.created_at as number,
        updatedAt: r.updated_at as number
      })
    }
    stmt.free()
    return rows
  }

  getById(id: string): ConnectionConfig | null {
    const stmt = this.db!.prepare(
      `SELECT id, name, type, host, port, username, password_encrypted,
              database_name, ssl, oracle_service_name, group_id, created_at, updated_at
       FROM connections WHERE id = ?`
    )
    stmt.bind([id])
    if (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>
      stmt.free()
      return {
        id: r.id as string,
        name: r.name as string,
        type: r.type as ConnectionConfig['type'],
        host: r.host as string,
        port: r.port as number,
        username: r.username as string,
        password: this.decrypt(r.password_encrypted as string),
        database: (r.database_name as string) || undefined,
        ssl: (r.ssl as number) === 1,
        readOnly: (r.read_only as number) === 1,
        oracleServiceName: (r.oracle_service_name as string) || undefined,
        groupId: (r.group_id as string) || undefined,
        createdAt: r.created_at as number,
        updatedAt: r.updated_at as number
      }
    }
    stmt.free()
    return null
  }

  create(input: ConnectionConfigInput): ConnectionConfig {
    const id = uuidv4()
    const now = Date.now()
    const passwordEncrypted = this.encrypt(input.password)

    this.db!.run(
      `INSERT INTO connections (id, name, type, host, port, username, password_encrypted, database_name, ssl, read_only, oracle_service_name, group_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.type,
        input.host,
        input.port,
        input.username,
        passwordEncrypted,
        input.database || null,
        input.ssl ? 1 : 0,
        input.readOnly ? 1 : 0,
        input.oracleServiceName || null,
        input.groupId || null,
        now,
        now
      ]
    )
    this.save()

    return { ...input, id, createdAt: now, updatedAt: now }
  }

  update(config: ConnectionConfig): void {
    const passwordEncrypted = this.encrypt(config.password)
    const now = Date.now()

    this.db!.run(
      `UPDATE connections SET name=?, type=?, host=?, port=?, username=?, password_encrypted=?,
              database_name=?, ssl=?, read_only=?, oracle_service_name=?, group_id=?, updated_at=? WHERE id=?`,
      [
        config.name,
        config.type,
        config.host,
        config.port,
        config.username,
        passwordEncrypted,
        config.database || null,
        config.ssl ? 1 : 0,
        config.readOnly ? 1 : 0,
        config.oracleServiceName || null,
        config.groupId || null,
        now,
        config.id
      ]
    )
    this.save()
  }

  delete(id: string): void {
    this.db!.run('DELETE FROM connections WHERE id = ?', [id])
    this.save()
  }

  // -- Group CRUD --

  listGroups(): ConnectionGroup[] {
    const stmt = this.db!.prepare(
      'SELECT id, name, sort_order, created_at FROM connection_groups ORDER BY sort_order ASC, created_at ASC'
    )
    const rows: ConnectionGroup[] = []
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>
      rows.push({
        id: r.id as string,
        name: r.name as string,
        sortOrder: r.sort_order as number,
        createdAt: r.created_at as number
      })
    }
    stmt.free()
    return rows
  }

  createGroup(name: string): ConnectionGroup {
    const id = uuidv4()
    const now = Date.now()
    const maxOrder = this.db!.exec('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM connection_groups')
    const sortOrder = maxOrder[0]?.values[0]?.[0] as number ?? 0

    this.db!.run(
      'INSERT INTO connection_groups (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
      [id, name, sortOrder, now]
    )
    this.save()

    return { id, name, sortOrder, createdAt: now }
  }

  renameGroup(id: string, name: string): void {
    this.db!.run('UPDATE connection_groups SET name = ? WHERE id = ?', [name, id])
    this.save()
  }

  deleteGroup(id: string): void {
    // Move connections in this group to ungrouped
    this.db!.run('UPDATE connections SET group_id = NULL WHERE group_id = ?', [id])
    this.db!.run('DELETE FROM connection_groups WHERE id = ?', [id])
    this.save()
  }
}