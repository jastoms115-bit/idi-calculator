import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { uploadToCloudinary } from './cloudinary'
import { listQueuedPhotos, removeQueuedPhoto } from './offlineQueue'

let syncing = false

/**
 * Uploads everything queued while offline, then patches the real URL back
 * into whichever Firestore doc referenced it (if known yet — see
 * offlineQueue.attachQueueTarget for the case where it wasn't at queue
 * time). Safe to call repeatedly: a no-op with nothing queued, and
 * re-entrant calls while one is already running are skipped rather than
 * racing each other.
 */
export async function processPhotoQueue() {
  if (syncing || !navigator.onLine) return
  syncing = true
  try {
    const items = await listQueuedPhotos()
    for (const item of items) {
      try {
        const folder = item.path.slice(0, item.path.lastIndexOf('/'))
        const { url } = await uploadToCloudinary({ file: item.file, folder })

        if (item.target) {
          const { collection: col, docId, arrayField } = item.target
          const docRef = doc(db, col, docId)
          const snap = await getDoc(docRef)
          if (snap.exists()) {
            const current = snap.data()[arrayField] || []
            const next = current.map((p) => (p.path === item.path ? { ...p, url, pending: false } : p))
            await updateDoc(docRef, { [arrayField]: next })
          }
        }

        await removeQueuedPhoto(item.path)
      } catch (err) {
        console.warn('Could not sync queued photo, will retry later:', item.path, err)
        // Left in the queue — the next trigger (reconnect, manual check) retries it.
      }
    }
  } finally {
    syncing = false
  }
}
