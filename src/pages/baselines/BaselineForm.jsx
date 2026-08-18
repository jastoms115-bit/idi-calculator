import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { mean, stdDev } from '../../lib/idiEngine'
import { logAudit } from '../../lib/audit'
import { isEngineerOrAbove } from '../../lib/roles'
import Nav from '../../components/Nav'

const PARAMS = [
  { key: 'vibration', label: 'Vibration (mm/s)' },
  { key: 'current', label: 'Current (A)' },
  { key: 'temperature', label: 'Temperature (°C)' },
  { key: 'pressure', label: 'Pressure (bar)' },
  { key: 'flow', label: 'Flow (m³/h)' }
]

export default function BaselineForm() {
  const { assetId } = useParams()
  const { user, profile } = useAuth()
  const canEdit = isEngineerOrAbove(profile?.role)

  const [asset, setAsset] = useState(null)
  const [history, setHistory] = useState([])
  const [recentAssessments, setRecentAssessments] = useState([])
  const [sampleCount, setSampleCount] = useState(10)
  const [manual, setManual] = useState({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'assets', assetId)).then((snap) => setAsset(snap.exists() ? { id: snap.id, ...snap.data() } : null))
    const q = query(collection(db, 'baselines'), where('asset_id', '==', assetId), orderBy('created_at', 'desc'))
    const unsubscribe = onSnapshot(q, (snap) => setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), console.error)
    return unsubscribe
  }, [assetId])

  useEffect(() => {
    const q = query(collection(db, 'assessments'), where('asset_id', '==', assetId), orderBy('recorded_at', 'desc'), limit(sampleCount))
    getDocs(q)
      .then((snap) => setRecentAssessments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
  }, [assetId, sampleCount])

  const computed = useMemo(() => {
    const result = {}
    for (const { key } of PARAMS) {
      let values
      if (key === 'current') {
        values = recentAssessments
          .map((a) => {
            const r = a.readings || {}
            if (r.current_r != null && r.current_y != null && r.current_b != null) {
              return (r.current_r + r.current_y + r.current_b) / 3
            }
            return null
          })
          .filter((v) => v != null)
      } else {
        values = recentAssessments.map((a) => a.readings?.[key]).filter((v) => v != null)
      }
      result[key] = { mean: mean(values), std: stdDev(values), n: values.length }
    }
    return result
  }, [recentAssessments])

  const activeBaseline = history[0] || null

  function manualValue(key, field) {
    if (manual[key]?.[field] !== undefined) return manual[key][field]
    const c = computed[key]
    return c && c[field] != null ? Math.round(c[field] * 1000) / 1000 : ''
  }

  function setManualValue(key, field, value) {
    setManual((m) => ({ ...m, [key]: { ...m[key], [field]: value } }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const payload = {
        asset_id: assetId,
        version: history.length + 1,
        created_at: serverTimestamp(),
        created_by: user.uid,
        created_by_name: profile?.display_name || null,
        source: 'assessments',
        sample_count: sampleCount,
        notes: notes.trim() || null
      }
      for (const { key } of PARAMS) {
        const m = Number(manualValue(key, 'mean'))
        const s = Number(manualValue(key, 'std'))
        payload[key] = { mean: Number.isFinite(m) ? m : null, std: Number.isFinite(s) && s > 0 ? s : null }
      }
      const ref = await addDoc(collection(db, 'baselines'), payload)
      await logAudit({
        action: 'baseline_created',
        entityType: 'baseline',
        entityId: ref.id,
        uid: user.uid,
        userName: profile?.display_name,
        userRole: profile?.role,
        details: { asset_id: assetId, version: payload.version }
      })
      setSuccess('New baseline saved. It supersedes the previous version for scoring going forward.')
      setManual({})
    } catch (err) {
      console.error(err)
      setError('Could not save baseline. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="eyebrow" style={{ marginTop: 24 }}>
          Baseline
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>{asset?.name || 'Asset'}</h1>
        <p style={{ marginBottom: 16 }}>
          Baselines are versioned and immutable — creating a new one supersedes the last for scoring, but history is kept.
        </p>

        {error && <div className="banner banner-error">{error}</div>}
        {success && <div className="banner banner-info">{success}</div>}

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Active Baseline
          </div>
          {activeBaseline ? (
            <>
              <p style={{ marginBottom: 8 }}>
                Version {activeBaseline.version} · {activeBaseline.sample_count || '—'} samples
              </p>
              <div className="breakdown-list">
                {PARAMS.map(({ key, label }) => (
                  <div className="breakdown-row" key={key}>
                    <span>{label}</span>
                    <span className="readout">
                      {activeBaseline[key]?.mean != null ? `${round2(activeBaseline[key].mean)} ± ${round2(activeBaseline[key].std)}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>No baseline recorded yet — condition scores will be unavailable until one is set.</p>
          )}
        </div>

        {canEdit ? (
          <form onSubmit={handleSave}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Compute From Recent Readings
            </div>
            <div className="field">
              <label htmlFor="sampleCount">Use the last N readings</label>
              <select id="sampleCount" value={sampleCount} onChange={(e) => setSampleCount(Number(e.target.value))}>
                {[5, 10, 15, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <p style={{ marginBottom: 16 }}>
              {recentAssessments.length} readings found. Only use assessments taken while the asset was known to be in healthy
              condition — override any value below before saving.
            </p>

            {PARAMS.map(({ key, label }) => (
              <div className="field-row" key={key}>
                <div className="field">
                  <label htmlFor={`${key}-mean`}>{label} — mean</label>
                  <input id={`${key}-mean`} type="number" step="any" value={manualValue(key, 'mean')} onChange={(e) => setManualValue(key, 'mean', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`${key}-std`}>{label} — std dev</label>
                  <input id={`${key}-std`} type="number" step="any" value={manualValue(key, 'std')} onChange={(e) => setManualValue(key, 'std', e.target.value)} />
                </div>
              </div>
            ))}

            <div className="field">
              <label htmlFor="baselineNotes">Notes</label>
              <textarea id="baselineNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this baseline was set…" />
            </div>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save new baseline version'}
            </button>
          </form>
        ) : (
          <p>Only engineers and above can set a baseline.</p>
        )}

        {history.length > 1 && (
          <div className="panel" style={{ marginTop: 16, marginBottom: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              History
            </div>
            {history.slice(1).map((b) => (
              <div className="list-row" key={b.id}>
                <div>
                  <div>Version {b.version}</div>
                  <p>
                    {formatDate(b.created_at)} · {b.created_by_name || 'Unknown'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Nav />
    </>
  )
}

function round2(v) {
  return v == null ? '—' : Math.round(v * 100) / 100
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
