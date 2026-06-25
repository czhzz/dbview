import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, SqlLogEntry } from './types'

const api: ElectronAPI = {
  dialog: {
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  },
  file: {
    write: (filePath, content, encoding) => ipcRenderer.invoke('file:write', filePath, content, encoding)
  },
  history: {
    add: (entry) => ipcRenderer.invoke('history:add', entry),
    list: (connId, search, limit, offset) => ipcRenderer.invoke('history:list', connId, search, limit, offset),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    clear: (connId) => ipcRenderer.invoke('history:clear', connId)
  },
  connection: {
    list: () => ipcRenderer.invoke('connection:list'),
    getById: (id) => ipcRenderer.invoke('connection:getById', id),
    create: (config) => ipcRenderer.invoke('connection:create', config),
    update: (config) => ipcRenderer.invoke('connection:update', config),
    delete: (id) => ipcRenderer.invoke('connection:delete', id),
    test: (config) => ipcRenderer.invoke('connection:test', config),
    connect: (id) => ipcRenderer.invoke('connection:connect', id),
    disconnect: (id) => ipcRenderer.invoke('connection:disconnect', id),
    getActiveConnections: () => ipcRenderer.invoke('connection:getActiveConnections'),
    listGroups: () => ipcRenderer.invoke('connection:listGroups'),
    createGroup: (name) => ipcRenderer.invoke('connection:createGroup', name),
    renameGroup: (id, name) => ipcRenderer.invoke('connection:renameGroup', id, name),
    deleteGroup: (id) => ipcRenderer.invoke('connection:deleteGroup', id),
    getStatuses: () => ipcRenderer.invoke('connection:getStatuses')
  },
  database: {
    getDatabases: (connId) => ipcRenderer.invoke('database:getDatabases', connId),
    getTables: (connId, schema) => ipcRenderer.invoke('database:getTables', connId, schema),
    getViews: (connId, schema) => ipcRenderer.invoke('database:getViews', connId, schema),
    getColumns: (connId, table, schema) => ipcRenderer.invoke('database:getColumns', connId, table, schema),
    getIndexes: (connId, table, schema) => ipcRenderer.invoke('database:getIndexes', connId, table, schema),
    getDDL: (connId, table, schema) => ipcRenderer.invoke('database:getDDL', connId, table, schema),
    getRoutines: (connId, schema) => ipcRenderer.invoke('database:getRoutines', connId, schema),
    getRoutineDefinition: (connId, name, type, schema) => ipcRenderer.invoke('database:getRoutineDefinition', connId, name, type, schema),
    getUsers: (connId, schema) => ipcRenderer.invoke('database:getUsers', connId, schema)
  },
  data: {
    query: (connId, params) => ipcRenderer.invoke('data:query', connId, params)
  },
  sql: {
    execute: (connId, sql, queryId?) => ipcRenderer.invoke('sql:execute', connId, sql, queryId),
    registerQuery: (connId) => ipcRenderer.invoke('sql:registerQuery', connId),
    cancel: (connId, queryId) => ipcRenderer.invoke('sql:cancel', connId, queryId)
  },
  sqlLog: {
    onLog: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, entry: SqlLogEntry) => callback(entry)
      ipcRenderer.on('sql-log', handler)
      return () => ipcRenderer.removeListener('sql-log', handler)
    },
    clear: () => ipcRenderer.invoke('sql-log:clear'),
    list: (params) => ipcRenderer.invoke('sql-log:list', params)
  },

  // v0.3.0 IPC channels
  erDiagram: {
    getData: (connId, schema) => ipcRenderer.invoke('erDiagram:getData', connId, schema)
  },
  diff: {
    compare: (sourceId, targetId) => ipcRenderer.invoke('diff:compare', sourceId, targetId),
    compareData: (sourceConnId, targetConnId, table) => ipcRenderer.invoke('diff:compareData', sourceConnId, targetConnId, table),
    generateScript: (report, sourceType, targetType) => ipcRenderer.invoke('diff:generateScript', report, sourceType, targetType),
    executeMigration: (connId, sql) => ipcRenderer.invoke('diff:executeMigration', connId, sql)
  },
  import: {
    preview: (filePath) => ipcRenderer.invoke('import:preview', filePath),
    execute: (connId, table, filePath, columnMapping, options) => ipcRenderer.invoke('import:execute', connId, table, filePath, columnMapping, options),
    createTable: (connId, tableName, columns) => ipcRenderer.invoke('import:createTable', connId, tableName, columns)
  },
  profiling: {
    explain: (connId, sql) => ipcRenderer.invoke('profiling:explain', connId, sql),
    analyzeSlowQueries: (connId) => ipcRenderer.invoke('profiling:analyzeSlowQueries', connId)
  },
  shortcut: {
    save: (shortcuts) => ipcRenderer.invoke('shortcut:save', shortcuts),
    load: () => ipcRenderer.invoke('shortcut:load')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)