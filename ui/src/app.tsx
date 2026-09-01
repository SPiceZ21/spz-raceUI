import { useState, useEffect, useRef } from 'preact/hooks'
import {
  Flag, Trophy, MapPin, Timer, Gauge, Crown, WifiOff,
  ChevronUp, ChevronDown, Zap, ArrowUp,
} from 'lucide-preact'

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

// Base theme (server.cfg spz_theme_* convars, pushed from spz-core) mapped
// onto this page's own CSS variable names (theme.css). Unknown/missing keys
// are a no-op since the stylesheet's own defaults still apply.
const THEME_VARS: Record<string, string> = {
  accent: '--color-primary',
  accent2: '--color-secondary',
  bg: '--bg-app',
  bg2: '--bg-card',
}
// rgba(...) glows/tints reference the accent as raw components so they can
// carry their own alpha — keep those in sync too.
const THEME_RGB_VARS: Record<string, string> = { accent: '--color-primary-rgb' }
function hexToRgbTriplet(hex?: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null
}
function applyTheme(theme?: Record<string, string>) {
  if (!theme) return
  for (const key in THEME_VARS) {
    if (theme[key]) document.documentElement.style.setProperty(THEME_VARS[key], theme[key])
  }
  for (const key in THEME_RGB_VARS) {
    const rgb = theme[key] && hexToRgbTriplet(theme[key])
    if (rgb) document.documentElement.style.setProperty(THEME_RGB_VARS[key], rgb)
  }
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

/* ── HUD icons ─────────────────────────────────────────────────
   Every icon in the HUD goes through here so stroke weight and size stay
   uniform: a HUD is glanced at, and mixed line weights read as noise.
   Icons ACCOMPANY their text label, never replace it — a glyph alone costs a
   new player the meaning, and this is read at 200 km/h.
   aria-hidden throughout: the text next to it is already the label. */
const HudIcon = ({ icon: Icon, size = 12, class: cls = '' }: { icon: any, size?: number, class?: string }) => (
  <Icon size={size} strokeWidth={2.5} class={`hud-ico ${cls}`} aria-hidden="true" />
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
  gap?: string        // time behind the LEADER, e.g. "+3.41", "+1:02.88 1L"
  interval?: string   // time behind the car directly AHEAD
  avatar?: string
  licenseClass?: string
  nation?: string      // ISO 3166-1 alpha-2, lowercase
  raceNumber?: number  // 1-99
  dc?: boolean         // dropped mid-race, inside the reconnect window
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
const SplitDelta = ({ s }: { s: { delta: number | null; split?: number; cp: number; total: number; key: number } }) => {
  const d = s.delta
  // No reference lap yet (first flying lap): show the raw split time so the
  // tower is still informative, tagged REF instead of a misleading "BEST".
  const first = d == null
  const cls = first ? 'first' : d < -5 ? 'ahead' : d > 5 ? 'behind' : 'even'
  const fmtSplit = (ms?: number) => {
    if (!ms || ms <= 0) return '--.--'
    const s2 = Math.floor(ms / 1000), t = Math.floor((ms % 1000) / 10)
    return `${s2}.${t.toString().padStart(2, '0')}`
  }
  const text = first
    ? fmtSplit(s.split)
    : (d! <= 0 ? '-' : '+') + (Math.abs(d!) / 1000).toFixed(2)
  return (
    <div key={s.key} class={`split-delta ${cls}`}>
      <span class="split-cp">
        <HudIcon icon={MapPin} size={10} class="ico-split" />
        CP {s.cp}/{s.total}{first ? ' · REF LAP' : ''}
      </span>
      <span class="split-val">
        {/* Up on your reference — the one split state worth a glance */}
        {cls === 'ahead' && <HudIcon icon={Zap} size={11} class="ico-ahead" />}
        {text}
      </span>
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
  myPosition?: number | string
  isTT?: boolean
}

/* ── Key hints ──────────────────────────────────────────────
   The in-race keys, printed so a driver never has to leave the race to find
   out how to recover. Sits below the sector strip and stays up when the
   standings list is hidden — the hint for the key that brings the list back
   cannot live inside the thing it toggles.

   Values arrive from Lua: the recovery keys are owned by spz-races
   (client/recover.lua) and pushed across, the standings toggle by spz-raceUI.
   They are DEFAULT bindings; a rebind in Settings is not reflected, because
   FiveM exposes no way to read a live command binding back. */

interface KeyHints { respawn?: string; flip?: string; standings?: string; rewind?: string; results?: string }

const KeyHintBar = ({ hints, listHidden }: { hints: KeyHints, listHidden: boolean }) => {
  const items: [string | undefined, string][] = [
    [hints.standings, listHidden ? 'SHOW LIST' : 'HIDE LIST'],
    [hints.rewind, 'REWIND'],
    [hints.respawn, 'LAST CP'],
    [hints.flip, 'FLIP'],
    // Pushed by spz-leaderboard, which owns this key. Last in the strip: it is
    // the only one you press AFTER the race rather than during it.
    [hints.results, 'RESULTS'],
  ]
  const shown = items.filter(([k]) => !!k)
  if (!shown.length) return null

  return (
    <div class="key-hints">
      {shown.map(([k, label]) => (
        <span key={label} class="key-hint">
          <KeyCap>{k}</KeyCap>
          <span class="key-hint-label">{label}</span>
        </span>
      ))}
    </div>
  )
}

/* ── Standings ─────────────────────────────────────────────── */

const MAX_STANDINGS = 6

const Standings = ({ positions, mySource }: { positions: RacerEntry[], mySource?: number }) => {
  const all = positions || []

  // Previous order, kept across renders so a place gained or lost can be shown
  // as a direction rather than a number the driver has to diff themselves.
  // Ref, not state: this must never itself cause a render.
  const prevPos = useRef<Record<string, number>>({})
  const moved: Record<string, number> = {}
  for (const r of all) {
    const key = String(r.source)
    const before = prevPos.current[key]
    const now = Number(r.position)
    if (before != null && Number.isFinite(now)) moved[key] = before - now  // >0 = gained
    prevPos.current[key] = now
  }

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
        const isLeader = Number(r.position) === 1
        const delta = moved[String(r.source)] || 0
        return (
          <div key={r.source} class={`racer-row ${isMe ? 'is-me' : ''}${r.dc ? ' is-dc' : ''}`}>
            {/* ONE marker slot beside the position, not two. The name is the
                only elastic cell in the row, so every fixed column and every
                row gap comes straight out of it — two slots plus their gaps
                truncated names that fit before.
                Priority: a place just changed hands (transient, and the most
                urgent thing in the tower) outranks the crown, which is already
                implied by the "1" next to it. */}
            <span class="racer-rank">
              <span class="racer-mark">
                {delta > 0
                  ? <HudIcon icon={ChevronUp} size={11} class="ico-up" />
                  : delta < 0
                    ? <HudIcon icon={ChevronDown} size={11} class="ico-down" />
                    : isLeader
                      ? <HudIcon icon={Crown} size={11} class="ico-leader" />
                      : null}
              </span>
              <span class="racer-pos">{r.position}</span>
            </span>

            {r.nation
              ? <img class="racer-flag" src={`flags/${r.nation}.webp`} alt="" />
              : <span class="racer-flag placeholder" />}
            {r.raceNumber != null && <span class="racer-num">{r.raceNumber}</span>}

            {/* State icons live INSIDE the name cell so they cost a few px of
                the name's own space instead of another full row gap each. */}
            <span class={`racer-name ${isMe ? 'is-me' : ''}`}>
              <span class="racer-name-text">{r.name}</span>
              {/* Dropped mid-race, slot held for reconnect — explains a car
                  that stopped improving without vanishing from the tower. */}
              {r.dc && <HudIcon icon={WifiOff} size={11} class="ico-dc" />}
            </span>

            <span class="racer-gap-box">{r.gap || (isMe ? 'YOU' : '--')}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Telemetry ─────────────────────────────────────────────── */

const Telemetry = ({ data, split }: {
  data: OverlayState
  split: { delta: number | null; split?: number; cp: number; total: number; key: number } | null
}) => {
  const totalCPs = data.totalCheckpoints || 0
  const cpPct = totalCPs > 0 ? ((data.checkpoint || 1) / totalCPs) * 100 : 0
  const isFinalCP = totalCPs > 0 && (data.checkpoint || 1) >= totalCPs
  const displayTime = data.formattedTime || formatTime(data.currentLapTime || 0)

  // Total race time only matters for multi-lap races (lap races, not sprints/TT)
  const totalLapsNum = Number(data.totalLaps) || 1
  const isLapRace = totalLapsNum > 1 && !data.isTT
  const displayTotal = formatTime(data.totalRaceTime || 0)

  const displayBest = data.bestLapTime && data.bestLapTime > 0
    ? (typeof data.bestLapTime === 'string' ? data.bestLapTime : formatTime(data.bestLapTime))
    : '--.---'

  const posLabel = data.myPosition || '1'

  return (
    <div class="telemetry-hud">
      {/* Lap is the single most glanceable fact in a race — it leads. */}
      <div class="tele-head">
        <div class="lap-box">
          <HudIcon icon={Flag} size={11} class="ico-lap" />
          <span class="lap-label">LAP</span>
          <span class="lap-now">{data.lapNum || 1}</span>
          <span class="lap-of">/{data.totalLaps || 1}</span>
        </div>
        <div class="pos-chip">
          <HudIcon icon={Trophy} size={11} class="ico-pos" />
          <span class="chip-label">POS</span>
          <span class="chip-val">{posLabel}</span>
        </div>
      </div>

      {/*
        Hero clock — the CURRENT LAP time.

        The lap is what you are driving right now and the number you push
        against corner by corner, so it leads. The elapsed total sits under it
        as the supporting readout: it decides the result, but it is not the
        number you are reacting to at 200 km/h.

        Sprints and time trials have no meaningful total separate from this
        clock, so the second row does not render for them at all.
      */}
      <div class="timer-hero"><TimeDigits text={displayTime} /></div>

      {/* Checkpoint progress: the bar IS the checkpoint readout, so the count
          rides on it instead of repeating as loose text underneath.
          The pin becomes a flag on the last checkpoint — the one gate where
          "which CP is this" actually changes what you do about it. */}
      <div class="cp-track">
        <div class="cp-track-fill" style={{ width: `${cpPct}%` }} />
        <div class="cp-track-text">
          <HudIcon icon={isFinalCP ? Flag : MapPin} size={11} class={isFinalCP ? 'ico-cp-final' : 'ico-cp'} />
          <span class="cp-word">CP</span>
          <span class="cp-now">{data.checkpoint || 1}</span>
          <span class="cp-of">/{totalCPs || '?'}</span>
        </div>
      </div>

      {/* Elapsed race time — the supporting clock under the lap. */}
      {isLapRace && (
        <div class="total-row">
          <HudIcon icon={Timer} size={12} class="ico-total" />
          <span class="total-label">TOTAL</span>
          <span class="total-val">{displayTotal}</span>
        </div>
      )}

      <div class="ref-row">
        <span class="ref"><HudIcon icon={Gauge} size={11} class="ico-pb" />PB <b>{displayBest}</b></span>
      </div>

      {split && <SplitDelta s={split} />}
    </div>
  )
}

/* ── CP Distance Pill ──────────────────────────────────────── */

/*
 * Two in-world readouts, toggled independently by the server (see Config.Hud in
 * spz-races). They answer different questions and are anchored to different
 * things, which is why they are separate elements rather than one panel:
 *
 *   guide  anchored to your CAR — what the road does at the next gate
 *   pill   anchored to the CHECKPOINT — where that gate is, with a stem to it
 *
 * A missing sub-object means "the server has this one turned off", so absence
 * is the off switch and there is no separate visibility flag to keep in sync.
 */
interface TurnGuideData {
  onScreen: boolean
  x: number
  y: number
  turn?: string        // "SLIGHT RIGHT", "HARD LEFT", "STRAIGHT", "U-TURN"
  severity?: string    // straight | slight | normal | hard | uturn
  angle?: number       // signed degrees, negative = left
  speed?: number       // mph
}

interface PillData {
  onScreen: boolean
  x: number
  y: number
}

interface CPWaypoint {
  dist: number
  guide?: TurnGuideData
  pill?: PillData
}

/*
 * Next-CP distance pill — anchored on the checkpoint, with a stem line pointing
 * down to the gate point.
 *
 * Kept alongside the turn guide rather than replaced by it: the guide tells you
 * what the road does, this tells you where the gate actually is, which still
 * matters on an unfamiliar track or when a gate sits behind geometry. Off by
 * default because its distance duplicates the guide's; servers that run without
 * the guide will want it on.
 */
const CPDistancePill = ({ pill, dist }: { pill?: PillData; dist: number }) => {
  if (!pill || !pill.onScreen || !dist || dist <= 0) return null
  const close = dist < 80
  const urgent = dist < 30
  // GPU-composited transform (no left/top layout thrash) = rock-steady tracking
  const style = {
    transform: `translate3d(${(pill.x * 100).toFixed(3)}vw, ${(pill.y * 100).toFixed(3)}vh, 0)`,
  }
  return (
    <div class="cp-wp" style={style}>
      <div class={`cp-wp-inner${close ? ' close' : ''}${urgent ? ' urgent' : ''}`}>
        <div class="cp-chip">
          <HudIcon icon={MapPin} size={10} class="ico-wp" />
          <span class="cp-chip-val">{dist}</span>
          <span class="cp-chip-unit">m</span>
        </div>
        <div class="cp-wp-stem" />
        <div class="cp-wp-dot" />
      </div>
    </div>
  )
}

/*
 * Turn guide — the corner call, anchored in world space ahead of the car.
 *
 * Replaces the old "next CP" distance pill, which was pinned to the checkpoint
 * and told you only how far away it was. Distance alone is the least useful
 * thing a driver can be told at speed: the gate already has props and blips
 * saying where it is. What is missing is what the road DOES when you get there,
 * so this leads with the turn and carries the distance as support.
 *
 * The cluster MIRRORS around the arrow: turning right puts the arrow on the
 * right and the speed on the left, turning left flips both. The arrow always
 * ends up on the side you are about to travel towards, so the layout itself
 * points the way before you have read a word of it.
 */
/*
 * Turn label and severity from a signed angle. Mirrors _turnLabel in
 * spz-races/client/nui_bridge.lua — the live HUD is fed the label from Lua, so
 * this exists only so the browser preview can render a real variant from
 * ?angle=. Keep the bands in step with the Lua side if either changes.
 */
function turnFromAngle(angle: number): { turn: string; severity: string } {
  const a = Math.abs(angle)
  const side = angle < 0 ? 'LEFT' : 'RIGHT'
  if (a < 12) return { turn: 'STRAIGHT', severity: 'straight' }
  if (a < 40) return { turn: `SLIGHT ${side}`, severity: 'slight' }
  if (a < 100) return { turn: side, severity: 'normal' }
  if (a < 150) return { turn: `HARD ${side}`, severity: 'hard' }
  return { turn: 'U-TURN', severity: 'uturn' }
}

const TurnGuide = ({ guide, dist }: { guide?: TurnGuideData; dist: number }) => {
  if (!guide || !guide.onScreen || !dist || dist <= 0) return null

  const angle = guide.angle ?? 0
  const left = angle < 0
  const sev = guide.severity || 'straight'
  const urgent = dist < 40

  // GPU-composited transform (no left/top layout thrash) = rock-steady tracking
  const style = {
    transform: `translate3d(${(guide.x * 100).toFixed(3)}vw, ${(guide.y * 100).toFixed(3)}vh, 0)`,
  }

  /*
   * The arrow is a single up-arrow rotated by the REAL angle rather than one of
   * a handful of fixed diagonal glyphs, so a 20° kink and a 90° corner do not
   * draw the same picture. Clamped to ±135°: past that the arrow points back at
   * the driver and stops reading as a direction, and a U-turn is better said in
   * words anyway.
   */
  const rot = Math.max(-135, Math.min(135, angle))

  const speedCell = guide.speed != null && (
    <div class="tg-speed">
      <HudIcon icon={Zap} size={11} class="ico-tg-speed" />
      <span class="tg-speed-unit">MPH</span>
      <span class="tg-speed-val">{guide.speed}</span>
    </div>
  )

  const arrowCell = (
    <div class="tg-arrow" style={{ transform: `rotate(${rot}deg)` }}>
      <ArrowUp size={44} strokeWidth={2.5} aria-hidden="true" />
    </div>
  )

  return (
    <div class="tg" style={style}>
      <div class={`tg-inner sev-${sev}${urgent ? ' urgent' : ''}${left ? ' is-left' : ''}`}>
        {left ? arrowCell : speedCell}

        <div class="tg-main">
          <div class="tg-label">{guide.turn || 'STRAIGHT'}</div>
          <div class="tg-dist">{dist}<span>M</span></div>
        </div>

        {left ? speedCell : arrowCell}
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

/* ── Rewind timeline (Forza-style scrub bar) ──────────────── */

interface RewindState {
  active: boolean
  secondsBack?: number
  fraction?: number       // 0..1 of the buffer scrubbed so far
  bufferSeconds?: number
  creditMs?: number       // clock handed back so far in this scrub
}

const RewindTimeline = ({ rw }: { rw: RewindState }) => {
  if (!rw || !rw.active) return null
  const pct = Math.max(0, Math.min(1, rw.fraction ?? 0)) * 100
  // The clock rewinds with the car; showing what it is giving back is what
  // makes the scrub read as "undo" rather than "teleport".
  const credit = (rw.creditMs ?? 0) / 1000
  return (
    <div class="rewind-panel">
      <div class="rewind-track">
        <div class="rewind-track-fill" style={{ width: `${pct}%` }} />
        <div class="rewind-track-head" style={{ left: `${pct}%` }} />
      </div>
      {credit > 0.05 && <div class="rewind-credit">−{credit.toFixed(1)}s</div>}
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
  const [cpWp, setCpWp] = useState<CPWaypoint>({ dist: 0 })
  const [warmup, setWarmup] = useState<WarmupState>({ remaining: 0, total: 0 })
  const [lobby, setLobby] = useState<LobbyState>({ mode: 'hidden' })
  const [rewind, setRewind] = useState<RewindState>({ active: false })
  const [sectors, setSectors] = useState<(SectorEntry | null)[]>([null, null, null])
  const [split, setSplit] = useState<{ delta: number | null; split?: number; cp: number; total: number; key: number } | null>(null)
  const [showStandings, setShowStandings] = useState(true)
  const [keyHints, setKeyHints] = useState<KeyHints>({})

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
  // Clock credit already folded into the two clocks for the scrub in progress.
  const rewindCreditRef = useRef<number>(0)

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
      // Browser preview. Showing every state at once stacks the countdown, the
      // HUD and the results card on top of each other, which is not a layout any
      // player ever sees — pick ONE scene with ?scene=… so each can be judged on
      // its own. Defaults to the live race HUD.
      const qs = new URLSearchParams(location.search)
      const scene = qs.get('scene') || 'race'

      import('./mockdata').then(m => {
        const D = m.MOCK_RACE_DATA

        if (scene === 'countdown') {
          setCountdown(D.countdown)
          setShowCountdown(true)
          return
        }

        if (scene === 'results') {
          setPostRace(D.postRace)
          showStatsRef.current = true
          setShowStats(true)
          return
        }

        // race (default) — the HUD as it looks mid-lap
        setOverlay(D.overlay)
        setShowOverlay(true)
        // Key hints normally arrive from Lua on join; seed them so the preview
        // shows the bar. ?keys=none drops it to judge the HUD without.
        // ?list=hidden renders the HUD as it looks with the standings list
        // toggled off, so the key strip can be judged in the state where it
        // matters most — it is the only thing telling you how to get the list back.
        if (qs.get('list') === 'hidden') setShowStandings(false)
        if (qs.get('keys') !== 'none') {
          // Must match the defaults in Docs/keybinds.md — this is browser-preview
          // seed data only, but a stale copy here is how a screenshot ends up
          // teaching the wrong key.
          setKeyHints({ standings: 'N', rewind: 'B', respawn: 'F4', flip: 'K', results: 'F6' })
        }
        setSectors((D as any).sectors ?? [null, null, null])
        if ((D as any).warmup) setWarmup((D as any).warmup)
        if ((D as any).lobby) setLobby((D as any).lobby)
        // Checkpoint pill overrides so it can be placed clear of the HUD corners
        // while judging it: ?cp=none hides it, ?dist=&x=&y= reposition it.
        const cpMode = qs.get('cp')
        if (cpMode !== 'none') {
          const base = (D as any).cpWaypoint as CPWaypoint | undefined
          if (base) {
            // ?angle= drives the whole turn guide: the label and severity are
            // derived from it exactly as Lua derives them, so a left/right or
            // slight/hard variant can be judged without a running server.
            // ?guide=0 / ?pill=0|1 mirror the server toggles by dropping or
            // adding the matching sub-object, exactly as Lua does.
            const angleQ = qs.get('angle')
            const derived = angleQ != null ? turnFromAngle(Number(angleQ)) : null

            const guide = qs.get('guide') === '0' ? undefined : {
              ...(base.guide as TurnGuideData),
              ...(qs.get('x') ? { x: Number(qs.get('x')) } : {}),
              ...(qs.get('y') ? { y: Number(qs.get('y')) } : {}),
              ...(qs.get('speed') ? { speed: Number(qs.get('speed')) } : {}),
              ...(derived ? { angle: Number(angleQ), ...derived } : {}),
            }

            const pill = qs.get('pill') === '1'
              ? (base.pill ?? { onScreen: true, x: 0.62, y: 0.34 })
              : undefined

            setCpWp({
              dist: Number(qs.get('dist') ?? base.dist ?? 184),
              guide,
              pill,
            })
          }
        }
      })
      return
    }

    const handler = (e: MessageEvent) => {
      const { action, data = {}, theme } = e.data ?? {}
      if (!action) return

      switch (action) {

        case 'theme':
          applyTheme(theme)
          break

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
            split: data.split ?? 0,
            cp: data.cp ?? 0,
            total: data.total ?? 0,
            key: Date.now(),
          })
          break

        case 'cpDistUpdate':
          setCpDist(data.dist ?? 0)
          break

        case 'cpWaypoint':
          // A missing sub-object means the server has that readout switched off,
          // so absence is the off switch — nothing extra to keep in sync.
          setCpWp({
            dist: data.dist ?? 0,
            guide: data.guide,
            pill: data.pill,
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

        case 'rewind': {
          // The race clocks are a local interval, so the rewind's clock credit
          // is applied here as a growing delta: the timer visibly runs backward
          // while the key is held instead of jumping once on release. Only the
          // increase since the last frame is applied, so a scrub cannot be
          // counted twice, and the ref resets when the scrub ends.
          const credit = data.active ? (data.creditMs ?? 0) : 0
          const delta = credit - rewindCreditRef.current
          if (delta > 0) {
            raceStartRef.current += delta
            lapStartRef.current += delta
          }
          rewindCreditRef.current = credit

          setRewind({
            active: !!data.active,
            secondsBack: data.secondsBack ?? 0,
            fraction: data.fraction ?? 0,
            bufferSeconds: data.bufferSeconds ?? 10,
            creditMs: credit,
          })
          break
        }

        case 'lobby':
          setLobby({
            mode: data.mode ?? 'hidden',
            queueCount: data.queueCount,
            queuePos: data.queuePos,
            seconds: data.seconds,
          })
          break

        case 'keyhints':
          setKeyHints(data || {})
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
          setRewind({ active: false })
          rewindCreditRef.current = 0
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
          {/* Left column: running order with the sector strip docked under it.
              Hiding the list (Z) lets the strip slide up to the top slot. */}
          <div class="hud-left">
            {showStandings && <Standings positions={overlay.positions || []} mySource={overlay.mySource} />}
            <SectorStrip sectors={sectors} />
            <KeyHintBar hints={keyHints} listHidden={!showStandings} />
          </div>
          <Telemetry data={overlay} split={split} />
        </div>
      )}

      {/* Two in-world readouts, each rendered only when the server sends its
          half of the payload — see Config.Hud in spz-races. */}
      {showOverlay && !overlay.isTT && (
        <>
          <TurnGuide guide={cpWp.guide} dist={cpWp.dist} />
          <CPDistancePill pill={cpWp.pill} dist={cpWp.dist} />
        </>
      )}

      <WarmupPanel wu={warmup} />
      <LobbyPill lb={lobby} />
      <RewindTimeline rw={rewind} />

      {showStats && postRace && (
        <PostRace data={postRace} autoClose={autoClose} onDismiss={dismissStats} />
      )}
    </div>
  )
}
