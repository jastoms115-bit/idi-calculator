import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase/config'
import Nav from '../components/Nav'

const ACTION_LABELS = {
  asset_created: 'Asset created',
  asset_updated: 'Asset updated',
  asset_archived: 'Asset archived',
  asset_reactivated: 'Asset reactivated',
  assessment_logged: 'Reading logged',
  baseline_created: 'Baseline created',
  maintenance_created: 'Maintenance created',
  maintenance_updated: 'Maintenance updated'
}

export default function AuditTrail() {
  const [entries, setEntries] = useState(null)
  const [error, setError] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')

  useEffect(() => {
    // Single-field orderBy only — entity-type filtering happens
    // client-side so this query never needs a composite index.
    const q = query(collection(db, 'auditLog'), orderBy('created_at', 'desc'), limit(200))
    const unsubscribe = onSnapshot(
      q,
      (snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.error(err)
        setError('Could not load the audit trail.')
      }
    )
    return unsubscribe
  }, [])

  const entityTypes = useMemo(() => {
    if (!entries) return []
    return ['all', ...new Set(entries.map((e) => e.entity_type).filter(Boolean))]
  }, [entries])

  const filtered = useMemo(() => {
    if (!entries) return null
    if (entityFilter === 'all') return entries
    return entries.filter((e) => e.entity_type === entityFilter)
  }, [entries, entityFilter])

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="eyebrow" style={{ marginTop: 24 }}>
          Audit Trail
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Activity Log</h1>

        {error && <div className="banner banner-error">{error}</div>}

        <div className="chip-row">
          {entityTypes.map((t) => (
            <button key={t} type="button" className={`chip${entityFilter === t ? ' chip-active' : ''}`} onClick={() => setEntityFilter(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {filtered === null && <p style={{ marginTop: 24 }}>Loading…</p>}
        {filtered && filtered.length === 0 && <p style={{ marginTop: 24 }}>No activity recorded yet.</p>}

        <div className="asset-list">
          {filtered?.map((entry) => (
            <div className="panel list-row" key={entry.id}>
              <div>
                <div>{ACTION_LABELS[entry.action] || entry.action}</div>
                <p>
                  {entry.user_name || 'Unknown'} ({entry.user_role || '—'}) · {formatDate(entry.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Nav />
    </>
  )
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
