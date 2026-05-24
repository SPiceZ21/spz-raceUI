export const MOCK_RACE_DATA = {
  countdown: {
    number: 3,
    isGo: false,
    track: "DOWNTOWN GRAND PRIX",
    class: "A",
    laps: 3,
    gridPos: 4,
    total: 12
  },
  overlay: {
    visible: true,
    mySource: 1,
    lapNum: 2,
    totalLaps: 3,
    checkpoint: 12,
    totalCheckpoints: 24,
    bestLapTime: 72450,
    allTimeBest: 71200,
    currentLapTime: 38240,
    delta: -0.450,
    myPosition: 2,
    isTT: false,
    positions: [
      { source: 2, name: "DRIFT_KING", position: 1, gap: "+1.25s", avatar: "https://i.ibb.co/F8bBfPy/helmet-gold.png", licenseClass: "S" },
      { source: 1, name: "SPICEZ", position: 2, gap: "YOU", avatar: "https://raw.githubusercontent.com/SPiceZ21/spz-core-media-kit/main/Extra/nametag_profile.png", licenseClass: "S" },
      { source: 3, name: "SHADOW_GRID", position: 3, gap: "+3.42s", avatar: "https://i.ibb.co/qDxgS5j/helmet-blue.png", licenseClass: "A" },
      { source: 4, name: "TURBO_RACER", position: 4, gap: "+5.10s", avatar: "https://i.ibb.co/313zWqj/helmet-red.png", licenseClass: "B" }
    ]
  },
  postRace: {
    trackName: "DOWNTOWN GRAND PRIX",
    finishTime: "03:42.50",
    position: 2,
    bestLap: "01:12.45",
    xpGained: 350,
    xpNewProgress: 0.78,
    classPointsGained: 25,
    cpNewProgress: 0.65,
    iRatingDelta: 45,
    safetyRatingDelta: 0.12,
    level: 24,
    levelUp: true
  },
  tracks: [
    { name: "Downtown Grand Prix", type: "circuit", laps: 3, length: "4.2 km", index: 1 },
    { name: "Vinewood Hills Sprint", type: "sprint", length: "6.8 km", index: 2 },
    { name: "LS River Drift Track", type: "circuit", laps: 5, length: "2.1 km", index: 3 },
    { name: "Chiliad Climb", type: "sprint", length: "12.4 km", index: 4 }
  ]
}
