import type { DatabaseDriver } from './db-driver'
import type { ConnectionConfig } from '../../renderer/types/connection'
import { MySQLDriver } from './mysql-driver'
import { PostgreSQLDriver } from './pg-driver'
import { SQLiteDriver } from './sqlite-driver'
import { OracleDriver } from './oracle-driver'

export class DriverFactory {
  static createDriver(type: ConnectionConfig['type']): DatabaseDriver {
    switch (type) {
      case 'mysql':
        return new MySQLDriver()
      case 'postgresql':
        return new PostgreSQLDriver()
      case 'sqlite':
        return new SQLiteDriver()
      case 'oracle':
        return new OracleDriver()
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }
}