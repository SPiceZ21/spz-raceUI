# spz-raceUI
> Race UI — Countdown, standings overlay, post-race stats · `v1.1.1`

## Scripts

| Side   | File              | Purpose                                               |
| ------ | ----------------- | ----------------------------------------------------- |
| Client | `client/main.lua` | Export handlers, NUI bridge, overlay state management |

## NUI

**Stack:** Vite · Preact · TypeScript · spz-ui

```
ui/
├── src/
│   ├── app.tsx
│   ├── components/       # spz-ui components
│   └── styles/
└── dist/                 # built output (served by FiveM)
    └── index.html
```

Build: `cd ui && npm run build`

## Exports

| Export                  | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `ShowCountdown`         | Display the race start countdown sequence            |
| `UpdateRaceOverlay`     | Push updated standings data to the in-race overlay   |
| `SetRaceOverlayVisible` | Show or hide the standings overlay                   |
| `HideAll`               | Hide all race UI elements                            |
| `ShowPostRaceStats`     | Display the post-race results and stats screen       |

## CI
Built and released via `.github/workflows/release.yml` on push to `main`.
