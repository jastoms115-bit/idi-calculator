import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import thomargLogo from '../assets/thomarg-logo-reversed.svg'

export default function Welcome() {
  const navigate = useNavigate()
  const [step, setStep] = useState('company') // 'company' | 'product'

  if (step === 'company') {
    return (
      <div className="screen screen--center" style={{ alignItems: 'center', textAlign: 'center' }}>
        <img
          src={thomargLogo}
          alt="Thomarg Technologies"
          style={{ width: '100%', maxWidth: 340, marginBottom: 28 }}
        />
        <p style={{ maxWidth: 380, marginBottom: 8, fontSize: 16 }}>
          Thomarg Technologies is a technology-driven company founded to
          solve engineering problems through technology and artificial
          intelligence.
        </p>
        <p className="eyebrow" style={{ marginTop: 16, marginBottom: 32 }}>
          Solving engineering problems with technology and AI
        </p>
        <button
          className="btn btn-primary"
          style={{ maxWidth: 280, width: '100%' }}
          onClick={() => setStep('product')}
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="screen screen--center">
      <div className="eyebrow" style={{ textAlign: 'center', marginBottom: 12 }}>
        Our First Product
      </div>
      <h1 style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>
        IDI Calculator
      </h1>
      <p style={{ textAlign: 'center', marginBottom: 8 }}>
        Engineering calculations, simplified.
      </p>
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
        <button
          className="btn btn-secondary"
          style={{ background: 'transparent', border: 'none' }}
          onClick={() => setStep('company')}
        >
          Back
        </button>
      </div>
    </div>
  )
}
