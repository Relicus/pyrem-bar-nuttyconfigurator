// Multiplier handling module for BAR Configurator
// Handles HP multipliers and game multipliers (resource, shield, raptor settings)

// --- Lua Templates ---
const luaQhpTemplate = `--NuttyB v1.52 __MULTIPLIER_TEXT__X QHP
-- docs.google.com/spreadsheets/d/1QSVsuAAMhBrhiZdTihVfSCwPzbbZWDLCtXWP23CU0ko
for b, c in pairs(UnitDefs) do
	if b:match('^raptor_queen_.*') then
		c.repairable = false
		c.canbehealed = false
		c.buildtime = 9999999
		c.autoheal = 2
		c.canSelfRepair = false
		c.health = c.health * __HEALTH_MULTIPLIER__
	end
end`;

const luaHpTemplate = `--NuttyB v1.52 __MULTIPLIER_TEXT__X HP
-- docs.google.com/spreadsheets/d/1QSVsuAAMhBrhiZdTihVfSCwPzbbZWDLCtXWP23CU0ko
for unitName, unitDef in pairs(UnitDefs) do
    if string.sub(unitName, 1, 24) == "raptor_land_swarmer_heal" then
        unitDef.reclaimspeed = 100
        unitDef.stealth = false
        unitDef.builder = false
        unitDef.workertime = unitDef.workertime * __WORKERTIME_MULTIPLIER__
        unitDef.canassist = false
        unitDef.maxthisunit = 20
    end

    if unitDef.customparams and unitDef.customparams.subfolder == "other/raptors" and unitDef.health and not unitName:match('^raptor_queen_.*') then
        unitDef.health = unitDef.health * __HEALTH_MULTIPLIER__
        --unitDef.sfxtypes = {}
        --unitDef.explodas = unitDef.explodas
    end
end

local oldUnitDef_Post = UnitDef_Post
function UnitDef_Post(unitID, unitDef)
    if oldUnitDef_Post and oldUnitDef_Post ~= UnitDef_Post then
        oldUnitDef_Post(unitID, unitDef)
    end

    if unitDef.customparams and unitDef.customparams.subfolder == "other/raptors" then
        unitDef.nochasecategory = "OBJECT"
        if unitDef.metalcost and unitDef.health then
            unitDef.metalcost = math.floor(unitDef.health * __METAL_COST_FACTOR__)
        end
    end
end`;

const luaBossHpTemplate = `--Scav Boss HP __MULTIPLIER_TEXT__X
local originalUnitDef_Post = UnitDef_Post

function UnitDef_Post(unitName, unitDef)
	originalUnitDef_Post(unitName, unitDef)
	if unitDef.health and unitName:match("^scavengerbossv4") then
		unitDef.health = math.floor(unitDef.health * __HEALTH_MULTIPLIER__)
	end
end`;

const luaScavHpTemplate = `--Scavengers HP __MULTIPLIER_TEXT__X
local originalUnitDef_Post = UnitDef_Post

function UnitDef_Post(unitName, unitDef)
	originalUnitDef_Post(unitName, unitDef)
	if unitDef.health and unitName:match("_scav$") and not unitName:match("^scavengerbossv4") then
		unitDef.health = math.floor(unitDef.health * __HEALTH_MULTIPLIER__)
	end
	if unitName:match("_scav$") then
		if unitDef.metalcost and type(unitDef.metalcost) == "number" then
 			unitDef.metalcost = math.floor(unitDef.metalcost * __HEALTH_MULTIPLIER__)
    		end
		unitDef.nochasecategory = "OBJECT"
	end
end`;

// Export templates for use in generateLuaTweak
window.LuaTemplates = {
    qhp: luaQhpTemplate,
    hp: luaHpTemplate,
    bossHp: luaBossHpTemplate,
    scavHp: luaScavHpTemplate
};

/**
 * Get game multiplier commands (resource income, shield power, build range, raptor settings)
 * @param {Array} multipliersConfig - Configuration array for multipliers
 * @param {Function} getMultiplierValues - Function to retrieve current multiplier values
 * @returns {Array<string>} Array of multiplier commands
 */

function formatMultiplierValueForCommand(value, multiplierConfig) {
    if (!multiplierConfig || typeof multiplierConfig.id !== 'string') {
        return value;
    }

    if (multiplierConfig.id === 'multiplier_builddistance') {
        const numericValue = Number.parseFloat(value);
        if (Number.isFinite(numericValue)) {
            return numericValue.toFixed(1);
        }
    }

    return value;
}

function getMultiplierCommands(multipliersConfig, getMultiplierValues) {
    const values = getMultiplierValues();
    const commands = [];

    multipliersConfig.forEach(section => {
        section.multipliers.forEach(m => {
            const value = values[m.id] || m.default;
            const prefix = m.prefix || '!';
            const formattedValue = formatMultiplierValueForCommand(value, m);
            commands.push(`${prefix}${m.id} ${formattedValue}`);
        });
    });

    return commands;
}

/**
 * Generate raw Lua tweak code for HP multipliers (not base64 encoded)
 * @param {string} type - Type of HP multiplier ('hp', 'qhp', 'boss', 'scav')
 * @param {number} multiplierValue - Multiplier value
 * @returns {string} Raw Lua code with templates filled
 */
function generateLuaTweakRaw(type, multiplierValue) {
    let originalCode;

    if (type === 'qhp') { // Raptor Queen HP
        originalCode = luaQhpTemplate
            .replace(/__MULTIPLIER_TEXT__/g, multiplierValue)
            .replace(/__HEALTH_MULTIPLIER__/g, multiplierValue);
    } else if (type === 'hp') { // Raptor HP
        const multiplierNum = parseFloat(multiplierValue);
        let metalCostFactor;
        let workerTimeMultiplier;

        switch (multiplierNum) {
            case 1.3: metalCostFactor = '0.576923077'; workerTimeMultiplier = '0.5'; break;
            case 1.5: metalCostFactor = '0.466666667'; workerTimeMultiplier = '0.5'; break;
            case 1.7: metalCostFactor = '0.411764706'; workerTimeMultiplier = '0.5'; break;
            case 2:   metalCostFactor = '0.35';        workerTimeMultiplier = '0.5'; break;
            case 2.5: metalCostFactor = '0.3';         workerTimeMultiplier = '0.6'; break;
            case 3:   metalCostFactor = '0.25';        workerTimeMultiplier = '0.55'; break;
            case 4:   metalCostFactor = '0.1875';      workerTimeMultiplier = '0.45'; break;
            case 5:   metalCostFactor = '0.15';        workerTimeMultiplier = '0.25'; break;
            default:  metalCostFactor = '1';           workerTimeMultiplier = '0.5'; break;
        }
        originalCode = luaHpTemplate
            .replace(/__MULTIPLIER_TEXT__/g, multiplierValue)
            .replace(/__HEALTH_MULTIPLIER__/g, multiplierValue)
            .replace(/__METAL_COST_FACTOR__/g, metalCostFactor)
            .replace(/__WORKERTIME_MULTIPLIER__/g, workerTimeMultiplier);
    } else if (type === 'boss') { // Boss HP
         originalCode = luaBossHpTemplate
            .replace(/__MULTIPLIER_TEXT__/g, multiplierValue)
            .replace(/__HEALTH_MULTIPLIER__/g, multiplierValue);
    } else if (type === 'scav') { // Scavenger HP
        originalCode = luaScavHpTemplate
            .replace(/__MULTIPLIER_TEXT__/g, multiplierValue)
            .replace(/__HEALTH_MULTIPLIER__/g, multiplierValue);
    }

    return originalCode;
}

// NOTE: encodeBase64Url is now a shared utility in utils.js (window.encodeBase64Url)

/**
 * Generate Lua tweak code for HP multipliers (base64-encoded for legacy use)
 * @param {string} type - Type of HP multiplier ('hp', 'qhp', 'boss', 'scav')
 * @param {number} multiplierValue - Multiplier value
 * @returns {string} Base64URL-encoded minified Lua code
 */
function generateLuaTweak(type, multiplierValue) {
    const originalCode = generateLuaTweakRaw(type, multiplierValue);

    try {
        const firstLineComment = originalCode.split('\n')[0];
        const hasLuaMinifier = typeof LuaMinifier !== 'undefined' && typeof LuaMinifier.minify === 'function';
        if (!hasLuaMinifier) {
            throw new Error('LuaMinifier not loaded');
        }

        const minifiedCode = LuaMinifier.minify(originalCode);
        const finalCodeToEncode = firstLineComment + '\n' + minifiedCode;
        return window.encodeBase64Url(finalCodeToEncode);
    } catch (e) {
        console.error(`Lua Minify Error: ${e.message}`);
        return `Error: ${e.message}`;
    }
}

// Export functions - for browser use
const getMultiplierCommandsImpl = getMultiplierCommands;
const generateLuaTweakImpl = generateLuaTweak;
window.generateLuaTweakRaw = generateLuaTweakRaw;
window.generateLuaTweak = generateLuaTweak;

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getMultiplierCommands, generateLuaTweak, generateLuaTweakRaw };
}
