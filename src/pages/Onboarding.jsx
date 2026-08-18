import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SCREENS = [
  {
    title: 'Measure What Matters',
    text: 'Capture vibration, current, temperature, pressure, flow and operating data from your equipment.'
  },
  {
    title: 'Understand the Condition',
    text: 'IDI combines available condition indicators into a transparent equipment health score while showing how the score was calculated.'
  },
  {
    title: 'Learn. Investigate. Improve.',
    text: 'Use trends, baselines and engineering guidance to understand degradation and investigate possible failure modes.'
  }
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const isLast = step === SCREENS.length - 1
  const screen = SCREENS[step]

  function next() {
    if (isLast) {
      // onboarding_completed is best written against the user's profile
      // doc once they're authenticated — if this runs pre-auth, persist
      // locally and reconcile to Firestore right after sign-up.
      localStorage.setItem('idi_onboarding_completed', 'true')
      navigate('/welcome')
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <div className="screen screen--center">
      <div className="panel">
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          {step + 1} of {SCREENS.length}
        </div>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>{screen.title}</h2>
        <p>{screen.text}</p>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={next}>
        {isLast ? 'Continue to IDI' : 'Next'}
      </button>
    </div>
  )
}
