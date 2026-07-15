import { useState, useEffect, useRef } from 'preact/hooks'
import { Trophy, TrendingUp, TrendingDown, ChevronRight } from 'lucide-preact'
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
}

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

const Standings = ({ positions, mySource }: { positions: RacerEntry[], mySource?: number }) => (
  <div class="standings-list">
    {(positions || []).map(r => {
      const isMe = r.source === mySource
      return (
        <div key={r.source} class={`racer-card ${isMe ? 'is-me' : ''}`}>
          <div class="racer-pos">
            {r.position === 1 ? <Trophy size={13} class="p1-icon" /> : r.position}
          </div>
          <div class="racer-avatar">
            <img src={r.avatar || 'https://raw.githubusercontent.com/SPiceZ21/spz-core-media-kit/main/Extra/nametag_profile.png'} alt="" />
          </div>
          <div class="racer-details">
            <div class="racer-top">
              <span class={`racer-name ${isMe ? 'is-me' : ''}`}>{r.name}</span>
            </div>
            <span class="racer-gap">{r.gap || (isMe ? 'YOU' : '--')}</span>
          </div>
        </div>
      )
    })}
  </div>
)

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
  const style = { left: `${wp.x * 100}%`, top: `${wp.y * 100}%` }
  return (
    <div class="cp-wp" style={style}>
      <div class={`cp-dist-pill${close ? ' close' : ''}${urgent ? ' urgent' : ''}`}>
        <span class="cp-dist-label">Next CP</span>
        <div class="cp-dist-body">
          <span class="cp-dist-arrow">▲</span>
          <span class="cp-dist-val">{wp.dist}</span>
          <span class="cp-dist-unit">m</span>
        </div>
      </div>
      <div class="cp-wp-stem" />
      <div class="cp-wp-dot" />
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

/* ── TT Track Menu ─────────────────────────────────────────── */

type FilterType = 'all' | 'circuit' | 'sprint'

const TTMenu = ({ tracks, onSelect, onClose }: {
  tracks: any[]
  onSelect: (t: any, i: number) => void
  onClose: () => void
}) => {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const visible = tracks.filter(t => {
    const typeMatch = filter === 'all' || (t.type || '').toLowerCase() === filter
    const nameMatch = !search || (t.name || '').toLowerCase().includes(search.toLowerCase())
    return typeMatch && nameMatch
  })

  return (
    <div class="menu-overlay" style={{ pointerEvents: 'auto' }}>
      <div class="tt-menu-card">
        <div class="tt-menu-header">
          <div class="tt-menu-eyebrow">SPiceZ Racing</div>
          <div class="tt-menu-title">TIME TRIALS</div>
          <div class="tt-filters">
            {(['all', 'circuit', 'sprint'] as FilterType[]).map(f => (
              <button key={f} class={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <input
              class="tt-search"
              type="text"
              placeholder="Search tracks..."
              value={search}
              onInput={(e: any) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div class="tt-track-count">{visible.length} track{visible.length !== 1 ? 's' : ''}</div>

        <div class="tt-track-list">
          {visible.map((t: any, i: number) => {
            const typeKey = (t.type || 'circuit').toLowerCase()
            return (
              <div key={i} class="track-item" onClick={() => onSelect(t, i)}>
                <div class={`track-type-dot ${typeKey}`} />
                <div class="track-info">
                  <div class="track-name">{t.name}</div>
                  {t.laps && <div class="track-sub">{t.laps} laps · {t.length || '—'}</div>}
                </div>
                <div class={`track-badge ${typeKey}`}>{t.type || 'Circuit'}</div>
                <ChevronRight size={14} />
              </div>
            )
          })}
          {visible.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
              No tracks match
            </div>
          )}
        </div>

        <div class="tt-menu-footer">
          <button class="tt-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ── Post-Race Stats ───────────────────────────────────────── */

const PostRace = ({ data, autoClose, onDismiss }: { data: any, autoClose: number, onDismiss: () => void }) => {
  const pos = data.position || 1
  const suffix = typeof pos === 'number' ? posSuffix(pos) : ''
  const iRDelta = data.iRatingDelta || 0
  const srDelta = data.safetyRatingDelta || 0

  // Determine podium class for styling highlights
  const podiumClass = typeof pos === 'number' && pos <= 3 ? `podium-${pos}` : 'podium-other'

  return (
    <div class="stats-overlay" style={{ pointerEvents: 'auto' }}>
      <div class="post-race-card">
        {/* Podium Highlight Header */}
        <div class={`race-hero ${podiumClass}`}>
          <div class="race-hero-content">
            <div class="pos-block">
              <span class="pos-giant">{pos}</span>
              <span class="pos-suffix">{suffix}</span>
            </div>
            <div class="hero-right">
              <div class="hero-eyebrow">Race Complete</div>
              <div class="hero-track">{data.trackName || 'Unknown Track'}</div>
            </div>
          </div>
          <div class="card-glow-overlay" />
        </div>

        {/* Telemetry Cells (Finish Time & Best Lap) */}
        <div class="time-grid">
          <div class="time-cell">
            <div class="time-cell-label">Finish Time</div>
            <div class="time-cell-val">{data.finishTime || '--'}</div>
          </div>
          <div class="time-cell">
            <div class="time-cell-label">Best Lap</div>
            <div class="time-cell-val">{data.bestLap || '--'}</div>
          </div>
        </div>

        {/* Ratings Delta Cards (iRating & Safety Rating) */}
        <div class="rating-row">
          <div class="rating-cell-card">
            <div class="rating-cell-header">
              <span class="rating-cell-label">iRATING</span>
              {iRDelta >= 0 ? <TrendingUp size={12} class="pos-icon" /> : <TrendingDown size={12} class="neg-icon" />}
            </div>
            <span class={`rating-cell-val ${iRDelta >= 0 ? 'pos' : 'neg'}`}>
              {iRDelta >= 0 ? '+' : ''}{iRDelta}
            </span>
          </div>

          <div class="rating-cell-card">
            <div class="rating-cell-header">
              <span class="rating-cell-label">SAFETY RATING</span>
              {srDelta >= 0 ? <TrendingUp size={12} class="pos-icon" /> : <TrendingDown size={12} class="neg-icon" />}
            </div>
            <span class={`rating-cell-val ${srDelta >= 0 ? 'pos' : 'neg'}`}>
              {srDelta >= 0 ? '+' : ''}{srDelta.toFixed ? srDelta.toFixed(2) : srDelta}
            </span>
          </div>
        </div>

        {/* Progression Strip — bottom-rectangle wrapper composing XPBar + RankBar */}
        <ProgressionStrip
          xpGained={data.xpGained}
          xpNewProgress={data.xpNewProgress}
          classPointsGained={data.classPointsGained}
          cpNewProgress={data.cpNewProgress}
          level={data.level}
          levelUp={data.levelUp}
        />

        {/* Footer & Auto-Close Timeline Bar */}
        <div class="stats-footer-container">
          <div class="stats-footer">
            <span class="auto-close-label">Closing in {autoClose}s</span>
            <span class="key-hint"><KeyCap>⌫ Backspace</KeyCap> to dismiss</span>
          </div>
          <div class="timeline-bar-container">
            <div class="timeline-bar-fill" style={{ width: `${(autoClose / 12) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main App ──────────────────────────────────────────────── */

export function App() {
  const [showCountdown, setShowCountdown] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showTTMenu, setShowTTMenu] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const [countdown, setCountdown] = useState<any>({})
  const [overlay, setOverlay] = useState<OverlayState>({})
  const [ttMenu, setTTMenu] = useState<any[]>([])
  const [postRace, setPostRace] = useState<any>(null)
  const [autoClose, setAutoClose] = useState(12)
  const [cpDist, setCpDist] = useState(0)
  const [cpWp, setCpWp] = useState<CPWaypoint>({ dist: 0, onScreen: false, x: 0.5, y: 0.5 })
  const [warmup, setWarmup] = useState<WarmupState>({ remaining: 0, total: 0 })
  const [lobby, setLobby] = useState<LobbyState>({ mode: 'hidden' })

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

        setTTMenu(m.MOCK_RACE_DATA.tracks)
        setShowTTMenu(true)
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

        case 'race_timer':
          // Direct timer feed from Lua if present; otherwise client timer handles it
          merge({ currentLapTime: data.time || 0 })
          setShowOverlay(true)
          break

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

        case 'tt_open_menu': {
          const raw = data.tracks
          const tracks = Array.isArray(raw) ? raw : Object.values(raw || {})
          setTTMenu(tracks)
          setShowTTMenu(true)
          break
        }

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

        case 'tt_hide':
        case 'hideAll':
          stopRaceTimer()
          if (autoCloseRef.current) clearInterval(autoCloseRef.current)
          showStatsRef.current = false
          setCpDist(0)
          setShowOverlay(false)
          setShowCountdown(false)
          setShowTTMenu(false)
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
          <Standings positions={overlay.positions || []} mySource={overlay.mySource} />
          <Telemetry data={overlay} />
        </div>
      )}

      {showOverlay && !overlay.isTT && (
        <CPWaypointBillboard wp={cpWp} />
      )}

      <WarmupPanel wu={warmup} />
      <LobbyPill lb={lobby} />

      {showTTMenu && (
        <TTMenu
          tracks={ttMenu}
          onSelect={(t, i) => { post('tt_selectTrack', { index: t.index || i + 1 }); setShowTTMenu(false) }}
          onClose={() => { setShowTTMenu(false); post('tt_closeMenu') }}
        />
      )}

      {showStats && postRace && (
        <PostRace data={postRace} autoClose={autoClose} onDismiss={dismissStats} />
      )}
    </div>
  )
}
