import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Writes one entry to the append-only auditLog collection (create-only,
 * never updated or deleted — see firestore.rules). Any signed-in user can
 * write an entry, but only supervisor+ can read the collection back.
 *
 * Deliberately non-blocking: audit logging must never prevent the primary
 * action (saving a reading, updating an asset) from completing, especially
 * offline, where this write just queues locally like everything else.
 */
export async function logAudit({ action, entityType, entityId, uid, userName, userRole, details = {} }) {
  try {
    await addDoc(collection(db, 'auditLog'), {
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: uid || null,
      user_name: userName || 'Unknown',
      user_role: userRole || null,
      details,
      created_at: serverTimestamp()
    })
  } catch (err) {
    console.warn('Audit log write failed (non-blocking):', err)
  }
}
