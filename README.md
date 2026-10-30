# spz-raceUI

> Race HUD: countdown, standings, timing, intro cover, lobby pill and results.

![version](https://img.shields.io/badge/version-1.18.0-ff6200) ![SPiceZ-Core](https://img.shields.io/badge/SPiceZ--Core-beta-18181b)

## Overview

Everything drawn during a race: the intro cover and briefing, countdown, lap/sector/position HUD, standings list, finish window, post-race stats, and the freeroam lobby pill ("E JOIN RACE" / "JOIN WARMUP").

## Features

- Race intro with sliced transition cover
- Lap, sector and split deltas
- Standings list (toggle `N`)
- Freeroam lobby pill with join / warmup / queue states
- Stays hidden until the loading screen is down

## Requirements

| Resource | Type |
|---|---|
| `spz-core` | SPiceZ module |

## Installation

Included in the [txAdmin recipe](https://github.com/SPiceZ21/spz-txrecipe). Manual install:

1. Download `spz-raceUI` from GitHub (latest release, or the repository) into your `resources` folder.
2. Add to `server.cfg`, after its requirements:

```cfg
ensure spz-raceUI
```

## Key binds

Rebindable in **Settings → Key Bindings → FiveM**.

| Action | Default |
|---|---|
| Race: Toggle Standings List | `N` |
| HUD: show / hide freeroam info | `PAGEDOWN` |

## Exports

| Export | Side |
|---|---|
| `HideAll` | client |
| `HideFinishWindow` | client |
| `HideRaceIntro` | client |
| `HideRewind` | client |
| `HideWarmup` | client |
| `PlaySound` | client |
| `ResetSectors` | client |
| `SetKeyHints` | client |
| `SetRaceOverlayVisible` | client |
| `ShowCountdown` | client |
| `ShowFastestLap` | client |
| `ShowFinishWindow` | client |
| `ShowFlourish` | client |
| `ShowPostRaceStats` | client |
| `ShowRaceIntro` | client |
| `ShowSplitDelta` | client |
| `ShowWarmup` | client |
| `TT_Broadcast` | client |
| `TT_Hide` | client |
| `UpdateCPWaypoint` | client |
| `UpdateLobby` | client |
| `UpdateRaceOverlay` | client |
| `UpdateRewind` | client |
| `UpdateSector` | client |
| `UpdateWanted` | client |

```lua
exports["spz-raceUI"]:HideAll(...)
```

---

Part of **SPiceZ-Core** — [documentation](https://github.com/SPiceZ21/Docs) · [all modules](https://github.com/SPiceZ21/Docs/blob/main/modules/README.md)
