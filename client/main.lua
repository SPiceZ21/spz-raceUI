local isRaceOverlayVisible = false

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
    if data.laps then hudCache.totalLaps = data.laps end
    if data.totalCheckpoints then hudCache.totalCheckpoints = data.totalCheckpoints end
    if data.total then hudCache.myPosition = data.gridPos or hudCache.myPosition end

    SendNUIMessage({
        action = 'countdown',
        data = data
    })
end

---@param data table { positions: table, mySource: number, lapNum: number, totalLaps: number, checkpoint: number, totalCheckpoints: number, bestLapTime: number, allTimeBest: number }
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
            -- racer.name comes from the SERVER (always valid). Statebag name is
            -- only an override once it has replicated; never downgrade to
            -- "**INVALID**" or a stale local-index lookup.
            local stateName = p['spz:name']
            if stateName == "" or stateName == "**INVALID**" then stateName = nil end
            if (not racer.name) or racer.name == "" or racer.name == "**INVALID**" then
                local localIdx = GetPlayerFromServerId(racer.source)
                racer.name = (localIdx ~= -1 and GetPlayerName(localIdx)) or "Racer"
                if racer.name == "**INVALID**" then racer.name = "Racer" end
            end
            racer.name = stateName or racer.name
            racer.avatar = p['spz:avatar'] or "https://raw.githubusercontent.com/SPiceZ21/spz-core-media-kit/main/Extra/nametag_profile.png"
            racer.licenseClass = p['spz:licenseClass'] or "D"
            racer.nation = p['spz:nation']
            racer.raceNumber = p['spz:raceNumber']
            
            if racer.source == (data.mySource or GetPlayerServerId(PlayerId())) then
                hudCache.myPosition = racer.position
            end
        end
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
        }
    })
end

-- The lap / total clocks are owned by the NUI's own interval. This resource
-- used to also push GetGameTimer() deltas (in this payload and from a 10Hz
-- thread), which ran off a different epoch than the NUI clock — the two
-- disagreed by a fraction of a second and the seconds digit flickered back and
-- forth between them. Lua sends lap *events*; the UI does the counting.

local function SetRaceOverlayVisible(visible)
    isRaceOverlayVisible = visible
    if not visible then
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

-- Sector strip — data = { sector = 1..3, time, colour = 'purple'|'green'|'yellow', delta }
-- No isRaceOverlayVisible guard: time trials never call SetRaceOverlayVisible,
-- and the NUI only renders the strip while an overlay is on screen anyway.
local function UpdateSector(data)
    SendNUIMessage({ action = 'sector', data = data or {} })
end

-- Clear the strip for a new lap.
local function ResetSectors()
    SendNUIMessage({ action = 'sectorReset', data = {} })
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
exports('UpdateSector', UpdateSector)
exports('ResetSectors', ResetSectors)
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
