import { invoke } from '@tauri-apps/api/core'

export const db = {
  connect: (uri: string) => invoke<string>('connect', { uri }),
  disconnect: () => invoke<void>('disconnect'),
  listDatabases: () => invoke<string[]>('list_databases'),
  listCollections: (dbName: string) => invoke<string[]>('list_collections', { dbName }),
}

export interface FindQuery {
  filter?: string | null
  projection?: string | null
  sort?: string | null
  collation?: string | null
  hint?: string | null
  limit?: number | null
  skip?: number | null
  maxTimeMs?: number | null
}

export const crud = {
  findDocuments: (db: string, coll: string, query: FindQuery, limit: number, skip: number) =>
    invoke<string[]>('find_documents', {
      db,
      coll,
      filter: query.filter ?? null,
      projection: query.projection ?? null,
      sort: query.sort ?? null,
      collation: query.collation ?? null,
      hint: query.hint ?? null,
      limit,
      skip,
      maxTimeMs: query.maxTimeMs ?? null,
    }),
  insertDocument: (db: string, coll: string, doc: string) =>
    invoke<string>('insert_document', { db, coll, doc }),
  updateDocument: (db: string, coll: string, id: string, doc: string) =>
    invoke<void>('update_document', { db, coll, id, doc }),
  deleteDocument: (db: string, coll: string, id: string) =>
    invoke<void>('delete_document', { db, coll, id }),
}

export const connections = {
  getSaved: () => invoke<{ name: string; uri: string; environment: string }[]>('get_saved_connections'),
  save: (name: string, uri: string, environment: string) => invoke<void>('save_connection', { name, uri, environment }),
  delete: (name: string, environment: string) => invoke<void>('delete_connection', { name, environment }),
}

export const environments = {
  getAll: () => invoke<string[]>('get_environments'),
  save: (name: string) => invoke<void>('save_environment', { name }),
  delete: (name: string) => invoke<void>('delete_environment', { name }),
}
