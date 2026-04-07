import { invoke } from '@tauri-apps/api/core'

export const db = {
  connectNamed:      (connId: string, uri: string) => invoke<string>('connect_named', { connId, uri }),
  disconnectNamed:   (connId: string) => invoke<void>('disconnect_named', { connId }),
  listDatabasesFor:  (connId: string) => invoke<string[]>('list_databases_for', { connId }),
  listCollectionsFor:(connId: string, dbName: string) => invoke<string[]>('list_collections_for', { connId, dbName }),
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
  aggregate: (connId: string, db: string, coll: string, pipeline: string) =>
    invoke<string[]>('aggregate', { connId, db, coll, pipeline }),
  findDocuments: (connId: string, db: string, coll: string, query: FindQuery, limit: number, skip: number) =>
    invoke<string[]>('find_documents', {
      connId,
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
  insertDocument: (connId: string, db: string, coll: string, doc: string) =>
    invoke<string>('insert_document', { connId, db, coll, doc }),
  updateDocument: (connId: string, db: string, coll: string, id: string, doc: string) =>
    invoke<void>('update_document', { connId, db, coll, id, doc }),
  deleteDocument: (connId: string, db: string, coll: string, id: string) =>
    invoke<void>('delete_document', { connId, db, coll, id }),
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
