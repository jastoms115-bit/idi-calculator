import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { isEngineerOrAbove } from '../../lib/roles'
import ConditionBadge from '../../components/ConditionBadge'
import EmptyState from '../../components/EmptyState'
import Nav from '../../components/Nav'

const STATUS_TABS = ['active', 'archived', 'all']
const CONDITION_FILTERS = ['all', 'healthy', 'watch', 'caution', 'critical', 'unknown']

export default function AssetList() {
  const { profile } = useAuth()
  const [assets, setAssets] = useState(null)
  const [error, setError] = useState('')
  const [statusTab, setStatusTab] = useState('active')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Single-field orderBy only — status/condition filtering happens
    // client-side so this query never needs a composite index.
    const q = query(collection(db, 'assets'), orderBy('name'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data(), _pending: d.metadata.hasPendingWrites }))),
      (err) => {
        console.error(err)
        setError('Could not load assets. Showing cached data if available.')
      }
    )
    return unsubscribe
  }, [])

  const filtered = useMemo(() => {
    if (!assets) return null
    return assets.filter((a) => {
      if (statusTab !== 'all' && (a.status || 'active') !== statusTab) return false
      if (conditionFilter !== 'all' && (a.current_condition_category || 'unknown') !== conditionFilter) return false
      if (search.trim()) {
        const s = search.trim().toLowerCase()
        const haystack = `${a.tag || ''} ${a.name || ''} ${a.location || ''}`.toLowerCase()
        if (!haystack.includes(s)) return false
      }
      return true
    })
  }, [assets, statusTab, conditionFilter, search])

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="page-header">
          <div>
            <div className="eyebrow">Equipment</div>
            <h1 style={{ fontSize: 24 }}>Assets</h1>
          </div>
          {isEngineerOrAbove(profile?.role) && (
            <Link to="/assets/new" className="btn btn-primary btn-inline">
              + New
            </Link>
          )}
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <input
          className="search-input"
          placeholder="Search by tag, name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="chip-row">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip${statusTab === s ? ' chip-active' : ''}`}
              onClick={() => setStatusTab(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {CONDITION_FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${conditionFilter === c ? ' chip-active' : ''}`}
              onClick={() => setConditionFilter(c)}
            >
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>

        {filtered === null && <p style={{ marginTop: 24 }}>Loading assets…</p>}

        {filtered && filtered.length === 0 && (
          <EmptyState
            title="No assets"
            message={
              statusTab === 'active'
                ? 'No active assets match this filter yet.'
                : 'No assets match this filter.'
            }
          />
        )}

        <div className="asset-list">
          {filtered?.map((asset) => (
            <Link to={`/assets/${asset.id}`} className="asset-row panel" key={asset.id}>
              <div>
                <div className="asset-row-tag">{asset.tag || '—'}</div>
                <div className="asset-row-name">{asset.name}</div>
                <div className="asset-row-location">{asset.location}</div>
              </div>
              <div className="asset-row-right">
                <ConditionBadge category={asset.current_condition_category} />
                {asset._pending && <span className="pending-dot" title="Pending sync" />}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Nav />
    </>
  )
}
