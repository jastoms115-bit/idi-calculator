import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import ConditionBadge from '../../components/ConditionBadge'
import TrendChart from '../../components/TrendChart'
import Nav from '../../components/Nav'

export default function AssetTrend() {
  const { assetId } = useParams()
  const [asset, setAsset] = useState(null)
  const [assessments, setAssessments] = useState(null)

  useEffect(() => {
    getDoc(doc(db, 'assets', assetId)).then((snap) => setAsset(snap.exists() ? { id: snap.id, ...snap.data() } : null))
    const q = query(collection(db, 'assessments'), where('asset_id', '==', assetId), orderBy('recorded_at', 'asc'))
    const unsubscribe = onSnapshot(q, (snap) => setAssessments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), console.error)
    return unsubscribe
  }, [assetId])

  const points = useMemo(() => {
    if (!assessments) return []
    return assessments
      .filter((a) => a.composite?.score != null && a.recorded_at)
      .map((a) => ({
        x: a.recorded_at.toDate ? a.recorded_at.toDate().getTime() : new Date(a.recorded_at).getTime(),
        y: a.composite.score
      }))
  }, [assessments])

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="eyebrow" style={{ marginTop: 24 }}>
          Trend
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>{asset?.name || 'Asset'}</h1>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Composite IDI Score
          </div>
          <TrendChart points={points} />
          <div className="chart-legend">
            <span>
              <i className="legend-dot" style={{ background: 'var(--healthy)' }} /> ≥85 Healthy
            </span>
            <span>
              <i className="legend-dot" style={{ background: 'var(--watch)' }} /> 70–84 Watch
            </span>
            <span>
              <i className="legend-dot" style={{ background: 'var(--caution)' }} /> 40–69 Caution
            </span>
            <span>
              <i className="legend-dot" style={{ background: 'var(--critical)' }} /> &lt;40 Critical
            </span>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            History
          </div>
          {assessments === null && <p>Loading…</p>}
          {assessments && assessments.length === 0 && <p>No readings logged yet.</p>}
          {assessments &&
            [...assessments].reverse().map((a) => (
              <div className="list-row" key={a.id}>
                <div>
                  <div>{formatDate(a.recorded_at)}</div>
                  <p>
                    {a.recorded_by_name}
                    {a.flags?.length ? ` · ${a.flags.join(', ')}` : ''}
                  </p>
                </div>
                <div className="asset-row-right">
                  <span className="readout">{a.composite?.score ?? '—'}</span>
                  <ConditionBadge category={a.composite?.category} />
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
