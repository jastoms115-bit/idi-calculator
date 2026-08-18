import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function SignIn() {
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      // Route guards (RedirectIfAuthed) send the user to the right place
      // — dashboard or complete-profile — based on their profile state.
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password."')
      return
    }
    setError('')
    try {
      await resetPassword(email.trim())
      setInfo('Password reset email sent. Check your inbox.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="screen">
      <div className="eyebrow" style={{ marginTop: 24, marginBottom: 8 }}>Sign In</div>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Welcome back</h1>

      {error && <div className="banner banner-error">{error}</div>}
      {info && <div className="banner banner-info">{info}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button className="btn-link" onClick={handleForgotPassword} type="button">
          Forgot password?
        </button>
        <Link to="/sign-up" className="btn-link">
          Don't have an account? Create one
        </Link>
      </div>
    </div>
  )
}
