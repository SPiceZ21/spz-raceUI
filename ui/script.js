const countdownApp = document.getElementById('countdown-app');
const countdownDisplay = document.getElementById('countdown-display');
const countdownTrackInfo = document.getElementById('countdown-track-info');

const raceOverlayApp = document.getElementById('race-overlay-app');
const standingsList = document.getElementById('standings-list');
const posVal = document.getElementById('pos-val');
const posTotal = document.getElementById('pos-total');
const lapVal = document.getElementById('lap-val');
const lapTotal = document.getElementById('lap-total');
const cpVal = document.getElementById('cp-val');
const cpTotal = document.getElementById('cp-total');
const currentLapDisplay = document.getElementById('current-lap-time');
const bestLapDisplay = document.getElementById('best-lap-time');

let lapStartTime = 0;
let isLapTimerRunning = false;
let rafId = null;

window.addEventListener('message', (event) => {
    const data = event.data;

    switch (data.action) {
        case 'countdown':
            handleCountdown(data.data);
            break;
        case 'raceOverlay':
            handleRaceOverlay(data.data);
            break;
        case 'hideAll':
            countdownApp.style.display = 'none';
            raceOverlayApp.style.display = 'none';
            stopLapTimer();
            break;
    }
});

function handleCountdown(data) {
    if (!data) {
        countdownApp.style.display = 'none';
        return;
    }

    countdownApp.style.display = 'flex';

    if (data.isGo) {
        countdownDisplay.className = 'monolithic-go';
        countdownDisplay.innerText = 'RACE';
        countdownTrackInfo.style.display = 'none';
        
        // Hide countdown after 2 seconds of GO
        setTimeout(() => {
            countdownApp.style.display = 'none';
        }, 2000);
    } else {
        countdownDisplay.className = 'monolithic-number';
        countdownDisplay.innerText = data.number;
        countdownTrackInfo.style.display = 'flex';
        
        document.getElementById('mono-track-name').innerText = data.track || 'AIRSTRIP ASSAULT';
        document.getElementById('mono-class-laps').innerHTML = `CLASS ${data.class || 'B'} &bull; ${data.laps || 3} LAPS`;
        document.getElementById('mono-grid').innerText = `GRID P${data.gridPos || 1}/${data.total || 8}`;
    }
}

function handleRaceOverlay(data) {
    if (data.visible === false) {
        raceOverlayApp.style.display = 'none';
        stopLapTimer();
        return;
    }

    raceOverlayApp.style.display = 'block';

    // Metrics
    posVal.innerText = data.position || 1;
    posTotal.innerText = ` / ${data.totalRacers || '–'}`;
    lapVal.innerText = data.lapNum || 1;
    lapTotal.innerText = `/${data.totalLaps || '–'}`;
    cpVal.innerText = data.checkpoint || 1;
    cpTotal.innerText = `/${data.totalCheckpoints || '–'}`;

    if (data.bestLapTime) {
        bestLapDisplay.style.display = 'block';
        bestLapDisplay.innerText = `BEST: ${formatMs(data.bestLapTime)}`;
    } else {
        bestLapDisplay.style.display = 'none';
    }

    // Standings
    renderStandings(data.positions || [], data.mySource);

    // Lap Timer logic
    // If lapNum changed, reset timer
    if (data.resetTimer || data.isFirstLap) {
        startLapTimer();
    } else if (!isLapTimerRunning) {
        startLapTimer();
    }
}

function renderStandings(positions, mySource) {
    standingsList.innerHTML = '';
    
    const myPosIndex = positions.findIndex(p => p.source === mySource);
    const topRacers = positions.slice(0, 4);

    topRacers.forEach((racer) => {
        const row = createStandingRow(racer, racer.source === mySource);
        standingsList.appendChild(row);
    });

    if (myPosIndex >= 4) {
        const spacer = document.createElement('div');
        spacer.style.height = '4px';
        spacer.style.opacity = '0.3';
        standingsList.appendChild(spacer);

        const myRow = createStandingRow(positions[myPosIndex], true);
        standingsList.appendChild(myRow);
    }
}

function createStandingRow(racer, isMe) {
    const row = document.createElement('div');
    row.className = `standing-row${isMe ? ' my-pos' : ''}`;

    row.innerHTML = `
        <span class="standing-num">${racer.position}</span>
        <span class="standing-name-main">
            ${racer.name}
            ${racer.crew_tag ? `<span style="opacity: 0.4; font-size: 10px; margin-left: 6px;">[${racer.crew_tag}]</span>` : ''}
        </span>
        <span class="standing-delta">${racer.gap || ''}</span>
    `;
    return row;
}

function startLapTimer() {
    lapStartTime = Date.now();
    if (!isLapTimerRunning) {
        isLapTimerRunning = true;
        requestAnimationFrame(updateTimer);
    }
}

function stopLapTimer() {
    isLapTimerRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
}

function updateTimer() {
    if (!isLapTimerRunning) return;

    const diff = Date.now() - lapStartTime;
    currentLapDisplay.innerText = formatMs(diff);
    
    rafId = requestAnimationFrame(updateTimer);
}

function formatMs(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}
