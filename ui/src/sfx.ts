// One-shot UI sound effects.
//
// FiveM cannot play a file from a resource without a browser to decode it, so
// every custom clip in the race HUD goes through this page. Files live in
// public/aud/ and are copied verbatim into dist/ by Vite — the manifest's
// `files { 'ui/dist/**/*' }` already serves them, so adding a clip here needs
// no fxmanifest change.
//
// Paths are relative (vite `base: './'`): the page is served from the resource
// root, and an absolute '/aud/...' would not resolve inside the NUI frame.
const CLIPS: Record<string, string> = {
  cppass: './aud/cppass.wav',
  cpmiss: './aud/cpmiss.mp3',
}

// Decoding on first play would delay the chime past the gate it belongs to,
// so each clip is fetched and decoded once at module load.
const cache: Record<string, HTMLAudioElement> = {}
for (const [name, src] of Object.entries(CLIPS)) {
  const el = new Audio(src)
  el.preload = 'auto'
  cache[name] = el
}

// Checkpoints can come faster than a clip is long (and a miss can land on top
// of a pass), so playback restarts from zero rather than being dropped while
// the previous one is still running.
export function playSfx(name: string, volume = 1) {
  const el = cache[name]
  if (!el) return
  try {
    el.volume = Math.max(0, Math.min(1, volume))
    el.currentTime = 0
    void el.play()
  } catch { /* autoplay blocked in browser preview — not fatal */ }
}
