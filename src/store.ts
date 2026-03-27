import { create } from 'zustand'

// ── Settings helpers ─────────────────────────────────────────────────────────

function loadBool(key: string, fallback = false): boolean {
  const v = localStorage.getItem(key)
  return v === null ? fallback : v === 'true'
}

// ── State ────────────────────────────────────────────────────────────────────

interface AppState {
  connected: boolean
  currentUri: string
  selectedDb: string | null
  selectedCollection: string | null
  databases: string[]
  collections: string[]
  documents: any[]
  totalDocs: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  // settings
  readOnlyMode: boolean
  protectConnectionStringSecrets: boolean
  defaultSort: 'default' | '_id_asc' | '_id_desc' | 'natural_desc'
  maxTimeMsLimit: number | null
  theme: 'dark' | 'light'
  setConnected: (v: boolean, uri?: string) => void
  setSelectedDb: (db: string | null) => void
  setSelectedCollection: (coll: string | null) => void
  setDatabases: (dbs: string[]) => void
  setCollections: (colls: string[]) => void
  setDocuments: (docs: any[]) => void
  setPage: (page: number) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setReadOnlyMode: (v: boolean) => void
  setProtectConnectionStringSecrets: (v: boolean) => void
  setDefaultSort: (v: 'default' | '_id_asc' | '_id_desc' | 'natural_desc') => void
  setMaxTimeMsLimit: (v: number | null) => void
  setTheme: (v: 'dark' | 'light') => void
}

export const useStore = create<AppState>((set) => ({
  connected: false,
  currentUri: '',
  selectedDb: null,
  selectedCollection: null,
  databases: [],
  collections: [],
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
  setConnected: (v, uri = '') => set({ connected: v, currentUri: uri }),
  setSelectedDb: (db) => set({ selectedDb: db, selectedCollection: null, collections: [], documents: [] }),
  setSelectedCollection: (coll) => set({ selectedCollection: coll, documents: [], page: 0 }),
  setDatabases: (dbs) => set({ databases: dbs }),
  setCollections: (colls) => set({ collections: colls }),
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
