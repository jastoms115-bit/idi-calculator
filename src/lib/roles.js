/**
 * Role hierarchy helpers — mirrors the role checks in firestore.rules
 * exactly, so the UI hides/disables what the backend would reject
 * anyway. This is a UX convenience only; firestore.rules remains the
 * real enforcement boundary.
 */

export const ROLES = ['technician', 'engineer', 'supervisor', 'administrator']

export function isEngineerOrAbove(role) {
  return ['engineer', 'supervisor', 'administrator'].includes(role)
}

export function isSupervisorOrAbove(role) {
  return ['supervisor', 'administrator'].includes(role)
}

export function isAdmin(role) {
  return role === 'administrator'
}

export function roleLabel(role) {
  const labels = {
    technician: 'Technician',
    engineer: 'Engineer',
    supervisor: 'Supervisor',
    administrator: 'Administrator'
  }
  return labels[role] || role || 'Unknown'
}
