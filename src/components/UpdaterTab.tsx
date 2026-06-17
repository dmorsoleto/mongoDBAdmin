import { useState, useEffect } from 'react'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { getVersion } from '@tauri-apps/api/app'
import { RefreshCw, CheckCircle, Download, AlertCircle } from 'lucide-react'

type Status = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error'

interface Progress {
  downloaded: number
  total: number | null
}

export function UpdaterTab() {
  const [status, setStatus] = useState<Status>('idle')
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [update, setUpdate] = useState<Update | null>(null)
  const [progress, setProgress] = useState<Progress>({ downloaded: 0, total: null })
  const [error, setError] = useState<string>('')

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => {})
  }, [])

  const handleCheck = async () => {
    setStatus('checking')
    setError('')
    try {
      const result = await check()
      if (result) {
        setUpdate(result)
        setStatus('available')
      } else {
        setStatus('up-to-date')
      }
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  const handleInstall = async () => {
    if (!update) return
    setStatus('downloading')
    setProgress({ downloaded: 0, total: null })
    try {
      await update.downloadAndInstall(event => {
        if (event.event === 'Started') {
          setProgress({ downloaded: 0, total: event.data.contentLength ?? null })
        } else if (event.event === 'Progress') {
          setProgress(prev => ({
            downloaded: prev.downloaded + event.data.chunkLength,
            total: prev.total,
          }))
        }
      })
      setStatus('ready')
      await relaunch()
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const progressPercent =
    progress.total && progress.total > 0
      ? Math.round((progress.downloaded / progress.total) * 100)
      : null

  return (
    <div className="space-y-5">
      {/* Current version */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Current version</span>
        <span className="text-xs font-mono text-gray-200">
          {currentVersion ? `v${currentVersion}` : '—'}
        </span>
      </div>

      <div className="border-t border-gray-700" />

      {status === 'idle' && (
        <button
          onClick={handleCheck}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-gray-200 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Check for updates
        </button>
      )}

      {status === 'checking' && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Checking for updates...
        </div>
      )}

      {status === 'up-to-date' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 py-1 text-xs text-green-400">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            You are on the latest version
          </div>
          <button
            onClick={handleCheck}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check again
          </button>
        </div>
      )}

      {status === 'available' && update && (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-700/40 bg-green-950/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-400">New version available</span>
              <span className="text-xs font-mono font-semibold text-white">v{update.version}</span>
            </div>
            {update.body && (
              <p className="text-[11px] text-gray-400 leading-relaxed whitespace-pre-wrap">
                {update.body}
              </p>
            )}
          </div>
          <button
            onClick={handleInstall}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download and Install
          </button>
        </div>
      )}

      {status === 'downloading' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>Downloading update...</span>
            <span>
              {progressPercent !== null ? `${progressPercent}%` : formatBytes(progress.downloaded)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-200"
              style={{ width: progressPercent !== null ? `${progressPercent}%` : '30%' }}
            />
          </div>
          {progress.total !== null && (
            <p className="text-[11px] text-gray-500 text-right">
              {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
            </p>
          )}
        </div>
      )}

      {status === 'ready' && (
        <div className="flex items-center gap-2 py-1 text-xs text-green-400">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          Download complete. Relaunching...
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 py-1 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="break-all">{error || 'Failed to check for updates.'}</span>
          </div>
          <button
            onClick={handleCheck}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-gray-400 hover:text-gray-200 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
