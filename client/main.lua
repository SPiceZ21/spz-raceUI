local isRaceOverlayVisible = false

---@param data table { number: number, isGo: boolean, track: string, class: string, laps: number, gridPos: number, total: number }
local function ShowCountdown(data)
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
            if rawName == "**INVALID**" then rawName = "Racer" end
            racer.name = rawName
            racer.avatar = p['spz:avatar'] or "https://raw.githubusercontent.com/SPiceZ21/spz-core-media-kit/main/Extra/nametag_profile.png"
            racer.banner = p['spz:banner'] or "https://raw.githubusercontent.com/SPiceZ21/spz-core-media-kit/main/Extra/nametag.png"
            racer.license = p['spz:license'] or "D-5"
            racer.licenseClass = p['spz:licenseClass'] or "D"
            racer.crew = p['spz:crew'] or ""
        end
    end

    SendNUIMessage({
        action = 'raceOverlay',
        data = data
    })
end

local function SetRaceOverlayVisible(visible)
    isRaceOverlayVisible = visible
    if not visible then
        SendNUIMessage({ action = 'hideAll' })
    else
        -- Just show it, will be populated by next update
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

---@param data table { trackName: string, finishTime: string, position: number, bestLap: string, xpGained: number, xpNewProgress: number, classPointsGained: number, cpNewProgress: number, iRatingDelta: number, safetyRatingDelta: number }
local function ShowPostRaceStats(data)
    SendNUIMessage({
        action = 'postRaceStats',
        data = data
    })
end

-- Exports
exports('ShowCountdown', ShowCountdown)
exports('UpdateRaceOverlay', UpdateRaceOverlay)
exports('SetRaceOverlayVisible', SetRaceOverlayVisible)
exports('HideAll', HideAll)
exports('ShowPostRaceStats', ShowPostRaceStats)

-- Test Commands
RegisterCommand('testcountdown', function(source, args)
    local num = tonumber(args[1]) or 3
    
    Citizen.CreateThread(function()
        for i = num, 1, -1 do
            ShowCountdown({
                number = i,
                isGo = false,
                track = "VINEWOOD CIRCUIT",
                class = "S",
                laps = 3,
                gridPos = 1,
                total = 12
            })
            Wait(1000)
        end
        ShowCountdown({ isGo = true })
    end)
end, false)

RegisterCommand('testoverlay', function()
    SetRaceOverlayVisible(true)
    
    local mockPositions = {
        { source = 1, name = "SPiceZ", position = 1, gap = "LEADER", crew_tag = "SPZ" },
        { source = 2, name = "RacerX", position = 2, gap = "+1.2s" },
        { source = 3, name = "Speedy", position = 3, gap = "+2.5s" },
        { source = 4, name = "Ghost", position = 4, gap = "+4.1s" },
        { source = 5, name = "NoobMaster", position = 5, gap = "+10.2s" }
    }
    
    UpdateRaceOverlay({
        positions = mockPositions,
        mySource = 1,
        lapNum = 1,
        totalLaps = 3,
        checkpoint = 5,
        totalCheckpoints = 24,
        bestLapTime = 0,
        isFirstLap = true
    })
end, false)

RegisterCommand('hideui', function()
    HideAll()
end, false)

RegisterCommand('teststats', function()
    ShowPostRaceStats({
        trackName = "VINEWOOD CIRCUIT",
        finishTime = "05:42.12",
        position = 1,
        bestLap = "01:22.45",
        xpGained = 1250,
        xpNewProgress = 0.85,
        classPointsGained = 45,
        cpNewProgress = 0.65,
        iRatingDelta = 12,
        safetyRatingDelta = 4
    })
end, false)
