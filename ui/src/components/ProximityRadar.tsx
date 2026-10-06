import './ProximityRadar.css'

// Proximity radar: a faint dashed hexagon that fades out toward its edges, no
// panel behind it. Units are metres in MY car's frame: x = right, y = ahead
// (SVG y is flipped). A car alongside lights a wedge fanning out from my car's
// side toward that hexagon corner. Cars come from client/main.lua.
export type RadarCar = { x: number; y: number; h: number; w: number; l: number }
export type RadarState = { cars: RadarCar[]; w: number; l: number }

// Hexagon "radius" (centre to left/right corner), metres. Flat top/bottom,
// corners pointing left and right, sized to the client's RADAR_RANGE (9.5 m).
const R = 9
const HY = R * 0.866                  // half height of the flat top/bottom
const SIDE_MAX = 3.5                  // lateral clearance at which the side warning starts

const HEX = `${R},0 ${R / 2},${HY} ${-R / 2},${HY} ${-R},0 ${-R / 2},${-HY} ${R / 2},${-HY}`
const INNER = (k: number) => `${R * k},0 ${R * k / 2},${HY * k} ${-R * k / 2},${HY * k} ${-R * k},0 ${-R * k / 2},${-HY * k} ${R * k / 2},${-HY * k}`

const Car = ({ w, l, cls, transform }: { w: number; l: number; cls: string; transform?: string }) => (
  <g class={`car ${cls}`} transform={transform}>
    <rect class="body" x={-w / 2} y={-l / 2} width={w} height={l} rx={Math.min(w, l) * 0.22} />
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

  // Wedge from my car's flank out to the hexagon's side corner (and the two
  // corners next to it), like a sonar fan. Mirrored for the left.
  const fan = (s: 1 | -1) => {
    const x0 = s * (r.w / 2 + 0.15)
    return `${x0},${-r.l * 0.18} ${s * R / 2},${-HY} ${s * R},0 ${s * R / 2},${HY} ${x0},${r.l * 0.18}`
  }

  return (
    <div class={`prox ${visible ? 'on' : ''} ${danger ? 'danger' : ''}`}>
      <svg viewBox={`${-R - 0.3} ${-HY - 0.3} ${R * 2 + 0.6} ${HY * 2 + 0.6}`}>
        <defs>
          {/* Everything fades to nothing toward the hexagon's rim. */}
          <radialGradient id="proxFade" cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fff" stop-opacity="1" />
            <stop offset="0.7" stop-color="#fff" stop-opacity="0.9" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
          </radialGradient>
          <mask id="proxMask" maskUnits="userSpaceOnUse" x={-R - 1} y={-HY - 1} width={R * 2 + 2} height={HY * 2 + 2}>
            <rect x={-R - 1} y={-HY - 1} width={R * 2 + 2} height={HY * 2 + 2} fill="url(#proxFade)" />
          </mask>
          <clipPath id="proxClip"><polygon points={HEX} /></clipPath>
          <radialGradient id="proxFill" cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fff" stop-opacity="0.22" />
            <stop offset="1" stop-color="#fff" stop-opacity="0.04" />
          </radialGradient>
          <linearGradient id="proxR" x1="0" x2={R} y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="var(--prox-warn)" stop-opacity="0.95" />
            <stop offset="1" stop-color="var(--prox-warn)" stop-opacity="0.15" />
          </linearGradient>
          <linearGradient id="proxL" x1="0" x2={-R} y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="var(--prox-warn)" stop-opacity="0.95" />
            <stop offset="1" stop-color="var(--prox-warn)" stop-opacity="0.15" />
          </linearGradient>
        </defs>

        <g mask="url(#proxMask)">
          <polygon class="hex-fill" points={HEX} fill="url(#proxFill)" />
          <polygon class="guide" points={HEX} />
          <polygon class="guide faint" points={INNER(0.5)} />
          <line class="guide" x1={-R} y1="0" x2={R} y2="0" />
          <line class="guide" x1="0" y1={-HY} x2="0" y2={HY} />
          <polygon class="warn" style={{ opacity: left }} fill="url(#proxL)" points={fan(-1)} />
          <polygon class="warn" style={{ opacity: right }} fill="url(#proxR)" points={fan(1)} />
        </g>

        <g clip-path="url(#proxClip)">
          {r.cars.map((c, i) => (
            <Car key={i} w={c.w} l={c.l} cls="other" transform={`translate(${c.x} ${-c.y}) rotate(${-c.h})`} />
          ))}
        </g>
        <Car w={r.w} l={r.l} cls="me" />
      </svg>
      <div class="prox-gap">
        {nearest === Infinity ? '' : `${nearest.toFixed(1)}`}{nearest !== Infinity && <span>m</span>}
      </div>
    </div>
  )
}
