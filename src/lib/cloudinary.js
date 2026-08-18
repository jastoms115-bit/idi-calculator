/**
 * Minimal Cloudinary client — replaces Firebase Storage (which now requires
 * a linked billing card even on the free tier as of Feb 2026). Cloudinary's
 * free tier (25 credits/month, ~25GB storage+bandwidth) needs no card,
 * using an *unsigned* upload preset so the browser can upload directly
 * with no backend and no secret key exposed client-side.
 *
 * Setup (console.cloudinary.com, free signup):
 *   1. Dashboard → copy your "Cloud name".
 *   2. Settings → Upload → Upload presets → Add upload preset →
 *      set Signing Mode to "Unsigned" → give it a name → Save.
 *   3. Put both values in .env.local:
 *        VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *        VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 *
 * Note: unsigned uploads can't be deleted from the client (deleting
 * requires a signed request with your API secret, which must never ship
 * to the browser). Removing a photo here removes it from the record —
 * the file itself stays in Cloudinary until cleaned up server-side later.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/**
 * Uploads a file to Cloudinary with progress reporting.
 * @param {Object} opts
 * @param {File|Blob} opts.file
 * @param {string} opts.folder - groups uploads (mirrors the old storage path prefix)
 * @param {(percent:number)=>void} [opts.onProgress]
 * @returns {Promise<{url:string, publicId:string}>}
 */
export function uploadToCloudinary({ file, folder, onProgress }) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return Promise.reject(
      new Error('Cloudinary is not configured — set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.')
    )
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  if (folder) formData.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: res.secure_url, publicId: res.public_id })
        } else {
          reject(new Error(res.error?.message || `Cloudinary upload failed (${xhr.status})`))
        }
      } catch (err) {
        reject(err)
      }
    }
    xhr.onerror = () => reject(new Error('Network error during Cloudinary upload'))
    xhr.send(formData)
  })
}
