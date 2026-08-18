const LABELS = {
  healthy: 'Healthy',
  watch: 'Watch',
  caution: 'Caution',
  critical: 'Critical',
  unknown: 'Unknown'
}

export default function ConditionBadge({ category, size }) {
  const key = (category || 'unknown').toLowerCase()
  const label = LABELS[key] || 'Unknown'
  return (
    <span className={`badge badge-${key}`} style={size === 'lg' ? { fontSize: 12, padding: '6px 10px' } : undefined}>
      {label}
    </span>
  )
}
