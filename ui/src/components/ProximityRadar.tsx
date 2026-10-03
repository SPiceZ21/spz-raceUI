import './ProximityRadar.css'

// ACC-style proximity radar, dressed like the rest of the race HUD (dark glass
// panel, orange accent). Units are metres in MY car's frame: x = right,
// y = ahead (SVG y is flipped). Cars come from client/main.lua.
export type RadarCar = { x: number; y: number; h: number; w: number; l: number }
export type RadarState = { cars: RadarCar[]; w: number; l: number }

// Field of view. Tight on purpose: the radar is for wheel-to-wheel, so a car
// alongside should look like a car, not a speck. Anything further out is
// visible through the windscreen anyway.
const HALF_W = 5      // metres either side
const HALF_L = 8      // metres ahead / behind
const SIDE_MAX = 3.5  // lateral clearance at which the side warning starts

// Car silhouette: body, windscreen and rear glass, centred on 0,0.
const Car = ({ w, l, cls, transform }: { w: number; l: number; cls: string; transform?: string }) => (
  <g class={`car ${cls}`} transform={transform}>
    <rect class="body" x={-w / 2} y={-l / 2} width={w} height={l} rx={Math.min(w, l) * 0.28} />
    <rect class="glass" x={-w * 0.36} y={-l * 0.26} width={w * 0.72} height={l * 0.16} rx={0.12} />
    <rect class="glass" x={-w * 0.34} y={l * 0.24} width={w * 0.68} height={l * 0.1} rx={0.1} />
  </g>
)

export const ProximityRadar = ({ r }: { r: RadarState }) => {
  const visible = r.cars.length > 0

  let left = 0, right = 0, nearest = Infinity
  for (const c of r.cars) {
    const gap = Math.max(0, Math.abs(c.x) - (r.w + c.w) / 2)
    const overlap = Math.abs(c.y) < (r.l + c.l) / 2
    if (overlap) nearest = Math.min(nearest, gap)
    if (!overlap || gap > SIDE_MAX) continue
    const s = Math.min(1, Math.max(0.3, 1 - gap / SIDE_MAX))
    if (c.x < 0) left = Math.max(left, s); else right = Math.max(right, s)
  }
  const danger = nearest < 0.6

  return (
    <div class={`prox ${visible ? 'on' : ''} ${danger ? 'danger' : ''}`}>
      <svg viewBox={`${-HALF_W} ${-HALF_L} ${HALF_W * 2} ${HALF_L * 2}`}>
        <defs>
          <linearGradient id="proxL" x1="1" x2="0">
            <stop offset="0" stop-color="var(--prox-warn)" stop-opacity="0.85" />
            <stop offset="1" stop-color="var(--prox-warn)" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="proxR" x1="0" x2="1">
            <stop offset="0" stop-color="var(--prox-warn)" stop-opacity="0.85" />
            <stop offset="1" stop-color="var(--prox-warn)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <line class="guide" x1={-HALF_W} y1="0" x2={HALF_W} y2="0" />
        <line class="guide" x1="0" y1={-HALF_L} x2="0" y2={HALF_L} />
        <polygon class="guide" points={`0,${-HALF_L * 0.78} ${HALF_W * 0.78},0 0,${HALF_L * 0.78} ${-HALF_W * 0.78},0`} />

        <polygon class="warn" style={{ opacity: left }} fill="url(#proxL)"
          points={`${-r.w / 2 - 0.2},${-r.l * 0.15} ${-HALF_W},${-HALF_L * 0.7} ${-HALF_W},${HALF_L * 0.7} ${-r.w / 2 - 0.2},${r.l * 0.15}`} />
        <polygon class="warn" style={{ opacity: right }} fill="url(#proxR)"
          points={`${r.w / 2 + 0.2},${-r.l * 0.15} ${HALF_W},${-HALF_L * 0.7} ${HALF_W},${HALF_L * 0.7} ${r.w / 2 + 0.2},${r.l * 0.15}`} />

        {r.cars.map((c, i) => (
          <Car key={i} w={c.w} l={c.l} cls="other" transform={`translate(${c.x} ${-c.y}) rotate(${-c.h})`} />
        ))}
        <Car w={r.w} l={r.l} cls="me" />
      </svg>
      <div class="prox-gap">
        {nearest === Infinity ? '—' : `${nearest.toFixed(1)}`}<span>m</span>
      </div>
    </div>
  )
}
