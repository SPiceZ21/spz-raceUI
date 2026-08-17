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
    totalRaceTime: 158240,
    positions: [
      { source: 2, name: "DRIFT_KING",  position: 1, gap: "LEADER", licenseClass: "S", nation: "jp", raceNumber: 7,  crew_tag: "[APX]" },
      { source: 1, name: "SPICEZ",      position: 2, gap: "+1.25",  licenseClass: "S", nation: "in", raceNumber: 21, crew_tag: "[NR]" },
      { source: 3, name: "SHADOW_GRID", position: 3, gap: "+3.42",  licenseClass: "A", nation: "de", raceNumber: 44, crew_tag: "[NR]" },
      { source: 4, name: "TURBO_RACER", position: 4, gap: "+5.10",  licenseClass: "B", nation: "br", raceNumber: 3 },
      { source: 5, name: "NIGHT_OWL",   position: 5, gap: "+8.77",  licenseClass: "B", nation: "gb", raceNumber: 18 },
      { source: 6, name: "REDLINE",     position: 6, gap: "+12.03", licenseClass: "C", nation: "us", raceNumber: 96 }
    ]
  },
  sectors: [
    { time: 24310, colour: "purple", delta: -0.212 },
    { time: 28094, colour: "yellow", delta:  0.084 },
    null
  ],
  cpWaypoint: { dist: 184, onScreen: true, x: 0.62, y: 0.44 },
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
