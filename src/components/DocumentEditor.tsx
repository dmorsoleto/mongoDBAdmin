import { useState, useEffect } from 'react'
import { crud as crudApi } from '../lib/tauri'
import { useStore } from '../store'
import { X, Save, Loader2, AlertCircle } from 'lucide-react'

interface DocumentEditorProps {
  document?: any
  mode: 'insert' | 'edit'
  onClose: () => void
  onSuccess: () => void
}

export function DocumentEditor({ document, mode, onClose, onSuccess }: DocumentEditorProps) {
  const { activeConnId, selectedDb, selectedCollection } = useStore()
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'edit' && document) {
      try {
        setJsonText(JSON.stringify(document, null, 2))
      } catch {
        setJsonText('{}')
      }
    } else {
      setJsonText('{\n  \n}')
    }
  }, [document, mode])

  const validateJson = (text: string): any | null => {
    try {
      const parsed = JSON.parse(text)
      setJsonError(null)
      return parsed
    } catch (e: any) {
      setJsonError(`Invalid JSON: ${e.message}`)
      return null
    }
  }

  const handleTextChange = (value: string) => {
    setJsonText(value)
    if (jsonError) {
      try {
        JSON.parse(value)
        setJsonError(null)
      } catch {
        // still invalid, keep error
      }
    }
  }

  const handleSave = async () => {
    if (!activeConnId || !selectedDb || !selectedCollection) return

    const parsed = validateJson(jsonText)
    if (!parsed) return

    setSaving(true)
    setApiError(null)

    try {
      if (mode === 'insert') {
        await crudApi.insertDocument(activeConnId, selectedDb, selectedCollection, jsonText)
      } else if (mode === 'edit' && document) {
        const id = document._id?.$oid ?? document._id
        if (!id) {
          setApiError('Document has no valid _id field')
          setSaving(false)
          return
        }
        await crudApi.updateDocument(activeConnId, selectedDb, selectedCollection, String(id), jsonText)
      }
      onSuccess()
    } catch (e: any) {
      setApiError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'insert' ? 'Insert Document' : 'Edit Document'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden p-6 flex flex-col gap-4">
          {(jsonError || apiError) && (
            <div className="flex items-start gap-2 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{jsonError ?? apiError}</span>
            </div>
          )}

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400 font-medium">JSON Document</label>
              <span className="text-xs text-gray-500">
                {selectedDb}/{selectedCollection}
              </span>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => handleTextChange(e.target.value)}
              className={`flex-1 min-h-80 w-full bg-gray-900 text-green-400 font-mono text-sm border rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-1 transition-colors ${
                jsonError
                  ? 'border-red-600 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-600 focus:border-green-500 focus:ring-green-500'
              }`}
              spellCheck={false}
              placeholder='{"key": "value"}'
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !!jsonError}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {mode === 'insert' ? 'Insert' : 'Update'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
