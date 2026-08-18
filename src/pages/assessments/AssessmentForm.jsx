import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { scoreAssessment } from '../../lib/scoring'
import { logAudit } from '../../lib/audit'
import { attachQueueTarget } from '../../lib/offlineQueue'
import ConditionBadge from '../../components/ConditionBadge'
import PhotoUpload from '../../components/PhotoUpload'
import Nav from '../../components/Nav'

const EMPTY_READINGS = {
  vibration: '',
  current_r: '',
  current_y: '',
  current_b: '',
  temperature: '',
  pressure: '',
  flow: '',
  hours_since_overhaul: ''
}

export default function AssessmentForm() {
  const [searchParams] = useSearchParams()
  const preselectedAssetId = searchParams.get('assetId') || ''
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  // Stable id used only to namespace any photos attached before the
  // assessment document exists — matches the assessments/{id}/** photo folder convention.
  const [draftId] = useState(() => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`))

  const [assets, setAssets] = useState([])
  const [assetId, setAssetId] = useState(preselectedAssetId)
  const [baseline, setBaseline] = useState(null)
  const [baselineLoading, setBaselineLoading] = useState(false)
  const [readings, setReadings] = useState(EMPTY_READINGS)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'assets'), orderBy('name'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => (a.status || 'active') === 'active')),
      console.error
    )
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!assetId) {
      setBaseline(null)
      return
    }
    setBaselineLoading(true)
    const q = query(collection(db, 'baselines'), where('asset_id', '==', assetId), orderBy('created_at', 'desc'), limit(1))
    getDocs(q)
      .then((snap) => setBaseline(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }))
      .catch((err) => {
        console.error(err)
        setBaseline(null)
      })
      .finally(() => setBaselineLoading(false))
  }, [assetId])

  const selectedAsset = assets.find((a) => a.id === assetId)

  function setReading(field, value) {
    setReadings((r) => ({ ...r, [field]: value }))
  }

  const parsedReadings = useMemo(() => {
    const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
    return {
      vibration: num(readings.vibration),
      current_r: num(readings.current_r),
      current_y: num(readings.current_y),
      current_b: num(readings.current_b),
      temperature: num(readings.temperature),
      pressure: num(readings.pressure),
      flow: num(readings.flow),
      hours_since_overhaul: num(readings.hours_since_overhaul),
      overhaul_interval_hours: selectedAsset?.overhaul_interval_hours || 8000
    }
  }, [readings, selectedAsset])

  const preview = useMemo(() => scoreAssessment({ readings: parsedReadings, baseline }), [parsedReadings, baseline])

  const hasAnyReading = Object.entries(parsedReadings).some(
    ([key, v]) => key !== 'overhaul_interval_hours' && v != null
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!assetId) {
      setError('Select an asset.')
      return
    }
    if (!hasAnyReading) {
      setError('Enter at least one reading.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const assessmentPayload = {
        asset_id: assetId,
        asset_tag: selectedAsset?.tag || null,
        recorded_by: user.uid,
        recorded_by_name: profile?.display_name || profile?.full_name || 'Unknown',
        recorded_at: serverTimestamp(),
        baseline_id: baseline?.id || null,
        readings: parsedReadings,
        scores: preview.subScores,
        composite: preview.composite,
        flags: preview.flags,
        notes: notes.trim() || null,
        photos
      }
      const ref = await addDoc(collection(db, 'assessments'), assessmentPayload)

      const pendingPaths = photos.filter((p) => p.pending).map((p) => p.path)
      if (pendingPaths.length) {
        await Promise.all(
          pendingPaths.map((path) => attachQueueTarget(path, { collection: 'assessments', docId: ref.id, arrayField: 'photos' }))
        )
      }

      await updateDoc(doc(db, 'assets', assetId), {
        current_score: preview.composite.score,
        current_condition_category: preview.composite.category,
        last_assessment_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })

      await logAudit({
        action: 'assessment_logged',
        entityType: 'assessment',
        entityId: ref.id,
        uid: user.uid,
        userName: profile?.display_name,
        userRole: profile?.role,
        details: { asset_id: assetId, category: preview.composite.category }
      })

      navigate(`/assets/${assetId}`, { replace: true })
    } catch (err) {
      console.error(err)
      setError('Could not save this reading. Check your connection — if you\'re offline, it will sync automatically once reconnected.')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="eyebrow" style={{ marginTop: 24 }}>
          New Reading
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Log an assessment</h1>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="asset">Asset</label>
            <select id="asset" value={assetId} onChange={(e) => setAssetId(e.target.value)} required>
              <option value="">Select an asset…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {assetId && !baseline && !baselineLoading && (
            <div className="banner banner-info">
              No baseline set for this asset yet — scores will show as unavailable until a baseline is recorded.
            </div>
          )}

          <div className="eyebrow" style={{ margin: '20px 0 8px' }}>
            Vibration
          </div>
          <div className="field">
            <label htmlFor="vibration">Overall vibration (mm/s)</label>
            <input
              id="vibration"
              type="number"
              step="any"
              inputMode="decimal"
              value={readings.vibration}
              onChange={(e) => setReading('vibration', e.target.value)}
            />
          </div>

          <div className="eyebrow" style={{ margin: '20px 0 8px' }}>
            Current (per phase)
          </div>
          <div className="field-row field-row-3">
            <div className="field">
              <label htmlFor="current_r">R (A)</label>
              <input id="current_r" type="number" step="any" inputMode="decimal" value={readings.current_r} onChange={(e) => setReading('current_r', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="current_y">Y (A)</label>
              <input id="current_y" type="number" step="any" inputMode="decimal" value={readings.current_y} onChange={(e) => setReading('current_y', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="current_b">B (A)</label>
              <input id="current_b" type="number" step="any" inputMode="decimal" value={readings.current_b} onChange={(e) => setReading('current_b', e.target.value)} />
            </div>
          </div>

          <div className="eyebrow" style={{ margin: '20px 0 8px' }}>
            Process Conditions
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="temperature">Temperature (°C)</label>
              <input id="temperature" type="number" step="any" inputMode="decimal" value={readings.temperature} onChange={(e) => setReading('temperature', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pressure">Discharge pressure (bar)</label>
              <input id="pressure" type="number" step="any" inputMode="decimal" value={readings.pressure} onChange={(e) => setReading('pressure', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="flow">Flow (m³/h)</label>
            <input id="flow" type="number" step="any" inputMode="decimal" value={readings.flow} onChange={(e) => setReading('flow', e.target.value)} />
          </div>

          <div className="eyebrow" style={{ margin: '20px 0 8px' }}>
            Run Hours
          </div>
          <div className="field">
            <label htmlFor="hours_since_overhaul">Hours since last overhaul</label>
            <input
              id="hours_since_overhaul"
              type="number"
              min="0"
              inputMode="numeric"
              value={readings.hours_since_overhaul}
              onChange={(e) => setReading('hours_since_overhaul', e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything unusual observed…" />
          </div>

          <div className="field">
            <label>Photos (optional)</label>
            <PhotoUpload storagePathPrefix={`assessments/${draftId}`} photos={photos} onChange={setPhotos} />
          </div>

          {hasAnyReading && (
            <div className="panel" style={{ marginBottom: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Preview
              </div>
              <div className="score-panel-row">
                <div className="readout readout--large">{preview.composite.score ?? '—'}</div>
                <ConditionBadge category={preview.composite.category} size="lg" />
              </div>
              {preview.composite.breakdown?.length > 0 && (
                <div className="breakdown-list">
                  {preview.composite.breakdown.map((b) => (
                    <div className="breakdown-row" key={b.key}>
                      <span>{b.key}</span>
                      <span className="readout">{Math.round(b.score)}</span>
                    </div>
                  ))}
                </div>
              )}
              {preview.flags.length > 0 && <p style={{ marginTop: 8 }}>Flags: {preview.flags.join(', ')}</p>}
              <p style={{ marginTop: 8 }}>
                {preview.composite.completeness.available} of {preview.composite.completeness.total} sub-indices available —
                weights renormalized accordingly.
              </p>
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save reading'}
          </button>
        </form>
      </div>
      <Nav />
    </>
  )
}
