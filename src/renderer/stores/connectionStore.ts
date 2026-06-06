import { create } from 'zustand'
import { connectionApi } from '../services/api'
import type { ConnectionConfig } from '../types/connection'

interface ConnectionState {
  connections: ConnectionConfig[]
  activeConnectionId: string | null
  connectedIds: Set<string>
  loading: boolean
  setConnections: (connections: ConnectionConfig[]) => void
  setActiveConnection: (id: string | null) => void
  addConnected: (id: string) => void
  removeConnected: (id: string) => void
  setLoading: (loading: boolean) => void
  loadConnections: () => Promise<void>
  addConnection: (config: ConnectionConfig) => void
  removeConnection: (id: string) => void
  updateConnection: (config: ConnectionConfig) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  connections: [],
  activeConnectionId: null,
  connectedIds: new Set(),
  loading: false,
  setConnections: (connections) => set({ connections }),
  setActiveConnection: (id) => set({ activeConnectionId: id }),
  addConnected: (id) =>
    set((state) => {
      const next = new Set(state.connectedIds)
      next.add(id)
      return { connectedIds: next }
    }),
  removeConnected: (id) =>
    set((state) => {
      const next = new Set(state.connectedIds)
      next.delete(id)
      return { connectedIds: next }
    }),
  setLoading: (loading) => set({ loading }),
  loadConnections: async () => {
    set({ loading: true })
    try {
      const list = await connectionApi.list()
      set({ connections: list, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  addConnection: (config) =>
    set((state) => ({ connections: [...state.connections, config] })),
  removeConnection: (id) =>
    set((state) => ({ connections: state.connections.filter((c) => c.id !== id) })),
  updateConnection: (config) =>
    set((state) => ({
      connections: state.connections.map((c) => (c.id === config.id ? config : c))
    }))
}))
