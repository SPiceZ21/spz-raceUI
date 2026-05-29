import { useEffect, useState, useRef } from 'preact/hooks'

/* Reusable progress-bar lane — Premium Minimal style.
   - Single 3px linear fill, single ease-out animation 0 → target
   - Count-up animation on the gain number (1.2s ease-out cubic)
   - No shimmer, no glow soup, no gradients
   Used by XPBar + RankBar. */

export type LaneVariant = 'xp' | 'cp'

export interface ProgressLaneProps {
  label: string
  badge?: any            // ReactNode — full custom badge (e.g. "LVL 24")
  flash?: string         // optional inline status text (e.g. "LEVEL UP")
  gain: number
  gainUnit: string
  variant: LaneVariant
  target: number          // 0..1
  startLabel: string
  endLabel: string
}

export const ProgressLane = (p: ProgressLaneProps) => {
  const target = Math.min(1, Math.max(0, p.target || 0))
  const [fillPct,   setFillPct]   = useState(0)
  const [gainCount, setGainCount] = useState(0)
  const rafRef = useRef<number | null>(null)

  // Bar fill: trigger one tick after mount so CSS transition runs
  useEffect(() => {
    const t = setTimeout(() => setFillPct(target), 80)
    return () => clearTimeout(t)
  }, [target])

  // Count-up: gain number rises from 0 → target (1.2s ease-out cubic)
  useEffect(() => {
    const duration = 1200
    const start    = performance.now()
    const targetN  = Math.max(0, Math.round(p.gain || 0))

    const step = (now: number) => {
      const t     = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setGainCount(Math.round(eased * targetN))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [p.gain])

  return (
    <div class="lane">
      <div class="lane-header">
        <div class="lane-left">
          <span class="lane-label">{p.label}</span>
          {p.badge && <span class="lane-badge">{p.badge}</span>}
          {p.flash && <span class="lane-flash">{p.flash}</span>}
        </div>
        <div class="lane-gain">
          <span class="gain-sign">+</span>
          {gainCount}
          <span class="gain-unit">{p.gainUnit}</span>
        </div>
      </div>

      <div class="lane-track">
        <div
          class={`lane-fill ${p.variant}`}
          style={{ width: `${fillPct * 100}%` }}
        />
      </div>

      <div class="lane-footer">
        <span>{p.startLabel}</span>
        <span class="lane-pct">{Math.round(fillPct * 100)}%</span>
        <span>{p.endLabel}</span>
      </div>
    </div>
  )
}
