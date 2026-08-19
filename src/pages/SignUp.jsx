import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signUp(email.trim(), password)
      // No manual navigate needed for most cases — RedirectIfAuthed /
      // RequireUnverified route guards react to the new auth state and
      // send the user to Verify Email automatically. We navigate
      // explicitly too as a fallback in case guards haven't re-rendered yet.
      navigate('/verify-email', { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <div className="eyebrow" style={{ marginTop: 24, marginBottom: 8 }}>Create Account</div>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Register as a field user</h1>

      {error && <div className="banner banner-error">{error}</div>}

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
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Link to="/sign-in" className="btn-link">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  )
}
