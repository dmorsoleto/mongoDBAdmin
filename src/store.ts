import { create } from 'zustand'

// ── Settings helpers ─────────────────────────────────────────────────────────

function loadBool(key: string, fallback = false): boolean {
  const v = localStorage.getItem(key)
  return v === null ? fallback : v === 'true'
}

// ── Connection entry ─────────────────────────────────────────────────────────

export interface ConnectionEntry {
  id: string
  uri: string
  name: string          // e.g. "localhost:27017"
  databases: string[]
  selectedDb: string | null
  collections: string[]
}

export function extractConnName(uri: string): string {
  try {
    const m = uri.match(/(?:mongodb(?:\+srv)?:\/\/)?(?:[^@]+@)?([^/?]+)/)
    return m ? m[1] : uri.slice(0, 40)
  } catch {
    return uri.slice(0, 40)
  }
}

// ── State ────────────────────────────────────────────────────────────────────

interface AppState {
  // Multi-connection
  connections: ConnectionEntry[]
  activeConnId: string | null

  // Active view (mirrors active connection's selectedDb)
  selectedDb: string | null
  selectedCollection: string | null

  // Documents
  documents: any[]
  totalDocs: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null

  // Settings
  readOnlyMode: boolean
  protectConnectionStringSecrets: boolean
  defaultSort: 'default' | '_id_asc' | '_id_desc' | 'natural_desc'
  maxTimeMsLimit: number | null
  theme: 'dark' | 'light'

  // Connection management
  addConnection: (entry: ConnectionEntry) => void
  removeConnection: (id: string) => void
  updateConn: (id: string, patch: Partial<Pick<ConnectionEntry, 'databases' | 'selectedDb' | 'collections'>>) => void
  activateCollection: (connId: string, db: string, coll: string) => void

  // Document state
  setDocuments: (docs: any[]) => void
  setPage: (page: number) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void

  // Settings setters
  setReadOnlyMode: (v: boolean) => void
  setProtectConnectionStringSecrets: (v: boolean) => void
  setDefaultSort: (v: 'default' | '_id_asc' | '_id_desc' | 'natural_desc') => void
  setMaxTimeMsLimit: (v: number | null) => void
  setTheme: (v: 'dark' | 'light') => void
}

export const useStore = create<AppState>((set) => ({
  connections: [],
  activeConnId: null,
  selectedDb: null,
  selectedCollection: null,
  documents: [],
  totalDocs: 0,
  page: 0,
  pageSize: 20,
  loading: false,
  error: null,
  readOnlyMode: loadBool('setting_readOnlyMode'),
  protectConnectionStringSecrets: loadBool('setting_protectConnectionStringSecrets'),
  defaultSort: (localStorage.getItem('setting_defaultSort') as 'default' | '_id_asc' | '_id_desc' | 'natural_desc') ?? 'default',
  maxTimeMsLimit: localStorage.getItem('setting_maxTimeMsLimit') !== null ? Number(localStorage.getItem('setting_maxTimeMsLimit')) : null,
  theme: (localStorage.getItem('setting_theme') as 'dark' | 'light') ?? 'dark',

  addConnection: (entry) =>
    set((s) => ({ connections: [...s.connections, entry] })),

  removeConnection: (id) =>
    set((s) => {
      const connections = s.connections.filter((c) => c.id !== id)
      const wasActive = s.activeConnId === id
      return {
        connections,
        activeConnId: wasActive ? (connections[0]?.id ?? null) : s.activeConnId,
        selectedDb: wasActive ? null : s.selectedDb,
        selectedCollection: wasActive ? null : s.selectedCollection,
        documents: wasActive ? [] : s.documents,
        page: wasActive ? 0 : s.page,
      }
    }),

  updateConn: (id, patch) =>
    set((s) => ({
      connections: s.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  activateCollection: (connId, db, coll) =>
    set((s) => ({
      activeConnId: connId,
      selectedDb: db,
      selectedCollection: coll,
      documents: [],
      page: 0,
      connections: s.connections.map((c) =>
        c.id === connId ? { ...c, selectedDb: db } : c
      ),
    })),

  setDocuments: (docs) => set({ documents: docs }),
  setPage: (page) => set({ page }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),

  setReadOnlyMode: (v) => {
    localStorage.setItem('setting_readOnlyMode', String(v))
    set({ readOnlyMode: v })
  },
  setProtectConnectionStringSecrets: (v) => {
    localStorage.setItem('setting_protectConnectionStringSecrets', String(v))
    set({ protectConnectionStringSecrets: v })
  },
  setDefaultSort: (v) => {
    localStorage.setItem('setting_defaultSort', v)
    set({ defaultSort: v })
  },
  setMaxTimeMsLimit: (v) => {
    if (v === null) localStorage.removeItem('setting_maxTimeMsLimit')
    else localStorage.setItem('setting_maxTimeMsLimit', String(v))
    set({ maxTimeMsLimit: v })
  },
  setTheme: (v) => {
    localStorage.setItem('setting_theme', v)
    if (v === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    set({ theme: v })
  },
}))
