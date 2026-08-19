import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

// Maps Firebase's error codes to plain-language messages. Never let a raw
// "auth/xyz" code or a silent failure reach the user — every path here
// produces something a technician can actually act on.
function friendlyAuthError(error) {
  const code = error?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Try signing in instead.'
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email or password is incorrect.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.'
    case 'auth/network-request-failed':
      return 'No internet connection. Check your network and try again.'
    default:
      return error?.message || 'Something went wrong. Please try again.'
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // authReady only flips true after Firebase's FIRST callback — this is
  // what the rest of the app gates routing on. Never route based on
  // auth.currentUser read synchronously; it can be null for a moment
  // even with a valid restored session.
  const [authReady, setAuthReady] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  // Mirrors firebaseUser.emailVerified as a separate primitive so guards
  // re-render on change — the user object itself only reflects a fresh
  // verification status after an explicit reload() (see checkEmailVerified).
  const [emailVerified, setEmailVerified] = useState(false)

  const loadProfile = useCallback(async (uid) => {
    setProfileLoading(true)
    try {
      const snap = await getDoc(doc(db, 'users', uid))
      setProfile(snap.exists() ? snap.data() : null)
    } catch (err) {
      console.error('Failed to load profile:', err)
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setEmailVerified(firebaseUser?.emailVerified ?? false)
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid)
      } else {
        setProfile(null)
      }
      setAuthReady(true)
    })
    return unsubscribe
  }, [loadProfile])

  const signUp = useCallback(async (email, password) => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('Enter a valid email address.')
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters.')
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      // Create the profile doc immediately — default role is technician,
      // only an administrator can elevate it (enforced in Firestore rules).
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        role: 'technician',
        full_name: '',
        display_name: '',
        profile_completed: false,
        onboarding_completed: false,
        welcome_voice_played: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
      await sendEmailVerification(cred.user)
      await loadProfile(cred.user.uid)
      return cred.user
    } catch (err) {
      throw new Error(friendlyAuthError(err))
    }
  }, [loadProfile])

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return
    try {
      await sendEmailVerification(auth.currentUser)
    } catch (err) {
      throw new Error(friendlyAuthError(err))
    }
  }, [])

  // Firebase doesn't push verification status to the client in real time —
  // the user has to actually reload their auth token to pick up a change
  // made by clicking the email link. Call this from a "I've verified"
  // button rather than polling.
  const checkEmailVerified = useCallback(async () => {
    if (!auth.currentUser) return false
    try {
      await reload(auth.currentUser)
      const verified = auth.currentUser.emailVerified
      setEmailVerified(verified)
      return verified
    } catch (err) {
      throw new Error(friendlyAuthError(err))
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return cred.user
    } catch (err) {
      throw new Error(friendlyAuthError(err))
    }
  }, [])

  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      throw new Error(friendlyAuthError(err))
    }
  }, [])

  const signOutUser = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  const refreshProfile = useCallback(() => {
    if (user) return loadProfile(user.uid)
  }, [user, loadProfile])

  const value = {
    user,
    profile,
    authReady,
    profileLoading,
    emailVerified,
    signUp,
    signIn,
    signOut: signOutUser,
    resetPassword,
    refreshProfile,
    resendVerificationEmail,
    checkEmailVerified
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider')
  return ctx
}
