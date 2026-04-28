import { useState, useEffect } from 'preact/hooks'
import { Button } from './components/Button'
import './components/Button.css'

const RESOURCE = GetParentResourceName()

function post(action: string, data: object = {}) {
  fetch(`https://${RESOURCE}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {})
}

function ordinalSuffix(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

/* ── Types ─────────────────────────────────────────────────── */

interface CountdownData {
  number?: number
  isGo?: boolean
  track?: string
  class?: string
  laps?: number
  gridPos?: number
  total?: number
}

interface RacerEntry {
  source: number
  name?: string
  position: number
  gap?: string
  crew_tag?: string
}

interface RaceOverlayData {
  visible?: boolean
  positions?: RacerEntry[]
  mySource?: number
  lapNum?: number
  totalLaps?: number
  checkpoint?: number
  totalCheckpoints?: number
  bestLapTime?: number
  isFirstLap?: boolean
  resetTimer?: boolean
}

interface PostRaceData {
  trackName?: string
  finishTime?: string
  position?: number
  bestLap?: string
  xpGained?: number
  xpNewProgress?: number
  classPointsGained?: number
  cpNewProgress?: number
  iRatingDelta?: number
  safetyRatingDelta?: number
}

/* ── Countdown ─────────────────────────────────────────────── */

function Countdown({ data }: { data: CountdownData }) {
  return (
    <div class="countdown-root">
      {data.isGo ? (
        <div class="countdown-go">GO!</div>
      ) : (
        <div class="countdown-number">{data.number}</div>
      )}
      {!data.isGo && (
        <div class="countdown-meta">
          {data.track && <span>{data.track}</span>}
          {data.class && <span>CLASS {data.class}</span>}
          {data.laps && <span>{data.laps} LAPS</span>}
          {data.gridPos != null && <span>P{data.gridPos}/{data.total}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Race standings overlay ─────────────────────────────────── */

function RaceOverlay({ data }: { data: RaceOverlayData }) {
  const positions = data.positions ?? []
  const mySource  = data.mySource

  return (
    <div class="race-overlay">
      <div class="race-standings">
        <div class="race-standings-header">
          <span class="race-standings-label">Standings</span>
          <span class="race-standings-label">
            Lap {data.lapNum ?? 1} / {data.totalLaps ?? '?'}
          </span>
        </div>

        {positions.map(r => {
          const isMe = r.source === mySource
          const posClass = r.position === 1 ? 'p1' : r.position === 2 ? 'p2' : r.position === 3 ? 'p3' : ''
          return (
            <div key={r.source} class={`racer-row${isMe ? ' is-me' : ''}`}>
              <span class={`racer-pos ${posClass}`}>{r.position}</span>
              <span class={`racer-name${isMe ? ' is-me' : ''}`}>{r.name ?? `P${r.position}`}</span>
              <span class="racer-gap">{r.gap ?? ''}</span>
            </div>
          )
        })}

        {(data.checkpoint != null) && (
          <div class="race-lap-bar">
            <span class="race-lap-text">CP {data.checkpoint} / {data.totalCheckpoints}</span>
            {data.bestLapTime ? (
              <span class="race-lap-text">Best: {data.bestLapTime}ms</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Post-race stats ───────────────────────────────────────── */

function PostRaceStats({ data, onDismiss }: { data: PostRaceData; onDismiss: () => void }) {
  const pos = data.position ?? 1
  const suffix = ordinalSuffix(pos)
  const ir = data.iRatingDelta ?? 0
  const sr = data.safetyRatingDelta ?? 0

  return (
    <div class="stats-overlay">
      <div class="stats-card">
        <div class="stats-hero">
          <div class="stats-position">
            {pos}<span class="stats-position-suffix">{suffix}</span>
          </div>
          <div class="stats-track">{data.trackName ?? 'Race Complete'}</div>
        </div>

        <div class="stats-grid">
          <div class="stats-cell">
            <div class="stats-cell-label">Finish Time</div>
            <div class="stats-cell-val">{data.finishTime ?? '--:--'}</div>
          </div>
          <div class="stats-cell">
            <div class="stats-cell-label">Best Lap</div>
            <div class="stats-cell-val">{data.bestLap ?? '--:--'}</div>
          </div>
          <div class="stats-cell">
            <div class="stats-cell-label">XP Gained</div>
            <div class="stats-cell-val positive">+{data.xpGained ?? 0}</div>
          </div>
          <div class="stats-cell">
            <div class="stats-cell-label">Class Points</div>
            <div class="stats-cell-val positive">+{data.classPointsGained ?? 0}</div>
          </div>
        </div>

        <div class="stats-rating-row">
          <span class="stats-rating-label">iRating</span>
          <span class={`stats-rating-delta ${ir >= 0 ? 'pos' : 'neg'}`}>
            {ir >= 0 ? '+' : ''}{ir}
          </span>
        </div>

        <div class="stats-rating-row">
          <span class="stats-rating-label">Safety Rating</span>
          <span class={`stats-rating-delta ${sr >= 0 ? 'pos' : 'neg'}`}>
            {sr >= 0 ? '+' : ''}{sr}
          </span>
        </div>

        {data.xpNewProgress != null && (
          <div class="xp-bar-wrap">
            <div class="xp-bar-label">
              <span>XP Progress</span>
              <span>{Math.round((data.xpNewProgress ?? 0) * 100)}%</span>
            </div>
            <div class="xp-bar-track">
              <div class="xp-bar-fill" style={{ width: `${(data.xpNewProgress ?? 0) * 100}%` }} />
            </div>
          </div>
        )}

        <div class="stats-footer">
          <Button variant="primary" onClick={onDismiss}>Continue</Button>
        </div>
      </div>
    </div>
  )
}

/* ── Root app ──────────────────────────────────────────────── */

type ActiveView = 'none' | 'countdown' | 'overlay' | 'poststats'

export function App() {
  const [view, setView]             = useState<ActiveView>('none')
  const [countdown, setCountdown]   = useState<CountdownData>({})
  const [overlay, setOverlay]       = useState<RaceOverlayData>({})
  const [postRace, setPostRace]     = useState<PostRaceData | null>(null)
  const [cdTimer, setCdTimer]       = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const { action, data = {} } = e.data ?? {}
      if (!action) return

      switch (action) {
        case 'countdown':
          setCountdown(data)
          setView('countdown')
          if (cdTimer) clearTimeout(cdTimer)
          if (data.isGo) {
            const t = setTimeout(() => setView('none'), 1200)
            setCdTimer(t)
          }
          break

        case 'raceOverlay':
          if (data.visible === false) {
            setView('none')
          } else {
            setOverlay(data)
            if (view !== 'overlay') setView('overlay')
          }
          break

        case 'postRaceStats':
          setPostRace(data)
          setView('poststats')
          break

        case 'hideAll':
          setView('none')
          setPostRace(null)
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [view, cdTimer])

  const dismissStats = () => {
    post('dismissStats')
    setPostRace(null)
    setView('none')
  }

  return (
    <>
      {view === 'countdown' && <Countdown data={countdown} />}
      {view === 'overlay'   && <RaceOverlay data={overlay} />}
      {view === 'poststats' && postRace && <PostRaceStats data={postRace} onDismiss={dismissStats} />}
    </>
  )
}
