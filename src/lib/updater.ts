import { check, type Update } from '@tauri-apps/plugin-updater'

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'

export interface UpdateInfo {
  version: string
  notes: string | null
  date: string | null
}

export interface DownloadProgress {
  downloaded: number
  total: number | null
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const update: Update | null = await check()
  if (!update) return null
  return {
    version: update.version,
    notes: update.body ?? null,
    date: update.date ?? null,
  }
}

export { check as getRawUpdate }
