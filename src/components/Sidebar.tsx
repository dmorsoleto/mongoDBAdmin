import { useState, useCallback } from 'react'
import { useStore } from '../store'
import type { ConnectionEntry } from '../store'
import { db as dbApi } from '../lib/tauri'
import {
  Database, Table, ChevronRight, ChevronDown, Loader2,
  Plus, X, ServerCrash,
} from 'lucide-react'
import { Connections } from './Connections'

// ── single connection accordion ────────────────────────────────────────────

interface ConnAccordionProps {
  conn: ConnectionEntry
  onRemove: (id: string) => void
}

function ConnAccordion({ conn, onRemove }: ConnAccordionProps) {
  const { activeConnId, selectedCollection, updateConn, activateCollection, setError } = useStore()
  const [open, setOpen] = useState(true)
  const [loadingDb, setLoadingDb] = useState<string | null>(null)

  const handleExpandDb = useCallback(async (dbName: string) => {
    if (conn.selectedDb === dbName) {
      // collapse
      updateConn(conn.id, { selectedDb: null, collections: [] })
      return
    }
    setLoadingDb(dbName)
    try {
      const colls = await dbApi.listCollectionsFor(conn.id, dbName)
      updateConn(conn.id, { selectedDb: dbName, collections: colls })
    } catch (e: any) {
      setError(String(e))
    } finally {
      setLoadingDb(null)
    }
  }, [conn.id, conn.selectedDb, updateConn, setError])

  const handleSelectCollection = useCallback(async (dbName: string, collName: string) => {
    // If collections not loaded yet for this db, load them first
    if (conn.selectedDb !== dbName) {
      setLoadingDb(dbName)
      try {
        const colls = await dbApi.listCollectionsFor(conn.id, dbName)
        updateConn(conn.id, { selectedDb: dbName, collections: colls })
      } catch (e: any) {
        setError(String(e))
        setLoadingDb(null)
        return
      }
      setLoadingDb(null)
    }
    activateCollection(conn.id, dbName, collName)
  }, [conn.id, conn.selectedDb, activateCollection, updateConn, setError])

  const isActive = activeConnId === conn.id

  return (
    <div className="border-b border-gray-700/60 last:border-b-0">
      {/* Accordion header */}
      <div className={`flex items-center gap-1 px-3 py-2 group ${isActive ? 'bg-gray-750' : ''}`}
           style={isActive ? { backgroundColor: 'rgba(255,255,255,0.04)' } : {}}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          {open
            ? <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
            : <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />}
          <ServerCrash className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-green-400' : 'text-gray-500'}`} />
          <span className={`text-xs font-mono truncate ${isActive ? 'text-green-300' : 'text-gray-400'}`}>
            {conn.name}
          </span>
        </button>
        <button
          onClick={() => onRemove(conn.id)}
          title="Disconnect"
          className="text-gray-600 hover:text-red-400 transition-colors shrink-0 p-0.5 rounded"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Databases */}
      {open && (
        <div className="pb-1">
          {conn.databases.length === 0 ? (
            <p className="px-8 py-2 text-gray-600 text-xs">No databases</p>
          ) : (
            conn.databases.map((dbName) => {
              const expanded = conn.selectedDb === dbName
              return (
                <div key={dbName}>
                  <button
                    onClick={() => handleExpandDb(dbName)}
                    className={`w-full flex items-center gap-2 px-5 py-1.5 text-left hover:bg-gray-700/40 transition-colors ${
                      expanded ? 'bg-gray-700/30' : ''
                    }`}
                  >
                    {loadingDb === dbName
                      ? <Loader2 className="w-3 h-3 text-gray-500 animate-spin shrink-0" />
                      : <ChevronRight className={`w-3 h-3 text-gray-600 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
                    }
                    <Database className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    <span className={`text-xs truncate ${expanded ? 'text-gray-200' : 'text-gray-400'}`}>
                      {dbName}
                    </span>
                  </button>

                  {expanded && (
                    <div className="ml-5 border-l border-gray-700/50">
                      {conn.collections.length === 0 ? (
                        <p className="px-4 py-1.5 text-gray-600 text-xs">No collections</p>
                      ) : (
                        conn.collections.map((collName) => {
                          const active = isActive && selectedCollection === collName
                          return (
                            <button
                              key={collName}
                              onClick={() => handleSelectCollection(dbName, collName)}
                              className={`w-full flex items-center gap-2 px-4 py-1.5 text-left hover:bg-gray-700/40 transition-colors ${
                                active ? 'bg-green-900/25 border-l-2 border-green-500 -ml-px' : ''
                              }`}
                            >
                              <Table className="w-3 h-3 text-gray-600 shrink-0" />
                              <span className={`text-xs truncate ${active ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
                                {collName}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── main sidebar ───────────────────────────────────────────────────────────

export function Sidebar() {
  const { connections, removeConnection, setDocuments, setLoading, setError } = useStore()
  const [addOpen, setAddOpen] = useState(false)

  const handleRemove = useCallback(async (id: string) => {
    const { db: dbModule } = await import('../lib/tauri')
    try { await dbModule.disconnectNamed(id) } catch { /* ignore */ }
    removeConnection(id)
    setDocuments([])
    setLoading(false)
    setError(null)
  }, [removeConnection, setDocuments, setLoading, setError])

  return (
    <div className="w-72 min-w-72 bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-green-500" />
          <span className="text-sm font-semibold text-gray-300">Connections</span>
          <span className="text-xs text-gray-600 font-mono">{connections.length}</span>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          title="Add connection"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors border border-gray-600"
        >
          <Plus className="w-3 h-3" />
          Connect
        </button>
      </div>

      {/* Connection list */}
      <div className="flex-1 overflow-y-auto">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <ServerCrash className="w-8 h-8 text-gray-600" />
            <p className="text-gray-500 text-xs">No connections yet</p>
            <button
              onClick={() => setAddOpen(true)}
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              + Add connection
            </button>
          </div>
        ) : (
          connections.map((conn) => (
            <ConnAccordion key={conn.id} conn={conn} onRemove={handleRemove} />
          ))
        )}
      </div>

      {/* Add connection modal */}
      {addOpen && (
        <Connections asModal onClose={() => setAddOpen(false)} />
      )}
    </div>
  )
}
