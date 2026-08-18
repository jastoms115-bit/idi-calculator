import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

export default function CompleteProfile() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullName.trim() || !displayName.trim()) {
      setError('Full name and display name are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        full_name: fullName.trim(),
        display_name: displayName.trim(),
        phone: phone.trim() || null,
        profile_completed: true,
        updated_at: serverTimestamp()
      })
      await refreshProfile()

      // Welcome voice: plays once, here, right after first completion.
      // Falls back silently to text-only if TTS isn't available — never
      // blocks navigation on speech synthesis.
      const greeting = `Welcome ${displayName.trim()}, to the IJIMARI Degradation Index application.`
      try {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(greeting)
          window.speechSynthesis.speak(utterance)
        }
      } catch (ttsErr) {
        console.warn('TTS unavailable, continuing without voice:', ttsErr)
      }
      await updateDoc(doc(db, 'users', user.uid), { welcome_voice_played: true })

      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Could not save your profile. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      <div className="eyebrow" style={{ marginTop: 24, marginBottom: 8 }}>One Last Step</div>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Complete your profile</h1>
      <p style={{ marginBottom: 24 }}>
        This identifies your readings and assessments in the system.
      </p>

      {error && <div className="banner banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save & Continue'}
        </button>
      </form>
    </div>
  )
}
