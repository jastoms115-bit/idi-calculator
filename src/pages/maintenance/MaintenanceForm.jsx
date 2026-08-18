import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { isEngineerOrAbove } from '../../lib/roles'
import { logAudit } from '../../lib/audit'
import { attachQueueTarget } from '../../lib/offlineQueue'
import PhotoUpload from '../../components/PhotoUpload'
import Nav from '../../components/Nav'

const TYPES = ['preventive', 'corrective', 'inspection', 'overhaul']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

const EMPTY = {
  asset_id: '',
  title: '',
  type: 'preventive',
  priority: 'medium',
  status: 'open',
  description: '',
  scheduled_date: '',
  completed_date: '',
  notes: ''
}

export default function MaintenanceForm() {
  const { recordId } = useParams()
  const isEdit = Boolean(recordId)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const canEdit = isEngineerOrAbove(profile?.role)

  // Stable id for photos attached before a new record exists — matches
  // the maintenance/{id}/** photo folder convention. Edit mode already has a real id.
  const [draftId] = useState(() => recordId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`))

  const [assets, setAssets] = useState([])
  const [form, setForm] = useState({ ...EMPTY, asset_id: searchParams.get('assetId') || '' })
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'assets'), orderBy('name'))
    const unsubscribe = onSnapshot(q, (snap) => setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), console.error)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!isEdit) return
    getDoc(doc(db, 'maintenance', recordId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setForm({ ...EMPTY, ...data })
          setPhotos(data.photos || [])
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Could not load this record.')
      })
      .finally(() => setLoading(false))
  }, [recordId, isEdit])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.asset_id || !form.title.trim()) {
      setError('Asset and title are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const asset = assets.find((a) => a.id === form.asset_id)
      const payload = {
        ...form,
        title: form.title.trim(),
        asset_tag: asset?.tag || null,
        photos,
        updated_at: serverTimestamp()
      }
      if (form.status === 'completed' && !form.completed_date) {
        payload.completed_date = new Date().toISOString().slice(0, 10)
      }
      if (isEdit) {
        await updateDoc(doc(db, 'maintenance', recordId), payload)
        await logAudit({
          action: 'maintenance_updated',
          entityType: 'maintenance',
          entityId: recordId,
          uid: user.uid,
          userName: profile?.display_name,
          userRole: profile?.role,
          details: { status: form.status }
        })
        navigate('/maintenance', { replace: true })
      } else {
        const ref = await addDoc(collection(db, 'maintenance'), {
          ...payload,
          created_at: serverTimestamp(),
          created_by: user.uid
        })
        const pendingPaths = photos.filter((p) => p.pending).map((p) => p.path)
        if (pendingPaths.length) {
          await Promise.all(
            pendingPaths.map((path) => attachQueueTarget(path, { collection: 'maintenance', docId: ref.id, arrayField: 'photos' }))
          )
        }
        await logAudit({
          action: 'maintenance_created',
          entityType: 'maintenance',
          entityId: ref.id,
          uid: user.uid,
          userName: profile?.display_name,
          userRole: profile?.role
        })
        navigate('/maintenance', { replace: true })
      }
    } catch (err) {
      console.error(err)
      setError('Could not save this record. Check your connection and try again.')
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
          {isEdit ? 'Maintenance Record' : 'New Maintenance'}
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>{isEdit ? form.title || 'Record' : 'Log maintenance'}</h1>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="asset_id">Asset</label>
            <select id="asset_id" value={form.asset_id} onChange={(e) => set('asset_id', e.target.value)} disabled={!canEdit} required>
              <option value="">Select an asset…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} disabled={!canEdit} placeholder="Replace drive-end bearing" required />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="type">Type</label>
              <select id="type" value={form.type} onChange={(e) => set('type', e.target.value)} disabled={!canEdit}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="priority">Priority</label>
              <select id="priority" value={form.priority} onChange={(e) => set('priority', e.target.value)} disabled={!canEdit}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(e) => set('status', e.target.value)} disabled={!canEdit}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="scheduled_date">Scheduled date</label>
              <input id="scheduled_date" type="date" value={form.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} disabled={!canEdit} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} disabled={!canEdit} />
          </div>
          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} disabled={!canEdit} />
          </div>
          <div className="field">
            <label>Photos</label>
            <PhotoUpload
              storagePathPrefix={`maintenance/${draftId}`}
              photos={photos}
              onChange={setPhotos}
              disabled={!canEdit}
              photoTarget={isEdit ? { collection: 'maintenance', docId: recordId, arrayField: 'photos' } : null}
            />
          </div>

          {canEdit ? (
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create record'}
            </button>
          ) : (
            <p>Only engineers and above can edit maintenance records.</p>
          )}
        </form>
      </div>
      <Nav />
    </>
  )
}
