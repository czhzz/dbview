import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './types'

const api: ElectronAPI = {
  connection: {
    list: () => ipcRenderer.invoke('connection:list'),
    getById: (id) => ipcRenderer.invoke('connection:getById', id),
    create: (config) => ipcRenderer.invoke('connection:create', config),
    update: (config) => ipcRenderer.invoke('connection:update', config),
    delete: (id) => ipcRenderer.invoke('connection:delete', id),
    test: (config) => ipcRenderer.invoke('connection:test', config),
    connect: (id) => ipcRenderer.invoke('connection:connect', id),
    disconnect: (id) => ipcRenderer.invoke('connection:disconnect', id),
    getActiveConnections: () => ipcRenderer.invoke('connection:getActiveConnections')
  },
  database: {
    getDatabases: (connId) => ipcRenderer.invoke('database:getDatabases', connId),
    getTables: (connId, schema) => ipcRenderer.invoke('database:getTables', connId, schema),
    getViews: (connId, schema) => ipcRenderer.invoke('database:getViews', connId, schema),
    getColumns: (connId, table, schema) => ipcRenderer.invoke('database:getColumns', connId, table, schema),
    getIndexes: (connId, table, schema) => ipcRenderer.invoke('database:getIndexes', connId, table, schema),
    getDDL: (connId, table, schema) => ipcRenderer.invoke('database:getDDL', connId, table, schema)
  },
  data: {
    query: (connId, params) => ipcRenderer.invoke('data:query', connId, params)
  },
  sql: {
    execute: (connId, sql, queryId?) => ipcRenderer.invoke('sql:execute', connId, sql, queryId),
    registerQuery: (connId) => ipcRenderer.invoke('sql:registerQuery', connId),
    cancel: (connId, queryId) => ipcRenderer.invoke('sql:cancel', connId, queryId)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)