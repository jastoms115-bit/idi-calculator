export default function EmptyState({ title, message, action }) {
  return (
    <div className="panel empty-state">
      <div className="eyebrow" style={{ marginBottom: 6 }}>{title}</div>
      <p style={{ marginBottom: action ? 16 : 0 }}>{message}</p>
      {action}
    </div>
  )
}
