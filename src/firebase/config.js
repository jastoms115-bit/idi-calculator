import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

// Photo storage runs on Cloudinary now (src/lib/cloudinary.js), not Firebase
// Storage — see that file for why. storageBucket is left out since nothing
// uses it.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Guard against re-initialization on hot reload / re-import.
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Explicit local persistence: sessions survive app restarts, which the
// offline-first requirement depends on. Fire-and-forget is fine here —
// it resolves before any auth calls the UI triggers on user interaction.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Failed to set auth persistence:', err)
})

// Firestore with offline persistence enabled up front. This is what lets a
// technician open the app, view synced assets, and log readings with zero
// connectivity — no hand-built offline store needed for Firestore data itself.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})

export default app
