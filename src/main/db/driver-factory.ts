import type { DatabaseDriver } from './db-driver'
import type { ConnectionConfig } from '../../renderer/types/connection'
import { MySQLDriver } from './mysql-driver'

export class DriverFactory {
  static createDriver(type: ConnectionConfig['type']): DatabaseDriver {
    switch (type) {
      case 'mysql':
        return new MySQLDriver()
      case 'oracle':
        throw new Error('Oracle driver not yet implemented')
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }
}