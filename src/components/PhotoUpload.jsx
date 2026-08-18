import { useEffect, useRef, useState } from 'react'
import { uploadToCloudinary } from '../lib/cloudinary'
import { enqueuePhoto, removeQueuedPhoto } from '../lib/offlineQueue'

/**
 * Reusable photo attach widget. Cloudinary folder layout mirrors the old
 * storage path convention: {storagePathPrefix}/{filename} under
 * assets/{id}, assessments/{id}, or maintenance/{id} — the caller passes
 * the right prefix.
 *
 * Offline-safe: if there's no connection when a photo is picked, the file
 * is queued in IndexedDB (src/lib/offlineQueue.js) instead of attempted
 * over the network, and shows as "Queued" until src/lib/photoSync.js
 * uploads it automatically once back online. Pass photoTarget when the
 * containing Firestore doc already exists so the real URL can be patched
 * back in after a queued upload completes; if the doc is only created on
 * form submit (e.g. a new assessment), leave it null here and attach the
 * target afterwards with attachQueueTarget() — see AssessmentForm.jsx.
 */
export default function PhotoUpload({ storagePathPrefix, photos = [], onChange, maxFiles = 6, disabled = false, photoTarget = null }) {
  const inputRef = useRef(null)
  const createdUrls = useRef([])
  const [uploading, setUploading] = useState({})
  const [previewUrls, setPreviewUrls] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      createdUrls.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  function pickFiles() {
    inputRef.current?.click()
  }

  async function queueOffline(file, path) {
    await enqueuePhoto({ path, file, name: file.name, target: photoTarget })
    const objectUrl = URL.createObjectURL(file)
    createdUrls.current.push(objectUrl)
    setPreviewUrls((prev) => ({ ...prev, [path]: objectUrl }))
    onChange([...photos, { path, name: file.name, url: null, pending: true }])
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    if (photos.length + files.length > maxFiles) {
      setError(`Up to ${maxFiles} photos per record.`)
      return
    }
    setError('')

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are supported.')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Each photo must be under 10 MB.')
        continue
      }

      const path = `${storagePathPrefix}/${Date.now()}_${file.name}`

      if (!navigator.onLine) {
        await queueOffline(file, path)
        continue
      }

      setUploading((prev) => ({ ...prev, [path]: 0 }))

      try {
        const { url, publicId } = await uploadToCloudinary({
          file,
          folder: storagePathPrefix,
          onProgress: (percent) => setUploading((prev) => ({ ...prev, [path]: percent }))
        })
        onChange([...photos, { url, path, publicId, name: file.name }])
      } catch (err) {
        console.warn('Upload failed, queueing for retry once online:', err)
        await queueOffline(file, path)
      } finally {
        setUploading((prev) => {
          const next = { ...prev }
          delete next[path]
          return next
        })
      }
    }
  }

  async function removePhoto(photo) {
    onChange(photos.filter((p) => p.path !== photo.path))
    if (photo.pending) {
      await removeQueuedPhoto(photo.path)
      return
    }
    // Cloudinary unsigned uploads can't be deleted from the client (that
    // needs a signed request with the API secret, which never ships to the
    // browser). The record stops referencing it here; the file itself
    // stays in Cloudinary until cleaned up server-side later.
  }

  const pendingUploadCount = Object.keys(uploading).length

  return (
    <div className="photo-upload">
      {error && <div className="banner banner-error">{error}</div>}
      <div className="photo-grid">
        {photos.map((photo) => (
          <div className={`photo-thumb${photo.pending ? ' photo-thumb-queued' : ''}`} key={photo.path}>
            {photo.url || previewUrls[photo.path] ? (
              <img src={photo.url || previewUrls[photo.path]} alt={photo.name || 'Photo'} />
            ) : (
              <div className="photo-thumb-placeholder">Queued</div>
            )}
            {photo.pending && <span className="photo-thumb-badge">Queued</span>}
            {!disabled && (
              <button type="button" className="photo-thumb-remove" onClick={() => removePhoto(photo)} aria-label="Remove photo">
                ×
              </button>
            )}
          </div>
        ))}
        {Array.from({ length: pendingUploadCount }).map((_, i) => (
          <div className="photo-thumb photo-thumb-pending" key={`uploading-${i}`}>
            <div className="spinner" />
          </div>
        ))}
        {!disabled && photos.length + pendingUploadCount < maxFiles && (
          <button type="button" className="photo-add" onClick={pickFiles}>
            + Photo
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={handleFiles} />
    </div>
  )
}
