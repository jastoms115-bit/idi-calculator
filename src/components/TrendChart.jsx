const THRESHOLDS = [
  { y: 85, color: 'var(--healthy)' },
  { y: 70, color: 'var(--watch)' },
  { y: 40, color: 'var(--caution)' }
]

/** points: [{ x: <ms timestamp>, y: <0-100 score> }], at least 2 required to draw a line. */
export default function TrendChart({ points, height = 180 }) {
  if (!points || points.length < 2) {
    return <div className="trend-chart-empty">Not enough readings yet to plot a trend — log at least two assessments.</div>
  }

  const width = 600
  const padding = 24
  const xs = points.map((p) => p.x)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)

  const scaleX = (x) => {
    if (maxX === minX) return padding
    return padding + ((x - minX) / (maxX - minX)) * (width - padding * 2)
  }
  const scaleY = (y) => {
    const clamped = Math.max(0, Math.min(100, y))
    return height - padding - (clamped / 100) * (height - padding * 2)
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" preserveAspectRatio="none">
      {THRESHOLDS.map((t) => (
        <line
          key={t.y}
          x1={padding}
          x2={width - padding}
          y1={scaleY(t.y)}
          y2={scaleY(t.y)}
          stroke={t.color}
          strokeDasharray="4 4"
          strokeWidth="1"
          opacity="0.5"
        />
      ))}
      <path d={path} fill="none" stroke="var(--amber-500)" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={scaleX(p.x)} cy={scaleY(p.y)} r="3" fill="var(--amber-400)" />
      ))}
    </svg>
  )
}
