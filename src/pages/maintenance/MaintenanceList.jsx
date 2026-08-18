import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { isEngineerOrAbove } from '../../lib/roles'
import EmptyState from '../../components/EmptyState'
import Nav from '../../components/Nav'

const STATUS_TABS = ['open', 'in_progress', 'completed', 'all']
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', completed: 'Completed', all: 'All' }

export default function MaintenanceList() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const assetIdFilter = searchParams.get('assetId') || ''
  const [records, setRecords] = useState(null)
  const [statusTab, setStatusTab] = useState('open')

  useEffect(() => {
    // Single-field orderBy only — asset/status filtering happens
    // client-side so this query never needs a composite index.
    const q = query(collection(db, 'maintenance'), orderBy('created_at', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data(), _pending: d.metadata.hasPendingWrites }))),
      console.error
    )
    return unsubscribe
  }, [])

  const filtered = useMemo(() => {
    if (!records) return null
    return records.filter((r) => {
      if (assetIdFilter && r.asset_id !== assetIdFilter) return false
      if (statusTab !== 'all' && r.status !== statusTab) return false
      return true
    })
  }, [records, statusTab, assetIdFilter])

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="page-header">
          <div>
            <div className="eyebrow">Maintenance</div>
            <h1 style={{ fontSize: 24 }}>Work Records</h1>
          </div>
          {isEngineerOrAbove(profile?.role) && (
            <Link to={`/maintenance/new${assetIdFilter ? `?assetId=${assetIdFilter}` : ''}`} className="btn btn-primary btn-inline">
              + New
            </Link>
          )}
        </div>

        <div className="chip-row">
          {STATUS_TABS.map((s) => (
            <button key={s} type="button" className={`chip${statusTab === s ? ' chip-active' : ''}`} onClick={() => setStatusTab(s)}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {filtered === null && <p style={{ marginTop: 24 }}>Loading…</p>}
        {filtered && filtered.length === 0 && <EmptyState title="No records" message="No maintenance records match this filter." />}

        <div className="asset-list">
          {filtered?.map((r) => (
            <Link to={`/maintenance/${r.id}`} className="asset-row panel" key={r.id}>
              <div>
                <div className="asset-row-tag">{r.asset_tag || '—'}</div>
                <div className="asset-row-name">{r.title}</div>
                <div className="asset-row-location">
                  {r.type} · {formatDate(r.scheduled_date)}
                </div>
              </div>
              <div className="asset-row-right">
                <span className={`status-pill status-${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span>
                {r._pending && <span className="pending-dot" title="Pending sync" />}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Nav />
    </>
  )
}

function formatDate(d) {
  if (!d) return 'unscheduled'
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
