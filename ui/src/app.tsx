import { useState, useEffect, useRef } from 'preact/hooks'
import { TrendingUp, TrendingDown } from 'lucide-preact'
import { ProgressionStrip } from './components/ProgressionStrip'
import './styles/app.css'

const RESOURCE = typeof GetParentResourceName === 'undefined' ? 'spz-raceUI' : GetParentResourceName()

function post(action: string, data: object = {}) {
  if (typeof GetParentResourceName === 'undefined') {
    console.log(`[Browser Preview] NUI Post to ${action}:`, data);
    return;
  }
  fetch(`https://${RESOURCE}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => { })
}

function formatTime(ms: number) {
  if (!ms || ms <= 0) return '00:00.000'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const t = Math.floor(ms % 1000)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${t.toString().padStart(3, '0')}`
}

/* TimeDigits — splits a time string into fixed-width per-character spans.
   Panchang has no tabular-nums, so we lock each digit's width via CSS to
   prevent left/right wiggle when digit shapes change (e.g. 1 vs 8). */
const TimeDigits = ({ text }: { text: string }) => (
  <>
    {text.split('').map((c, i) => {
      const isSep = c === ':' || c === '.'
      return (
        <span key={i} class={isSep ? 'tsep' : 'tdig'}>{c}</span>
      )
    })}
  </>
)

/* ── KeyCap ────────────────────────────────────────────────── */

const KeyCap = ({ children }: { children: any }) => (
  <span class="keycap">{children}</span>
)

function posSuffix(p: number) {
  if (p === 1) return 'ST'
  if (p === 2) return 'ND'
  if (p === 3) return 'RD'
  return 'TH'
}

interface RacerEntry {
  source: number
  name?: string
  position: number | string
  gap?: string
  avatar?: string
  licenseClass?: string
  nation?: string      // ISO 3166-1 alpha-2, lowercase
  raceNumber?: number  // 1-99
}

type SectorColour = 'purple' | 'green' | 'yellow'

interface SectorEntry {
  time: number
  colour: SectorColour
  delta?: number
}

/* Sector strip — S1|S2|S3 for the current lap. Sectors are derived from the
   track's checkpoint count server-side; this only renders what it is told. */
/* Split delta tower — flashes "+0.21 / -0.08 / PB" at each CP crossing,
   coloured against your best lap. Auto-fades; keyed so it re-triggers. */
const SplitDelta = ({ s }: { s: { delta: number | null; cp: number; total: number; key: number } }) => {
  const d = s.delta
  const cls = d == null ? 'first' : d < -5 ? 'ahead' : d > 5 ? 'behind' : 'even'
  const text =
    d == null ? 'BEST'
      : (d <= 0 ? '-' : '+') + (Math.abs(d) / 1000).toFixed(2)
  return (
    <div key={s.key} class={`split-delta ${cls}`}>
      <span class="split-cp">CP {s.cp}/{s.total}</span>
      <span class="split-val">{text}</span>
    </div>
  )
}

const SectorStrip = ({ sectors }: { sectors: (SectorEntry | null)[] }) => (
  <div class="sector-strip">
    {[0, 1, 2].map((i) => {
      const s = sectors[i]
      return (
        // key includes the time so a fresh result re-mounts the cell and
        // retriggers the pop animation
        <div key={`${i}-${s?.time ?? 'p'}`} class={`sector-cell ${s ? s.colour : 'pending'}`}>
          <div class="sector-inner">
            <span class="sector-label">S{i + 1}</span>
            <span class="sector-time">
              {s ? (s.time / 1000).toFixed(2) : '--.--'}
            </span>
          </div>
        </div>
      )
    })}
  </div>
)

interface OverlayState {
  visible?: boolean
  positions?: RacerEntry[]
  mySource?: number
  lapNum?: number
  totalLaps?: any
  checkpoint?: number
  totalCheckpoints?: number
  bestLapTime?: any
  allTimeBest?: any
  currentLapTime?: number
  totalRaceTime?: number
  formattedTime?: string
  delta?: number
  myPosition?: number | string
  isTT?: boolean
}

/* ── Standings ─────────────────────────────────────────────── */

const MAX_STANDINGS = 6

const Standings = ({ positions, mySource }: { positions: RacerEntry[], mySource?: number }) => {
  const all = positions || []

  // Show up to 6: top 6, but if I'm outside them swap me into the last slot
  let shown = all.slice(0, MAX_STANDINGS)
  const me = all.find(r => r.source === mySource)
  if (me && !shown.some(r => r.source === mySource)) {
    shown = [...shown.slice(0, MAX_STANDINGS - 1), me]
  }

  return (
    <div class="standings-list">
      {shown.map(r => {
        const isMe = r.source === mySource
        return (
          <div key={r.source} class={`racer-row ${isMe ? 'is-me' : ''}`}>
            <span class="racer-pos">{r.position}</span>
            {r.nation
              ? <img class="racer-flag" src={`flags/${r.nation}.webp`} alt="" />
              : <span class="racer-flag placeholder" />}
            {r.raceNumber != null && <span class="racer-num">{r.raceNumber}</span>}
            <span class={`racer-name ${isMe ? 'is-me' : ''}`}>{r.name}</span>
            <span class="racer-gap-box">{r.gap || (isMe ? 'YOU' : '--')}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Telemetry ─────────────────────────────────────────────── */

const Telemetry = ({ data }: { data: OverlayState }) => {
  const totalCPs = data.totalCheckpoints || 0
  const cpPct = totalCPs > 0 ? ((data.checkpoint || 1) / totalCPs) * 100 : 0
  const displayTime = data.formattedTime || formatTime(data.currentLapTime || 0)

  // Total race time only matters for multi-lap races (lap races, not sprints/TT)
  const totalLapsNum = Number(data.totalLaps) || 1
  const isLapRace = totalLapsNum > 1 && !data.isTT
  const displayTotal = formatTime(data.totalRaceTime || 0)

  const displayBest = data.bestLapTime && data.bestLapTime > 0
    ? (typeof data.bestLapTime === 'string' ? data.bestLapTime : formatTime(data.bestLapTime))
    : '--:--.---'

  const displayAllTime = data.allTimeBest && data.allTimeBest > 0
    ? (typeof data.allTimeBest === 'string' ? data.allTimeBest : formatTime(data.allTimeBest))
    : '--:--.---'

  const posLabel = data.myPosition || '1'

  return (
    <div class="telemetry-hud">
      <div class="telemetry-row">
        <div class="tele-stat">LAP <span class="val">{data.lapNum || 1}/{data.totalLaps || '1'}</span></div>
        <div class="tele-stat">CP <span class="val">{data.checkpoint || 1}/{totalCPs || '?'}</span></div>
      </div>

      <div class="timer-block">
        <div class="pos-chip">
          <span class="chip-label">POS</span>
          <span class="chip-val">{posLabel}</span>
        </div>
        <div class="timer-section">
          <div class="lap-timer"><TimeDigits text={displayTime} /></div>
          {isLapRace && (
            <div class="race-timer-total">
              <span class="rtt-label">TOTAL</span>
              <span class="rtt-value"><TimeDigits text={displayTotal} /></span>
            </div>
          )}
          {data.delta !== undefined && (
            <div class={`delta-pill ${data.delta <= 0 ? 'faster' : 'slower'}`}>
              {data.delta <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              <span>{data.delta <= 0 ? '' : '+'}{data.delta.toFixed(3)}</span>
            </div>
          )}
        </div>
      </div>

      <div class="cp-bar">
        <div class="cp-bar-fill" style={{ width: `${cpPct}%` }} />
      </div>

      <div class="best-laps-container">
        <div class="best-tag pb">PB: {displayBest}</div>
        <div class="best-tag tr">RECORD: {displayAllTime}</div>
      </div>
    </div>
  )
}

/* ── CP Distance Pill ──────────────────────────────────────── */

interface CPWaypoint { dist: number; onScreen: boolean; x: number; y: number }

// The "Next CP" pill projected into 3D space — anchored on the checkpoint via
// screen coords (x/y are 0..1), with a stem line pointing down to the CP point.
const CPWaypointBillboard = ({ wp }: { wp: CPWaypoint }) => {
  if (!wp || !wp.onScreen || !wp.dist || wp.dist <= 0) return null
  const close = wp.dist < 80
  const urgent = wp.dist < 30
  // GPU-composited transform (no left/top layout thrash) = rock-steady tracking
  const style = {
    transform: `translate3d(${(wp.x * 100).toFixed(3)}vw, ${(wp.y * 100).toFixed(3)}vh, 0)`,
  }
  return (
    <div class="cp-wp" style={style}>
      <div class={`cp-wp-inner${close ? ' close' : ''}${urgent ? ' urgent' : ''}`}>
        <div class="cp-chip">
          <span class="cp-chip-val">{wp.dist}</span>
          <span class="cp-chip-unit">m</span>
        </div>
        <div class="cp-wp-stem" />
        <div class="cp-wp-dot" />
      </div>
    </div>
  )
}

/* ── Warmup panel (modular tiles, top-center) ──────────────── */

interface WarmupState {
  remaining: number
  total: number
  track?: string
  class?: string
  gridPos?: number
}

const WarmupPanel = ({ wu }: { wu: WarmupState }) => {
  if (!wu || wu.remaining <= 0) return null
  const pct = wu.total > 0 ? (wu.remaining / wu.total) * 100 : 0
  return (
    <div class="warmup-panel">
      <div class="wu-grid">
        <div class="wu-tile wu-title">
          <span class="wu-label">Warm-up</span>
          <span class="wu-value accent">{wu.remaining}s</span>
        </div>
        <div class="wu-tile">
          <span class="wu-label">Track</span>
          <span class="wu-value sm">{wu.track || '—'}</span>
        </div>
        <div class="wu-tile">
          <span class="wu-label">Class</span>
          <span class="wu-value sm">{wu.class || '—'}</span>
        </div>
        <div class="wu-tile">
          <span class="wu-label">Grid</span>
          <span class="wu-value sm">#{wu.gridPos || 0}</span>
        </div>
      </div>
      <div class="wu-bar"><div class="wu-bar-fill" style={{ width: `${pct}%` }} /></div>
      <div class="wu-hint">Practice the track — race starts when the timer ends</div>
    </div>
  )
}

/* ── Lobby pill (bottom-center: join / queued / next race) ─── */

interface LobbyState {
  mode: 'hidden' | 'join' | 'queued' | 'intermission'
  queueCount?: number
  queuePos?: number
  seconds?: number
}

const LobbyPill = ({ lb }: { lb: LobbyState }) => {
  if (!lb || lb.mode === 'hidden') return null
  return (
    <div class={`lobby-pill ${lb.mode}`}>
      {lb.mode === 'join' && (
        <>
          <span class="lp-key">E</span>
          <span class="lp-text">JOIN RACE</span>
          {(lb.seconds ?? 0) > 0 && <span class="lp-timer">{lb.seconds}s</span>}
          {(lb.queueCount ?? 0) > 0 && <span class="lp-sub">{lb.queueCount} in queue</span>}
        </>
      )}
      {lb.mode === 'queued' && (
        <>
          <span class="lp-dot" />
          <span class="lp-text">IN QUEUE</span>
          {(lb.seconds ?? 0) > 0 && <span class="lp-timer">{lb.seconds}s</span>}
          <span class="lp-sub">#{lb.queuePos || 1} · {lb.queueCount || 1} waiting</span>
          <span class="lp-sub"><span class="lp-key sm">E</span> leave</span>
        </>
      )}
      {lb.mode === 'intermission' && (
        <>
          <span class="lp-text">NEXT RACE IN</span>
          <span class="lp-timer">{lb.seconds ?? 0}s</span>
          <span class="lp-sub"><span class="lp-key sm">E</span> join</span>
        </>
      )}
    </div>
  )
}

/* ── Post-Race Stats ───────────────────────────────────────── */

const PostRace = ({ data, autoClose }: { data: any, autoClose: number, onDismiss: () => void }) => {
  const pos = data.position || 1
  const suffix = typeof pos === 'number' ? posSuffix(pos) : ''
  const iRDelta = data.iRatingDelta || 0
  const srDelta = data.safetyRatingDelta || 0
  const podiumClass = typeof pos === 'number' && pos <= 3 ? `podium-${pos}` : 'podium-other'
  const srStr = srDelta.toFixed ? srDelta.toFixed(2) : srDelta

  return (
    <div class="results-toast">
      {/* position + track */}
      <div class={`rt-pos ${podiumClass}`}>
        <span class="rt-pos-num">{pos}</span>
        <span class="rt-pos-suffix">{suffix}</span>
      </div>

      <div class="rt-head rt-box">
        <span class="rt-eyebrow">Finished</span>
        <span class="rt-track">{data.trackName || 'Race Complete'}</span>
      </div>

      {/* times */}
      <div class="rt-metric rt-box">
        <span class="rt-label">Finish</span>
        <span class="rt-val">{data.finishTime || '--'}</span>
      </div>
      <div class="rt-metric rt-box">
        <span class="rt-label">Best Lap</span>
        <span class="rt-val">{data.bestLap || '--'}</span>
      </div>

      {/* deltas */}
      <div class="rt-metric rt-box">
        <span class="rt-label">iRating</span>
        <span class={`rt-delta ${iRDelta >= 0 ? 'pos' : 'neg'}`}>{iRDelta >= 0 ? '+' : ''}{iRDelta}</span>
      </div>
      <div class="rt-metric rt-box">
        <span class="rt-label">Safety</span>
        <span class={`rt-delta ${srDelta >= 0 ? 'pos' : 'neg'}`}>{srDelta >= 0 ? '+' : ''}{srStr}</span>
      </div>

      {/* clean race / incidents */}
      <div class="rt-metric rt-box">
        <span class="rt-label">Race</span>
        {data.cleanRace
          ? <span class="rt-clean">CLEAN</span>
          : <span class="rt-incidents">{data.incidents || 0} incident{(data.incidents || 0) === 1 ? '' : 's'}</span>}
      </div>

      {data.levelUp && <div class="rt-levelup">LEVEL UP</div>}

      {/* dismiss */}
      <div class="rt-tail rt-box">
        <span class="rt-hint"><KeyCap>⌫</KeyCap></span>
        <span class="rt-timer">{autoClose}s</span>
        <div class="rt-progress"><div class="rt-progress-fill" style={{ width: `${(autoClose / 12) * 100}%` }} /></div>
      </div>
    </div>
  )
}

/* ── Main App ──────────────────────────────────────────────── */

export function App() {
  const [showCountdown, setShowCountdown] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const [countdown, setCountdown] = useState<any>({})
  const [overlay, setOverlay] = useState<OverlayState>({})
  const [postRace, setPostRace] = useState<any>(null)
  const [autoClose, setAutoClose] = useState(12)
  const [cpDist, setCpDist] = useState(0)
  const [cpWp, setCpWp] = useState<CPWaypoint>({ dist: 0, onScreen: false, x: 0.5, y: 0.5 })
  const [warmup, setWarmup] = useState<WarmupState>({ remaining: 0, total: 0 })
  const [lobby, setLobby] = useState<LobbyState>({ mode: 'hidden' })
  const [sectors, setSectors] = useState<(SectorEntry | null)[]>([null, null, null])
  const [split, setSplit] = useState<{ delta: number | null; cp: number; total: number; key: number } | null>(null)
  const [showStandings, setShowStandings] = useState(true)

  // Auto-hide the split delta a few seconds after each crossing
  useEffect(() => {
    if (!split) return
    const t = setTimeout(() => setSplit(null), 3200)
    return () => clearTimeout(t)
  }, [split?.key])

  const autoCloseRef = useRef<any>(null)
  const raceTimerRef = useRef<any>(null)
  const overlayRef = useRef<OverlayState>({})
  const raceStartRef = useRef<number>(0)
  const lapStartRef = useRef<number>(0)
  const showStatsRef = useRef(false)

  /* Client-side race timer — runs in race mode (not TT).
     Tracks two separate clocks:
       • lapStartRef  — resets every lap → drives currentLapTime
       • raceStartRef — set once on race start → drives totalRaceTime  */
  const startRaceTimer = () => {
    if (raceTimerRef.current) return
    const now = performance.now()
    lapStartRef.current = now
    if (raceStartRef.current === 0) raceStartRef.current = now
    raceTimerRef.current = setInterval(() => {
      const t = performance.now()
      const lap = t - lapStartRef.current
      const total = t - raceStartRef.current
      overlayRef.current = { ...overlayRef.current, currentLapTime: lap, totalRaceTime: total }
      setOverlay({ ...overlayRef.current })
    }, 50)
  }

  const stopRaceTimer = () => {
    if (raceTimerRef.current) {
      clearInterval(raceTimerRef.current)
      raceTimerRef.current = null
      raceStartRef.current = 0   // reset so next race starts fresh
    }
  }

  const resetLapTimer = () => {
    lapStartRef.current = performance.now()
  }

  const dismissStats = () => {
    if (autoCloseRef.current) clearInterval(autoCloseRef.current)
    post('tt_dismissResults')
    showStatsRef.current = false
    setShowStats(false)
    setPostRace(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && showStatsRef.current) dismissStats()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const merge = (patch: Partial<OverlayState>) => {
    const next: OverlayState = { ...overlayRef.current, ...patch }
    // preserve totalCheckpoints across updates (only sent once on spawn)
    if (!patch.totalCheckpoints && overlayRef.current.totalCheckpoints) {
      next.totalCheckpoints = overlayRef.current.totalCheckpoints
    }
    if (!patch.allTimeBest && overlayRef.current.allTimeBest) {
      next.allTimeBest = overlayRef.current.allTimeBest
    }
    overlayRef.current = next
    setOverlay({ ...next })
  }

  useEffect(() => {
    if (typeof GetParentResourceName === 'undefined') {
      import('./mockdata').then(m => {
        setCountdown(m.MOCK_RACE_DATA.countdown)
        setShowCountdown(true)

        setOverlay(m.MOCK_RACE_DATA.overlay)
        setShowOverlay(true)

        setPostRace(m.MOCK_RACE_DATA.postRace)
        showStatsRef.current = true
        setShowStats(true)
      })
      return
    }

    const handler = (e: MessageEvent) => {
      const { action, data = {} } = e.data ?? {}
      if (!action) return

      switch (action) {

        case 'countdown':
          setCountdown(data)
          setShowCountdown(true)
          if (data.laps || data.totalCheckpoints) {
            merge({
              totalLaps: data.laps || overlayRef.current.totalLaps,
              totalCheckpoints: data.totalCheckpoints ? Number(data.totalCheckpoints) : overlayRef.current.totalCheckpoints,
              myPosition: data.gridPos || overlayRef.current.myPosition || '1',
            })
          }
          if (data.isGo) {
            setTimeout(() => setShowCountdown(false), 1500)
            setShowOverlay(true)
            startRaceTimer()
          }
          break

        case 'raceOverlay': {
          if (data.visible === false) {
            setShowOverlay(false)
            stopRaceTimer()
            break
          }
          const tcps = data.totalCheckpoints
            ? Number(data.totalCheckpoints)
            : overlayRef.current.totalCheckpoints
          // Capture the previous lap BEFORE merge overwrites it, so we can
          // detect a new lap and reset the per-lap (big) timer. Without this
          // the lap timer never resets and drifts into whole-race time.
          const prevLap = overlayRef.current.lapNum
          const patch: Partial<OverlayState> = {
            ...data,
            formattedTime: undefined,
            isTT: false,
            totalCheckpoints: tcps,
            positions: data.positions || overlayRef.current.positions,
            mySource: data.mySource || overlayRef.current.mySource,
            totalLaps: data.totalLaps || overlayRef.current.totalLaps,
            lapNum: data.lapNum || overlayRef.current.lapNum,
            checkpoint: data.checkpoint || overlayRef.current.checkpoint,
          }
          // The clocks belong to the local interval. If a payload is ever
          // allowed to write them the two epochs disagree and the seconds
          // digit flickers between them, so drop them from every patch.
          delete patch.currentLapTime
          delete patch.totalRaceTime

          const myEntry = (patch.positions || []).find((r: any) => r.source === patch.mySource)
          patch.myPosition = myEntry?.position || data.myPosition || overlayRef.current.myPosition || '1'
          merge(patch)
          setShowOverlay(true)
          if (!raceTimerRef.current) startRaceTimer()

          if (data.lapNum && data.lapNum !== prevLap) {
            resetLapTimer()
          }
          break
        }


        case 'tt_timer':
          merge({ formattedTime: data.formatted, isTT: true })
          setShowOverlay(true)
          break

        case 'tt_hud_show':
          overlayRef.current = {
            lapNum: 1,
            totalLaps: '∞',
            checkpoint: data.cpIndex || 1,
            totalCheckpoints: data.cpTotal ? Number(data.cpTotal) : undefined,
            bestLapTime: data.bestLap || 0,
            formattedTime: '00:00.000',
            myPosition: 'TT',
            isTT: true,
          }
          setOverlay({ ...overlayRef.current })
          setShowOverlay(true)
          break

        case 'tt_lap_started':
          merge({
            lapNum: data.lap,
            bestLapTime: data.bestLap || overlayRef.current.bestLapTime,
          })
          break

        case 'tt_next_cp':
          merge({
            checkpoint: data.cpIndex,
            totalCheckpoints: data.total ? Number(data.total) : overlayRef.current.totalCheckpoints,
          })
          break

        case 'postRaceStats':
          stopRaceTimer()
          setPostRace(data)
          setAutoClose(12)
          showStatsRef.current = true
          setShowStats(true)
          if (autoCloseRef.current) clearInterval(autoCloseRef.current)
          autoCloseRef.current = setInterval(() => {
            setAutoClose(prev => {
              if (prev <= 1) { dismissStats(); return 0 }
              return prev - 1
            })
          }, 1000)
          break

        case 'sector': {
          const idx = (data.sector || 1) - 1
          if (idx < 0 || idx > 2) break
          setSectors((prev) => {
            const next = [...prev]
            next[idx] = { time: data.time || 0, colour: data.colour || 'yellow', delta: data.delta }
            return next
          })
          break
        }

        case 'sectorReset':
          setSectors([null, null, null])
          break

        case 'splitDelta':
          setSplit({
            delta: data.delta ?? null,
            cp: data.cp ?? 0,
            total: data.total ?? 0,
            key: Date.now(),
          })
          break

        case 'cpDistUpdate':
          setCpDist(data.dist ?? 0)
          break

        case 'cpWaypoint':
          setCpWp({
            dist: data.dist ?? 0,
            onScreen: !!data.onScreen,
            x: data.x ?? 0.5,
            y: data.y ?? 0.5,
          })
          break

        case 'warmup':
          setWarmup({
            remaining: data.remaining ?? 0,
            total: data.total ?? 0,
            track: data.track,
            class: data.class,
            gridPos: data.gridPos,
          })
          break

        case 'warmupEnd':
          setWarmup({ remaining: 0, total: 0 })
          break

        case 'lobby':
          setLobby({
            mode: data.mode ?? 'hidden',
            queueCount: data.queueCount,
            queuePos: data.queuePos,
            seconds: data.seconds,
          })
          break

        case 'standingsToggle':
          setShowStandings(s => !s)
          break

        case 'dismissStats':
          dismissStats()
          break

        case 'tt_hide':
        case 'hideAll':
          stopRaceTimer()
          if (autoCloseRef.current) clearInterval(autoCloseRef.current)
          showStatsRef.current = false
          setCpDist(0)
          setShowOverlay(false)
          setShowCountdown(false)
          setShowStats(false)
          setWarmup({ remaining: 0, total: 0 })
          break
      }
    }

    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      stopRaceTimer()
      if (autoCloseRef.current) clearInterval(autoCloseRef.current)
    }
  }, [])

  return (
    <div class="nui-root" style="background: transparent !important; pointer-events: none;">
      {showCountdown && (
        <div class="countdown-container">
          <div class={`countdown-box ${countdown.isGo ? 'is-go' : ''}`}>
            {countdown.isGo ? 'GO!' : countdown.number}
          </div>
        </div>
      )}

      {showOverlay && (
        <div class="hud-layer">
          {/* Left column: standings with the sector strip docked under it.
              Hiding the list (Z) lets the strip slide up to the top slot. */}
          <div class="hud-left">
            {showStandings && <Standings positions={overlay.positions || []} mySource={overlay.mySource} />}
            <SectorStrip sectors={sectors} />
          </div>
          <Telemetry data={overlay} />
        </div>
      )}

      {showOverlay && !overlay.isTT && (
        <CPWaypointBillboard wp={cpWp} />
      )}

      {split && <SplitDelta s={split} />}

      <WarmupPanel wu={warmup} />
      <LobbyPill lb={lobby} />

      {showStats && postRace && (
        <PostRace data={postRace} autoClose={autoClose} onDismiss={dismissStats} />
      )}
    </div>
  )
}
