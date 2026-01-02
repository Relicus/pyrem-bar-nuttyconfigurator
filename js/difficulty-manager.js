const DifficultyManager = (() => {
    const difficultyLevels = [
        { value: '1', queenCount: 20, hpMultiplier: '1', waveMultiplier: 2, firstWaveBoost: 3, resourceIncome: 1.0, shieldPower: 2.0, buildRange: 1.5, buildPower: 1.0, maxT3Builders: 3, maxUnitLaunchers: 5, maxEpics: 10 },
        { value: '2', queenCount: 25, hpMultiplier: '1.3', waveMultiplier: 2, firstWaveBoost: 3, resourceIncome: 1.05, shieldPower: 2.0, buildRange: 1.5, buildPower: 1.05, maxT3Builders: 6, maxUnitLaunchers: 7, maxEpics: 15 },
        { value: '3', queenCount: 30, hpMultiplier: '1.5', waveMultiplier: 2, firstWaveBoost: 4, resourceIncome: 1.1, shieldPower: 2.0, buildRange: 1.55, buildPower: 1.1, maxT3Builders: 10, maxUnitLaunchers: 9, maxEpics: 20 },
        { value: '4', queenCount: 32, hpMultiplier: '1.7', waveMultiplier: 3, firstWaveBoost: 5, resourceIncome: 1.15, shieldPower: 2.2, buildRange: 1.6, buildPower: 1.15, maxT3Builders: 14, maxUnitLaunchers: 11, maxEpics: 25 },
        { value: '5', queenCount: 34, hpMultiplier: '2', waveMultiplier: 3, firstWaveBoost: 6, resourceIncome: 1.2, shieldPower: 2.4, buildRange: 1.65, buildPower: 1.2, maxT3Builders: 18, maxUnitLaunchers: 13, maxEpics: 30 },
        { value: '6', queenCount: 36, hpMultiplier: '2.5', waveMultiplier: 4, firstWaveBoost: 7, resourceIncome: 1.25, shieldPower: 2.6, buildRange: 1.7, buildPower: 1.25, maxT3Builders: 24, maxUnitLaunchers: 15, maxEpics: 35 },
        { value: '7', queenCount: 38, hpMultiplier: '3', waveMultiplier: 4, firstWaveBoost: 8, resourceIncome: 1.3, shieldPower: 2.8, buildRange: 1.75, buildPower: 1.3, maxT3Builders: 30, maxUnitLaunchers: 16, maxEpics: 40 },
        { value: '8', queenCount: 44, hpMultiplier: '3.5', waveMultiplier: 4, firstWaveBoost: 9, resourceIncome: 1.35, shieldPower: 3.1, buildRange: 1.8, buildPower: 1.35, maxT3Builders: 35, maxUnitLaunchers: 17, maxEpics: 45 },
        { value: '9', queenCount: 48, hpMultiplier: '4', waveMultiplier: 5, firstWaveBoost: 10, resourceIncome: 1.4, shieldPower: 3.5, buildRange: 1.85, buildPower: 1.4, maxT3Builders: 38, maxUnitLaunchers: 18, maxEpics: 50 },
        { value: '10', queenCount: 50, hpMultiplier: '5', waveMultiplier: 5, firstWaveBoost: 10, resourceIncome: 1.5, shieldPower: 4.0, buildRange: 1.9, buildPower: 1.5, maxT3Builders: 40, maxUnitLaunchers: 20, maxEpics: 60 }
    ];

    const maxThisUnitTargets = {
        t3Builders: 'maxthisunit-t3-builders',
        unitLaunchers: 'maxthisunit-unit-launchers',
        epics: [
            'maxthisunit-epic-ragnarok',
            'maxthisunit-epic-calamity',
            'maxthisunit-epic-tyrannus',
            'maxthisunit-epic-starfall'
        ]
    };

    let deps = {
        renderMultipliers: null,
        updateOutput: null
    };

    function isDifficultyMode() {
        const toggle = document.getElementById('control-mode-toggle');
        if (toggle) {
            return !!toggle.checked;
        }
        const modeSelect = document.getElementById('control-mode-select');
        return !modeSelect || modeSelect.value !== 'custom';
    }

    function getDifficultyConfig(levelValue) {
        const levelStr = String(levelValue || '1');
        return difficultyLevels.find(level => level.value === levelStr) || difficultyLevels[0];
    }

    function updateHpSelectState() {
        const diffMode = isDifficultyMode();
        const raptorHpSelect = document.getElementById('raptor-hp-select');
        const queenHpSelect = document.getElementById('queen-hp-select');
        if (raptorHpSelect) raptorHpSelect.disabled = diffMode;
        if (queenHpSelect) queenHpSelect.disabled = diffMode;
    }

    function setMaxThisUnitFieldValue(inputId, value, disable, { dispatch = true } = {}) {
        const input = document.getElementById(inputId);
        if (!input) return;
        if (typeof value !== 'undefined') {
            input.value = String(value);
            input.dataset.effectiveValue = String(value);
            if (dispatch) {
                try {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                } catch (e) {
                    // ignore
                }
            }
        }
        if (typeof disable === 'boolean') {
            input.disabled = disable;
            const row = input.closest('.maxthisunit-field');
            if (row) {
                row.classList.toggle('disabled', disable);
                row.querySelectorAll('.maxthisunit-spin').forEach(btn => btn.disabled = disable);
            }
        }
    }

    function applyMaxThisUnitDifficulty(config, { dispatch = true } = {}) {
        if (!config) return;
        setMaxThisUnitFieldValue(maxThisUnitTargets.t3Builders, config.maxT3Builders, true, { dispatch });
        setMaxThisUnitFieldValue(maxThisUnitTargets.unitLaunchers, config.maxUnitLaunchers, true, { dispatch });
        maxThisUnitTargets.epics.forEach(id => setMaxThisUnitFieldValue(id, config.maxEpics, true, { dispatch }));
    }

    function enableMaxThisUnitFields() {
        const allIds = [
            maxThisUnitTargets.t3Builders,
            maxThisUnitTargets.unitLaunchers,
            ...maxThisUnitTargets.epics
        ];
        allIds.forEach(id => setMaxThisUnitFieldValue(id, undefined, false));
    }

    function applyDifficulty(levelValue, { triggerOutput = false } = {}) {
        if (!isDifficultyMode()) {
            return;
        }

        const config = getDifficultyConfig(levelValue);
        const difficultySelect = document.getElementById('difficulty-select');
        if (difficultySelect) {
            difficultySelect.value = config.value;
        }

        const raptorHpSelect = document.getElementById('raptor-hp-select');
        const queenHpSelect = document.getElementById('queen-hp-select');

        if (raptorHpSelect) {
            raptorHpSelect.value = config.hpMultiplier;
            raptorHpSelect.disabled = true;
        }
        if (queenHpSelect) {
            queenHpSelect.value = config.hpMultiplier;
            queenHpSelect.disabled = true;
        }

        if (typeof window.setMultiplierValue === 'function') {
            window.setMultiplierValue('raptor_queen_count', config.queenCount, { save: false });
            window.setMultiplierValue('raptor_spawncountmult', config.waveMultiplier, { save: false });
            window.setMultiplierValue('raptor_firstwavesboost', config.firstWaveBoost, { save: false });
            window.setMultiplierValue('multiplier_resourceincome', config.resourceIncome, { save: false });
            window.setMultiplierValue('multiplier_shieldpower', config.shieldPower, { save: false });
            window.setMultiplierValue('multiplier_builddistance', config.buildRange, { save: false });
            window.setMultiplierValue('multiplier_buildpower', config.buildPower, { save: false });
        }

        applyMaxThisUnitDifficulty(config, { dispatch: triggerOutput });

        if (typeof window.saveMultiplierValues === 'function') {
            window.saveMultiplierValues();
        }

        updateHpSelectState();

        if (typeof window.saveStateToStorage === 'function') {
            window.saveStateToStorage();
        }

        const updateOutput = deps.updateOutput || (typeof window.updateOutput === 'function' ? window.updateOutput : null);
        if (triggerOutput && typeof updateOutput === 'function') {
            updateOutput();
        }
    }

    function updateModeUI() {
        const isDiff = isDifficultyMode();
        const difficultyLabel = document.querySelector('.difficulty-group');
        if (difficultyLabel) {
            difficultyLabel.style.display = isDiff ? 'block' : 'none';
        }
        const controlModeSelectLabel = document.querySelector('.control-mode-hidden');
        if (controlModeSelectLabel) {
            controlModeSelectLabel.style.display = 'none';
        }
        if (isDiff) {
            const diffSelect = document.getElementById('difficulty-select');
            const cfg = getDifficultyConfig(diffSelect ? diffSelect.value : '1');
            applyMaxThisUnitDifficulty(cfg, { dispatch: false });
        } else {
            enableMaxThisUnitFields();
        }
        updateHpSelectState();
    }

    function applyMode(mode, { triggerOutput = false } = {}) {
        const controlModeSelect = document.getElementById('control-mode-select');
        const controlModeToggle = document.getElementById('control-mode-toggle');
        const resolvedMode = mode || (controlModeSelect ? controlModeSelect.value : (controlModeToggle && controlModeToggle.checked ? 'difficulty' : 'custom'));

        if (controlModeSelect) {
            controlModeSelect.value = resolvedMode;
        }
        if (controlModeToggle) {
            controlModeToggle.checked = resolvedMode !== 'custom';
            controlModeToggle.dataset.synced = 'true';
        }

        const renderMultipliers = deps.renderMultipliers || (typeof window.renderMultipliers === 'function' ? window.renderMultipliers : null);
        if (typeof renderMultipliers === 'function') {
            renderMultipliers();
        }
        updateModeUI();

        if (resolvedMode !== 'custom') {
            const difficultySelect = document.getElementById('difficulty-select');
            applyDifficulty((difficultySelect && difficultySelect.value) || '1', { triggerOutput });
        } else if (triggerOutput) {
            const updateOutput = deps.updateOutput || (typeof window.updateOutput === 'function' ? window.updateOutput : null);
            if (typeof updateOutput === 'function') {
                updateOutput();
            }
        }
    }

    function syncFromControls(options = {}) {
        const triggerOutput = typeof options === 'boolean' ? options : !!options.triggerOutput;
        const controlModeSelect = document.getElementById('control-mode-select');
        const controlModeToggle = document.getElementById('control-mode-toggle');

        if (controlModeSelect && controlModeToggle) {
            controlModeToggle.checked = controlModeSelect.value !== 'custom';
            controlModeToggle.dataset.synced = 'true';
        }

        const mode = controlModeSelect ? controlModeSelect.value : ((controlModeToggle && controlModeToggle.checked) ? 'difficulty' : 'custom');
        applyMode(mode, { triggerOutput });
    }

    function init(options = {}) {
        deps = {
            renderMultipliers: options.renderMultipliers || deps.renderMultipliers || (typeof window.renderMultipliers === 'function' ? window.renderMultipliers : null),
            updateOutput: options.updateOutput || deps.updateOutput || (typeof window.updateOutput === 'function' ? window.updateOutput : null)
        };

        const difficultySelect = document.getElementById('difficulty-select');
        const controlModeSelect = document.getElementById('control-mode-select');
        const controlModeToggle = document.getElementById('control-mode-toggle');

        const syncToggleFromSelect = () => {
            if (!controlModeToggle || !controlModeSelect) return;
            controlModeToggle.checked = controlModeSelect.value !== 'custom';
        };

        if (controlModeToggle) {
            controlModeToggle.addEventListener('change', (e) => {
                applyMode(e.target.checked ? 'difficulty' : 'custom', { triggerOutput: true });
            });
        }

        if (controlModeSelect) {
            controlModeSelect.addEventListener('change', () => {
                syncToggleFromSelect();
                applyMode(controlModeSelect.value, { triggerOutput: true });
            });
        }

        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                if (isDifficultyMode()) {
                    applyDifficulty(e.target.value, { triggerOutput: true });
                }
            });
        }

        syncFromControls({ triggerOutput: false });
        syncToggleFromSelect();
        updateModeUI();
    }

    return {
        applyDifficulty,
        applyMode,
        getDifficultyConfig,
        init,
        isDifficultyMode,
        syncFromControls
    };
})();

window.DifficultyManager = DifficultyManager;
window.isDifficultyMode = DifficultyManager.isDifficultyMode;
window.applyDifficultySelection = DifficultyManager.applyDifficulty;
window.syncDifficultySelection = DifficultyManager.syncFromControls;
