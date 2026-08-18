import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, waitForPendingWrites } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { listQueuedPhotos } from '../lib/offlineQueue'
import { processPhotoQueue } from '../lib/photoSync'
import Nav from '../components/Nav'

const COLLECTIONS = [
  { key: 'assets', label: 'Assets' },
  { key: 'assessments', label: 'Readings' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'baselines', label: 'Baselines' }
]

export default function SyncCentre() {
  const online = useOnlineStatus()
  const [pending, setPending] = useState({})
  const [queuedPhotos, setQueuedPhotos] = useState(0)
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState(null)

  useEffect(() => {
    const unsubscribes = COLLECTIONS.map(({ key }) =>
      onSnapshot(
        query(collection(db, key)),
        { includeMetadataChanges: true },
        (snap) => {
          const pendingDocs = snap.docs.filter((d) => d.metadata.hasPendingWrites)
          setPending((prev) => ({ ...prev, [key]: pendingDocs.length }))
        },
        console.error
      )
    )
    return () => unsubscribes.forEach((u) => u())
  }, [])

  useEffect(() => {
    listQueuedPhotos().then((items) => setQueuedPhotos(items.length)).catch(console.error)
  }, [online])

  async function checkSync() {
    setChecking(true)
    try {
      await waitForPendingWrites(db)
      await processPhotoQueue()
      const items = await listQueuedPhotos()
      setQueuedPhotos(items.length)
    } catch (err) {
      console.error(err)
    } finally {
      setChecking(false)
      setLastChecked(new Date())
    }
  }

  const totalPending = Object.values(pending).reduce((a, b) => a + (b || 0), 0) + queuedPhotos

  return (
    <>
      <div className="screen screen--with-nav">
        <div className="eyebrow" style={{ marginTop: 24 }}>
          Sync Centre
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Connection &amp; Sync</h1>

        <div className={`panel sync-status ${online ? 'sync-status-online' : 'sync-status-offline'}`}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {online ? 'Online' : 'Offline'}
          </div>
          <p>
            {online
              ? 'Connected. New readings and asset changes sync to the server as you save them.'
              : "No connection. Everything you do is saved on this device and will sync automatically once you're back online — nothing is lost."}
          </p>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Pending Sync
          </div>
          {totalPending === 0 ? <p>Everything is synced.</p> : <p>{totalPending} record{totalPending === 1 ? '' : 's'} waiting to sync.</p>}
          <div className="breakdown-list" style={{ marginTop: 12 }}>
            {COLLECTIONS.map(({ key, label }) => (
              <div className="breakdown-row" key={key}>
                <span>{label}</span>
                <span className="readout">{pending[key] || 0}</span>
              </div>
            ))}
            <div className="breakdown-row">
              <span>Photos</span>
              <span className="readout">{queuedPhotos}</span>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 16 }} onClick={checkSync} disabled={checking || !online}>
            {checking ? 'Checking…' : 'Check sync status'}
          </button>
          {lastChecked && <p style={{ marginTop: 8 }}>Last checked {lastChecked.toLocaleTimeString()}</p>}
          {!online && <p style={{ marginTop: 8 }}>Reconnect to the internet to sync pending records.</p>}
        </div>

        <div className="panel" style={{ marginTop: 16, marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            How Offline Mode Works
          </div>
          <p>
            Readings, assets, and maintenance records are all saved to this device instantly, whether or not you have a
            connection. Firestore automatically pushes them to the server the moment connectivity returns — there's nothing
            to manually upload. Photos need a live connection to upload and will show an error if taken offline; retry them
            once you're back online.
          </p>
        </div>
      </div>
      <Nav />
    </>
  )
}
