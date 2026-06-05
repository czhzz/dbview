import { create } from 'zustand'
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
  setLoading: (loading) => set({ loading })
}))