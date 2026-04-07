import { useState, useCallback } from 'react'
import { useStore } from './store'
import { Connections } from './components/Connections'
import { Sidebar } from './components/Sidebar'
import { DocumentViewer } from './components/DocumentViewer'
import { SettingsModal } from './components/SettingsModal'
import { db as dbApi } from './lib/tauri'
import { Database, Settings, X } from 'lucide-react'

function App() {
  const { connections, removeConnection, setDocuments } = useStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

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
