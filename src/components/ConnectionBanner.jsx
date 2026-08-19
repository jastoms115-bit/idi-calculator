import { useOnlineStatus } from '../hooks/useOnlineStatus'

// Deliberately shows nothing when online — the point is to catch the
// attention only when it matters (offline), not to add permanent chrome
// to every screen. Fixed at the very top so it's visible regardless of
// which page is showing, without needing every page to remember to render it.
export default function ConnectionBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div className="connection-banner" role="status">
      <span className="connection-banner-dot" />
      Offline — your work is saved on this device and will sync automatically
    </div>
  )
}
