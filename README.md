# spz-raceUI

> Countdown, in-race overlay, split deltas, post-race stats · `v2.0.0`

## Overview

`spz-raceUI` is the in-race HUD. It renders the start countdown, the standings overlay,
the 3D checkpoint pill and distance, sector and split feedback, the warmup lobby, and the
post-race results screen. It holds no race logic — everything is pushed in through exports
by [spz-races](../spz-races/README.md).

## Structure

| Side | File | Purpose |
|---|---|---|
| Client | `client/main.lua` | Export handlers, NUI bridge, overlay state |

## Exports

| Group | Exports |
|---|---|
| Countdown / lobby | `ShowCountdown` · `ShowWarmup` · `HideWarmup` · `UpdateLobby` |
| Overlay | `UpdateRaceOverlay` · `SetRaceOverlayVisible` · `HideAll` |
| Checkpoints | `UpdateCPDistance` · `UpdateCPWaypoint` |
| Sectors / splits | `UpdateSector` · `ResetSectors` · `ShowSplitDelta` |
| Time trial | `TT_UpdateHUD` · `TT_Broadcast` · `TT_Hide` |
| Results | `ShowPostRaceStats` |

```lua
exports['spz-raceUI']:UpdateRaceOverlay(standings)
```

## NUI

Vite · Preact · TypeScript on the [spz-ui](../spz-ui/README.md) component set.

```bash
cd ui && npm install && npm run build   # → ui/dist/index.html
```

## Commands

`/standingstoggle`

## Dependencies

None beyond FiveM. Driven by `spz-races`.

---

Part of [SPiceZ-Core](../README.md) · GPL-3.0
