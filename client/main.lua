local isRaceOverlayVisible = false
local raceStartTime = 0
local lapStartTime = 0
local isRacing = false

-- HUD State Cache
local hudCache = {
    lapNum = 1,
    totalLaps = '?',
    checkpoint = 1,
    totalCheckpoints = '?',
    myPosition = '1',
    bestLapTime = 0,
    allTimeBest = 0
}

---@param data table { number: number, isGo: boolean, track: string, class: string, laps: number, gridPos: number, total: number }
local function ShowCountdown(data)
    if data.isGo then
        isRacing = true
        raceStartTime = GetGameTimer()
        lapStartTime = raceStartTime
    end

    if data.laps then hudCache.totalLaps = data.laps end
    if data.totalCheckpoints then hudCache.totalCheckpoints = data.totalCheckpoints end
    if data.total then hudCache.myPosition = data.gridPos or hudCache.myPosition end

    SendNUIMessage({
        action = 'countdown',
        data = data
    })
end

---@param data table { positions: table, mySource: number, lapNum: number, totalLaps: number, checkpoint: number, totalCheckpoints: number, bestLapTime: number, allTimeBest: number, resetTimer: boolean }
local function UpdateRaceOverlay(data)
    -- Update cache first regardless of visibility so we don't miss initialization telemetry
    if data.lapNum then hudCache.lapNum = data.lapNum end
    if data.totalLaps then hudCache.totalLaps = data.totalLaps end
    if data.checkpoint then hudCache.checkpoint = data.checkpoint end
    if data.totalCheckpoints then hudCache.totalCheckpoints = data.totalCheckpoints end
    if data.bestLapTime then hudCache.bestLapTime = data.bestLapTime end
    if data.allTimeBest then hudCache.allTimeBest = data.allTimeBest end

    if not isRaceOverlayVisible then return end
    
    if data.positions then
        for i, racer in ipairs(data.positions) do
            local p = Player(racer.source).state
            local rawName = p['spz:name'] or p['spz:nametag'] or GetPlayerName(GetPlayerFromServerId(racer.source)) or "Racer"
            if rawName == "**INVALID**" then rawName = GetPlayerName(GetPlayerFromServerId(racer.source)) or "Racer" end
            racer.name = rawName
            racer.avatar = p['spz:avatar'] or "https://raw.githubusercontent.com/SPiceZ21/spz-core-media-kit/main/Extra/nametag_profile.png"
            racer.licenseClass = p['spz:licenseClass'] or "D"
            
            if racer.source == (data.mySource or GetPlayerServerId(PlayerId())) then
                hudCache.myPosition = racer.position
            end
        end
    end

    if data.resetTimer then
        lapStartTime = GetGameTimer()
    end

    SendNUIMessage({
        action = 'raceOverlay',
        data = {
            visible = true,
            positions = data.positions,
            mySource = data.mySource or GetPlayerServerId(PlayerId()),
            lapNum = hudCache.lapNum,
            totalLaps = hudCache.totalLaps,
            checkpoint = hudCache.checkpoint,
            totalCheckpoints = hudCache.totalCheckpoints,
            bestLapTime = hudCache.bestLapTime,
            allTimeBest = hudCache.allTimeBest,
            myPosition = hudCache.myPosition,
            currentLapTime = isRacing and (GetGameTimer() - lapStartTime) or 0
        }
    })
end

-- Timer Thread for Live Updates
Citizen.CreateThread(function()
    while true do
        if isRacing and isRaceOverlayVisible then
            SendNUIMessage({
                action = 'race_timer',
                data = {
                    time = GetGameTimer() - lapStartTime
                }
            })
            Citizen.Wait(100) -- Stable 10Hz update
        else
            Citizen.Wait(500)
        end
    end
end)

local function SetRaceOverlayVisible(visible)
    isRaceOverlayVisible = visible
    if not visible then
        isRacing = false
        SendNUIMessage({ action = 'hideAll' })
    else
        SendNUIMessage({
            action = 'raceOverlay',
            data = { visible = true }
        })
    end
end

local function HideAll()
    isRaceOverlayVisible = false
    isRacing = false
    SendNUIMessage({ action = 'hideAll' })
end

-- Post-race results are NON-BLOCKING: no NUI focus, so the player keeps full
-- control and can drive off immediately. Backspace-to-dismiss is handled here
-- in Lua (a focusless NUI can't receive keyboard input).
local _statsActive = false

local function HidePostRaceStats()
    _statsActive = false
    SendNUIMessage({ action = 'dismissStats' })
end

local function ShowPostRaceStats(data)
    isRacing = false
    _statsActive = true
    -- NO SetNuiFocus — player stays in control
    SendNUIMessage({
        action = 'postRaceStats',
        data = data
    })

    CreateThread(function()
        while _statsActive do
            -- 177 = INPUT_FRONTEND_DELETE (Backspace)
            if IsControlJustPressed(0, 177) then
                HidePostRaceStats()
                break
            end
            Wait(0)
        end
    end)
end

-- Time Trial Exports
-- (track-selection menu moved to ox_lib in spz-races/client/timetrail.lua)
local function TT_UpdateHUD(data)
    SendNUIMessage({ action = 'tt_hud_show', data = data })
end

local function TT_Hide()
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'tt_hide' })
end

local function TT_Broadcast(action, data)
    SendNUIMessage({ action = action, data = data })
end

-- Dedicated distance update — targeted NUI message so the distance pill
-- re-renders without touching Standings / Telemetry state (no full HUD diff).
local function UpdateCPDistance(distM)
    if not isRaceOverlayVisible then return end
    SendNUIMessage({ action = 'cpDistUpdate', data = { dist = distM or 0 } })
end

-- 3D-billboard waypoint for the next CP: screen-projected position + distance.
-- data = { dist, onScreen, x, y }  (x/y are 0..1 screen coords)
local function UpdateCPWaypoint(data)
    if not isRaceOverlayVisible then return end
    SendNUIMessage({ action = 'cpWaypoint', data = data or {} })
end

-- Warmup tile panel — data = { remaining, total, track, class, gridPos }
local function ShowWarmup(data)
    SendNUIMessage({ action = 'warmup', data = data or {} })
end

local function HideWarmup()
    SendNUIMessage({ action = 'warmupEnd', data = {} })
end

-- Toggle the standings list (keybind, rebindable in Settings → Key Bindings)
RegisterCommand("standingstoggle", function()
    SendNUIMessage({ action = 'standingsToggle', data = {} })
end, false)
RegisterKeyMapping("standingstoggle", "Race: Toggle Standings List", "keyboard", "Z")

-- Lobby pill — data = { mode = 'hidden'|'join'|'queued'|'intermission',
--                       queueCount, queuePos, seconds }
local function UpdateLobby(data)
    SendNUIMessage({ action = 'lobby', data = data or {} })
end

-- Exports
exports('ShowCountdown', ShowCountdown)
exports('UpdateRaceOverlay', UpdateRaceOverlay)
exports('UpdateCPDistance', UpdateCPDistance)
exports('UpdateCPWaypoint', UpdateCPWaypoint)
exports('ShowWarmup', ShowWarmup)
exports('HideWarmup', HideWarmup)
exports('UpdateLobby', UpdateLobby)
exports('SetRaceOverlayVisible', SetRaceOverlayVisible)
exports('HideAll', HideAll)
exports('ShowPostRaceStats', ShowPostRaceStats)
exports('TT_UpdateHUD', TT_UpdateHUD)
exports('TT_Hide', TT_Hide)
exports('TT_Broadcast', TT_Broadcast)

-- Event Listeners for Race Bridge
RegisterNetEvent("SPZ:lapComplete", function()
    lapStartTime = GetGameTimer()
end)

RegisterNetEvent("spz_race:state_updated", function(state)
    if state == "IDLE" or state == "CLEANUP" then
        HideAll()
    end
end)

RegisterNUICallback("tt_dismissResults", function(_, cb)
    _statsActive = false           -- stop the backspace poll if it's still running
    SetNuiFocus(false, false)
    TriggerEvent("SPZ:tt:nuiDismissResults")
    cb("ok")
end)

RegisterNUICallback("tt_restartBtn", function(_, cb)
    TriggerEvent("SPZ:tt:nuiRestartBtn")
    cb("ok")
end)
