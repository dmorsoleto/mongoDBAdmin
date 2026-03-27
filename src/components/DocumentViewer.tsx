import { useState, useCallback, useRef } from 'react'
import { useStore } from '../store'
import { crud as crudApi } from '../lib/tauri'
import type { FindQuery } from '../lib/tauri'
import { DocumentEditor } from './DocumentEditor'
import { QueryToolbar } from './QueryToolbar'
import type { QueryToolbarHandle } from './QueryToolbar'
import { JsonView } from './JsonView'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'

export function getDocId(doc: any): string {
  const id = doc._id
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return JSON.stringify(id)
}

export function DocumentViewer() {
  const {
    selectedDb,
    selectedCollection,
    documents,
    page,
    pageSize,
    loading,
    error,
    readOnlyMode,
    setDocuments,
    setPage,
    setLoading,
    setError,
  } = useStore()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any>(null)
  const [editorMode, setEditorMode] = useState<'insert' | 'edit'>('insert')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())
  const activeQuery = useRef<FindQuery>({})
  const toolbarRef = useRef<QueryToolbarHandle>(null)

  const handleFilterByKey = (filter: string) => {
    toolbarRef.current?.setFilter(filter)
  }

  const fetchDocuments = useCallback(async (targetPage: number, query?: FindQuery) => {
    if (!selectedDb || !selectedCollection) return
    const q = query ?? activeQuery.current
    const effectiveLimit = q.limit ?? pageSize
    const effectiveSkip = (q.skip ?? 0) + targetPage * effectiveLimit
    setLoading(true)
    setError(null)
    try {
      const docs = await crudApi.findDocuments(
        selectedDb,
        selectedCollection,
        q,
        effectiveLimit,
        effectiveSkip
      )
      const parsed = docs.map((d) => JSON.parse(d))
      setDocuments(parsed)
      setPage(targetPage)
      setExpandedDocs(new Set())
    } catch (e: any) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [selectedDb, selectedCollection, pageSize, setDocuments, setPage, setLoading, setError])

  const handleFind = (query: FindQuery) => {
    activeQuery.current = query
    fetchDocuments(0, query)
  }

  const handleRefresh = () => fetchDocuments(page)

  const handlePrevPage = () => {
    if (page > 0) fetchDocuments(page - 1)
  }

  const handleNextPage = () => {
    if (documents.length === pageSize) fetchDocuments(page + 1)
  }

  const handleOpenInsert = () => {
    setEditingDoc(null)
    setEditorMode('insert')
    setEditorOpen(true)
  }

  const handleOpenEdit = (doc: any) => {
    setEditingDoc(doc)
    setEditorMode('edit')
    setEditorOpen(true)
  }

  const handleEditorSuccess = () => {
    setEditorOpen(false)
    fetchDocuments(page)
  }

  const handleDeleteConfirm = async (doc: any) => {
    const id = getDocId(doc)
    if (!id || !selectedDb || !selectedCollection) return
    setLoading(true)
    try {
      await crudApi.deleteDocument(selectedDb, selectedCollection, id)
      setDeleteConfirmId(null)
      fetchDocuments(page)
    } catch (e: any) {
      setError(String(e))
      setLoading(false)
    }
  }

  const toggleExpand = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) {
        next.delete(docId)
      } else {
        next.add(docId)
      }
      return next
    })
  }

  if (!selectedDb || !selectedCollection) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">Select a collection</p>
          <p className="text-gray-600 text-sm mt-1">
            Choose a database and collection from the sidebar to view documents
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm">
            {selectedDb}
          </span>
          <span className="text-gray-500">/</span>
          <span className="text-green-400 font-semibold text-sm">
            {selectedCollection}
          </span>
          {documents.length > 0 && (
            <span className="text-gray-500 text-xs ml-2">
              {page * pageSize + 1}–{page * pageSize + documents.length} documents
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {!readOnlyMode && (
            <button
              onClick={handleOpenInsert}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Insert Document
            </button>
          )}
          {readOnlyMode && (
            <span className="text-xs text-amber-500 border border-amber-700/50 bg-amber-900/20 px-2.5 py-1.5 rounded-lg">
              Read-only mode
            </span>
          )}
        </div>
      </div>

      {/* Query Toolbar */}
      <QueryToolbar ref={toolbarRef} onFind={handleFind} loading={loading} />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/40 border-b border-red-800 text-red-300 px-6 py-3 text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Documents */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <FileText className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-500 font-medium">No documents found</p>
            <p className="text-gray-600 text-sm mt-1">
              This collection is empty. Insert a document to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, idx) => {
              const docId = getDocId(doc) || String(idx)
              const isExpanded = expandedDocs.has(docId)
              const isConfirmingDelete = deleteConfirmId === docId

              return (
                <div
                  key={docId || idx}
                  className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors group"
                >
                  {/* Document Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
                    <button
                      onClick={() => toggleExpand(docId)}
                      className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                      <span className="font-mono">
                        {docId ? `_id: ${docId.substring(0, 24)}...` : `Document ${idx + 1}`}
                      </span>
                    </button>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isConfirmingDelete ? (
                        <>
                          <span className="text-xs text-red-400 mr-2">Delete?</span>
                          <button
                            onClick={() => handleDeleteConfirm(doc)}
                            className="text-xs text-red-400 hover:text-red-300 bg-red-900/30 hover:bg-red-900/50 px-2 py-1 rounded transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-gray-400 hover:text-gray-300 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                          >
                            No
                          </button>
                        </>
                      ) : !readOnlyMode ? (
                        <>
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                            title="Edit document"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(docId)}
                            className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Document Content */}
                  <div className="overflow-x-auto">
                    {isExpanded ? (
                      <JsonView doc={doc} onFilterByKey={handleFilterByKey} />
                    ) : (
                      <>
                        <JsonView doc={doc} compact />
                        {Object.keys(doc).length > 4 && (
                          <button
                            onClick={() => toggleExpand(docId)}
                            className="block w-full text-center text-xs text-gray-500 hover:text-gray-300 py-1 bg-gray-800/50 border-t border-gray-700/50 transition-colors"
                          >
                            Show more
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-t border-gray-700 shrink-0">
        <span className="text-xs text-gray-500">
          Page {page + 1} · {pageSize} docs per page
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={page === 0 || loading}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={documents.length < pageSize || loading}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <DocumentEditor
          document={editingDoc}
          mode={editorMode}
          onClose={() => setEditorOpen(false)}
          onSuccess={handleEditorSuccess}
        />
      )}
    </div>
  )
}
