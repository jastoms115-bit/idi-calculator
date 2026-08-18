import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div className="screen screen--center">
      <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 12 }}>
        Condition Monitoring
      </div>
      <h1 style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>
        Ijimari Degradation Index
      </h1>
      <p style={{ textAlign: 'center', marginBottom: 32 }}>
        Measure equipment condition, understand degradation, and make
        better maintenance decisions.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-primary" onClick={() => navigate('/sign-up')}>
          Get Started
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/sign-in')}>
          Sign In
        </button>
      </div>
    </div>
  )
}
