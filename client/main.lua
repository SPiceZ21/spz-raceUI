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

-- Exports
exports('ShowCountdown', ShowCountdown)
exports('UpdateRaceOverlay', UpdateRaceOverlay)
exports('SetRaceOverlayVisible', SetRaceOverlayVisible)
exports('HideAll', HideAll)

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
