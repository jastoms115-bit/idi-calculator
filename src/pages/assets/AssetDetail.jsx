import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { isEngineerOrAbove } from '../../lib/roles'
import { logAudit } from '../../lib/audit'
import ConditionBadge from '../../components/ConditionBadge'
import PhotoUpload from '../../components/PhotoUpload'
import Nav from '../../components/Nav'

export default function AssetDetail() {
  const { assetId } = useParams()
  const { user, profile } = useAuth()
  const [asset, setAsset] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubAsset = onSnapshot(
      doc(db, 'assets', assetId),
      (snap) => setAsset(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => {
        console.error(err)
        setError('Could not load this asset.')
      }
    )
    const assessQuery = query(
      collection(db, 'assessments'),
      where('asset_id', '==', assetId),
      orderBy('recorded_at', 'desc'),
      limit(5)
    )
    const unsubAssess = onSnapshot(
      assessQuery,
      (snap) => setAssessments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      console.error
    )
    const maintQuery = query(
      collection(db, 'maintenance'),
      where('asset_id', '==', assetId),
      orderBy('created_at', 'desc'),
      limit(3)
    )
    const unsubMaint = onSnapshot(
      maintQuery,
      (snap) => setMaintenance(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      console.error
    )
    return () => {
      unsubAsset()
      unsubAssess()
      unsubMaint()
    }
  }, [assetId])

  async function handleArchiveToggle() {
    if (!asset) return
    const nextStatus = asset.status === 'archived' ? 'active' : 'archived'
    try {
      await updateDoc(doc(db, 'assets', assetId), { status: nextStatus, updated_at: serverTimestamp() })
      await logAudit({
        action: nextStatus === 'archived' ? 'asset_archived' : 'asset_reactivated',
        entityType: 'asset',
        entityId: assetId,
        uid: user.uid,
        userName: profile?.display_name,
        userRole: profile?.role
      })
    } catch (err) {
      console.error(err)
      setError('Could not update asset status.')
    }
  }

  async function handlePhotosChange(photos) {
    try {
      await updateDoc(doc(db, 'assets', assetId), { photos, updated_at: serverTimestamp() })
    } catch (err) {
      console.error(err)
      setError('Could not save photos.')
    }
  }

  if (!asset) {
    return (
      <div className="screen">
        {error ? (
          <div className="banner banner-error" style={{ marginTop: 24 }}>
            {error}
          </div>
        ) : (
          <p style={{ marginTop: 40 }}>Loading…</p>
        )}
      </div>
    )
  }

  const canEdit = isEngineerOrAbove(profile?.role)

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="page-header">
          <div>
            <div className="eyebrow">
              {asset.tag}
              {asset.status === 'archived' ? ' · ARCHIVED' : ''}
            </div>
            <h1 style={{ fontSize: 24 }}>{asset.name}</h1>
            <p style={{ marginTop: 4 }}>{asset.location}</p>
          </div>
          {canEdit && (
            <Link to={`/assets/${assetId}/edit`} className="btn-link">
              Edit
            </Link>
          )}
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <div className="panel score-panel">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Current Condition
          </div>
          <div className="score-panel-row">
            <div className="readout readout--large">{asset.current_score != null ? asset.current_score : '—'}</div>
            <ConditionBadge category={asset.current_condition_category} size="lg" />
          </div>
          {asset.last_assessment_at && <p style={{ marginTop: 8 }}>Last reading logged {formatDate(asset.last_assessment_at)}</p>}
        </div>

        <div className="action-grid">
          <Link to={`/assessments/new?assetId=${assetId}`} className="btn btn-primary action-btn">
            Log Reading
          </Link>
          <Link to={`/assets/${assetId}/trend`} className="btn btn-secondary action-btn">
            View Trend
          </Link>
          <Link to={`/assets/${assetId}/baseline`} className="btn btn-secondary action-btn">
            Baseline
          </Link>
          <Link to={`/maintenance/new?assetId=${assetId}`} className="btn btn-secondary action-btn">
            Log Maintenance
          </Link>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Equipment Info
          </div>
          <dl className="info-list">
            <div>
              <dt>Type</dt>
              <dd>{asset.type || '—'}</dd>
            </div>
            <div>
              <dt>Manufacturer</dt>
              <dd>{asset.manufacturer || '—'}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{asset.model || '—'}</dd>
            </div>
            <div>
              <dt>Serial</dt>
              <dd>{asset.serial_number || '—'}</dd>
            </div>
            <div>
              <dt>Installed</dt>
              <dd>{asset.install_date || '—'}</dd>
            </div>
            <div>
              <dt>Overhaul interval</dt>
              <dd>{asset.overhaul_interval_hours ? `${asset.overhaul_interval_hours} hrs` : '—'}</dd>
            </div>
          </dl>
          {asset.notes && <p style={{ marginTop: 12 }}>{asset.notes}</p>}
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Photos
          </div>
          <PhotoUpload
            storagePathPrefix={`assets/${assetId}`}
            photos={asset.photos || []}
            onChange={handlePhotosChange}
            disabled={!canEdit}
            photoTarget={{ collection: 'assets', docId: assetId, arrayField: 'photos' }}
          />
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="section-header">
            <div className="eyebrow">Recent Readings</div>
            <Link to={`/assets/${assetId}/trend`} className="btn-link">
              See all
            </Link>
          </div>
          {assessments.length === 0 && <p>No readings logged yet.</p>}
          {assessments.map((a) => (
            <div className="list-row" key={a.id}>
              <div>
                <div>{formatDate(a.recorded_at)}</div>
                <p>{a.recorded_by_name}</p>
              </div>
              <ConditionBadge category={a.composite?.category} />
            </div>
          ))}
        </div>

        <div className="panel" style={{ marginTop: 16, marginBottom: 16 }}>
          <div className="section-header">
            <div className="eyebrow">Maintenance</div>
            <Link to={`/maintenance?assetId=${assetId}`} className="btn-link">
              See all
            </Link>
          </div>
          {maintenance.length === 0 && <p>No maintenance records yet.</p>}
          {maintenance.map((m) => (
            <Link to={`/maintenance/${m.id}`} className="list-row" key={m.id}>
              <div>
                <div>{m.title}</div>
                <p>
                  {m.type} · {formatDate(m.created_at)}
                </p>
              </div>
              <span className={`status-pill status-${m.status}`}>{m.status}</span>
            </Link>
          ))}
        </div>

        {canEdit && (
          <button type="button" className="btn btn-secondary" onClick={handleArchiveToggle}>
            {asset.status === 'archived' ? 'Reactivate asset' : 'Archive asset'}
          </button>
        )}
      </div>
      <Nav />
    </>
  )
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
