import { useState, useEffect, useRef } from 'preact/hooks'
import { 
  Trophy, 
  Flag, 
  ChevronRight, 
  Layout, 
  TrendingUp, 
  TrendingDown,
  Navigation
} from 'lucide-preact'
import { Button } from './components/Button'
import { Card } from './components/Card'
import { Badge } from './components/Badge'
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
  if (!ms || ms === 0) return "00:00.000"
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const t = Math.floor(ms % 1000)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${t.toString().padStart(3, '0')}`
}

/* ── Types ─────────────────────────────────────────────────── */

interface RacerEntry {
  source: number
  name?: string
  position: number | string
  gap?: string
  avatar?: string
  licenseClass?: string
}

interface RaceOverlayData {
  visible?: boolean
  positions?: RacerEntry[]
  mySource?: number
  lapNum?: number
  totalLaps?: any
  checkpoint?: number
  totalCheckpoints?: any
  bestLapTime?: any
  currentLapTime?: any
  formattedTime?: string
  delta?: number
  myPosition?: number | string
}

/* ── HUD Components ────────────────────────────────────────── */

const Standings = ({ positions, mySource }: { positions: RacerEntry[], mySource?: number }) => (
  <div className="standings-list">
    {(positions || []).map(r => {
      const isMe = r.source === mySource
      return (
        <div key={r.source} className={`racer-card ${isMe ? 'is-me' : ''}`}>
          <div className="racer-pos">
            {r.position === 1 ? <Trophy size={14} className="p1-icon" /> : r.position}
          </div>
          <div className="racer-avatar">
             <img src={r.avatar || 'https://raw.githubusercontent.com/SPiceZ21/spz-core-media-kit/main/Extra/nametag_profile.png'} alt="" />
          </div>
          <div className="racer-details">
            <div className="racer-top">
              <span className="name">{r.name}</span>
              {r.licenseClass && <Badge variant="primary" size="sm">{r.licenseClass}</Badge>}
            </div>
            <span className="gap">{r.gap || (isMe ? 'YOU' : '--')}</span>
          </div>
        </div>
      )
    })}
  </div>
)

const Telemetry = ({ data }: { data: RaceOverlayData }) => {
  const totalCPs = data.totalCheckpoints ? parseInt(data.totalCheckpoints) : 0
  const cpProgress = (totalCPs > 0) ? ((data.checkpoint || 1) / totalCPs) * 100 : 0
  
  const displayTime = data.formattedTime || formatTime(data.currentLapTime || 0)
  const displayBest = typeof data.bestLapTime === 'string' ? data.bestLapTime : formatTime(data.bestLapTime || 0)
  const posLabel = data.myPosition || "1"

  return (
    <div className="telemetry-hud">
      <div className="telemetry-top">
        <div className="stat-group">
          <Flag size={12} />
          <span className="val">LAP {data.lapNum || 1}/{data.totalLaps || '1'}</span>
        </div>
        <div className="stat-group">
          <Layout size={12} />
          <span className="val">CP {data.checkpoint || 1}/{data.totalCheckpoints || '?'}</span>
        </div>
      </div>

      <div className="timer-main">
        <div className="pos-badge">
          <span className="label">POS</span>
          <span className="val">{posLabel}</span>
        </div>
        <div className="lap-timer">{displayTime}</div>
        {data.delta !== undefined && (
          <div className={`delta-tag ${data.delta <= 0 ? 'faster' : 'slower'}`}>
            {data.delta <= 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {data.delta <= 0 ? '' : '+'}{data.delta.toFixed(3)}
          </div>
        )}
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${cpProgress}%` }} />
      </div>

      <div className="telemetry-bottom">
         <Badge variant="warning" size="sm">
           <Trophy size={10} style={{marginRight: 4}}/> BEST: {displayBest}
         </Badge>
      </div>
    </div>
  )
}

/* ── Main App ──────────────────────────────────────────────── */

export function App() {
  const [view, setView]             = useState('none')
  const [countdown, setCountdown]   = useState<any>({})
  const [overlay, setOverlay]       = useState<RaceOverlayData>({})
  const [ttMenu, setTTMenu]         = useState<any[]>([])
  const [postRace, setPostRace]     = useState<any>(null)
  const [autoClose, setAutoClose]   = useState(12)
  const autoCloseRef = useRef<any>(null)
  
  // Use a ref to keep track of the absolute latest overlay data without triggering re-renders
  // this prevents the timer updates from losing context of the laps/checkpoints
  const overlayRef = useRef<RaceOverlayData>({})

  const dismissStats = () => {
    if (autoCloseRef.current) clearInterval(autoCloseRef.current)
    post('tt_dismissResults')
    setView('none')
    setPostRace(null)
  }

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const { action, data = {} } = e.data ?? {}
      if (!action) return

      switch (action) {
        case 'countdown':
          setCountdown(data)
          setView('countdown')
          
          if (data.laps || data.totalCheckpoints) {
            const next = {
              ...overlayRef.current,
              totalLaps: data.laps || overlayRef.current.totalLaps,
              totalCheckpoints: data.totalCheckpoints || overlayRef.current.totalCheckpoints,
              myPosition: data.gridPos || overlayRef.current.myPosition
            }
            overlayRef.current = next
            setOverlay(next)
          }

          if (data.isGo) {
            setTimeout(() => setView('none'), 1500)
            setView('overlay')
          }
          break

        case 'raceOverlay':
          if (data.visible === false) {
            setView('none')
          } else {
            const myEntry = data.positions?.find((r: any) => r.source === data.mySource || r.source === overlayRef.current.mySource)
            const next = { 
              ...overlayRef.current, 
              ...data,
              positions: data.positions || overlayRef.current.positions,
              mySource: data.mySource || overlayRef.current.mySource,
              myPosition: myEntry?.position || data.myPosition || overlayRef.current.myPosition,
              totalLaps: data.totalLaps || overlayRef.current.totalLaps,
              totalCheckpoints: data.totalCheckpoints || overlayRef.current.totalCheckpoints,
              lapNum: data.lapNum || overlayRef.current.lapNum,
              checkpoint: data.checkpoint || overlayRef.current.checkpoint,
              currentLapTime: data.currentLapTime !== undefined ? data.currentLapTime : overlayRef.current.currentLapTime
            }
            overlayRef.current = next
            setOverlay(next)
            setView('overlay')
          }
          break

        case 'tt_timer':
          const ttNext = { ...overlayRef.current, formattedTime: data.formatted }
          overlayRef.current = ttNext
          setOverlay(ttNext)
          setView('overlay')
          break

        case 'tt_hud_show':
          const ttHud = {
            lapNum: 1,
            totalLaps: '∞',
            checkpoint: data.cpIndex || 1,
            totalCheckpoints: data.cpTotal || '?',
            bestLapTime: data.bestLap || 0,
            formattedTime: '00:00.000',
            myPosition: 'TT'
          }
          overlayRef.current = ttHud
          setOverlay(ttHud)
          setView('overlay')
          break

        case 'tt_lap_started':
          const lapStart = { 
            ...overlayRef.current, 
            lapNum: data.lap, 
            bestLapTime: data.bestLap || overlayRef.current.bestLapTime 
          }
          overlayRef.current = lapStart
          setOverlay(lapStart)
          break

        case 'tt_next_cp':
          const nextCp = { 
            ...overlayRef.current, 
            checkpoint: data.cpIndex, 
            totalCheckpoints: data.total || overlayRef.current.totalCheckpoints 
          }
          overlayRef.current = nextCp
          setOverlay(nextCp)
          break

        case 'postRaceStats':
          setPostRace(data)
          setAutoClose(12)
          setView('poststats')
          
          if (autoCloseRef.current) clearInterval(autoCloseRef.current)
          autoCloseRef.current = setInterval(() => {
            setAutoClose(prev => {
              if (prev <= 1) {
                dismissStats()
                return 0
              }
              return prev - 1
            })
          }, 1000)
          break

        case 'tt_open_menu':
          setTTMenu(data.tracks || [])
          setView('tt_menu')
          break

        case 'tt_hide':
        case 'hideAll':
          if (autoCloseRef.current) clearInterval(autoCloseRef.current)
          setView('none')
          break
      }
    }
    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      if (autoCloseRef.current) clearInterval(autoCloseRef.current)
    }
  }, [])

  return (
    <div className="nui-root" style={{ background: 'transparent !important' }}>
      {view === 'countdown' && (
        <div className="countdown-container">
          <div className={`countdown-box ${countdown.isGo ? 'is-go' : ''}`}>
            {countdown.isGo ? 'GO!' : countdown.number}
          </div>
        </div>
      )}
      
      {view === 'overlay' && (
        <div className="hud-layer">
          <Standings positions={overlay.positions || []} mySource={overlay.mySource} />
          <Telemetry data={overlay} />
        </div>
      )}

      {view === 'tt_menu' && (
        <div className="menu-overlay">
          <Card title="TIME TRIALS" className="tt-menu-card">
            <div className="menu-header-desc">Select a circuit to begin practice</div>
            <div className="track-list">
              {ttMenu.map((t: any, i: number) => (
                <div key={i} className="track-item" onClick={() => post('tt_selectTrack', { index: t.index || i + 1 })}>
                  <div className="track-info">
                    <span className="name">{t.name}</span>
                    <span className="type">{t.type}</span>
                  </div>
                  <ChevronRight size={16} />
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-16" onClick={() => post('tt_closeMenu')}>CLOSE</Button>
          </Card>
        </div>
      )}

      {view === 'poststats' && postRace && (
        <div className="stats-overlay">
          <div className="post-race-card">
             <div className="podium-badge">RACE COMPLETE</div>
             <div className="finish-pos">
               {postRace.position}
               <span>{postRace.position === 1 ? 'ST' : postRace.position === 2 ? 'ND' : 'RD'}</span>
             </div>
             <div className="track-title">{postRace.trackName}</div>
             
             <div className="stats-grid">
               <div className="stat-item">
                 <span className="label">FINISH TIME</span>
                 <span className="val">{postRace.finishTime}</span>
               </div>
               <div className="stat-item">
                 <span className="label">BEST LAP</span>
                 <span className="val">{postRace.bestLap}</span>
               </div>
             </div>

             <div className="progression">
               <div className="row">
                 <span>XP GAINED</span>
                 <span className="gain">+{postRace.xpGained || 0}</span>
               </div>
               <div className="bar">
                 <div className="fill" style={{width: `${(postRace.xpNewProgress || 0) * 100}%`}}/>
               </div>
               
               <div className="row mt-8">
                 <span>iRATING DELTA</span>
                 <span className={postRace.iRatingDelta >= 0 ? 'gain' : 'loss'}>
                   {postRace.iRatingDelta >= 0 ? '+' : ''}{postRace.iRatingDelta || 0}
                 </span>
               </div>
             </div>

             <Button variant="primary" className="w-full mt-32 stats-btn" onClick={dismissStats}>
               CONTINUE ({autoClose}s)
             </Button>
          </div>
        </div>
      )}
    </div>
  )
}
