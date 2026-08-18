/**
 * Minimal IndexedDB-backed queue for photo uploads taken while offline.
 * No external dependency — just the browser's built-in IndexedDB, so this
 * costs nothing and needs no extra package. Firestore already queues its
 * own writes offline (see src/firebase/config.js); Storage doesn't, so
 * this fills that one gap.
 */
const DB_NAME = 'idi-offline'
const DB_VERSION = 1
const STORE = 'photoQueue'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'path' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    const result = fn(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Queues a file for upload once back online. `target` identifies the
 * Firestore doc/array field to patch with the real URL after upload —
 * pass null if the doc doesn't exist yet (e.g. a new assessment) and
 * attach it afterwards with attachQueueTarget() once it does.
 */
export async function enqueuePhoto({ path, file, name, target = null }) {
  await withStore('readwrite', (store) => store.put({ path, file, name, target, queuedAt: Date.now() }))
}

export async function attachQueueTarget(path, target) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(path)
    getReq.onsuccess = () => {
      const item = getReq.result
      if (item) {
        item.target = target
        store.put(item)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function removeQueuedPhoto(path) {
  await withStore('readwrite', (store) => store.delete(path))
}

export async function listQueuedPhotos() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}
