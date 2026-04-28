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
    bestLapTime = 0
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

---@param data table { positions: table, mySource: number, lapNum: number, totalLaps: number, checkpoint: number, totalCheckpoints: number, bestLapTime: number, resetTimer: boolean }
local function UpdateRaceOverlay(data)
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

    -- Update cache
    if data.lapNum then hudCache.lapNum = data.lapNum end
    if data.totalLaps then hudCache.totalLaps = data.totalLaps end
    if data.checkpoint then hudCache.checkpoint = data.checkpoint end
    if data.totalCheckpoints then hudCache.totalCheckpoints = data.totalCheckpoints end
    if data.bestLapTime then hudCache.bestLapTime = data.bestLapTime end

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

local function ShowPostRaceStats(data)
    isRacing = false
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = 'postRaceStats',
        data = data
    })
end

-- Time Trial Exports
local function TT_ShowMenu(tracks)
    SetNuiFocus(true, true)
    SendNUIMessage({ action = 'tt_open_menu', data = { tracks = tracks } })
end

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

-- Exports
exports('ShowCountdown', ShowCountdown)
exports('UpdateRaceOverlay', UpdateRaceOverlay)
exports('SetRaceOverlayVisible', SetRaceOverlayVisible)
exports('HideAll', HideAll)
exports('ShowPostRaceStats', ShowPostRaceStats)
exports('TT_ShowMenu', TT_ShowMenu)
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

-- Time Trial NUI Callbacks
RegisterNUICallback("tt_selectTrack", function(data, cb)
    SetNuiFocus(false, false)
    TriggerEvent("SPZ:tt:nuiSelectTrack", data.index)
    cb("ok")
end)

RegisterNUICallback("tt_closeMenu", function(_, cb)
    SetNuiFocus(false, false)
    TriggerEvent("SPZ:tt:nuiCloseMenu")
    cb("ok")
end)

RegisterNUICallback("tt_dismissResults", function(_, cb)
    SetNuiFocus(false, false)
    TriggerEvent("SPZ:tt:nuiDismissResults")
    cb("ok")
end)

RegisterNUICallback("tt_restartBtn", function(_, cb)
    TriggerEvent("SPZ:tt:nuiRestartBtn")
    cb("ok")
end)
