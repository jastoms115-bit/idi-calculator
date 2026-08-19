import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function VerifyEmail() {
  const { user, resendVerificationEmail, checkEmailVerified, signOut } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  async function handleCheck() {
    setError('')
    setChecking(true)
    try {
      const verified = await checkEmailVerified()
      if (!verified) {
        setError("Not verified yet — tap the link in the email first, then try again.")
      }
      // If verified, RedirectIfAuthed / RequireAuthLoose pick up the new
      // emailVerified state automatically and route forward. No manual
      // navigate needed, but the button stays disabled-free either way.
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  async function handleResend() {
    setError('')
    setResent(false)
    setResending(true)
    try {
      await resendVerificationEmail()
      setResent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  async function handleUseDifferentEmail() {
    await signOut()
    navigate('/sign-up', { replace: true })
  }

  return (
    <div className="screen screen--center">
      <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 8 }}>
        One Last Step
      </div>
      <h1 style={{ fontSize: 28, textAlign: 'center', marginBottom: 16 }}>
        Confirm your email
      </h1>
      <p style={{ textAlign: 'center', marginBottom: 24 }}>
        We sent a confirmation link to <strong>{user?.email}</strong>. Open
        it on this phone, then come back and tap Continue below.
      </p>

      {error && <div className="banner banner-error">{error}</div>}
      {resent && !error && (
        <div className="banner banner-info">Confirmation email sent again.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleCheck} disabled={checking}>
          {checking ? 'Checking…' : "I've verified — Continue"}
        </button>
        <button className="btn btn-secondary" onClick={handleResend} disabled={resending}>
          {resending ? 'Sending…' : 'Resend email'}
        </button>
        <button
          className="btn btn-secondary"
          style={{ background: 'transparent', border: 'none' }}
          onClick={handleUseDifferentEmail}
        >
          Use a different email
        </button>
      </div>
    </div>
  )
}
