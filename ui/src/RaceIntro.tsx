import { useEffect, useRef, useState } from 'preact/hooks'
import './styles/intro.css'

/*
 * The race intro — what a driver sees between the warmup ending and the lights.
 *
 * THE COVER is spz-spawn's Cover.tsx, brought over deliberately rather than
 * re-invented: the two screens do the same job (hide a teleport and a streaming
 * hitch behind something branded) and a server that cannot decide what its own
 * loading screen looks like reads as two servers. See spz-spawn/ui/src/Cover.tsx
 * for why the backdrop and the sliced exit are built the way they are — that
 * file is the original and the comments there are the long version.
 *
 * THE BRIEFING is what the sweep opens onto: three centred slides — circuit,
 * machine, conditions — that come through one at a time over the start-line
 * camera, then clear before the countdown.
 *
 * WHY SLIDES AND NOT A PANEL
 *
 * Everything on this screen is known to the player already; they voted for it.
 * The job is not to inform, it is to make the start feel like an event, so the
 * information is PACED rather than presented: one idea at a time, each big
 * enough to read at a glance from a driving position, none of it competing
 * with the camera move underneath. A single card holding all of it is a form,
 * and it is what this replaced.
 *
 * WHY THE MOTION IS BUILT THIS WAY
 *
 * Each slide enters and leaves on the same axis it reads on — in from the
 * right, out to the left, like something passing through — with an asymmetric
 * curve: slow-out for the entrance so it arrives and settles, fast-in for the
 * exit so it is gone rather than lingering under the next one. Entrance and
 * exit overlap by design; the gap between two slides is where a sequence like
 * this dies.
 *
 * Nothing here animates a property that costs layout: transform and opacity
 * only, because this plays while the client is streaming the first corner of
 * a track it may not have loaded yet.
 */

const SLICES = 8

/** Total ms from the reveal starting to the last panel clearing the frame.
 *  app.tsx unmounts the cover on this, so the two must not drift apart. */
export const COVER_EXIT_MS = 1320

export interface IntroDetails {
  track?: string
  type?: string
  laps?: number
  length?: string
  vehicle?: string
  class?: string
  code?: string        // spawn code — the model name itself
  topSpeed?: number
  accel?: number
  handling?: number
  cops?: boolean
  traffic?: string
}

// ── Cover ────────────────────────────────────────────────────────────────────

export function IntroCover({ fading }: { fading: boolean }) {
  // Staged so the brand is gone before the panels start moving. Sweeping the
  // artwork out from under type that is still fully opaque reads as a glitch.
  const [sweeping, setSweeping] = useState(false)
  useEffect(() => {
    if (!fading) { setSweeping(false); return }
    const t = setTimeout(() => setSweeping(true), 180)
    return () => clearTimeout(t)
  }, [fading])

  return (
    <div class={`cv-root${fading ? ' is-out' : ''}`}>
      <div class={`cv-stage${sweeping ? ' is-sweeping' : ''}`}>
        {Array.from({ length: SLICES }, (_, i) => {
          // Outside-in: the edge panels leave first and the ones behind them
          // follow, so the gaps open between neighbours and widen inward.
          // Identical motion curves offset in time cannot overtake — see the
          // original for why matched distances would tear the frame open in
          // the middle instead.
          const left = i < SLICES / 2
          const order = left ? i : SLICES - 1 - i
          return (
            <div
              key={i}
              class="cv-slice"
              style={{
                '--i': i,
                '--bgx': `calc(${-i} * (100vw / ${SLICES}))`,
                '--dir': left ? -1 : 1,
                '--delay': `${order * 70}ms`,
              }}
            />
          )
        })}

        <div class="cv-aurora" />
        <div class="cv-grain" />
        <div class="cv-vign" />
      </div>

      <div class="cv-content">
        <div class="cv-frame" aria-hidden="true">
          <i class="tl" /><i class="tr" /><i class="bl" /><i class="br" />
        </div>

        <div class="cv-center">
          <img class="cv-logo" src="logo.png" alt="SPiceZ" />

          <div class="cv-rule" />

          <div class="cv-status">
            <span class="cv-pip" />
            Forming the grid
          </div>

          {/* Indeterminate on purpose: the wait is a teleport and collision
              streaming, neither of which reports progress. */}
          <div class="cv-bar"><span /></div>
        </div>

        <div class="cv-foot">
          <span class="cv-foot-mark">SPiceZ-Core</span>
          <span class="cv-foot-dot" />
          <span>Race Control</span>
        </div>
      </div>
    </div>
  )
}

// ── Briefing ─────────────────────────────────────────────────────────────────

/** How long one slide is fully on screen, before its exit begins. The enter and
 *  exit animations live in CSS and overlap this; see intro.css. */
const SLIDE_MS_MIN = 1700
const SLIDE_MS_MAX = 3400
const EXIT_MS = 420

type SlideKind = 'circuit' | 'machine' | 'conditions'

/* The kicker line: index, label, flanked by rules.
 *
 * The index was a huge ghosted numeral behind the title. It read well on the
 * two slides whose titles are short and collided with the ones whose titles
 * are not — which is every long track or add-on car name, i.e. the normal
 * case. Set small and inline it cannot collide with anything. */
function Kicker({ n, children }: { n: string, children: any }) {
  return (
    <div class="rb-kicker">
      <span class="rb-kicker-num">{n}</span>
      <span class="rb-kicker-pip" />
      {children}
    </div>
  )
}

function Stat({ label, value, i }: { label: string, value: string, i: number }) {
  return (
    <div class="rb-stat" style={{ '--s': i }}>
      <span class="rb-stat-value">{value}</span>
      <span class="rb-stat-label">{label}</span>
    </div>
  )
}

function CircuitSlide({ d }: { d: IntroDetails }) {
  // Laps only on a circuit — a sprint's "1 lap" is not a fact worth a stat.
  const isCircuit = !d.type || d.type.toLowerCase() === 'circuit'
  const laps = isCircuit && d.laps && d.laps > 0 ? String(d.laps) : null
  return (
    <>
      <Kicker n="01">Circuit</Kicker>
      <h1 class="rb-title">{d.track || 'Unknown circuit'}</h1>
      <div class="rb-rule" />
      <div class="rb-stats">
        {d.type && <Stat i={0} label="Format" value={d.type.toUpperCase()} />}
        {laps && <Stat i={1} label={d.laps === 1 ? 'Lap' : 'Laps'} value={laps} />}
        {d.length && <Stat i={2} label="Length" value={d.length} />}
      </div>
    </>
  )
}

function MachineSlide({ d }: { d: IntroDetails }) {
  // Stats are optional: an add-on car that has not been through the
  // performance probe yet has none, and inventing numbers for it on a screen
  // this size would be a lie the driver acts on.
  const hasStats = d.topSpeed || d.accel || d.handling
  return (
    <>
      <Kicker n="02">Machine</Kicker>
      <h1 class="rb-title">{d.vehicle || d.class || 'TBA'}</h1>
      {/* The spawn code, which is the one thing on this slide a driver cannot
          look up later: it is what they type into the spawner to drive this
          car again, and for a pack car it is the only handle they have. */}
      {d.code && <div class="rb-code">{d.code}</div>}
      <div class="rb-rule" />
      {hasStats ? (
        <div class="rb-stats">
          {d.class && <Stat i={0} label="Class" value={d.class} />}
          {!!d.topSpeed && <Stat i={1} label="Top speed" value={`${d.topSpeed} KM/H`} />}
          {!!d.accel && <Stat i={2} label="Accel" value={String(d.accel)} />}
          {!!d.handling && <Stat i={3} label="Handling" value={String(d.handling)} />}
        </div>
      ) : (
        d.class && (
          <div class="rb-stats">
            <Stat i={0} label="Class" value={d.class} />
          </div>
        )
      )}
    </>
  )
}

function ConditionsSlide({ d }: { d: IntroDetails }) {
  const traffic = !d.traffic || d.traffic === 'none' ? 'CLEAR' : d.traffic.toUpperCase()
  const busy = traffic !== 'CLEAR'

  // A headline, so this slide has the same shape as the other two: kicker,
  // title, rule, detail. Without one it read as a pair of boxes floating in
  // the middle of the frame — the odd slide out in a sequence whose whole job
  // is rhythm.
  //
  // It says what the two plates below mean TOGETHER, which is the thing a
  // driver actually wants off this slide: is the road mine or not.
  const headline =
    d.cops && busy ? 'Police & traffic'
    : d.cops       ? 'Police active'
    : busy         ? 'Traffic on track'
    :                'Clear roads'

  return (
    <>
      <Kicker n="03">Track conditions</Kicker>
      <h1 class="rb-title">{headline}</h1>
      <div class="rb-rule" />
      <div class="rb-flags">
        <div class={`rb-flag${d.cops ? ' is-hot' : ''}`} style={{ '--s': 0 }}>
          <span class="rb-flag-label">Police</span>
          <span class="rb-flag-value">{d.cops ? 'ACTIVE' : 'OFF'}</span>
        </div>
        <div class={`rb-flag${busy ? ' is-hot' : ''}`} style={{ '--s': 1 }}>
          <span class="rb-flag-label">Traffic</span>
          <span class="rb-flag-value">{traffic}</span>
        </div>
      </div>
    </>
  )
}

export function RaceBriefing({ d, holdMs, leaving, pin }: {
  d: IntroDetails
  holdMs?: number
  leaving: boolean
  /** Browser preview only (?slide=…): hold one slide so it can be judged on
   *  its own. Never set in game — the sequence is the point. */
  pin?: SlideKind
}) {
  const slides: SlideKind[] = ['circuit', 'machine', 'conditions']

  // Each slide gets an equal share of the window the server gave us, so the
  // briefing always ends before the lights whatever the staging phase is set
  // to. Bounds stop a very short staging phase from flashing three slides
  // past unreadably, or a very long one from parking on the first.
  const per = Math.min(
    SLIDE_MS_MAX,
    Math.max(SLIDE_MS_MIN, Math.round(((holdMs ?? 7500) - EXIT_MS) / slides.length)),
  )

  const [i, setI] = useState(0)
  const [out, setOut] = useState(false)
  const timers = useRef<any[]>([])

  useEffect(() => {
    if (pin) return
    // The whole schedule is laid out once from a single clock rather than each
    // slide arming the next: chained timeouts drift, and a drifting briefing
    // runs into the countdown.
    const t: any[] = []
    for (let n = 1; n < slides.length; n++) {
      t.push(setTimeout(() => setOut(true), n * per - EXIT_MS))
      t.push(setTimeout(() => { setI(n); setOut(false) }, n * per))
    }
    timers.current = t
    return () => t.forEach(clearTimeout)
  }, [per, pin])

  const kind = pin ?? slides[i]

  return (
    <div class={`rb-root${leaving ? ' is-leaving' : ''}`}>
      {/* Cutscene bars + a scrim, not a panel. The briefing sits over a
          moving camera shot: the type has to stay legible against a bright
          sky, and the player needs to know the camera is scripted and their
          controls are not simply dead. Boxing the text would hide the shot it
          is meant to sit in. */}
      <div class="rb-bar top" />
      <div class="rb-bar bottom" />
      <div class="rb-scrim" />

      <div class="rb-stage">
        <div class={`rb-slide${out ? ' is-out' : ''}`} key={kind}>
          {kind === 'circuit' && <CircuitSlide d={d} />}
          {kind === 'machine' && <MachineSlide d={d} />}
          {kind === 'conditions' && <ConditionsSlide d={d} />}
        </div>
      </div>

      <div class="rb-pips">
        {slides.map((s, n) => {
          const at = pin ? slides.indexOf(pin) : i
          return <span key={s} class={`rb-pip${n === at ? ' is-on' : ''}${n < at ? ' is-done' : ''}`} />
        })}
      </div>
    </div>
  )
}
