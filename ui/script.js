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

const postRaceStatsApp = document.getElementById('post-race-stats-app');
const statsMassiveBgText = document.getElementById('stats-massive-bg-text');
const statsHeaderTitle = document.getElementById('stats-header-title');
const statsContentInner = document.getElementById('stats-content-inner');

let lapStartTime = 0;
let raceStartTime = 0;
let isLapTimerRunning = false;
let isRaceTimerRunning = false;
let rafId = null;

let totals = {
    racers: 0,
    laps: 0,
    checkpoints: 0,
    currentLap: 1
};

window.addEventListener('message', (event) => {
    const data = event.data;

    switch (data.action) {
        case 'countdown':
            handleCountdown(data.data);
            break;
        case 'raceOverlay':
            handleRaceOverlay(data.data);
            break;
        case 'postRaceStats':
            handlePostRaceStats(data.data);
            break;
        case 'hideAll':
            countdownApp.style.display = 'none';
            raceOverlayApp.style.display = 'none';
            stopTimers();
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
        
        // Start timers
        startTimers();

        // Hide countdown after 2 seconds of GO
        setTimeout(() => {
            countdownApp.style.display = 'none';
        }, 2000);
    } else {
        countdownDisplay.className = 'monolithic-number';
        countdownDisplay.innerText = data.number;
        countdownTrackInfo.style.display = 'flex';
        
        // Store totals
        if (data.total) totals.racers = data.total;
        if (data.laps) totals.laps = data.laps;

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

    // Store new totals if provided
    if (data.totalRacers) totals.racers = data.totalRacers;
    if (data.totalLaps) totals.laps = data.totalLaps;
    if (data.totalCheckpoints) totals.checkpoints = data.totalCheckpoints;

    // Metrics
    if (data.position !== undefined) posVal.innerText = data.position;
    if (totals.racers) posTotal.innerText = ` / ${totals.racers}`;
    if (data.lapNum !== undefined) lapVal.innerText = data.lapNum;
    if (totals.laps) lapTotal.innerText = `/${totals.laps}`;
    if (data.checkpoint !== undefined) cpVal.innerText = data.checkpoint;
    if (totals.checkpoints) cpTotal.innerText = `/${totals.checkpoints}`;

    if (data.bestLapTime && data.bestLapTime > 0) {
        bestLapDisplay.style.display = 'block';
        bestLapDisplay.innerText = `BEST: ${formatMs(data.bestLapTime)}`;
    } else {
        bestLapDisplay.style.display = 'none';
    }

    // Standings
    if (data.positions && data.positions.length > 0) {
        renderStandings(data.positions, data.mySource);
        const myPos = data.positions.find(p => p.source === data.mySource);
        if (myPos) {
            posVal.innerText = myPos.position;
        }
    }

    // Lap Timer logic
    // If lapNum changed, reset timer
    if (data.resetTimer) {
        lapStartTime = Date.now();
        raceStartTime = Date.now();
        if (!isLapTimerRunning) startTimers();
    } else if (data.lapNum && data.lapNum !== totals.currentLap) {
        lapStartTime = Date.now();
        totals.currentLap = data.lapNum;
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
        <div class="bg-num">${racer.position}</div>
        <img class="standing-banner" src="${racer.banner || ''}" style="${racer.banner ? '' : 'display:none'}">
        <div class="standing-num">${racer.position}</div>
        <img class="standing-avatar" src="${racer.avatar || 'https://i.imgur.com/8NzA8m8.png'}">
        <div class="standing-info">
            <div class="standing-top">
                <span class="standing-name">${racer.name}</span>
                ${racer.crew ? `<span class="standing-crew">${racer.crew}</span>` : ''}
            </div>
            <div class="standing-license license-${racer.licenseClass || 'D'}">${racer.licenseClass || 'D'} CLASS &bull; ${racer.license || 'D-5'}</div>
        </div>
        <span class="standing-delta">${racer.gap || ''}</span>
    `;
    return row;
}

const wholeRaceDisplay = document.getElementById('whole-race-time');

function startTimers() {
    const now = Date.now();
    lapStartTime = now;
    raceStartTime = now;
    isLapTimerRunning = true;
    isRaceTimerRunning = true;
    if (rafId) cancelAnimationFrame(rafId);
    requestAnimationFrame(updateTimers);
}

function stopTimers() {
    isLapTimerRunning = false;
    isRaceTimerRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
}

function updateTimers() {
    if (!isLapTimerRunning && !isRaceTimerRunning) return;

    const now = Date.now();

    if (isLapTimerRunning) {
        const lapDiff = now - lapStartTime;
        currentLapDisplay.innerText = formatMs(lapDiff);
    }

    if (isRaceTimerRunning) {
        const raceDiff = now - raceStartTime;
        wholeRaceDisplay.innerText = formatMs(raceDiff);
    }
    
    rafId = requestAnimationFrame(updateTimers);
}

function formatMs(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

// ──────────────── POST RACE STATS LOGIC ────────────────

const CARD_SEQUENCE = ['result', 'xp', 'points', 'ir', 'sr'];
const HOLD_DURATION = 3500;
let currentCardIndex = 0;
let postRaceTimer = null;
let postRaceData = null;

function handlePostRaceStats(data) {
    if (!data) {
        postRaceStatsApp.classList.remove('visible');
        if (postRaceTimer) clearTimeout(postRaceTimer);
        return;
    }

    postRaceData = data;
    currentCardIndex = 0;
    postRaceStatsApp.classList.add('visible');
    
    showCard(CARD_SEQUENCE[currentCardIndex]);
}

function showCard(card) {
    if (!postRaceData) return;

    // Set Header
    const title = getHeaderTitle(card);
    statsHeaderTitle.innerText = title;

    // Set Background Text
    statsMassiveBgText.innerHTML = title.split(' ').map(word => `<div>${word}</div>`).join('');

    // Set Content
    statsContentInner.innerHTML = '';
    statsContentInner.classList.remove('fade-in');
    void statsContentInner.offsetWidth; // Trigger reflow
    statsContentInner.classList.add('fade-in');

    if (card === 'result') {
        statsContentInner.innerHTML = `
            <div class="slim-result">
                <div class="slim-side left">
                    <div class="slim-label">${postRaceData.trackName || 'TRACK'}</div>
                    <div class="slim-value">${postRaceData.finishTime || '00:00.00'}</div>
                </div>
                <div class="slim-center">
                    <span class="p-brand">P</span>
                    <span class="p-number">${postRaceData.position || '1'}</span>
                </div>
                <div class="slim-side right">
                    <div class="slim-label">BEST LAP TIME</div>
                    <div class="slim-value">${postRaceData.bestLap || '00:00.00'}</div>
                </div>
            </div>
        `;
    } else if (card === 'xp' || card === 'points') {
        const isXp = card === 'xp';
        const gained = isXp ? postRaceData.xpGained : postRaceData.classPointsGained;
        const progress = isXp ? (postRaceData.xpNewProgress || 0.6) : (postRaceData.cpNewProgress || 0.45);
        
        statsContentInner.innerHTML = `
            <div class="slim-progress">
                <div class="slim-prog-val">+${gained || 0}</div>
                <div class="slim-bar-container">
                    <div id="slim-bar-fill" class="slim-bar-fill" style="width: 0%"></div>
                    <div class="slim-bar-segments">
                        ${Array.from({ length: 60 }).map(() => '<div class="slim-seg"></div>').join('')}
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            const fill = document.getElementById('slim-bar-fill');
            if (fill) fill.style.width = `${progress * 100}%`;
        }, 100);
    } else if (card === 'ir') {
        const delta = postRaceData.iRatingDelta || 0;
        const color = delta >= 0 ? '#FF6200' : '#FF3B3B';
        
        statsContentInner.innerHTML = `
            <div class="slim-diff">
                <div class="slim-diff-val" style="color: ${color}">${delta >= 0 ? '+' : ''}${delta}</div>
                <div class="slim-diff-line">
                    <div class="slim-diff-base"></div>
                    <div id="slim-diff-dot" class="slim-diff-dot" style="left: 50%"></div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const dot = document.getElementById('slim-diff-dot');
            if (dot) dot.style.left = `${50 + delta}%`;
        }, 100);
    } else if (card === 'sr') {
        const delta = postRaceData.safetyRatingDelta || 0;
        const color = delta >= 0 ? '#FF6200' : '#FF3B3B';

        statsContentInner.innerHTML = `
            <div class="slim-sr">
                <div class="slim-sr-val" style="color: ${color}">${delta >= 0 ? '+' : ''}${delta}</div>
            </div>
        `;
    }

    // Schedule next card
    if (postRaceTimer) clearTimeout(postRaceTimer);
    postRaceTimer = setTimeout(() => {
        if (currentCardIndex < CARD_SEQUENCE.length - 1) {
            currentCardIndex++;
            showCard(CARD_SEQUENCE[currentCardIndex]);
        } else {
            // Hide after some time
            setTimeout(() => {
                postRaceStatsApp.classList.remove('visible');
            }, HOLD_DURATION);
        }
    }, HOLD_DURATION);
}

function getHeaderTitle(card) {
    switch (card) {
        case 'result': return 'POSITION REPORT';
        case 'xp': return 'EXPERIENCE GAINED';
        case 'points': return 'CLASS PROGRESSION';
        case 'ir': return 'SKILL DIFFERENTIAL';
        case 'sr': return 'SAFETY TELEMETRY';
        default: return '';
    }
}
