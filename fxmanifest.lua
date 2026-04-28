fx_version 'cerulean'
game 'gta5'

description 'SPiceZ Race UI (Countdown & Overlay)'
author 'SPiceZ'
version '1.1.8'

ui_page 'ui/dist/index.html'

files {
    'ui/dist/**/*',
}

client_scripts {
    'client/main.lua'
}

exports {
    'ShowCountdown',
    'UpdateRaceOverlay',
    'SetRaceOverlayVisible',
    'HideAll',
    'ShowPostRaceStats'
}

