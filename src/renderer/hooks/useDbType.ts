import { useConnectionStore } from '../stores/connectionStore'
import type { DbType } from '../utils/sql-quote'

/**
 * Get the database type for a given connection ID.
 * Falls back to 'mysql' if the connection is not found.
 */
export function useDbType(connId: string): DbType {
  const connections = useConnectionStore((s) => s.connections)
  const conn = connections.find((c) => c.id === connId)
  return (conn?.type || 'mysql') as DbType
}
