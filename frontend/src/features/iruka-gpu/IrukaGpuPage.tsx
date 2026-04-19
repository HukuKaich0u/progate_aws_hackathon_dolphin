import { useEffect } from 'react'
import { ControlPanel } from './ControlPanel'
import { HeroHeader } from './HeroHeader'
import { Legend } from './Legend'
import { MetricsPanel } from './MetricsPanel'
import { OceanCanvas } from './OceanCanvas'
import { RecentResults } from './RecentResults'
import { useFleetStore } from './fleet-store'
import './iruka-gpu.css'

export function IrukaGpuPage() {
  const initWorkers = useFleetStore((s) => s.initWorkers)

  useEffect(() => {
    initWorkers()
  }, [initWorkers])

  return (
    <div className="iruka-gpu-page">
      <OceanCanvas />
      <HeroHeader />
      <MetricsPanel />
      <Legend />
      <RecentResults />
      <ControlPanel />
    </div>
  )
}
