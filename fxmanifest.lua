fx_version 'cerulean'
game 'gta5'

description 'SPiceZ Race UI (Countdown & Overlay)'
author 'SPiceZ'
version '1.2.1'

ui_page 'ui/dist/index.html'

files {
    'ui/dist/**/*',
}

client_scripts {
    'client/main.lua'
}

exports {
    'SetKeyHints',
    'ShowCountdown',
    'UpdateRaceOverlay',
    'UpdateCPDistance',
    'UpdateCPWaypoint',
    'ShowWarmup',
    'HideWarmup',
    'UpdateLobby',
    'SetRaceOverlayVisible',
    'HideAll',
    'ShowPostRaceStats'
}

dependencies {
    'spz-core',
}

