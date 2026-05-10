-- Doom Mode
-- Themed raptor escalation with elite substitutions, Doom bosses, and rare scav cameos

-- DOOM_MODE_CORE_BOOSTS_START
do
local defs = UnitDefs or {}
local merge = table.merge
local copy = table.copy

local function addCat(existing, category)
    if type(existing) ~= 'string' or existing == '' then
        return category
    end

    for token in string.gmatch(existing, '%S+') do
        if token == category then
            return existing
        end
    end

    return existing .. ' ' .. category
end

local function getScale(mo)
    local resourceIncome = tonumber(mo.multiplier_resourceincome) or 1
    local buildPower = tonumber(mo.multiplier_buildpower) or 1
    local buildRange = tonumber(mo.multiplier_builddistance) or 1.7
    local waveMultiplier = tonumber(mo.raptor_spawncountmult) or 3
    local firstWaveBoost = tonumber(mo.raptor_firstwavesboost) or 4

    local economyPressure = (resourceIncome * 0.5)
        + (buildPower * 0.2)
        + ((buildRange / 1.7) * 0.3)
    local wavePressure = ((3 / math.max(waveMultiplier, 0.1)) * 0.6)
        + ((4 / math.max(firstWaveBoost, 0.1)) * 0.4)

    return math.max(1, 1.45 * economyPressure * wavePressure)
end

local function resMul(ss, divider)
    return math.max(1, 1 + (((ss or 1.7) - 1) / divider))
end

local function vtolOnly(weapon)
    if type(weapon) ~= 'table' or type(weapon.onlytargetcategory) ~= 'string' then
        return false
    end

    local hasVtol = false
    for token in string.gmatch(weapon.onlytargetcategory, '%S+') do
        if token == 'VTOL' then
            hasVtol = true
        elseif token ~= 'GROUNDSCOUT' then
            return false
        end
    end

    return hasVtol
end

local function avoidObj(unitDef)
    if type(unitDef) ~= 'table' then
        return
    end

    unitDef.nochasecategory = addCat(unitDef.nochasecategory, 'SATS')

    if type(unitDef.weapons) ~= 'table' then
        return
    end

    for _, weapon in pairs(unitDef.weapons) do
        if type(weapon) == 'table' and not vtolOnly(weapon) then
            weapon.badtargetcategory = addCat(weapon.badtargetcategory, 'SATS')
        end
    end
end

local function scaled(value, multiplier)
    return math.max(1, math.floor(value * multiplier + 0.5))
end

local function scaleDmg(unitDef, damageMultiplier, copyTable, mergeTables)
    if type(unitDef) ~= 'table' or type(unitDef.weapondefs) ~= 'table' or damageMultiplier == 1 then
        return
    end

    local patchedWeaponDefs = {}
    local hasPatch = false

    for weaponName, weaponDef in pairs(unitDef.weapondefs) do
        if type(weaponDef) == 'table' and type(weaponDef.damage) == 'table' then
            local patchedWeapon = copyTable and copyTable(weaponDef) or mergeTables(weaponDef, {})
            patchedWeapon.damage = copyTable and copyTable(weaponDef.damage) or mergeTables(weaponDef.damage, {})

            for damageType, amount in pairs(patchedWeapon.damage) do
                if type(amount) == 'number' then
                    patchedWeapon.damage[damageType] = math.max(1, math.floor(amount * damageMultiplier + 0.5))
                end
            end

            patchedWeaponDefs[weaponName] = patchedWeapon
            hasPatch = true
        end
    end

    if hasPatch then
        unitDef.weapondefs = mergeTables(unitDef.weapondefs, patchedWeaponDefs)
    end
end

local function boost(name, scale)
    local unitDef = defs[name]
    if not unitDef then
        return
    end

    local patch = {}
    if scale.health and unitDef.health then
        patch.health = scaled(unitDef.health, scale.health)
    end
    if scale.speed and unitDef.speed then
        patch.speed = scaled(unitDef.speed, scale.speed)
    end
    if scale.autoheal and unitDef.autoheal then
        patch.autoheal = scaled(unitDef.autoheal, scale.autoheal)
    end
    if scale.turnrate and unitDef.turnrate then
        patch.turnrate = scaled(unitDef.turnrate, scale.turnrate)
    end

    if next(patch) then
        defs[name] = merge(unitDef, patch)
        unitDef = defs[name]
    end

    if scale.damageMultiplier then
        scaleDmg(unitDef, scale.damageMultiplier, copy, merge)
    end

    unitDef.customparams = unitDef.customparams or {}
    local hpMul = scale.health or 1
    local dmgMul = scale.damageMultiplier or 1
    local speedMul = scale.speed or 1
    if unitDef.customparams.doom_scaled_hp_mul then hpMul = hpMul * unitDef.customparams.doom_scaled_hp_mul end
    if unitDef.customparams.doom_scaled_dmg_mul then dmgMul = dmgMul * unitDef.customparams.doom_scaled_dmg_mul end
    if unitDef.customparams.doom_scaled_speed_mul then speedMul = speedMul * unitDef.customparams.doom_scaled_speed_mul end
    unitDef.customparams.doom_scaled_hp_mul = hpMul
    unitDef.customparams.doom_scaled_dmg_mul = dmgMul
    unitDef.customparams.doom_scaled_speed_mul = speedMul
end

local spring = Spring
local mo = spring and spring.GetModOptions and spring.GetModOptions() or {}
local ss = getScale(mo)
local hm = resMul(ss, 1.8)
local dm = resMul(ss, 2.4)
local speedScale = resMul(ss, 6)
local doomDensity = math.max(0.5, math.min(2.0, tonumber(mo.doom_boss_density) or 1.0))

local boosts = {
    { name = 'raptor_land_swarmer_basic_t1_v1', scale = { health = 1.18 * hm, speed = 1.03, damageMultiplier = dm } },
    { name = 'raptor_land_swarmer_basic_t2_v1', scale = { health = 1.16 * hm, speed = 1.04, damageMultiplier = dm } },
    { name = 'raptor_land_assault_basic_t2_v1', scale = { health = 1.18 * hm, speed = 1.04, damageMultiplier = dm } },
    { name = 'raptor_allterrain_arty_basic_t2_v1', scale = { health = 1.2 * hm, damageMultiplier = dm } },
    { name = 'raptor_air_fighter_basic_t2_v1', scale = { health = 1.14 * hm, speed = 1.05, damageMultiplier = dm } },
    { name = 'raptor_land_swarmer_heal_t2_v1', scale = { health = 1.32 * hm, speed = 1.06, autoheal = 1.45, damageMultiplier = 1.08 * dm } },
    { name = 'raptor_land_swarmer_emp_t2_v1', scale = { health = hm, damageMultiplier = dm } },
    { name = 'raptor_allterrain_arty_emp_t2_v1', scale = { health = hm, damageMultiplier = dm } },
    { name = 'raptor_land_swarmer_acids_t2_v1', scale = { health = hm, speed = 1.02, damageMultiplier = dm } },
    { name = 'raptor_allterrain_arty_acid_t2_v1', scale = { health = hm, damageMultiplier = dm } },
    { name = 'raptor_land_swarmer_fire_t2_v1', scale = { health = hm, speed = 1.03, damageMultiplier = dm } },
    { name = 'raptor_land_assault_basic_t4_v1', scale = { health = hm, speed = 1.03, damageMultiplier = dm } },
    { name = 'raptor_land_swarmer_heal_t3_v1', scale = { health = 1.5 * hm, speed = 1.08, autoheal = 1.7, damageMultiplier = 1.15 * dm } },
    { name = 'raptor_land_swarmer_heal_t4_v1', scale = { health = 1.8 * hm, speed = 1.1, autoheal = 1.9, damageMultiplier = 1.2 * dm } },
    { name = 'raptor_land_swarmer_brood_t4_v1', scale = { health = 1.6 * hm, speed = 1.08, autoheal = 1.25, damageMultiplier = 1.18 * dm } },
    { name = 'raptor_air_bomber_basic_t2_v1', scale = { health = hm, damageMultiplier = dm } },
    { name = 'raptor_matriarch_fire', scale = { health = hm, damageMultiplier = dm } },
    { name = 'raptor_matriarch_basic', scale = { health = hm, damageMultiplier = dm } },
    { name = 'raptor_matriarch_acid', scale = { health = hm, damageMultiplier = dm } },
    { name = 'raptor_matriarch_electric', scale = { health = hm, damageMultiplier = dm } },
    { name = 'critter_penguinking', scale = { health = 1.18 * hm, speed = 1.05, damageMultiplier = 1.15 * dm } },
    { name = 'armscavengerbossv2_hard', scale = { health = 1.28 * hm, speed = 1.04, damageMultiplier = 1.12 * dm } },
    { name = 'scavengerbossv4_normal', scale = { health = 1.35 * hm, speed = 1.05, damageMultiplier = 1.18 * dm } },
}

local function cap(name, limit)
    local unitDef = defs[name]
    if unitDef then
        defs[name] = merge(unitDef, { maxthisunit = limit })
    end
end

local function clampWeaponRanges(name, maxRange)
    local unitDef = defs[name]
    if not unitDef or type(unitDef.weapondefs) ~= 'table' then return end

    local patchedWeaponDefs = {}
    local hasPatch = false

    for weaponName, weaponDef in pairs(unitDef.weapondefs) do
        if type(weaponDef) == 'table' and type(weaponDef.range) == 'number' and weaponDef.range > maxRange then
            patchedWeaponDefs[weaponName] = merge(weaponDef, { range = maxRange })
            hasPatch = true
        end
    end

    if hasPatch then
        unitDef.weapondefs = merge(unitDef.weapondefs, patchedWeaponDefs)
        defs[name] = unitDef
    end
end

local function setWeaponRange(name, weaponName, maxRange)
    local unitDef = defs[name]
    if not unitDef or type(unitDef.weapondefs) ~= 'table' or type(unitDef.weapondefs[weaponName]) ~= 'table' then return end
    unitDef.weapondefs[weaponName] = merge(unitDef.weapondefs[weaponName], { range = maxRange })
    defs[name] = unitDef
end

for _, entry in ipairs(boosts) do
    boost(entry.name, entry.scale)
end

cap('raptor_doombringer',  math.max(1, math.ceil(1 * doomDensity)))
cap('raptor_doom_queen',   math.max(1, math.ceil(1 * doomDensity)))
cap('raptor_queen_epic',   math.max(1, math.ceil(1 * doomDensity)))

for name, _ in pairs(defs) do
    if string.find(name, '^raptor_') or name == 'critter_penguinking' or string.find(name, 'scavengerboss') then
        local unitDef = defs[name]
        if unitDef then
            local customparams = unitDef.customparams or {}
            if not customparams.doom_scaled_hp_mul or not customparams.doom_scaled_dmg_mul or not customparams.doom_scaled_speed_mul then
                boost(name, {
                    health = customparams.doom_scaled_hp_mul and nil or hm,
                    speed = customparams.doom_scaled_speed_mul and nil or speedScale,
                    damageMultiplier = customparams.doom_scaled_dmg_mul and nil or dm,
                })
            end
            avoidObj(unitDef)
        end
    end
end

local mo = Spring and Spring.GetModOptions and Spring.GetModOptions() or {}
local qCount = tonumber(mo.raptor_queen_count) or 1

cap('raptor_matriarch_fire', 1)
cap('raptor_matriarch_basic', 1)
cap('armscavengerbossv2_hard', math.max(1, qCount))
cap('scavengerbossv4_normal', math.max(1, qCount))
clampWeaponRanges('armscavengerbossv2_hard', 1700)
setWeaponRange('scavengerbossv4_normal', 'shoulderturrets', 1800)
setWeaponRange('scavengerbossv4_normal', 'turbo_shoulderturrets', 1800)
setWeaponRange('scavengerbossv4_normal', 'special_botcannon', 1800)

if defs['armscavengerbossv2_hard'] then
    avoidObj(defs['armscavengerbossv2_hard'])
end

if defs['scavengerbossv4_normal'] then
    avoidObj(defs['scavengerbossv4_normal'])
end
end

-- DOOM_MODE_CORE_BOOSTS_END



-- DOOM_MODE_CORE_ELITES_START
do
local defs = UnitDefs or {}
local merge = table.merge
local copy = table.copy

local function addCat(existing, category)
    if type(existing) ~= 'string' or existing == '' then return category end
    for token in string.gmatch(existing, '%S+') do if token == category then return existing end end
    return existing .. ' ' .. category
end

local function getScale(mo)
    local resourceIncome = tonumber(mo.multiplier_resourceincome) or 1
    local buildPower = tonumber(mo.multiplier_buildpower) or 1
    local buildRange = tonumber(mo.multiplier_builddistance) or 1.7
    local waveMultiplier = tonumber(mo.raptor_spawncountmult) or 3
    local firstWaveBoost = tonumber(mo.raptor_firstwavesboost) or 4

    local economyPressure = (resourceIncome * 0.5)
        + (buildPower * 0.2)
        + ((buildRange / 1.7) * 0.3)
    local wavePressure = ((3 / math.max(waveMultiplier, 0.1)) * 0.6)
        + ((4 / math.max(firstWaveBoost, 0.1)) * 0.4)

    return math.max(1, 1.45 * economyPressure * wavePressure)
end

local function resMul(ss, divider)
    return math.max(1, 1 + (((ss or 1.7) - 1) / divider))
end

local function vtolOnly(weapon)
    if type(weapon) ~= 'table' or type(weapon.onlytargetcategory) ~= 'string' then return false end
    local hasVtol = false
    for token in string.gmatch(weapon.onlytargetcategory, '%S+') do
        if token == 'VTOL' then hasVtol = true elseif token ~= 'GROUNDSCOUT' then return false end
    end
    return hasVtol
end

local function avoidObj(unitDef)
    if type(unitDef) ~= 'table' then return end
    unitDef.nochasecategory = addCat(unitDef.nochasecategory, 'SATS')
    if type(unitDef.weapons) ~= 'table' then return end
    for _, weapon in pairs(unitDef.weapons) do
        if type(weapon) == 'table' and not vtolOnly(weapon) then
            weapon.badtargetcategory = addCat(weapon.badtargetcategory, 'SATS')
        end
    end
end

local function scaled(value, multiplier)
    return math.max(1, math.floor(value * multiplier + 0.5))
end

local function applyWT(weaponDef, tweak)
    if not weaponDef then return nil end
    local patched = copy and copy(weaponDef) or merge(weaponDef, {})
    if patched.damage then
        patched.damage = copy and copy(patched.damage) or merge(patched.damage, {})
    end
    for key, value in pairs(tweak) do
        if key ~= 'damageMultiplier' then patched[key] = value end
    end
    if tweak.damageMultiplier and patched.damage then
        for damageType, amount in pairs(patched.damage) do
            if type(amount) == 'number' then patched.damage[damageType] = scaled(amount, tweak.damageMultiplier) end
        end
    end
    return patched
end

local function elite(source, target, label, tooltip, scale, extra, weaponTweaks)
    local base = defs[source]
    if not base or defs[target] then return end
    local patch = extra and merge({}, extra) or {}
    
    local hpMul = scale.health
    if base.customparams and base.customparams.doom_scaled_hp_mul and scale.health then
        hpMul = scale.health / base.customparams.doom_scaled_hp_mul
    end
    
    if hpMul and base.health then patch.health = scaled(base.health, hpMul) end
    if scale.speed and base.speed then patch.speed = scaled(base.speed, scale.speed) end
    if scale.autoheal and base.autoheal then patch.autoheal = scaled(base.autoheal, scale.autoheal) end
    if scale.turnrate and base.turnrate then patch.turnrate = scaled(base.turnrate, scale.turnrate) end
    defs[target] = merge(base, patch)
    local unitDef = defs[target]
    unitDef.name = label
    unitDef.customparams = merge(unitDef.customparams or {}, merge(scale.squad or {}, {
        i18n_en_humanname = label,
        i18n_en_tooltip = tooltip,
        subfolder = 'other/raptors'
    }))
    if weaponTweaks and base.weapondefs then
        unitDef.weapondefs = unitDef.weapondefs or {}
        for weaponName, tweak in pairs(weaponTweaks) do
            local localTweak = tweak
            if type(tweak) == 'table' then
                localTweak = {}
                for k, v in pairs(tweak) do localTweak[k] = v end
            end
            if base.customparams and base.customparams.doom_scaled_dmg_mul and localTweak.damageMultiplier then
                localTweak.damageMultiplier = localTweak.damageMultiplier / base.customparams.doom_scaled_dmg_mul
            end
            if base.weapondefs[weaponName] then unitDef.weapondefs[weaponName] = applyWT(base.weapondefs[weaponName], localTweak) end
        end
    end
    avoidObj(unitDef)
end

local spring = Spring
local mo = spring and spring.GetModOptions and spring.GetModOptions() or {}
local ss = getScale(mo)
local hm = resMul(ss, 1.8)
local dm = resMul(ss, 2.4)

local elites = {
    { source = 'raptor_land_swarmer_emp_t2_v1', target = 'raptor_doom_shockling', label = 'Shockling Prime', tooltip = 'Fast EMP vanguard that opens themed shock waves.', scale = { health = 1.7 * hm, speed = 1.1, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 6, raptorsquadminanger = 18, raptorsquadmaxanger = 34, raptorsquadweight = 6, raptorsquadrarity = 'special', raptorsquadbehavior = 'raider', raptorsquadbehaviordistance = 550, raptorsquadbehaviorchance = 0.8 } }, extra = { maxthisunit = 18 }, weaponTweaks = { raptorparalyzersmall = { damageMultiplier = 1.35 * dm, paralyzetime = 8, rgbcolor = '0.85 0.65 1.0', rgbcolor2 = '0.35 1.0 1.0' } } },
    { source = 'raptor_land_assault_emp_t2_v1', target = 'raptor_doom_shockmaw', label = 'Shockmaw Alpha', tooltip = 'Heavy control predator that anchors EMP stampedes.', scale = { health = 2.1 * hm, speed = 1.08, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 3, raptorsquadminanger = 28, raptorsquadmaxanger = 48, raptorsquadweight = 3, raptorsquadrarity = 'special', raptorsquadbehavior = 'berserk', raptorsquadbehaviordistance = 600, raptorsquadbehaviorchance = 0.82 } }, extra = { maxthisunit = 10 }, weaponTweaks = { raptorparalyzerbig = { damageMultiplier = 1.45 * dm, paralyzetime = 12, areaofeffect = 120, rgbcolor = '0.8 0.55 1.0', rgbcolor2 = '0.4 0.9 1.0' } } },
    { source = 'raptor_allterrain_arty_emp_t4_v1', target = 'raptor_doom_ionmortar', label = 'Ion Mortar', tooltip = 'Long-range paralyzer siege beast for nightmare pressure spikes.', scale = { health = 1.65 * hm, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 2, raptorsquadminanger = 58, raptorsquadmaxanger = 92, raptorsquadweight = 2, raptorsquadrarity = 'special', raptorsquadbehavior = 'artillery', raptorsquadbehaviordistance = 2200, raptorsquadbehaviorchance = 0.68 } }, extra = { maxthisunit = 6 }, weaponTweaks = { goolauncher = { damageMultiplier = 1.4 * dm, areaofeffect = 192, paralyzetime = 12, rgbcolor = '0.75 0.75 1.0', rgbcolor2 = '0.4 1.0 1.0' } } },
    { source = 'raptor_air_bomber_emp_t2_v1', target = 'raptor_doom_stormwing', label = 'Stormwing', tooltip = 'Fast disruption bomber that turns air raids into doom signals.', scale = { health = 1.55 * hm, speed = 1.08, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 4, raptorsquadminanger = 32, raptorsquadmaxanger = 55, raptorsquadweight = 2, raptorsquadrarity = 'special', raptorsquadbehavior = 'raider', raptorsquadbehaviordistance = 900, raptorsquadbehaviorchance = 0.72 } }, extra = { maxthisunit = 8 }, weaponTweaks = { weapon = { damageMultiplier = 1.3 * dm, areaofeffect = 192, paralyzetime = 11 } } },
    { source = 'raptor_land_swarmer_acids_t2_v1', target = 'raptor_doom_blightling', label = 'Blightling', tooltip = 'Acid runner bred for corrosive swarm themes.', scale = { health = 1.65 * hm, speed = 1.12, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 7, raptorsquadminanger = 18, raptorsquadmaxanger = 36, raptorsquadweight = 6, raptorsquadrarity = 'special', raptorsquadbehavior = 'raider', raptorsquadbehaviordistance = 550, raptorsquadbehaviorchance = 0.8 } }, extra = { maxthisunit = 18 } },
    { source = 'critter_penguinking', target = 'raptor_doom_consort', label = 'Doom Consort', tooltip = 'Penguin escort that makes every mini-queen event feel reinforced.', scale = { health = 2.6 * hm, speed = 1.18, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 2, raptorsquadminanger = 34, raptorsquadmaxanger = 130, raptorsquadweight = 4, raptorsquadrarity = 'special', raptorsquadbehavior = 'berserk', raptorsquadbehaviordistance = 850, raptorsquadbehaviorchance = 0.78 } }, extra = { maxthisunit = 6 }, weaponTweaks = { eyelaser = { damageMultiplier = 2.4 * dm, reloadtime = 2.9, range = 650, rgbcolor = '1 0.45 0.16' }, goo = { damageMultiplier = 1.8 * dm, burst = 10, reloadtime = 5.8, sprayangle = 3072, rgbcolor = '1 0.72 0.24' } } },
    { source = 'raptor_matriarch_acid', target = 'raptor_doom_blightmatron', label = 'Blight Matron', tooltip = 'Corrosive apex matriarch that headlines acid bloom waves.', scale = { health = 1.25 * hm, speed = 1.06, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 1, raptorsquadminanger = 52, raptorsquadmaxanger = 82, raptorsquadweight = 2, raptorsquadrarity = 'special', raptorsquadbehavior = 'berserk', raptorsquadbehaviordistance = 650, raptorsquadbehaviorchance = 0.6 } }, extra = { maxthisunit = 2 } },
    { source = 'raptor_land_assault_basic_t4_v1', target = 'raptor_doom_cindermaw', label = 'Cindermaw', tooltip = 'Pyro-bruiser used for close-range stampede waves.', scale = { health = 1.5 * hm, speed = 1.08, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 3, raptorsquadminanger = 30, raptorsquadmaxanger = 58, raptorsquadweight = 3, raptorsquadrarity = 'special', raptorsquadbehavior = 'berserk', raptorsquadbehaviordistance = 600, raptorsquadbehaviorchance = 0.82 } }, extra = { maxthisunit = 12 } },
    { source = 'raptor_land_swarmer_brood_t4_v1', target = 'raptor_doom_broodguard', label = 'Broodguard', tooltip = 'Tankier brood escort that keeps Doom bosses buried in backup.', scale = { health = 2.1 * hm, speed = 1.07, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 6, raptorsquadminanger = 42, raptorsquadmaxanger = 130, raptorsquadweight = 4, raptorsquadrarity = 'special', raptorsquadbehavior = 'berserk', raptorsquadbehaviordistance = 650, raptorsquadbehaviorchance = 0.82 } }, extra = { maxthisunit = 12 } },
    { source = 'raptor_matriarch_electric', target = 'raptor_doom_shiverqueen', label = 'Shiver Queen', tooltip = 'Nightmare EMP matriarch that freezes frontlines in place.', scale = { health = 1.22 * hm, speed = 1.05, squad = { raptorcustomsquad = true, raptorsquadunitsamount = 1, raptorsquadminanger = 62, raptorsquadmaxanger = 95, raptorsquadweight = 2, raptorsquadrarity = 'special', raptorsquadbehavior = 'berserk', raptorsquadbehaviordistance = 700, raptorsquadbehaviorchance = 0.5 } }, extra = { maxthisunit = 2 }, weaponTweaks = { goo = { damageMultiplier = 1.35 * dm, paralyzetime = 15 }, melee = { damageMultiplier = 1.3 * dm, paralyzetime = 15 }, spike_emp_blob = { damageMultiplier = 1.25 * dm, paralyzetime = 15 } } },
}

for _, entry in ipairs(elites) do
    elite(entry.source, entry.target, entry.label, entry.tooltip, entry.scale, entry.extra, entry.weaponTweaks)
end
end

-- DOOM_MODE_CORE_ELITES_END

-- DOOM_MODE_BOSS_MINIS_START
do
local defs = UnitDefs or {}
local merge = table.merge

local function addCat(existing, category)
    if type(existing) ~= 'string' or existing == '' then return category end
    for token in string.gmatch(existing, '%S+') do if token == category then return existing end end
    return existing .. ' ' .. category
end

local function getScale(mo)
    local resourceIncome = tonumber(mo.multiplier_resourceincome) or 1
    local buildPower = tonumber(mo.multiplier_buildpower) or 1
    local buildRange = tonumber(mo.multiplier_builddistance) or 1.7
    local waveMultiplier = tonumber(mo.raptor_spawncountmult) or 3
    local firstWaveBoost = tonumber(mo.raptor_firstwavesboost) or 4
    local economyPressure = (resourceIncome * 0.5) + (buildPower * 0.2) + ((buildRange / 1.7) * 0.3)
    local wavePressure = ((3 / math.max(waveMultiplier, 0.1)) * 0.6) + ((4 / math.max(firstWaveBoost, 0.1)) * 0.4)
    return math.max(1, 1.45 * economyPressure * wavePressure)
end

local function resolveMul(ss, divider)
    return math.max(1, 1 + (((ss or 1.7) - 1) / divider))
end

local function vtolOnly(weapon)
    if type(weapon) ~= 'table' or type(weapon.onlytargetcategory) ~= 'string' then return false end
    local hasVtol = false
    for token in string.gmatch(weapon.onlytargetcategory, '%S+') do
        if token == 'VTOL' then hasVtol = true elseif token ~= 'GROUNDSCOUT' then return false end
    end
    return hasVtol
end

local function avoidObj(unitDef)
    if type(unitDef) ~= 'table' then return end
    unitDef.nochasecategory = addCat(unitDef.nochasecategory, 'SATS')
    for _, weapon in pairs(unitDef.weapons or {}) do
        if type(weapon) == 'table' and not vtolOnly(weapon) then
            weapon.badtargetcategory = addCat(weapon.badtargetcategory, 'SATS')
        end
    end
end

local function scaled(value, multiplier)
    return math.max(1, math.floor(value * multiplier + 0.5))
end

local function copy(value)
    if type(value) ~= 'table' then return value end
    local out = {}
    for key, item in pairs(value) do out[key] = copy(item) end
    return out
end

local function cu(source, target)
    local base = defs[source]
    if not base then return nil end
    if defs[target] then return defs[target] end
    defs[target] = copy(base)
    return defs[target]
end

local function sid(unitDef, label, tooltip, iconType)
    if not unitDef then return end
    unitDef.name = label
    if iconType then unitDef.icontype = iconType end
    unitDef.customparams = merge(unitDef.customparams or {}, { i18n_en_humanname = label, i18n_en_tooltip = tooltip, subfolder = 'other/raptors' })
end

local function setSquad(unitDef, minAnger, maxAnger, distance, chance, amount)
    if not unitDef then return end
    unitDef.customparams = merge(unitDef.customparams or {}, {
        raptorcustomsquad = true,
        raptorsquadunitsamount = amount or 1,
        raptorsquadminanger = minAnger,
        raptorsquadmaxanger = maxAnger,
        raptorsquadweight = 2,
        raptorsquadrarity = 'special',
        raptorsquadbehavior = 'berserk',
        raptorsquadbehaviordistance = distance,
        raptorsquadbehaviorchance = chance,
    })
end

local function tb(unitDef, scale, maxThisUnit)
    if not unitDef then return end
    
    local hpMul = scale.health
    if unitDef.customparams and unitDef.customparams.doom_scaled_hp_mul and scale.health then
        hpMul = scale.health / unitDef.customparams.doom_scaled_hp_mul
    end
    
    if hpMul and unitDef.health then unitDef.health = scaled(unitDef.health, hpMul) end
    if scale.speed and unitDef.speed then unitDef.speed = scaled(unitDef.speed, scale.speed) end
    if scale.autoheal and unitDef.autoheal then unitDef.autoheal = scaled(unitDef.autoheal, scale.autoheal) end
    if scale.turnrate and unitDef.turnrate then unitDef.turnrate = scaled(unitDef.turnrate, scale.turnrate) end
    if maxThisUnit then unitDef.maxthisunit = maxThisUnit end
end

local function tw(unitDef, weaponName, tweak)
    if not unitDef or not unitDef.weapondefs or not unitDef.weapondefs[weaponName] then return end
    local weaponDef = copy(unitDef.weapondefs[weaponName])
    
    local dmgMul = tweak.damageMultiplier
    if unitDef.customparams and unitDef.customparams.doom_scaled_dmg_mul and tweak.damageMultiplier then
        dmgMul = tweak.damageMultiplier / unitDef.customparams.doom_scaled_dmg_mul
    end
    
    if dmgMul and weaponDef.damage then
        for damageType, amount in pairs(weaponDef.damage) do
            if type(amount) == 'number' then weaponDef.damage[damageType] = scaled(amount, dmgMul) end
        end
    end
    for key, value in pairs(tweak) do if key ~= 'damageMultiplier' then weaponDef[key] = value end end
    unitDef.weapondefs[weaponName] = weaponDef
end

local spring = Spring
local mo = spring and spring.GetModOptions and spring.GetModOptions() or {}
local ss = getScale(mo)
local hm = resolveMul(ss, 1.8)
local dm = resolveMul(ss, 2.4)

local qtm = math.max(1, tonumber(mo.raptor_queentimemult) or 1.3)
local angerT = {45, 72, 74, 92, 94, 110}
local aFirst, aLast = angerT[1], angerT[#angerT]
local aEnd = qtm * aLast / 1.3
local aStretch = (aEnd - aFirst) / (aLast - aFirst)
for idx = 2, #angerT do
    angerT[idx] = math.floor(aFirst + (angerT[idx] - aFirst) * aStretch)
end

local pScale = 1
if Spring.Utilities.Gametype.IsRaptors() then
    pScale = (#Spring.GetTeamList() - 2) / 12
end
local scm = tonumber(mo.raptor_spawncountmult) or 3
pScale = pScale * (scm / 3)
local function pCap(n) return math.max(1, math.ceil(n * pScale)) end

local function findMelee(unitDef)
    if not unitDef or not unitDef.weapondefs then return nil end
    if unitDef.weapondefs.melee then return 'melee' end
    for _, weapon in pairs(unitDef.weapons or {}) do
        local weaponName = weapon and weapon.def
        if type(weaponName) == 'string' and unitDef.weapondefs[weaponName]
            and (weaponName:match('melee') or weaponName:match('claw|talon|bite|flame')) then
            return weaponName
        end
    end
    for weaponName in pairs(unitDef.weapondefs) do
        if type(weaponName) == 'string' and (weaponName:match('melee') or weaponName:match('claw|talon|bite|flame')) then
            return weaponName
        end
    end
end

local function pm(unitDef, damage, reloadtime, colorA, colorB)
    local weaponName = findMelee(unitDef)
    if not unitDef or not unitDef.weapondefs or not weaponName then return end
    local melee = copy(unitDef.weapondefs[weaponName])
    melee.name = 'Doomfire Claws'
    melee.reloadtime = reloadtime or melee.reloadtime
    melee.firestarter = 100
    melee.edgeeffectiveness = 0.85
    melee.explosiongenerator = 'custom:heatray-large'
    melee.soundstart = 'heatray3'
    melee.soundhitwet = 'sizzle'
    melee.rgbcolor = colorA or '1 0.45 0.1'
    melee.rgbcolor2 = colorB or '0.95 0.9 0.35'
    melee.damage = copy(melee.damage or {})
    melee.damage.default = damage
    if melee.damage.commanders then melee.damage.commanders = math.max(melee.damage.commanders, math.floor(damage * 0.75)) end
    unitDef.weapondefs[weaponName] = melee
end

local function pyro(unitDef, label)
    local pyroSource = defs['raptor_matriarch_fire']
    if not unitDef or not pyroSource or not pyroSource.weapondefs or not pyroSource.weapons then return end
    unitDef.weapondefs = unitDef.weapondefs or {}
    unitDef.weapondefs.flamethrowerspike = copy(pyroSource.weapondefs.flamethrowerspike)
    unitDef.weapondefs.flamethrowermain = copy(pyroSource.weapondefs.flamethrowermain)
    if unitDef.weapondefs.flamethrowerspike then unitDef.weapondefs.flamethrowerspike.name = label or 'Doomfire Breath' end
    if unitDef.weapondefs.flamethrowermain then unitDef.weapondefs.flamethrowermain.name = label or 'Doomfire Breath' end
    unitDef.weapons = unitDef.weapons or {}
    for _, weapon in pairs(unitDef.weapons) do
        if weapon.def == 'flamethrowerspike' or weapon.def == 'flamethrowermain' then return end
    end
    local nextIndex = #unitDef.weapons
    for index, weapon in ipairs(pyroSource.weapons) do
        unitDef.weapons[nextIndex + index] = copy(weapon)
    end
end



local doomMiniA = cu('raptor_queen_veryeasy', 'raptor_doom_mini_a')
if doomMiniA then
    sid(doomMiniA, 'Queenling Alpha', 'Fast herald. First warning that the ladder has begun.')
    tb(doomMiniA, { health = 1.35 * hm, speed = 1.20, autoheal = 1.10, turnrate = 1.6 }, qCount)
    setSquad(doomMiniA, angerT[1], angerT[4], 700, 0.55, qCount)
    pm(doomMiniA, 770, 0.8)
    tw(doomMiniA, 'yellow_missile', { damageMultiplier = 0.7 * dm, reloadtime = 3.6 })
    tw(doomMiniA, 'goo', { damageMultiplier = 0.7 * dm, reloadtime = 6.5, areaofeffect = 192, rgbcolor = '1 0.55 0.15' })
    doomMiniA.explodeas = 'crawl_blastsmlscavboss'
    doomMiniA.selfdestructas = 'crawl_blastsmlscavboss'
    avoidObj(doomMiniA)
end

local doomMiniB = cu('raptor_queen_veryeasy', 'raptor_doom_mini_b')
if doomMiniB then
    sid(doomMiniB, 'Queenling Beta', 'Recurring enforcer. Late-game pressure that never stops.')
    tb(doomMiniB, { health = 1.7 * hm, speed = 1.30, autoheal = 1.35, turnrate = 2.0 }, qCount)
    setSquad(doomMiniB, angerT[3], angerT[6], 760, 0.50, qCount)
    pm(doomMiniB, 1050, 0.7)
    tw(doomMiniB, 'yellow_missile', { damageMultiplier = 0.8 * dm, reloadtime = 3.2 })
    tw(doomMiniB, 'acidgoo', { damageMultiplier = 0.84 * dm, burst = 10, reloadtime = 8, sprayangle = 4096 })
    tw(doomMiniB, 'goo', { damageMultiplier = 0.8 * dm, reloadtime = 6.0, sprayangle = 4096 })
    doomMiniB.explodeas = 'commanderExplosion'
    doomMiniB.selfdestructas = 'commanderExplosion'
    avoidObj(doomMiniB)
end

local doomMiniC = cu('raptor_queen_veryeasy', 'raptor_doom_mini_c')
if doomMiniC then
    sid(doomMiniC, 'Queenling Omega', 'Apex predator. Overlaps boss phase to ensure no safe moment.')
    tb(doomMiniC, { health = 2.0 * hm, speed = 1.42, autoheal = 1.55, turnrate = 2.3 }, qCount)
    setSquad(doomMiniC, angerT[5], 130, 820, 0.46, qCount)
    pm(doomMiniC, 1400, 0.65, '1 0.35 0.08', '1 0.95 0.35')
    tw(doomMiniC, 'yellow_missile', { damageMultiplier = 0.9 * dm, reloadtime = 2.9 })
    tw(doomMiniC, 'empgoo', { damageMultiplier = 0.95 * dm, burst = 12, reloadtime = 8, sprayangle = 4096, paralyzetime = 16 })
    tw(doomMiniC, 'goo', { damageMultiplier = 0.84 * dm, reloadtime = 5.5, paralyzetime = 16 })
    doomMiniC.explodeas = 'ScavComBossExplo'
    doomMiniC.selfdestructas = 'ScavComBossExplo'
    avoidObj(doomMiniC)
end

end

-- DOOM_MODE_BOSS_MINIS_END

-- DOOM_MODE_BOSS_PROCESSION_START
do
local defs = UnitDefs or {}
local merge = table.merge

local function addCat(existing, category)
    if type(existing) ~= 'string' or existing == '' then return category end
    for token in string.gmatch(existing, '%S+') do if token == category then return existing end end
    return existing .. ' ' .. category
end

local function getScale(mo)
    local resourceIncome = tonumber(mo.multiplier_resourceincome) or 1
    local buildPower = tonumber(mo.multiplier_buildpower) or 1
    local buildRange = tonumber(mo.multiplier_builddistance) or 1.7
    local waveMultiplier = tonumber(mo.raptor_spawncountmult) or 3
    local firstWaveBoost = tonumber(mo.raptor_firstwavesboost) or 4

    local economyPressure = (resourceIncome * 0.5)
        + (buildPower * 0.2)
        + ((buildRange / 1.7) * 0.3)
    local wavePressure = ((3 / math.max(waveMultiplier, 0.1)) * 0.6)
        + ((4 / math.max(firstWaveBoost, 0.1)) * 0.4)

    return math.max(1, 1.45 * economyPressure * wavePressure)
end

local function resMul(ss, divider)
    return math.max(1, 1 + (((ss or 1.7) - 1) / divider))
end

local function vtolOnly(weapon)
    if type(weapon) ~= 'table' or type(weapon.onlytargetcategory) ~= 'string' then return false end
    local hasVtol = false
    for token in string.gmatch(weapon.onlytargetcategory, '%S+') do
        if token == 'VTOL' then hasVtol = true elseif token ~= 'GROUNDSCOUT' then return false end
    end
    return hasVtol
end

local function avoidObj(unitDef)
    if type(unitDef) ~= 'table' then return end
    unitDef.nochasecategory = addCat(unitDef.nochasecategory, 'SATS')
    if type(unitDef.weapons) ~= 'table' then return end
    for _, weapon in pairs(unitDef.weapons) do
        if type(weapon) == 'table' and not vtolOnly(weapon) then
            weapon.badtargetcategory = addCat(weapon.badtargetcategory, 'SATS')
        end
    end
end

local function scaled(value, multiplier)
    return math.max(1, math.floor(value * multiplier + 0.5))
end

local function ct(value)
    if type(value) ~= 'table' then return value end
    local out = {}
    for key, item in pairs(value) do out[key] = ct(item) end
    return out
end

local function cu(source, target)
    local base = defs[source]
    if not base then return nil end
    if defs[target] then return defs[target] end
    defs[target] = ct(base)
    return defs[target]
end

local function sid(unitDef, label, tooltip, iconType)
    if not unitDef then return end
    unitDef.name = label
    if iconType then unitDef.icontype = iconType end
    unitDef.customparams = merge(unitDef.customparams or {}, { i18n_en_humanname = label, i18n_en_tooltip = tooltip, subfolder = 'other/raptors' })
end

local function sqp(unitDef, profile)
    if not unitDef or not profile then return end
    unitDef.customparams = merge(unitDef.customparams or {}, profile)
end

local function tb(unitDef, scale, maxThisUnit)
    if not unitDef then return end

    local hpMul = scale.health
    if unitDef.customparams and unitDef.customparams.doom_scaled_hp_mul and scale.health then
        hpMul = scale.health / unitDef.customparams.doom_scaled_hp_mul
    end

    if hpMul and unitDef.health then unitDef.health = scaled(unitDef.health, hpMul) end
    if scale.speed and unitDef.speed then unitDef.speed = scaled(unitDef.speed, scale.speed) end
    if scale.autoheal and unitDef.autoheal then unitDef.autoheal = scaled(unitDef.autoheal, scale.autoheal) end
    if scale.turnrate and unitDef.turnrate then unitDef.turnrate = scaled(unitDef.turnrate, scale.turnrate) end
    if maxThisUnit then unitDef.maxthisunit = maxThisUnit end
end

local function tw(unitDef, weaponName, tweak)
    if not unitDef or not unitDef.weapondefs or not unitDef.weapondefs[weaponName] then return end
    local weaponDef = ct(unitDef.weapondefs[weaponName])

    local dmgMul = tweak.damageMultiplier
    if unitDef.customparams and unitDef.customparams.doom_scaled_dmg_mul and tweak.damageMultiplier then
        dmgMul = tweak.damageMultiplier / unitDef.customparams.doom_scaled_dmg_mul
    end

    if dmgMul and weaponDef.damage then
        for damageType, amount in pairs(weaponDef.damage) do
            if type(amount) == 'number' then weaponDef.damage[damageType] = scaled(amount, dmgMul) end
        end
    end
    for key, value in pairs(tweak) do if key ~= 'damageMultiplier' then weaponDef[key] = value end end
    unitDef.weapondefs[weaponName] = weaponDef
end

local spring = Spring
local mo = spring and spring.GetModOptions and spring.GetModOptions() or {}
local ss = getScale(mo)
local hm = resMul(ss, 1.8)
local dm = resMul(ss, 2.4)

local qtm = math.max(1, tonumber(mo.raptor_queentimemult) or 1.3)
local qCount = tonumber(mo.raptor_queen_count) or 1
local qhScale = 1.3
if defs['raptor_queen_epic'] and defs['raptor_queen_epic'].health then
    qhScale = defs['raptor_queen_epic'].health / 1250000
end
local dbBase = math.min(10, qhScale / 1.3 * 0.9)
local dbCeil = 20
local dbExp = 10 * (1.06 ^ math.max(0, math.min(qCount, dbCeil) - 8))
local dbOver = math.max(0, qCount - dbCeil)
local dbAnger = math.ceil(dbBase * (dbExp + dbOver))
local dbMinAnger = qtm * 100 + dbAnger

local angerT = {110, 125}
local aFirst, aLast = angerT[1], angerT[#angerT]
local aEnd = qtm * aLast / 1.3
local aStretch = (aEnd - aFirst) / (aLast - aFirst)
for idx = 2, #angerT do
    angerT[idx] = math.floor(aFirst + (angerT[idx] - aFirst) * aStretch)
end

local pScale = 1
if Spring.Utilities.Gametype.IsRaptors() then
    pScale = (#Spring.GetTeamList() - 2) / 12
end
local scm = tonumber(mo.raptor_spawncountmult) or 3
pScale = pScale * (scm / 3)
local function pCap(n) return math.max(1, math.ceil(n * pScale)) end

local function findMelee(unitDef)
    if not unitDef or not unitDef.weapondefs then return nil end
    if unitDef.weapondefs.melee then return 'melee' end
    if unitDef.weapons then
        for _, weapon in pairs(unitDef.weapons) do
            local weaponName = weapon and weapon.def
            if type(weaponName) == 'string' and unitDef.weapondefs[weaponName] and weaponName:match('melee') then return weaponName end
        end
        for _, weapon in pairs(unitDef.weapons) do
            local weaponName = weapon and weapon.def
            if type(weaponName) == 'string' and unitDef.weapondefs[weaponName] and weaponName:match('claw|talon|bite|flame') then return weaponName end
        end
    end
    for weaponName in pairs(unitDef.weapondefs) do
        if type(weaponName) == 'string' and weaponName:match('melee|claw|talon|bite|flame') then return weaponName end
    end
    return nil
end

local function pm(unitDef, damage, reloadtime, colorA, colorB)
    local weaponName = findMelee(unitDef)
    if not unitDef or not unitDef.weapondefs or not weaponName then return end
    local melee = ct(unitDef.weapondefs[weaponName])
    melee.name = 'Doomfire Claws'
    melee.reloadtime = reloadtime or melee.reloadtime
    melee.firestarter = 100
    melee.edgeeffectiveness = 0.85
    melee.explosiongenerator = 'custom:heatray-large'
    melee.soundstart = 'heatray3'
    melee.soundhitwet = 'sizzle'
    melee.rgbcolor = colorA or '1 0.45 0.1'
    melee.rgbcolor2 = colorB or '0.95 0.9 0.35'
    melee.damage = ct(melee.damage or {})
    melee.damage.default = damage
    if melee.damage.commanders then melee.damage.commanders = math.max(melee.damage.commanders, math.floor(damage * 0.75)) end
    unitDef.weapondefs[weaponName] = melee
end

local function pyro(unitDef, label)
    local pyroSource = defs['raptor_matriarch_fire']
    if not unitDef or not pyroSource or not pyroSource.weapondefs or not pyroSource.weapons then return end

    unitDef.weapondefs = unitDef.weapondefs or {}
    unitDef.weapondefs.flamethrowerspike = ct(pyroSource.weapondefs.flamethrowerspike)
    unitDef.weapondefs.flamethrowermain = ct(pyroSource.weapondefs.flamethrowermain)
    if unitDef.weapondefs.flamethrowerspike then unitDef.weapondefs.flamethrowerspike.name = label or 'Doomfire Breath' end
    if unitDef.weapondefs.flamethrowermain then unitDef.weapondefs.flamethrowermain.name = label or 'Doomfire Breath' end

    unitDef.weapons = unitDef.weapons or {}
    for _, weapon in pairs(unitDef.weapons) do
        if weapon.def == 'flamethrowerspike' or weapon.def == 'flamethrowermain' then return end
    end
    local nextIndex = #unitDef.weapons
    for index, weapon in ipairs(pyroSource.weapons) do
        unitDef.weapons[nextIndex + index] = ct(weapon)
    end
end

local doombringer = cu('critter_penguinking', 'raptor_doombringer')
if doombringer then
    tb(doombringer, { health = 3.5 * hm, speed = 1.24, autoheal = 2.0, turnrate = 1.4 }, pCap(1))
    doombringer.explodeas = 'ScavComBossExplo'
    doombringer.selfdestructas = 'ScavComBossExplo'
    sid(doombringer, 'Doombringer', 'Penguin siege escort for queen waves.', 'armafust3')
    sqp(doombringer, { raptorcustomsquad = true, raptorsquadunitsamount = 1, raptorsquadminanger = dbMinAnger, raptorsquadmaxanger = 1000, raptorsquadweight = 3, raptorsquadrarity = 'special', raptorsquadbehavior = 'berserk', raptorsquadbehaviordistance = 950, raptorsquadbehaviorchance = 0.6 })
    tw(doombringer, 'eyelaser', { damageMultiplier = 3.5 * dm, reloadtime = 2.4, range = 700, rgbcolor = '1 0.15 0.05' })
    tw(doombringer, 'goo', { damageMultiplier = 2.0 * dm, name = 'Amber Hailstorm', burst = 15, reloadtime = 5, sprayangle = 3072, hightrajectory = 1, rgbcolor = '0.95 0.75 0.2' })
    avoidObj(doombringer)
end

local doomQueen = cu('raptor_queen_veryeasy', 'raptor_doom_queen')
if doomQueen then
    sid(doomQueen, 'Doom Queen', 'Terrifying queen that leads the doom procession.')
    tb(doomQueen, { health = 4.0 * hm, speed = 1.65, autoheal = 4.0, turnrate = 2.8 }, qCount)
    sqp(doomQueen, { raptorcustomsquad = true, raptorsquadunitsamount = qCount, raptorsquadminanger = angerT[1], raptorsquadmaxanger = angerT[2], raptorsquadweight = 1, raptorsquadrarity = 'special', raptorsquadbehavior = 'berserk', raptorsquadbehaviordistance = 700, raptorsquadbehaviorchance = 0.34 })
    pm(doomQueen, 8000, 0.38, '1 0.3 0.05', '1 0.95 0.35')
    tw(doomQueen, 'yellow_missile', { damageMultiplier = 1.9 * dm, reloadtime = 2.8 })
    tw(doomQueen, 'goo', { damageMultiplier = 2.4 * dm, reloadtime = 4.2, areaofeffect = 320 })
    doomQueen.explodeas = 'bantha'
    doomQueen.selfdestructas = 'bantha'
    avoidObj(doomQueen)
end

local doomFinalQueen = defs['raptor_queen_epic']
if doomFinalQueen then
    tb(doomFinalQueen, { health = 7.0 * hm, speed = 3.2, autoheal = 4.2, turnrate = 3.0 })
    local fqDmg = 5.5 * dm
    if doomFinalQueen.customparams and doomFinalQueen.customparams.doom_scaled_dmg_mul then
        fqDmg = fqDmg / doomFinalQueen.customparams.doom_scaled_dmg_mul
    end
    if doomFinalQueen.weapondefs then
        for _, wd in pairs(doomFinalQueen.weapondefs) do
            if type(wd) == 'table' and type(wd.damage) == 'table' then
                for dt, amt in pairs(wd.damage) do
                    if type(amt) == 'number' then wd.damage[dt] = scaled(amt, fqDmg) end
                end
            end
        end
        local meleeWd = doomFinalQueen.weapondefs.melee
        if meleeWd and meleeWd.damage then
            for dt, amt in pairs(meleeWd.damage) do
                if type(amt) == 'number' then meleeWd.damage[dt] = scaled(amt, 1.3) end
            end
        end
        local gooWd = doomFinalQueen.weapondefs.goo
        if gooWd and gooWd.damage then
            for dt, amt in pairs(gooWd.damage) do
                if type(amt) == 'number' then gooWd.damage[dt] = scaled(amt, 1.2) end
            end
        end
    end
    doomFinalQueen.explodeas = 'bantha'
    doomFinalQueen.selfdestructas = 'bantha'
    avoidObj(doomFinalQueen)
end
end

-- DOOM_MODE_BOSS_PROCESSION_END



-- DOOM_MODE_WAVES_START
do
local defs = UnitDefs or {}
local merge = table.merge

local function squad(minAnger, maxAnger, behavior, amount, rarity, weight, distance, chance)
    return {
        raptorcustomsquad = true,
        raptorsquadunitsamount = amount or 1,
        raptorsquadminanger = minAnger,
        raptorsquadmaxanger = maxAnger,
        raptorsquadweight = weight or 1,
        raptorsquadrarity = rarity or 'basic',
        raptorsquadbehavior = behavior or 'berserk',
        raptorsquadbehaviordistance = distance or 500,
        raptorsquadbehaviorchance = chance or 0.75,
    }
end

local function assignSquad(name, params, label, tooltip)
    local unitDef = defs[name]
    if not unitDef then return end
    local custom = merge(unitDef.customparams or {}, params)
    if label then custom.i18n_en_humanname = label end
    if tooltip then custom.i18n_en_tooltip = tooltip end
    unitDef.customparams = custom
end

assignSquad('raptor_land_assault_basic_t2_v1', squad(0, 30, 'berserk', 6, 'basic', 7, 500, 0.82))
assignSquad('raptor_land_swarmer_basic_t2_v1', squad(4, 30, 'raider', 14, 'basic', 9, 500, 0.8))
assignSquad('raptor_land_swarmer_emp_t2_v1', squad(18, 45, 'raider', 10, 'basic', 8, 500, 0.78), 'Shock Swarmer', 'Fast control packs that signal Doom Mode is ramping.')
assignSquad('raptor_allterrain_arty_emp_t2_v1', squad(25, 55, 'artillery', 4, 'special', 4, 1600, 0.72), 'Shock Mortar', 'EMP siege support for shock-themed waves.')

assignSquad('raptor_land_swarmer_acids_t2_v1', squad(18, 50, 'raider', 12, 'basic', 8, 500, 0.8), 'Blight Swarmer', 'Corrosive flankers that make acid bloom waves feel unfair in the right way.')
assignSquad('raptor_allterrain_arty_acid_t2_v1', squad(28, 60, 'artillery', 4, 'special', 3, 1800, 0.72), 'Blight Mortar', 'Acid artillery used in bloom-themed pressure waves.')

assignSquad('raptor_land_swarmer_fire_t2_v1', squad(20, 55, 'berserk', 10, 'basic', 6, 500, 0.78), 'Cinder Swarmer', 'Pyro rushers for stampede waves.')
assignSquad('raptor_land_assault_basic_t4_v1', squad(24, 45, 'berserk', 4, 'special', 4, 550, 0.76), 'Stampede Brawler', 'Heavy bruisers that replace raw count with raw panic.')

assignSquad('raptor_land_swarmer_brood_t4_v1', squad(40, 90, 'raider', 10, 'special', 5, 600, 0.86), 'Brood Stampede', 'Hatchling avalanche that keeps Doom bosses buried in backup from mini queens onward.')

assignSquad('raptor_air_fighter_basic_t2_v1', squad(30, 70, 'raider', 7, 'basic', 5, 700, 0.72), 'Shrieker Flight', 'Air cover that keeps anti-swarm defenses honest.')
assignSquad('raptor_air_bomber_basic_t2_v1', squad(50, 90, 'artillery', 4, 'special', 3, 1200, 0.7), 'Ruin Bombardiers', 'Themed bombing run that punishes static greed.')

assignSquad('raptor_matriarch_fire', squad(65, 115, 'berserk', 1, 'special', 2, 650, 0.58), 'Pyro Matron', 'Rare theme boss for cinder stampedes.')
assignSquad('raptor_matriarch_basic', squad(75, 120, 'berserk', 1, 'special', 2, 650, 0.58), 'Matron of Ruin', 'Late-wave centerpiece that adds weight without adding clutter.')
local function weakenBoss(name)
    local u = defs[name]
    if not u then return end
    if u.health then u.health = u.health * 0.33 end
    if u.weapondefs then
        local newWeapons = {}
        for wk, w in pairs(u.weapondefs) do
            local nw = merge({}, w)
            if nw.damage then
                nw.damage = merge({}, nw.damage)
                for k, v in pairs(nw.damage) do
                    if type(v) == 'number' then nw.damage[k] = math.max(1, v * 0.33) end
                end
            end
            newWeapons[wk] = nw
        end
        u.weapondefs = newWeapons
    end
end

weakenBoss('armscavengerbossv2_hard')
weakenBoss('scavengerbossv4_normal')

local mo = Spring and Spring.GetModOptions and Spring.GetModOptions() or {}

local pScale = 1
if Spring.Utilities.Gametype.IsRaptors() then
    pScale = (#Spring.GetTeamList() - 2) / 12
end
local localScm = tonumber(mo.raptor_spawncountmult) or 3
local localDoomDensity = math.max(0.5, math.min(2.0, tonumber(mo.doom_boss_density) or 1.0))
pScale = pScale * (localScm / 3) * localDoomDensity
local function pCap(n) return math.max(1, math.ceil(n * pScale)) end

assignSquad('armscavengerbossv2_hard', squad(95, 140, 'berserk', pCap(2), 'special', 3, 1700, 0.6), 'Scav Harbinger', 'Frequent siege escort that starts backing up mini queens instead of waiting for the final boss window.')
assignSquad('scavengerbossv4_normal', squad(110, 150, 'berserk', pCap(2), 'special', 3, 950, 0.56), 'Scav Nightmare Core', 'Heavy scav escort that overlaps late mini queens, Doom Queen, and Ascendant events.')
end

-- DOOM_MODE_WAVES_END
