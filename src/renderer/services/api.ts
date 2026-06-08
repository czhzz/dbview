// This file is a typed wrapper around window.electronAPI
// It provides a convenient interface for the renderer to call main process functions.
// The actual IPC bridge is defined in src/preload/index.ts

function getAPI() {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available - are you running in Electron?')
  }
  return window.electronAPI
}

export const dialogApi = {
  showSaveDialog: (options: Parameters<typeof getAPI>[0]['dialog']['showSaveDialog'][0]) =>
    getAPI().dialog.showSaveDialog(options)
}

export const fileApi = {
  write: (filePath: string, content: string, encoding?: BufferEncoding) =>
    getAPI().file.write(filePath, content, encoding)
}

export const historyApi = {
  add: (entry: Parameters<typeof getAPI>[0]['history']['add'][0]) =>
    getAPI().history.add(entry),
  list: (connId?: string, search?: string, limit?: number) =>
    getAPI().history.list(connId, search, limit),
  delete: (id: number) => getAPI().history.delete(id),
  clear: (connId?: string) => getAPI().history.clear(connId)
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
  getActiveConnections: () => getAPI().connection.getActiveConnections(),
  listGroups: () => getAPI().connection.listGroups(),
  createGroup: (name: string) => getAPI().connection.createGroup(name),
  renameGroup: (id: string, name: string) => getAPI().connection.renameGroup(id, name),
  deleteGroup: (id: string) => getAPI().connection.deleteGroup(id)
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
    getAPI().database.getDDL(connId, table, schema),
  getRoutines: (connId: string, schema?: string) =>
    getAPI().database.getRoutines(connId, schema),
  getRoutineDefinition: (connId: string, name: string, type: 'PROCEDURE' | 'FUNCTION', schema?: string) =>
    getAPI().database.getRoutineDefinition(connId, name, type, schema),
  getUsers: (connId: string, schema?: string) =>
    getAPI().database.getUsers(connId, schema)
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

export const sqlLogApi = {
  onLog: (callback: Parameters<typeof getAPI>[0]['sqlLog']['onLog'][0]) =>
    getAPI().sqlLog.onLog(callback),
  clear: () => getAPI().sqlLog.clear()
}