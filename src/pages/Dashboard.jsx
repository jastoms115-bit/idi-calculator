import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import Nav from '../components/Nav'

const CONDITION_LABELS = [
  { key: 'total', label: 'Total Assets' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'watch', label: 'Watch' },
  { key: 'caution', label: 'Caution' },
  { key: 'critical', label: 'Critical' },
  { key: 'pendingSync', label: 'Pending Sync' }
]

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [counts, setCounts] = useState(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    // onSnapshot serves cached data instantly when offline (Firestore's
    // persistentLocalCache from firebase/config.js), then reconciles
    // silently once connectivity returns — no manual offline branch needed.
    const assetsQuery = query(collection(db, 'assets'), where('status', '==', 'active'))
    const unsubscribe = onSnapshot(
      assetsQuery,
      (snapshot) => {
        const tally = { total: 0, healthy: 0, watch: 0, caution: 0, critical: 0, pendingSync: 0 }
        snapshot.forEach((docSnap) => {
          const data = docSnap.data()
          tally.total += 1
          const band = data.current_condition_category?.toLowerCase()
          if (band && tally[band] !== undefined) tally[band] += 1
          if (docSnap.metadata.hasPendingWrites) tally.pendingSync += 1
        })
        setCounts(tally)
      },
      (err) => {
        console.error(err)
        setLoadError('Could not load assets. Showing cached data if available.')
      }
    )
    return unsubscribe
  }, [])

  return (
    <>
      <div className="screen screen--with-nav">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 24 }}>
          <div>
            <div className="eyebrow">Dashboard</div>
            <h1 style={{ fontSize: 26, marginTop: 4 }}>
              Welcome, {profile?.display_name || 'Technician'}
            </h1>
            <p style={{ marginTop: 4 }}>Ready for your next equipment assessment?</p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link to="/about" className="btn-link">
              About
            </Link>
            <button className="btn-link" onClick={signOut} type="button">
              Sign out
            </button>
          </div>
        </div>

        {loadError && <div className="banner banner-error" style={{ marginTop: 16 }}>{loadError}</div>}

        <div className="summary-grid">
          {CONDITION_LABELS.map(({ key, label }) => (
            <Link to="/assets" className="summary-card" key={key}>
              <div className="count">{counts ? counts[key] : '—'}</div>
              <div className="label">{label}</div>
            </Link>
          ))}
        </div>

        <div className="action-grid">
          <Link to="/assessments/new" className="btn btn-primary action-btn">
            Log Reading
          </Link>
          <Link to="/assets" className="btn btn-secondary action-btn">
            View Assets
          </Link>
          <Link to="/maintenance" className="btn btn-secondary action-btn">
            Maintenance
          </Link>
          <Link to="/learn" className="btn btn-secondary action-btn">
            Learning Centre
          </Link>
        </div>
      </div>
      <Nav />
    </>
  )
}
