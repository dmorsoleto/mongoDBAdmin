import { useState, useCallback, useEffect } from 'react'
import { useStore } from './store'
import { Connections } from './components/Connections'
import { Sidebar } from './components/Sidebar'
import { DocumentViewer } from './components/DocumentViewer'
import { SettingsModal } from './components/SettingsModal'
import { db as dbApi } from './lib/tauri'
import { checkForUpdate } from './lib/updater'
import { Database, Settings, X } from 'lucide-react'

function App() {
  const { connections, removeConnection, setDocuments } = useStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const info = await checkForUpdate()
        if (info) setUpdateAvailable(info.version)
      } catch { /* silencioso */ }
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleDisconnect = useCallback(async (id: string) => {
    try { await dbApi.disconnectNamed(id) } catch { /* ignore */ }
    removeConnection(id)
    setDocuments([])
  }, [removeConnection, setDocuments])

  if (connections.length === 0) {
    return <Connections />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 p-1.5 rounded-lg">
            <Database className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">MongoDB Admin</span>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className="text-gray-500 hover:text-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {connections.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 text-xs text-gray-400 font-mono bg-gray-700/50 px-2.5 py-1 rounded border border-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              {c.name}
              <button
                onClick={() => handleDisconnect(c.id)}
                title="Disconnect"
                className="text-gray-600 hover:text-red-400 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </header>

      {/* Update banner — shown when a new version is detected on startup */}
      {updateAvailable && (
        <div className="shrink-0 flex items-center justify-between px-6 py-2 bg-green-700/20 border-b border-green-700/40">
          <span className="text-xs text-green-400">
            New version <span className="font-mono font-semibold">v{updateAvailable}</span> available
          </span>
          <button
            onClick={() => { setSettingsOpen(true) }}
            className="text-xs text-green-300 hover:text-white underline transition-colors"
          >
            View in Settings → Updates
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <DocumentViewer />
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default App
