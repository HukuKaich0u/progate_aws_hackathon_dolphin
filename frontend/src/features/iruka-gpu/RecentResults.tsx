import { useFleetStore } from './fleet-store'

export function RecentResults() {
  const results = useFleetStore((s) => s.recentResults)
  if (results.length === 0) return null

  return (
    <section className="iruka-recent" aria-label="Latest results">
      <h3>Latest inferences</h3>
      <ul>
        {results.map((r) => (
          <li key={`${r.worker_id}-${r.timestamp}`}>
            <span className="iruka-recent__worker">w{r.worker_id.toString().padStart(3, '0')}</span>
            <span className="iruka-recent__label">{r.label}</span>
            <span className="iruka-recent__latency">{r.latency_ms.toFixed(0)} ms</span>
            <span className="iruka-recent__conf">
              {(r.confidence * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
