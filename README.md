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
| NUI | `ui/src/app.tsx` | HUD: standings tower, telemetry, CP pill, splits |
| NUI | `ui/src/mockdata.ts` | Browser-preview fixtures — covers every tower state |
| NUI | `ui/src/styles/app.css` | HUD layout and icon vocabulary |

## Standings tower

Each row is `position · marker · flag · number · name · gap`.

The **gap is a real time**, not a checkpoint count. `spz-races` banks every crossing
against a progress index and answers "how long ago was the car ahead standing where this
one is now", so the value holds across a lap boundary — a lapped car reads as the time it
is genuinely down, suffixed `1L`. The payload carries both `gap` (to the leader) and
`interval` (to the car directly ahead); the tower renders `gap` today.

Two flags ride on each entry: `bot` (ghost-bot — replayed line, scores nothing) and `dc`
(dropped mid-race, slot held for reconnect).

## Icons

Icons come from `lucide-preact` through the local `HudIcon` wrapper, which fixes size and
stroke weight — mixed line weights read as noise on something glanced at 200 km/h.

**Icons accompany their label; they never replace it.** A glyph alone costs a new player
the meaning, and the HUD has no room for a legend.

| Surface | Icon | Meaning |
|---|---|---|
| Telemetry | `Flag` · `Trophy` · `Timer` · `Gauge` | Lap · position · total time · personal best |
| Checkpoint | `MapPin`, `Flag` on the last gate | CP counter, distance pill, split tower |
| Standings | `Crown` (gold) | Race leader |
| Standings | `ChevronUp` / `ChevronDown` | Place gained or lost since the last update |
| Standings | `Bot` (dim) | Ghost-bot — deliberately quiet, it scores nothing |
| Standings | `WifiOff` (amber) | Held slot awaiting reconnect; the row dims |
| Split | `Zap` | Up on your reference lap |

The crown and the movement arrow share **one** 11px marker slot, movement winning when
both apply. The name is the only elastic cell in the row, so every fixed column and every
row gap is taken out of it — two separate slots truncated driver names that previously
fit. Anything added to a row has to be paid for somewhere; measure
`scrollWidth` vs `clientWidth` on `.racer-name-text` before and after.

## Exports

| Group | Exports |
|---|---|
| Countdown / lobby | `ShowCountdown` · `ShowWarmup` · `HideWarmup` · `UpdateLobby` |
| Key hints | `SetKeyHints` |
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

The resource serves `ui/dist`, so a source edit does not ship until it is rebuilt:

```bash
cd ui && npm install && npm run build   # → ui/dist/index.html
```

Preview the HUD in a browser without a server — `mockdata.ts` supplies the field, and the
scene is chosen by query string:

```bash
cd ui && npm run dev   # ?scene=race (default) · ?scene=countdown · ?scene=results
```

`?cp=none` hides the checkpoint pill; `?dist=&x=&y=` repositions it.
`?list=hidden` renders the HUD with the standings list toggled off; `?keys=none` drops the
key strip.

## Keys

The HUD prints the in-race keys under the sector strip, so a driver never has to leave the
race to find out how to recover. The strip stays up when the standings list is hidden — the
hint for the key that brings the list back cannot live inside the thing it toggles.

| Key | Command | Effect | Owned by |
|---|---|---|---|
| `Z` | `/standingstoggle` | Hide / show the standings list | this resource |
| `F5` | `+spz_rewind` | Hold to rewind the car along its own path | `spz-races/client/rewind.lua` |
| `F4` | `/spz_respawn_cp` | Back to the last checkpoint you crossed | `spz-races/client/recover.lua` |
| `F6` | `/leaderboard` | Race results (deep-links to the race you just drove) and the archive | `spz-leaderboard` |
| `X` | `/spz_flip_car` | Flip the car upright | `spz-races/client/recover.lua` |

Each key is declared once by the resource that owns it — `spz-races/config.lua`
(`RecoverKey`, `Rewind.key`), `spz-leaderboard` for the results key — and pushed here
through the `SetKeyHints` export. The key that is **registered**, the key the HUD
**prints**, and the key the missed-checkpoint prompt **names** cannot drift apart.

These are **default** bindings. A player who rebinds in Settings gets the new key, but the
hint still shows the default — FiveM exposes no way to read a live command binding back.

## Dependencies

None beyond FiveM. Driven by `spz-races`.

---

Part of [SPiceZ-Core](../README.md) · GPL-3.0
