import { useState, useEffect, useRef } from 'preact/hooks'
import { Trophy, TrendingUp, TrendingDown, ChevronRight } from 'lucide-preact'
import './styles/app.css'

const RESOURCE = GetParentResourceName()

function post(action: string, data: object = {}) {
  fetch(`https://${RESOURCE}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {})
}

function formatTime(ms: number) {
  if (!ms || ms <= 0) return '00:00.000'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const t = Math.floor(ms % 1000)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${t.toString().padStart(3, '0')}`
}

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
  currentLapTime?: number
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
  const totalCPs  = data.totalCheckpoints || 0
  const cpPct     = totalCPs > 0 ? ((data.checkpoint || 1) / totalCPs) * 100 : 0
  const displayTime = data.formattedTime || formatTime(data.currentLapTime || 0)
  const displayBest = typeof data.bestLapTime === 'string' ? data.bestLapTime : formatTime(data.bestLapTime || 0)
  const posLabel  = data.myPosition || '1'

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
        <div class="lap-timer">{displayTime}</div>
        {data.delta !== undefined && (
          <div class={`delta-tag ${data.delta <= 0 ? 'faster' : 'slower'}`}>
            {data.delta <= 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {data.delta <= 0 ? '' : '+'}{data.delta.toFixed(3)}
          </div>
        )}
      </div>

      <div class="cp-bar">
        <div class="cp-bar-fill" style={{ width: `${cpPct}%` }} />
      </div>

      <div class="best-tag">⏱ BEST: {displayBest}</div>
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
  const pos     = data.position || 1
  const suffix  = posSuffix(pos)
  const iRDelta = data.iRatingDelta || 0
  const xpProg  = Math.min(1, Math.max(0, data.xpNewProgress || 0))
  const srDelta = data.srDelta || 0

  return (
    <div class="stats-overlay" style={{ pointerEvents: 'auto' }}>
      <div class="post-race-card">
        <div class="race-hero">
          <div>
            <span class="pos-giant">{pos}</span>
            <span class="pos-suffix">{suffix}</span>
          </div>
          <div class="hero-right">
            <div class="hero-eyebrow">Race Complete</div>
            <div class="hero-track">{data.trackName || 'Unknown Track'}</div>
          </div>
        </div>

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

        <div class="prog-block">
          <div class="prog-row">
            <div class="prog-label">XP</div>
            <div class="prog-bar-wrap">
              <div class="prog-bar-fill" style={{ width: `${xpProg * 100}%` }} />
            </div>
            <div class={`prog-delta ${(data.xpGained || 0) >= 0 ? 'pos' : 'neg'}`}>
              +{data.xpGained || 0}
            </div>
          </div>
        </div>

        <div class="rating-row">
          <div class="rating-cell">
            <span class="rating-cell-label">iRATING</span>
            <span class={`rating-cell-val ${iRDelta >= 0 ? 'pos' : 'neg'}`}>
              {iRDelta >= 0 ? '+' : ''}{iRDelta}
            </span>
          </div>
          <div class="rating-cell">
            <span class="rating-cell-label">SAFETY RATING</span>
            <span class={`rating-cell-val ${srDelta >= 0 ? 'pos' : 'neg'}`}>
              {srDelta >= 0 ? '+' : ''}{srDelta.toFixed ? srDelta.toFixed(2) : srDelta}
            </span>
          </div>
        </div>

        <div class="stats-footer">
          <span class="auto-close-label">Closing in {autoClose}s</span>
          <span class="key-hint"><KeyCap>⌫ Backspace</KeyCap> to dismiss</span>
        </div>
      </div>
    </div>
  )
}

/* ── Main App ──────────────────────────────────────────────── */

export function App() {
  const [showCountdown, setShowCountdown] = useState(false)
  const [showOverlay,   setShowOverlay]   = useState(false)
  const [showTTMenu,    setShowTTMenu]    = useState(false)
  const [showStats,     setShowStats]     = useState(false)

  const [countdown,  setCountdown]  = useState<any>({})
  const [overlay,    setOverlay]    = useState<OverlayState>({})
  const [ttMenu,     setTTMenu]     = useState<any[]>([])
  const [postRace,   setPostRace]   = useState<any>(null)
  const [autoClose,  setAutoClose]  = useState(12)

  const autoCloseRef  = useRef<any>(null)
  const raceTimerRef  = useRef<any>(null)
  const overlayRef    = useRef<OverlayState>({})
  const raceStartRef  = useRef<number>(0)
  const lapStartRef   = useRef<number>(0)
  const showStatsRef  = useRef(false)

  /* Client-side race timer — runs in race mode (not TT) */
  const startRaceTimer = () => {
    if (raceTimerRef.current) return
    lapStartRef.current = performance.now()
    raceTimerRef.current = setInterval(() => {
      const elapsed = performance.now() - lapStartRef.current
      overlayRef.current = { ...overlayRef.current, currentLapTime: elapsed }
      setOverlay({ ...overlayRef.current })
    }, 50)
  }

  const stopRaceTimer = () => {
    if (raceTimerRef.current) {
      clearInterval(raceTimerRef.current)
      raceTimerRef.current = null
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
    overlayRef.current = next
    setOverlay({ ...next })
  }

  useEffect(() => {
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

          if (data.lapNum && data.lapNum !== overlayRef.current.lapNum) {
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

        case 'tt_hide':
        case 'hideAll':
          stopRaceTimer()
          if (autoCloseRef.current) clearInterval(autoCloseRef.current)
          showStatsRef.current = false
          setShowOverlay(false)
          setShowCountdown(false)
          setShowTTMenu(false)
          setShowStats(false)
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
