import { useState } from 'react'
import { useStore } from './store'
import { Connections } from './components/Connections'
import { Sidebar } from './components/Sidebar'
import { DocumentViewer } from './components/DocumentViewer'
import { SettingsModal } from './components/SettingsModal'
import { db as dbApi } from './lib/tauri'
import { Database, LogOut, Circle, Settings } from 'lucide-react'

function App() {
  const { connected, currentUri, protectConnectionStringSecrets, setConnected, setDatabases, setSelectedDb, setCollections, setDocuments } = useStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleDisconnect = async () => {
    try {
      await dbApi.disconnect()
    } catch {
      // ignore
    }
    setConnected(false, '')
    setDatabases([])
    setSelectedDb(null)
    setCollections([])
    setDocuments([])
  }

  if (!connected) {
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            <span className="text-xs text-gray-400 font-mono max-w-xs truncate">
              {protectConnectionStringSecrets
                ? currentUri.replace(/:\/\/([^:@]+):([^@]+)@/, '://$1:••••••••@')
                : currentUri}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 bg-gray-700 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors border border-gray-600 hover:border-red-500/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
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
