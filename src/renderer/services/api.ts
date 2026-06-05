// This file is a typed wrapper around window.electronAPI
// It provides a convenient interface for the renderer to call main process functions.
// The actual IPC bridge is defined in src/preload/index.ts

function getAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available - are you running in Electron?')
  }
  return window.electronAPI
}

export const connectionApi = {
  list: () => getAPI().connection.list(),
  getById: (id: string) => getAPI().connection.getById(id),
  create: (config: Parameters<typeof getAPI>[0]['connection']['create'][0]) =>
    getAPI().connection.create(config),
  update: (config: Parameters<typeof getAPI>[0]['connection']['update'][0]) =>
    getAPI().connection.update(config),
  delete: (id: string) => getAPI().connection.delete(id),
  test: (config: Parameters<typeof getAPI>[0]['connection']['test'][0]) =>
    getAPI().connection.test(config),
  connect: (id: string) => getAPI().connection.connect(id),
  disconnect: (id: string) => getAPI().connection.disconnect(id),
  getActiveConnections: () => getAPI().connection.getActiveConnections()
}

export const databaseApi = {
  getDatabases: (connId: string) => getAPI().database.getDatabases(connId),
  getTables: (connId: string, schema?: string) => getAPI().database.getTables(connId, schema),
  getViews: (connId: string, schema?: string) => getAPI().database.getViews(connId, schema),
  getColumns: (connId: string, table: string, schema?: string) =>
    getAPI().database.getColumns(connId, table, schema),
  getIndexes: (connId: string, table: string, schema?: string) =>
    getAPI().database.getIndexes(connId, table, schema),
  getDDL: (connId: string, table: string, schema?: string) =>
    getAPI().database.getDDL(connId, table, schema)
}

export const dataApi = {
  query: (connId: string, params: Parameters<typeof getAPI>[0]['data']['query'][1]) =>
    getAPI().data.query(connId, params)
}

export const sqlApi = {
  execute: (connId: string, sql: string, queryId?: string) => getAPI().sql.execute(connId, sql, queryId),
  registerQuery: (connId: string) => getAPI().sql.registerQuery(connId),
  cancel: (connId: string, queryId: string) => getAPI().sql.cancel(connId, queryId)
}