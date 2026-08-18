import { useEffect } from 'react'
import { processPhotoQueue } from '../lib/photoSync'

/**
 * Mount once near the app root. Flushes any photos queued while offline
 * as soon as there's a connection — once on load (in case items were
 * queued in a previous offline session) and again whenever the browser
 * fires 'online'.
 */
export function usePhotoQueueSync() {
  useEffect(() => {
    processPhotoQueue()
    window.addEventListener('online', processPhotoQueue)
    return () => window.removeEventListener('online', processPhotoQueue)
  }, [])
}
