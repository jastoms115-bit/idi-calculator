import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isSupervisorOrAbove } from '../lib/roles'

const TABS = [
  { to: '/dashboard', label: 'Home', icon: '\u25C6' },
  { to: '/assets', label: 'Assets', icon: '\u25A3' },
  { to: '/maintenance', label: 'Maint', icon: '\u2699' },
  { to: '/sync', label: 'Sync', icon: '\u21C5' },
  { to: '/learn', label: 'Learn', icon: '?' }
]

export default function Nav() {
  const { profile } = useAuth()
  const tabs = isSupervisorOrAbove(profile?.role)
    ? [...TABS, { to: '/audit', label: 'Audit', icon: '\u2630' }]
    : TABS

  return (
    <nav className="tab-nav">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `tab-nav-item${isActive ? ' active' : ''}`}>
          <span className="tab-nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
