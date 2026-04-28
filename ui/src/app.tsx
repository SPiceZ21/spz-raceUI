import { useState, useEffect } from 'preact/hooks'
import { 
  Trophy, 
  Flag, 
  ChevronRight, 
  Layout, 
  TrendingUp, 
  TrendingDown,
  X
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
  const t = ms % 1000
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${t.toString().padStart(3, '0')}`
}

/* ── Types ─────────────────────────────────────────────────── */

interface RacerEntry {
  source: number
  name?: string
  position: number
  gap?: string
  avatar?: string
  licenseClass?: string
}

interface RaceOverlayData {
  visible?: boolean
  positions?: RacerEntry[]
  mySource?: number
  lapNum?: number
  totalLaps?: number | string
  checkpoint?: number
  totalCheckpoints?: number | string
  bestLapTime?: any
  currentLapTime?: any
  formattedTime?: string
  delta?: number
}

/* ── HUD Components ────────────────────────────────────────── */

const Standings = ({ positions, mySource }: { positions: RacerEntry[], mySource?: number }) => (
  <div className="standings-list">
    {positions.map(r => {
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
  const cpProgress = (typeof data.totalCheckpoints === 'number' && data.totalCheckpoints > 0) 
    ? ((data.checkpoint || 1) / data.totalCheckpoints) * 100 
    : 0
  
  const displayTime = data.formattedTime || formatTime(data.currentLapTime || 0)
  const displayBest = typeof data.bestLapTime === 'string' ? data.bestLapTime : formatTime(data.bestLapTime || 0)

  return (
    <div className="telemetry-hud">
      <div className="telemetry-top">
        <div className="stat-group">
          <Flag size={12} />
          <span className="val">LAP {data.lapNum || 1}/{data.totalLaps || '?'}</span>
        </div>
        <div className="stat-group">
          <Layout size={12} />
          <span className="val">CP {data.checkpoint || 1}/{data.totalCheckpoints || '?'}</span>
        </div>
      </div>

      <div className="timer-main">
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

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const { action, data = {} } = e.data ?? {}
      if (!action) return

      switch (action) {
        case 'countdown':
          setCountdown(data)
          setView('countdown')
          if (data.isGo) setTimeout(() => setView('none'), 1500)
          break

        case 'raceOverlay':
          if (data.visible === false) setView('none')
          else {
            setOverlay(prev => ({ ...prev, ...data }))
            setView('overlay')
          }
          break

        // Time Trial Specific Handlers
        case 'tt_timer':
          setOverlay(prev => ({ ...prev, formattedTime: data.formatted }))
          setView('overlay')
          break

        case 'tt_hud_show':
          setOverlay({
            lapNum: 1,
            totalLaps: data.lapTotal || '?',
            checkpoint: data.cpIndex || 1,
            totalCheckpoints: data.cpTotal || '?',
            bestLapTime: data.bestLap || 0,
            formattedTime: '00:00.000'
          })
          setView('overlay')
          break

        case 'tt_lap_started':
          setOverlay(prev => ({ 
            ...prev, 
            lapNum: data.lap, 
            bestLapTime: data.bestLap || prev.bestLapTime 
          }))
          break

        case 'tt_next_cp':
          setOverlay(prev => ({ 
            ...prev, 
            checkpoint: data.cpIndex, 
            totalCheckpoints: data.total || prev.totalCheckpoints 
          }))
          break

        case 'tt_lap_complete':
          setOverlay(prev => ({ 
            ...prev, 
            bestLapTime: data.bestLap,
            lapNum: data.lapNum + 1,
            checkpoint: 1
          }))
          break

        case 'postRaceStats':
          setPostRace(data)
          setView('poststats')
          break

        case 'tt_open_menu':
          setTTMenu(data.tracks || [])
          setView('tt_menu')
          break

        case 'tt_hide':
          setView('none')
          break

        case 'hideAll':
          setView('none')
          break
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return (
    <div className="nui-root">
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
              {ttMenu.map((t, i) => (
                <div key={i} className="track-item" onClick={() => post('tt_selectTrack', { index: i + 1 })}>
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
          <Card className="post-race-card">
             <div className="podium-badge">RACE COMPLETE</div>
             <div className="finish-pos">{postRace.position}<span>{postRace.position === 1 ? 'ST' : 'RD'}</span></div>
             <div className="track-title">{postRace.trackName}</div>
             
             <div className="stats-grid">
               <div className="stat-item"><span className="label">FINISH TIME</span><span className="val">{postRace.finishTime}</span></div>
               <div className="stat-item"><span className="label">BEST LAP</span><span className="val">{postRace.bestLap}</span></div>
             </div>

             <div className="progression">
               <div className="row"><span>XP GAINED</span><span className="gain">+{postRace.xpGained}</span></div>
               <div className="bar"><div className="fill" style={{width: `${(postRace.xpNewProgress || 0) * 100}%`}}/></div>
             </div>

             <Button className="w-full mt-24" onClick={() => post('dismissStats')}>CONTINUE</Button>
          </Card>
        </div>
      )}
    </div>
  )
}
