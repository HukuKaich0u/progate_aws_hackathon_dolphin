import type { CSSProperties } from 'react'
import './iruka-gpu.css'

type MetricSpec = {
  detail: string
  label: string
  value: string
}

type BubbleSpec = {
  left: string
  size: number
  top: string
}

type DolphinSpec = {
  left: string
  opacity: number
  rotate: number
  scale: number
  top: string
}

const FLOATING_BUBBLES: readonly BubbleSpec[] = [
  { left: '4%', size: 22, top: '93%' },
  { left: '9%', size: 10, top: '24%' },
  { left: '14%', size: 8, top: '88%' },
  { left: '53%', size: 12, top: '93%' },
  { left: '90%', size: 10, top: '15%' },
]

const DOLPHINS: readonly DolphinSpec[] = [
  { left: '5%', top: '21%', scale: 0.76, rotate: -12, opacity: 0.56 },
  { left: '14%', top: '13%', scale: 0.98, rotate: 8, opacity: 0.8 },
  { left: '15%', top: '33%', scale: 1.1, rotate: -18, opacity: 0.84 },
  { left: '22%', top: '18%', scale: 0.48, rotate: -8, opacity: 0.78 },
  { left: '22%', top: '43%', scale: 0.94, rotate: -22, opacity: 0.66 },
  { left: '30%', top: '16%', scale: 0.86, rotate: 15, opacity: 0.7 },
  { left: '31%', top: '42%', scale: 0.74, rotate: -18, opacity: 0.7 },
  { left: '37%', top: '10%', scale: 0.92, rotate: -4, opacity: 0.72 },
  { left: '40%', top: '27%', scale: 0.82, rotate: 14, opacity: 0.72 },
  { left: '45%', top: '14%', scale: 1.02, rotate: 8, opacity: 0.72 },
  { left: '46%', top: '48%', scale: 0.72, rotate: 9, opacity: 0.7 },
  { left: '50%', top: '11%', scale: 0.98, rotate: -9, opacity: 0.74 },
  { left: '52%', top: '36%', scale: 0.75, rotate: -12, opacity: 0.72 },
  { left: '56%', top: '20%', scale: 0.95, rotate: 20, opacity: 0.78 },
  { left: '58%', top: '46%', scale: 0.62, rotate: -17, opacity: 0.74 },
  { left: '61%', top: '11%', scale: 0.9, rotate: 7, opacity: 0.7 },
  { left: '65%', top: '23%', scale: 0.88, rotate: -10, opacity: 0.72 },
  { left: '67%', top: '39%', scale: 0.7, rotate: 15, opacity: 0.7 },
  { left: '70%', top: '19%', scale: 0.96, rotate: -16, opacity: 0.8 },
  { left: '73%', top: '42%', scale: 0.7, rotate: 18, opacity: 0.68 },
  { left: '77%', top: '29%', scale: 0.92, rotate: -18, opacity: 0.78 },
  { left: '81%', top: '14%', scale: 0.55, rotate: -10, opacity: 0.7 },
  { left: '84%', top: '34%', scale: 0.9, rotate: 18, opacity: 0.75 },
  { left: '89%', top: '24%', scale: 0.82, rotate: -25, opacity: 0.7 },
  { left: '90%', top: '7%', scale: 0.58, rotate: -35, opacity: 0.72 },
  { left: '9%', top: '58%', scale: 0.82, rotate: -15, opacity: 0.62 },
]

const GAUGE_TICKS = Array.from({ length: 15 }, (_, index) => index)

const SIDE_PANEL_METRICS: readonly (readonly MetricSpec[])[] = [
  [
    {
      label: 'Active Nodes',
      value: '126',
      detail: '126 / 126 online',
    },
    {
      label: 'Node Health',
      value: '99.2%',
      detail: '124 healthy, 2 warning',
    },
  ],
  [
    {
      label: 'Inference Throughput',
      value: '4,820 req/s',
      detail: 'Current swarm throughput',
    },
    {
      label: 'Latency',
      value: '42 / 88 ms',
      detail: 'p50 / p95',
    },
  ],
  [
    {
      label: 'Queue Depth',
      value: '18',
      detail: '3 high-priority waiting',
    },
    {
      label: 'Power / Thermal',
      value: '71 kW / 64C',
      detail: 'Cluster draw / avg temp',
    },
  ],
  [
    {
      label: 'Network Sync',
      value: '3.8 ms',
      detail: 'Inter-node sync delay',
    },
    {
      label: 'Failures / Retries',
      value: '2 / 11',
      detail: 'Errors / retried jobs',
    },
  ],
]

function BubbleCluster({
  bubbles,
  className,
}: {
  bubbles: readonly BubbleSpec[]
  className?: string
}) {
  return (
    <div aria-hidden="true" className={className}>
      {bubbles.map((bubble, index) => (
        <span
          className="iruka-bubble"
          key={`${bubble.left}-${bubble.top}-${bubble.size}`}
          style={
            {
              '--bubble-delay': `${index * 0.7}s`,
              '--bubble-size': `${bubble.size}px`,
              left: bubble.left,
              top: bubble.top,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function DolphinIcon() {
  return (
    <svg aria-hidden="true" className="iruka-dolphin-svg" viewBox="0 0 120 80">
      <path
        className="iruka-dolphin-svg__body"
        d="M10 50c8-16 24-27 45-30 14-2 22 0 30 5 6 4 12 9 22 11-8 6-17 8-25 9 3 5 5 10 4 15-5-2-10-7-14-11-9 10-22 17-37 19-10 1-18-1-25-6 5-3 9-7 12-12-5 1-9 2-12 0Z"
      />
      <path
        className="iruka-dolphin-svg__line"
        d="M27 47c14-15 30-21 49-20 12 1 21 5 32 11"
      />
      <path className="iruka-dolphin-svg__line" d="M52 33c-1-8 2-14 7-18 1 6 3 11 7 16" />
      <path className="iruka-dolphin-svg__line" d="M56 49c-5 8-12 13-21 16" />
      <circle className="iruka-dolphin-svg__eye" cx="84" cy="34" r="2.2" />
    </svg>
  )
}

function ScreenDolphins() {
  return (
    <div aria-hidden="true" className="iruka-screen__dolphins">
      {DOLPHINS.map((dolphin, index) => (
        <div
          className="iruka-dolphin"
          key={`${dolphin.left}-${dolphin.top}-${dolphin.scale}`}
          style={
            {
              '--dolphin-delay': `${index * 0.18}s`,
              left: dolphin.left,
              opacity: dolphin.opacity,
              top: dolphin.top,
              transform: `rotate(${dolphin.rotate}deg) scale(${dolphin.scale})`,
            } as CSSProperties
          }
        >
          <DolphinIcon />
        </div>
      ))}
    </div>
  )
}

function MonitorGauge() {
  return (
    <div className="iruka-gauge" aria-label="Sync level gauge">
      <div className="iruka-gauge__dial">
        <div className="iruka-gauge__ring" />
        <div className="iruka-gauge__ring iruka-gauge__ring--inner" />
        <div className="iruka-gauge__ticks">
          {GAUGE_TICKS.map((tick) => (
            <span
              className="iruka-gauge__tick"
              key={tick}
              style={{ transform: `rotate(${-94 + tick * 13}deg)` }}
            />
          ))}
        </div>
        <div className="iruka-gauge__needle" />
        <div className="iruka-gauge__hub" />
      </div>
      <div className="iruka-gauge__footer">
        <span className="iruka-gauge__label">Sync Level</span>
        <span className="iruka-gauge__meter">
          <span className="iruka-gauge__meter-fill" />
        </span>
      </div>
    </div>
  )
}

function MetricStack({ items }: { items: readonly MetricSpec[] }) {
  return (
    <div className="iruka-metric-stack">
      {items.map((item) => (
        <article className="iruka-metric-card" key={item.label}>
          <span className="iruka-metric-card__label">{item.label}</span>
          <strong className="iruka-metric-card__value">{item.value}</strong>
          <span className="iruka-metric-card__detail">{item.detail}</span>
        </article>
      ))}
    </div>
  )
}

export function IrukaGpuPage() {
  return (
    <main className="iruka-gpu-page">
      <BubbleCluster bubbles={FLOATING_BUBBLES} className="iruka-floating-bubbles" />

      <div className="iruka-monitor-stage">
        <section className="iruka-monitor" aria-label="Dolphin sync monitor">
          <div className="iruka-monitor__frame">
            <div className="iruka-monitor__sheen" aria-hidden="true" />

            <div className="iruka-side iruka-side--left">
              <section className="iruka-panel iruka-panel--stats">
                <MetricStack items={SIDE_PANEL_METRICS[0]} />
                <div className="iruka-panel__glow" aria-hidden="true" />
              </section>

              <section className="iruka-panel iruka-panel--large">
                <MetricStack items={SIDE_PANEL_METRICS[1]} />
                <BubbleCluster
                  bubbles={[
                    { left: '22%', top: '64%', size: 9 },
                    { left: '28%', top: '78%', size: 12 },
                    { left: '34%', top: '86%', size: 14 },
                    { left: '36%', top: '95%', size: 7 },
                  ]}
                  className="iruka-panel__bubbles"
                />
              </section>
            </div>

            <section className="iruka-screen">
              <div className="iruka-screen__top-beam" aria-hidden="true" />
              <div className="iruka-screen__vignette" aria-hidden="true" />
              <div className="iruka-screen__mist iruka-screen__mist--left" aria-hidden="true" />
              <div className="iruka-screen__mist iruka-screen__mist--right" aria-hidden="true" />

              <div className="iruka-screen__particle-field" aria-hidden="true" />
              <ScreenDolphins />

              <div className="iruka-swirl" aria-hidden="true">
                <span className="iruka-swirl__ring iruka-swirl__ring--outer" />
                <span className="iruka-swirl__ring iruka-swirl__ring--mid" />
                <span className="iruka-swirl__ring iruka-swirl__ring--inner" />
                <span className="iruka-swirl__core" />
              </div>

              <span className="iruka-screen__timestamp">11 ms</span>
            </section>

            <div className="iruka-side iruka-side--right">
              <section className="iruka-panel">
                <MetricStack items={SIDE_PANEL_METRICS[2]} />
                <BubbleCluster
                  bubbles={[
                    { left: '76%', top: '8%', size: 8 },
                    { left: '79%', top: '17%', size: 9 },
                    { left: '82%', top: '26%', size: 6 },
                    { left: '84%', top: '35%', size: 7 },
                    { left: '86%', top: '44%', size: 10 },
                    { left: '88%', top: '55%', size: 6 },
                  ]}
                  className="iruka-panel__bubbles iruka-panel__bubbles--right"
                />
              </section>

              <section className="iruka-panel iruka-panel--large">
                <MetricStack items={SIDE_PANEL_METRICS[3]} />
                <BubbleCluster
                  bubbles={[
                    { left: '64%', top: '38%', size: 10 },
                    { left: '72%', top: '44%', size: 18 },
                    { left: '83%', top: '51%', size: 9 },
                    { left: '69%', top: '58%', size: 7 },
                  ]}
                  className="iruka-panel__bubbles iruka-panel__bubbles--right"
                />
              </section>
            </div>
          </div>

          <MonitorGauge />
          <div className="iruka-monitor__stand" aria-hidden="true" />
        </section>
      </div>

      <div aria-hidden="true" className="iruka-corner-spark" />
    </main>
  )
}
