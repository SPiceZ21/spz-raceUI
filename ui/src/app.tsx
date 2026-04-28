import { useState, useEffect } from 'preact/hooks'
import { 
  Trophy, 
  Timer as TimerIcon, 
  Flag, 
  ChevronRight, 
  Layout, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  X
} from 'lucide-preact'
import { Button } from './components/Button'
import './app.css'

const RESOURCE = GetParentResourceName()

function post(action: string, data: object = {}) {
  fetch(`https://${RESOURCE}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {})
}

function formatTime(ms: number) {
  if (!ms || ms === 0) return "00:00.000"
  const m = math.floor(ms / 60000)
  const s = math.floor((ms % 60000) / 1000)
  const t = ms % 1000
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${t.toString().padStart(3, '0')}`
}

const math = Math; // Alias for consistency with Lua logic if needed

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
  avatar?: string
  isMe?: boolean
  isBestLap?: boolean
}

interface SectorTime {
  id: number
  time: number
  delta?: number
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
  currentLapTime?: number
  delta?: number
  lastSector?: SectorTime
  sectors?: SectorTime[]
}

interface TimeTrialData {
  visible?: boolean
  track?: string
  trackType?: string
  lapLabel?: string
  bestLap?: string
  currentTimer?: string
  cpIndex?: number
  cpTotal?: number
  restartKey?: string
  allLaps?: { lapNum: number; label: string; time: string; isBest: boolean }[]
  tracks?: { name: string; type: string; id: number }[]
}

/* ── Components ─────────────────────────────────────────────── */

const Countdown = ({ data }: { data: CountdownData }) => (
  <div className="countdown-container">
    <div className={`countdown-box ${data.isGo ? 'is-go' : ''}`}>
      {data.isGo ? 'GO!' : data.number}
    </div>
    {!data.isGo && data.track && (
      <div className="countdown-info">
        <div className="track-name">{data.track}</div>
        <div className="race-meta">
          <span>{data.class} CLASS</span>
          <div className="dot" />
          <span>{data.laps} LAPS</span>
          <div className="dot" />
          <span>GRID P{data.gridPos}/{data.total}</span>
        </div>
      </div>
    )}
  </div>
)

const Standings = ({ positions, mySource }: { positions: RacerEntry[], mySource?: number }) => (
  <div className="standings-list">
    {positions.map(r => {
      const isMe = r.source === mySource
      return (
        <div key={r.source} className={`racer-card ${isMe ? 'is-me' : ''}`}>
          <div className="racer-pos">{r.position}</div>
          <div className="racer-avatar">
             <img src={r.avatar || 'https://raw.githubusercontent.com/SPiceZ21/spz-core-media-kit/main/Extra/nametag_profile.png'} alt="" />
          </div>
          <div className="racer-details">
            <span className="name">{r.name}</span>
            <span className="gap">{r.gap || '--'}</span>
          </div>
        </div>
      )
    })}
  </div>
)

const Telemetry = ({ data }: { data: RaceOverlayData }) => {
  const cpProgress = data.totalCheckpoints ? ((data.checkpoint || 1) / data.totalCheckpoints) * 100 : 0
  
  return (
    <div className="telemetry-hud">
      <div className="telemetry-top">
        <div className="stat-group">
          <Flag size={14} />
          <span className="label">LAP</span>
          <span className="value">{data.lapNum || 1} / {data.totalLaps || '?'}</span>
        </div>
        <div className="stat-group">
          <Layout size={14} />
          <span className="label">CP</span>
          <span className="value">{data.checkpoint || 1} / {data.totalCheckpoints || '?'}</span>
        </div>
      </div>

      <div className="timer-main">
        <div className="lap-timer">{formatTime(data.currentLapTime || 0)}</div>
        {data.delta !== undefined && (
          <div className={`delta-tag ${data.delta <= 0 ? 'faster' : 'slower'}`}>
            {data.delta <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {data.delta <= 0 ? '' : '+'}{data.delta.toFixed(3)}s
          </div>
        )}
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${cpProgress}%` }} />
      </div>

      <div className="telemetry-bottom">
        <div className="best-lap">
          <Trophy size={12} />
          BEST: {formatTime(data.bestLapTime || 0)}
        </div>
      </div>
    </div>
  )
}

const SectorFeed = ({ sectors }: { sectors?: SectorTime[] }) => (
  <div className="sector-feed">
    <div className="header">SECTORS</div>
    {sectors?.slice(-4).reverse().map((s, i) => (
      <div key={i} className="sector-row">
        <span>S{s.id}</span>
        <span className={s.delta && s.delta <= 0 ? 'text-success' : 'text-danger'}>
          {formatTime(s.time)}
        </span>
      </div>
    ))}
  </div>
)

/* ── Root App ──────────────────────────────────────────────── */

type ActiveView = 'none' | 'countdown' | 'overlay' | 'poststats' | 'tt_menu' | 'tt_results'

export function App() {
  const [view, setView]             = useState<ActiveView>('none')
  const [countdown, setCountdown]   = useState<CountdownData>({})
  const [overlay, setOverlay]       = useState<RaceOverlayData>({})
  const [ttData, setTTData]         = useState<TimeTrialData>({})
  const [postRace, setPostRace]     = useState<any>(null)
  const [cdTimer, setCdTimer]       = useState<any>(null)

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
            setOverlay(prev => ({ ...prev, ...data }))
            if (view !== 'overlay') setView('overlay')
          }
          break

        case 'postRaceStats':
          setPostRace(data)
          setView('poststats')
          break

        case 'tt_open_menu':
          setTTData({ ...ttData, tracks: data.tracks })
          setView('tt_menu')
          break

        case 'tt_hud_show':
          setTTData(prev => ({ ...prev, ...data, visible: true }))
          setView('overlay') // Reuse overlay view for TT
          break

        case 'tt_hide':
          setView('none')
          break

        case 'hideAll':
          setView('none')
          setPostRace(null)
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [view, cdTimer, ttData])

  const handleDismiss = () => {
    post('dismissStats')
    setView('none')
  }

  const selectTrack = (index: number) => {
    post('tt_selectTrack', { index })
    setView('none')
  }

  const closeMenu = () => {
    post('tt_closeMenu')
    setView('none')
  }

  return (
    <div className="nui-root">
      {view === 'countdown' && <Countdown data={countdown} />}
      
      {view === 'overlay' && (
        <div className="hud-layer">
          <Standings positions={overlay.positions || []} mySource={overlay.mySource} />
          <Telemetry data={overlay} />
          <SectorFeed sectors={overlay.sectors} />
        </div>
      )}

      {view === 'tt_menu' && (
        <div className="menu-overlay">
          <div className="tt-menu-card">
            <div className="menu-header">
              <div>
                <h2>TIME TRIALS</h2>
                <p>Select a circuit to begin practice</p>
              </div>
              <button className="close-btn" onClick={closeMenu}><X size={20}/></button>
            </div>
            <div className="track-list">
              {ttData.tracks?.map((t, i) => (
                <div key={i} className="track-item" onClick={() => selectTrack(i + 1)}>
                  <div className="track-icon"><Flag size={18}/></div>
                  <div className="track-info">
                    <span className="name">{t.name}</span>
                    <span className="type">{t.type}</span>
                  </div>
                  <ChevronRight size={16} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'poststats' && postRace && (
        <div className="stats-overlay">
          <div className="post-race-card">
            <div className="podium-badge">FINISH</div>
            <div className="finish-pos">
              {postRace.position}
              <span>{postRace.position === 1 ? 'ST' : postRace.position === 2 ? 'ND' : 'RD'}</span>
            </div>
            <h2 className="track-title">{postRace.trackName}</h2>
            
            <div className="stats-grid">
              <div className="stat-box">
                <span className="label">TOTAL TIME</span>
                <span className="val">{postRace.finishTime}</span>
              </div>
              <div className="stat-box">
                <span className="label">BEST LAP</span>
                <span className="val">{postRace.bestLap}</span>
              </div>
            </div>

            <div className="progression-section">
              <div className="prog-row">
                <span>XP GAINED</span>
                <span className="gain">+{postRace.xpGained}</span>
              </div>
              <div className="prog-bar"><div className="fill" style={{width: `${(postRace.xpNewProgress || 0) * 100}%`}}/></div>
              
              <div className="rating-row">
                <div className="rating-item">
                  <span className="label">iRATING</span>
                  <span className={postRace.iRatingDelta >= 0 ? 'pos' : 'neg'}>
                    {postRace.iRatingDelta >= 0 ? '+' : ''}{postRace.iRatingDelta}
                  </span>
                </div>
                <div className="rating-item">
                  <span className="label">SAFETY</span>
                  <span className={postRace.safetyRatingDelta >= 0 ? 'pos' : 'neg'}>
                    {postRace.safetyRatingDelta >= 0 ? '+' : ''}{postRace.safetyRatingDelta}
                  </span>
                </div>
              </div>
            </div>

            <Button className="continue-btn" onClick={handleDismiss}>CONTINUE</Button>
          </div>
        </div>
      )}
    </div>
  )
}
