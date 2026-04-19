import { useFleetStore } from './fleet-store'
import { FLEET_SIZE } from './config'

function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
}) {
  return (
    <div className="iruka-stat">
      <span className="iruka-stat__label">{label}</span>
      <span className="iruka-stat__value">
        {value}
        {unit ? <span className="iruka-stat__unit">{unit}</span> : null}
      </span>
      {hint ? <span className="iruka-stat__hint">{hint}</span> : null}
    </div>
  )
}

export function MetricsPanel() {
  const rps = useFleetStore((s) => s.metrics.rps)
  const p50 = useFleetStore((s) => s.metrics.p50)
  const p95 = useFleetStore((s) => s.metrics.p95)
  const total = useFleetStore((s) => s.metrics.total)
  const errors = useFleetStore((s) => s.metrics.errors)
  const activeMax = useFleetStore((s) => s.metrics.activeMax)
  const liveActive = useFleetStore((s) => s.liveActive)
  const lastBatch = useFleetStore((s) => s.metrics.lastBatchSize)
  const lastWall = useFleetStore((s) => s.metrics.lastBatchWallMs)

  return (
    <section className="iruka-metrics" aria-label="Fleet metrics">
      <Stat
        label="Active now"
        value={`${liveActive}`}
        unit={`/ ${FLEET_SIZE}`}
        hint={`peak ${activeMax}`}
      />
      <Stat
        label="Throughput"
        value={rps > 0 ? rps.toFixed(0) : '—'}
        unit={rps > 0 ? 'req/s' : undefined}
        hint={lastBatch > 0 ? `${lastBatch} req in ${lastWall.toFixed(0)} ms` : undefined}
      />
      <Stat
        label="Latency p50 / p95"
        value={p50 > 0 ? `${p50.toFixed(0)} / ${p95.toFixed(0)}` : '—'}
        unit={p50 > 0 ? 'ms' : undefined}
      />
      <Stat
        label="Total inferences"
        value={total.toLocaleString()}
        hint={errors > 0 ? `${errors} errors` : undefined}
      />
    </section>
  )
}
