fx_version 'cerulean'
game 'gta5'

description 'SPiceZ Race UI (Countdown & Overlay)'
author 'SPiceZ'
version '1.0.0'

ui_page 'ui/index.html'

files {
    'ui/index.html',
    'ui/style.css',
    'ui/script.js',
    'ui/public/fonts/*.ttf'
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
