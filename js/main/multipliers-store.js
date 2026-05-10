// Multiplier state and persistence extracted from main.js.

(function (globalScope) {
    const storageConstants = globalScope.ConfiguratorStorageConstants || globalScope.AppRuntime?.get('storageConstants') || {};

    const multipliersConfig = [
        {
            section: 'resource',
            multipliers: [
                { id: 'multiplier_resourceincome', label: 'Resource Income', default: 1.5, min: 0.1, max: 10, step: 0.1 },
                { id: 'multiplier_shieldpower', label: 'Shield Power', default: 2.0, min: 0.1, max: 10, step: 0.1 },
                { id: 'multiplier_builddistance', label: 'Build Range', default: 1.7, min: 1, max: 10, step: 0.1 },
                { id: 'multiplier_buildpower', label: 'Build Power', default: 1.4, min: 0.1, max: 10, step: 0.1 }
            ]
        },
        {
            section: 'raptor',
            multipliers: [
                { id: 'raptor_queen_count', label: 'Queen Quantity', default: 20, min: 1, max: 100, step: 1, prefix: '!bSet ' },
                { id: 'raptor_spawncountmult', label: 'Wave Multiplier', default: 3, min: 1, max: 5, step: 1 },
                { id: 'raptor_firstwavesboost', label: 'First Waves Boost', default: 4, min: 1, max: 10, step: 1 },
                { id: 'raptor_graceperiodmult', label: 'Grace Period Multiplier', default: 3, min: 0.1, max: 3, step: 0.1 }
            ]
        },
        {
            section: 'doom',
            multipliers: [
                { id: 'doom_boss_density', label: 'Doom Mode Boss Density', default: 1.0, min: 0.5, max: 2.0, step: 0.1, prefix: '!bSet ' }
            ]
        }
    ];

    function getStepDecimalPlaces(step) {
        if (typeof step !== 'number' || !Number.isFinite(step) || step <= 0) {
            return 0;
        }

        let decimals = 0;
        let testStep = step;
        while (!Number.isInteger(testStep) && decimals < 10) {
            testStep *= 10;
            decimals += 1;
        }
        return decimals;
    }

    function clampMultiplierValue(rawValue, config) {
        const parsed = Number.parseFloat(rawValue);
        if (!Number.isFinite(parsed)) {
            return config.default;
        }

        let value = parsed;
        if (typeof config.min === 'number') value = Math.max(config.min, value);
        if (typeof config.max === 'number') value = Math.min(config.max, value);
        if (typeof config.step === 'number' && config.step > 0) {
            const normalized = Math.round(value / config.step) * config.step;
            const decimals = getStepDecimalPlaces(config.step);
            value = decimals > 0 ? Number.parseFloat(normalized.toFixed(decimals)) : normalized;
            if (typeof config.min === 'number') value = Math.max(config.min, value);
            if (typeof config.max === 'number') value = Math.min(config.max, value);
        }
        return value;
    }

    function formatMultiplierValueForDisplay(value, config) {
        if (value === undefined || value === null) {
            return value;
        }
        if (typeof config.step === 'number' && config.step > 0) {
            const decimals = getStepDecimalPlaces(config.step);
            if (decimals > 0) {
                const numericValue = Number.parseFloat(value);
                if (Number.isFinite(numericValue)) {
                    return numericValue.toFixed(decimals);
                }
            }
        }
        return value;
    }

    function getMultiplierValues() {
        const saved = localStorage.getItem(storageConstants.MULTIPLIERS_KEY || 'nuttyb-game-multipliers');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const sanitized = {};
                multipliersConfig.forEach((section) => {
                    section.multipliers.forEach((multiplier) => {
                        sanitized[multiplier.id] = clampMultiplierValue(parsed ? parsed[multiplier.id] : undefined, multiplier);
                    });
                });
                return sanitized;
            } catch (error) {
                console.warn('Failed to parse stored multiplier values, falling back to defaults:', error);
            }
        }

        const defaults = {};
        multipliersConfig.forEach((section) => {
            section.multipliers.forEach((multiplier) => {
                defaults[multiplier.id] = multiplier.default;
            });
        });
        return defaults;
    }

    function saveMultiplierValues() {
        const values = {};
        multipliersConfig.forEach((section) => {
            section.multipliers.forEach((multiplier) => {
                const input = document.getElementById(`${multiplier.id}-input`);
                if (!input) {
                    return;
                }
                const sanitized = clampMultiplierValue(input.value, multiplier);
                values[multiplier.id] = sanitized;
                input.value = formatMultiplierValueForDisplay(sanitized, multiplier);
                const linkedSlider = document.getElementById(`${multiplier.id}-slider`);
                if (linkedSlider) {
                    linkedSlider.value = sanitized;
                }
            });
        });
        localStorage.setItem(storageConstants.MULTIPLIERS_KEY || 'nuttyb-game-multipliers', JSON.stringify(values));
    }

    function findMultiplierConfigById(id) {
        for (const section of multipliersConfig) {
            const found = section.multipliers.find((multiplier) => multiplier.id === id);
            if (found) {
                return found;
            }
        }
        return null;
    }

    function setMultiplierValue(id, rawValue, options = {}) {
        const { save = true } = options;
        const config = findMultiplierConfigById(id);
        if (!config) {
            return null;
        }

        const sanitized = clampMultiplierValue(rawValue, config);
        const displayValue = formatMultiplierValueForDisplay(sanitized, config);
        const input = document.getElementById(`${id}-input`);
        const slider = document.getElementById(`${id}-slider`);
        if (input) input.value = displayValue;
        if (slider) slider.value = sanitized;
        if (save) saveMultiplierValues();
        return sanitized;
    }

    function getMultiplierCommands() {
        if (typeof globalScope.getMultiplierCommandsImpl === 'function') {
            return globalScope.getMultiplierCommandsImpl(multipliersConfig, getMultiplierValues);
        }
        return [];
    }

    function generateLuaTweak(type, multiplierValue) {
        if (typeof globalScope.generateLuaTweakImpl === 'function') {
            return globalScope.generateLuaTweakImpl(type, multiplierValue);
        }
        return '';
    }

    const api = {
        multipliersConfig,
        clampMultiplierValue,
        formatMultiplierValueForDisplay,
        getMultiplierValues,
        saveMultiplierValues,
        findMultiplierConfigById,
        setMultiplierValue,
        getMultiplierCommands,
        generateLuaTweak
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainMultipliersStore', api);
    }

    globalScope.MainMultipliersStore = api;
    globalScope.getMultiplierValues = getMultiplierValues;
    globalScope.getMultiplierCommands = getMultiplierCommands;
    globalScope.generateLuaTweak = generateLuaTweak;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
