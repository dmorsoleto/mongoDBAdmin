import { useCallback } from 'react'
import { useStore } from '../store'
import { db as dbApi, crud as crudApi } from '../lib/tauri'
import { Database, Table, ChevronRight, Loader2, FolderOpen } from 'lucide-react'

export function Sidebar() {
  const {
    databases,
    collections,
    selectedDb,
    selectedCollection,
    loading,
    pageSize,
    setSelectedDb,
    setSelectedCollection,
    setCollections,
    setDocuments,
    setLoading,
    setError,
  } = useStore()

  const loadCollections = useCallback(async (dbName: string) => {
    setLoading(true)
    try {
      const colls = await dbApi.listCollections(dbName)
      setCollections(colls)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [setCollections, setLoading, setError])

  const loadDocuments = useCallback(async (dbName: string, collName: string) => {
    setLoading(true)
    try {
      const docs = await crudApi.findDocuments(dbName, collName, {}, pageSize, 0)
      const parsed = docs.map((d) => JSON.parse(d))
      setDocuments(parsed)
    } catch (e: any) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [pageSize, setDocuments, setLoading, setError])

  const handleSelectDb = useCallback(async (dbName: string) => {
    if (dbName === selectedDb) return
    setSelectedDb(dbName)
    await loadCollections(dbName)
  }, [selectedDb, setSelectedDb, loadCollections])

  const handleSelectCollection = useCallback(async (collName: string) => {
    if (!selectedDb || collName === selectedCollection) return
    setSelectedCollection(collName)
    await loadDocuments(selectedDb, collName)
  }, [selectedDb, selectedCollection, setSelectedCollection, loadDocuments])

  return (
    <div className="w-72 min-w-72 bg-gray-800 border-r border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-green-500" />
          <span className="text-sm font-semibold text-gray-300">Databases</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-gray-500 ml-auto" />}
        </div>
      </div>

      {/* Database List */}
      <div className="flex-1 overflow-y-auto py-2">
        {databases.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FolderOpen className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-xs">No databases found</p>
          </div>
        ) : (
          databases.map((dbName) => (
            <div key={dbName}>
              {/* Database Item */}
              <button
                onClick={() => handleSelectDb(dbName)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-700/50 transition-colors group ${
                  selectedDb === dbName ? 'bg-gray-700' : ''
                }`}
              >
                <ChevronRight
                  className={`w-3 h-3 text-gray-500 transition-transform shrink-0 ${
                    selectedDb === dbName ? 'rotate-90' : ''
                  }`}
                />
                <Database className="w-4 h-4 text-green-500 shrink-0" />
                <span
                  className={`text-sm truncate ${
                    selectedDb === dbName ? 'text-white font-medium' : 'text-gray-300'
                  }`}
                >
                  {dbName}
                </span>
              </button>

              {/* Collections under selected DB */}
              {selectedDb === dbName && (
                <div className="ml-4 border-l border-gray-700">
                  {collections.length === 0 && !loading ? (
                    <div className="px-4 py-2">
                      <p className="text-gray-600 text-xs">No collections</p>
                    </div>
                  ) : (
                    collections.map((collName) => (
                      <button
                        key={collName}
                        onClick={() => handleSelectCollection(collName)}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-700/50 transition-colors ${
                          selectedCollection === collName ? 'bg-green-900/30 border-l-2 border-green-500 -ml-px' : ''
                        }`}
                      >
                        <Table className="w-3 h-3 text-gray-500 shrink-0" />
                        <span
                          className={`text-sm truncate ${
                            selectedCollection === collName
                              ? 'text-green-400 font-medium'
                              : 'text-gray-400'
                          }`}
                        >
                          {collName}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
