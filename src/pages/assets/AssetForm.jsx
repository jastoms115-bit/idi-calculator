import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { logAudit } from '../../lib/audit'
import Nav from '../../components/Nav'

const ASSET_TYPES = ['pump', 'motor', 'pump-motor set', 'fan', 'compressor', 'other']

const EMPTY = {
  tag: '',
  name: '',
  type: 'pump',
  location: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  install_date: '',
  overhaul_interval_hours: 8000,
  status: 'active',
  notes: ''
}

export default function AssetForm() {
  const { assetId } = useParams()
  const isEdit = Boolean(assetId)
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'assets', assetId))
        if (snap.exists()) setForm({ ...EMPTY, ...snap.data() })
      } catch (err) {
        console.error(err)
        setError('Could not load this asset.')
      } finally {
        setLoading(false)
      }
    })()
  }, [assetId, isEdit])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.tag.trim() || !form.name.trim()) {
      setError('Tag and name are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        tag: form.tag.trim(),
        name: form.name.trim(),
        overhaul_interval_hours: Number(form.overhaul_interval_hours) || 8000,
        updated_at: serverTimestamp()
      }
      if (isEdit) {
        await updateDoc(doc(db, 'assets', assetId), payload)
        await logAudit({
          action: 'asset_updated',
          entityType: 'asset',
          entityId: assetId,
          uid: user.uid,
          userName: profile?.display_name,
          userRole: profile?.role
        })
        navigate(`/assets/${assetId}`, { replace: true })
      } else {
        const ref = await addDoc(collection(db, 'assets'), {
          ...payload,
          current_condition_category: 'unknown',
          current_score: null,
          created_at: serverTimestamp(),
          created_by: user.uid
        })
        await logAudit({
          action: 'asset_created',
          entityType: 'asset',
          entityId: ref.id,
          uid: user.uid,
          userName: profile?.display_name,
          userRole: profile?.role
        })
        navigate(`/assets/${ref.id}`, { replace: true })
      }
    } catch (err) {
      console.error(err)
      setError('Could not save this asset. Check your connection and try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <p style={{ marginTop: 40 }}>Loading…</p>
      </div>
    )
  }

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="eyebrow" style={{ marginTop: 24 }}>
          {isEdit ? 'Edit Asset' : 'New Asset'}
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>{isEdit ? form.name || 'Edit asset' : 'Register equipment'}</h1>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="tag">Asset tag</label>
            <input id="tag" value={form.tag} onChange={(e) => set('tag', e.target.value)} placeholder="P-101" required />
          </div>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Feed pump 1" required />
          </div>
          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Building 3, Bay 2" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="manufacturer">Manufacturer</label>
              <input id="manufacturer" value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="model">Model</label>
              <input id="model" value={form.model} onChange={(e) => set('model', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="serial">Serial number</label>
            <input id="serial" value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="install_date">Install date</label>
              <input id="install_date" type="date" value={form.install_date} onChange={(e) => set('install_date', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="overhaul">Overhaul interval (hrs)</label>
              <input
                id="overhaul"
                type="number"
                min="0"
                value={form.overhaul_interval_hours}
                onChange={(e) => set('overhaul_interval_hours', e.target.value)}
              />
            </div>
          </div>
          {isEdit && (
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Register asset'}
          </button>
        </form>
      </div>
      <Nav />
    </>
  )
}
