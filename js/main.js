        let rawOptionsData = [];
        let formOptionsConfig = [];
        window.formOptionsConfig = formOptionsConfig;  // Expose to global scope
        let customOptions = [];
        let gameConfigs = { maps: [], modes: [], base: [], scavengers: [] };
        window.gameConfigs = gameConfigs;  // Expose to global scope for command-builder.js
        let tweakFileCache = null; // Cache of scanned file sections
        let latestSlotSnapshot = { slots: [], slotUsage: null, context: {} };

        // REMOVED: CHECKBOX_TO_MARKERS - No longer needed with automatic UI generation

        const optionsFormColumns = document.getElementById('options-form-columns');
        const leftColumn = document.getElementById('left-column');
        const rightColumn = document.getElementById('right-column');
        const customSettingsContainer = document.getElementById('custom-settings-container');
        const customLeftColumn = document.getElementById('custom-left-column');
        const customRightColumn = document.getElementById('custom-right-column');
        const slotWarningContainer = document.getElementById('slot-warning-messages');
        const lobbyNameDisplay = document.getElementById('lobby-name-display');
        const libraryStatusBanner = document.getElementById('library-status');
        const rebuildButton = document.getElementById('rebuild-button');
        const copyButtons = document.querySelectorAll('.copy-button');
        const customTweaksTableBody = document.querySelector('#custom-tweaks-table tbody');
        const sheetSyncButton = null; // Sheet sync removed
        const sheetSyncStatus = null; // Sheet sync removed
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const MAX_SECTION_LENGTH = 51000;
        const STATE_STORAGE_KEY = 'nuttyb-state-v1';
        const difficultyManager = window.DifficultyManager || {
            isDifficultyMode: () => false,
            applyDifficulty: () => {},
            applyMode: () => {},
            init: () => {},
            syncFromControls: () => {}
        };

        // --- Game Multipliers Configuration ---
        const MULTIPLIERS_KEY = 'nuttyb-game-multipliers';
        const multipliersConfig = [
            {
                section: 'resource',
                multipliers: [
                    { id: 'multiplier_resourceincome', label: 'Resource Income', default: 1, min: 0.1, max: 10, step: 0.1 },
                    { id: 'multiplier_shieldpower', label: 'Shield Power', default: 2.0, min: 0.1, max: 10, step: 0.1 },
                    { id: 'multiplier_builddistance', label: 'Build Range', default: 1.5, min: 1, max: 10, step: 0.1 },
                    { id: 'multiplier_buildpower', label: 'Build Power', default: 1, min: 0.1, max: 10, step: 0.1 }
                ]
            },
            {
                section: 'raptor',
                multipliers: [
                    { id: 'raptor_queen_count', label: 'Queen Quantity', default: 20, min: 1, max: 100, step: 1, prefix: '!bSet ' },
                    { id: 'raptor_spawncountmult', label: 'Wave Multiplier', default: 4, min: 1, max: 5, step: 1 },
                    { id: 'raptor_firstwavesboost', label: 'First Waves Boost', default: 6, min: 1, max: 10, step: 1 },
                    { id: 'raptor_graceperiodmult', label: 'Grace Period Multiplier', default: 3, min: 0.1, max: 3, step: 0.1 }
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
            if (typeof config.min === 'number') {
                value = Math.max(config.min, value);
            }
            if (typeof config.max === 'number') {
                value = Math.min(config.max, value);
            }
            if (typeof config.step === 'number' && config.step > 0) {
                const normalized = Math.round(value / config.step) * config.step;
                const decimals = getStepDecimalPlaces(config.step);
                value = decimals > 0 ? Number.parseFloat(normalized.toFixed(decimals)) : normalized;
                if (typeof config.min === 'number') {
                    value = Math.max(config.min, value);
                }
                if (typeof config.max === 'number') {
                    value = Math.min(config.max, value);
                }
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
            const saved = localStorage.getItem(MULTIPLIERS_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const sanitized = {};
                    multipliersConfig.forEach(section => {
                        section.multipliers.forEach(m => {
                            const raw = parsed ? parsed[m.id] : undefined;
                            sanitized[m.id] = clampMultiplierValue(raw, m);
                        });
                    });
                    return sanitized;
                } catch (error) {
                    console.warn('Failed to parse stored multiplier values, falling back to defaults:', error);
                }
            }

            // Return defaults
            const defaults = {};
            multipliersConfig.forEach(section => {
                section.multipliers.forEach(m => {
                    defaults[m.id] = m.default;
                });
            });
            return defaults;
        }

        function saveMultiplierValues() {
            const values = {};
            multipliersConfig.forEach(section => {
                section.multipliers.forEach(m => {
                    const input = document.getElementById(`${m.id}-input`);
                    if (input) {
                        const sanitized = clampMultiplierValue(input.value, m);
                        values[m.id] = sanitized;
                        const displayValue = formatMultiplierValueForDisplay(sanitized, m);
                        input.value = displayValue;
                        const linkedSlider = document.getElementById(`${m.id}-slider`);
                        if (linkedSlider) {
                            linkedSlider.value = sanitized;
                        }
                    }
                });
            });
            localStorage.setItem(MULTIPLIERS_KEY, JSON.stringify(values));
        }

        function findMultiplierConfigById(id) {
            for (const section of multipliersConfig) {
                const found = section.multipliers.find(m => m.id === id);
                if (found) {
                    return found;
                }
            }
            return null;
        }

        function setMultiplierValue(id, rawValue, { save = true } = {}) {
            const config = findMultiplierConfigById(id);
            if (!config) return null;

            const sanitized = clampMultiplierValue(rawValue, config);
            const displayValue = formatMultiplierValueForDisplay(sanitized, config);

            const input = document.getElementById(`${id}-input`);
            const slider = document.getElementById(`${id}-slider`);

            if (input) {
                input.value = displayValue;
            }
            if (slider) {
                slider.value = sanitized;
            }

            if (save) {
                saveMultiplierValues();
            }

            return sanitized;
        }

        function renderMultipliers() {
            const resourceContainer = document.getElementById('resource-multipliers');
            const raptorContainer = document.getElementById('raptor-multipliers');

            if (!resourceContainer || !raptorContainer) return;

            const values = getMultiplierValues();
            const difficultyMode = difficultyManager.isDifficultyMode();

            resourceContainer.innerHTML = '';
            raptorContainer.innerHTML = '';

            multipliersConfig.forEach(section => {
                const container = section.section === 'resource' ? resourceContainer : raptorContainer;

                section.multipliers.forEach(m => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'multiplier-control';

                    const label = document.createElement('label');
                    label.textContent = m.label;
                    label.htmlFor = `${m.id}-input`;

                    const controlsWrapper = document.createElement('div');
                    controlsWrapper.className = 'multiplier-controls';

                    const slider = document.createElement('input');
                    const isDifficultyControlled = difficultyMode;
                    slider.type = 'range';
                    slider.id = `${m.id}-slider`;
                    slider.min = m.min;
                    slider.max = m.max;
                    slider.step = m.step;
                    const initialValue = clampMultiplierValue(values[m.id], m);
                    slider.value = initialValue;
                    slider.dataset.defaultValue = m.default;
                    slider.disabled = isDifficultyControlled;
                    slider.style.pointerEvents = isDifficultyControlled ? 'none' : 'auto';
                    slider.style.touchAction = isDifficultyControlled ? 'none' : 'auto';

                    const displayDefaultValue = formatMultiplierValueForDisplay(m.default, m);
                    const initialDisplayValue = formatMultiplierValueForDisplay(initialValue, m);

                    const input = document.createElement('input');
                    input.type = 'number';
                    input.id = `${m.id}-input`;
                    input.min = m.min;
                    input.max = m.max;
                    input.step = m.step;
                    input.value = initialDisplayValue;
                    input.className = 'multiplier-input';
                    input.dataset.defaultValue = displayDefaultValue;
                    input.disabled = isDifficultyControlled;

                    // Create spinner wrapper and buttons
                    const spinnerWrapper = document.createElement('div');
                    spinnerWrapper.className = 'input-spinner-wrapper';

                    const spinnerButtons = document.createElement('div');
                    spinnerButtons.className = 'spinner-buttons';

                    const upButton = document.createElement('button');
                    upButton.type = 'button';
                    upButton.className = 'spinner-button spinner-button-up';
                    upButton.textContent = '+';
                    upButton.title = 'Increase value';

                    const downButton = document.createElement('button');
                    downButton.type = 'button';
                    downButton.className = 'spinner-button spinner-button-down';
                    downButton.textContent = '-';
                    downButton.title = 'Decrease value';

                    // Update button states based on input value
                    const updateButtonStates = (currentValue = clampMultiplierValue(input.value, m)) => {
                        upButton.disabled = isDifficultyControlled || currentValue >= m.max;
                        downButton.disabled = isDifficultyControlled || currentValue <= m.min;
                    };

                    const applyMultiplierValue = (value, shouldUpdateOutput = true) => {
                        const sanitized = clampMultiplierValue(value, m);
                        const displayValue = formatMultiplierValueForDisplay(sanitized, m);
                        input.value = displayValue;
                        slider.value = sanitized;
                        updateButtonStates(sanitized);
                        saveMultiplierValues();
                        if (shouldUpdateOutput && typeof updateOutput === 'function') {
                            updateOutput();
                        }
                    };

                    // Up button handler
                    upButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        input.stepUp();
                        applyMultiplierValue(input.value);
                    });

                    // Down button handler
                    downButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        input.stepDown();
                        applyMultiplierValue(input.value);
                    });

                    if (isDifficultyControlled) {
                        upButton.disabled = true;
                        downButton.disabled = true;
                    }

                    // Sync slider and input
                    slider.addEventListener('input', (e) => {
                        applyMultiplierValue(e.target.value, false);
                    });

                    slider.addEventListener('change', (e) => {
                        applyMultiplierValue(e.target.value, true);
                    });

                    input.addEventListener('input', (e) => {
                        applyMultiplierValue(e.target.value);
                    });

                    spinnerButtons.appendChild(upButton);
                    spinnerButtons.appendChild(downButton);
                    spinnerWrapper.appendChild(input);
                    spinnerWrapper.appendChild(spinnerButtons);

                    // Initialize button states
                    updateButtonStates();

                    controlsWrapper.appendChild(slider);
                    controlsWrapper.appendChild(spinnerWrapper);

                    wrapper.appendChild(label);
                    wrapper.appendChild(controlsWrapper);
                    container.appendChild(wrapper);
                });
            });
        }

        function getMultiplierCommands() {
            // Delegate to multiplier-handler module
            return getMultiplierCommandsImpl(multipliersConfig, getMultiplierValues);
        }

        function generateLuaTweak(type, multiplierValue) {
            // Delegate to multiplier-handler module
            return generateLuaTweakImpl(type, multiplierValue);
        }

        function populateStartSelector() {
            return populateStartSelectorImpl();
        }

        async function loadConfigData() {
            return await loadConfigDataImpl();
        }
        
        async function loadLinksContent() {
            // Delegate to config-loader module
            return loadLinksContentImpl();
        }

        /**
         * Generate dynamic checkbox UI from scanned tweak files (file-level only)
         * @param {Object} tweakFileCache - File path -> file data mapping
         */
        async function generateDynamicCheckboxUI(tweakFileCache) {
            // Delegate to ui-generator module
            return await generateDynamicCheckboxUIImpl(tweakFileCache, updateOutput);
        }

        let slotPackerReadyPromise = null;

        function ensureSlotPackerHelpersReady() {
            if (typeof window === 'undefined') {
                return Promise.resolve();
            }
            if (typeof window.packIntoSlots === 'function' && typeof window.getSlotSummary === 'function') {
                return Promise.resolve();
            }

            if (!slotPackerReadyPromise) {
                slotPackerReadyPromise = new Promise((resolve) => {
                    let pollInterval = null;

                    const maybeResolve = () => {
                        if (typeof window.packIntoSlots === 'function' && typeof window.getSlotSummary === 'function') {
                            if (pollInterval) {
                                clearInterval(pollInterval);
                            }
                            window.removeEventListener('slotPackerReady', onSlotPackerReady);
                            resolve();
                            return true;
                        }
                        return false;
                    };

                    const onSlotPackerReady = () => {
                        maybeResolve();
                    };

                    if (!maybeResolve()) {
                        window.addEventListener('slotPackerReady', onSlotPackerReady, { once: true });
                        pollInterval = setInterval(() => {
                            if (maybeResolve()) {
                                clearInterval(pollInterval);
                            }
                        }, 50);
                    }
                });
            }

            return slotPackerReadyPromise;
        }

        async function generateDynamicSlotCommands() {
            await ensureSlotPackerHelpersReady();

            const packerFn = (typeof window !== 'undefined' && typeof window.packIntoSlots === 'function') ? window.packIntoSlots : null;
            const summaryFn = (typeof window !== 'undefined' && typeof window.getSlotSummary === 'function') ? window.getSlotSummary : null;

            if (!packerFn || !summaryFn) {
                throw new Error('Slot packer helpers are unavailable');
            }

            return generateDynamicSlotCommandsImpl(tweakFileCache, packerFn, summaryFn);
        }

        async function generateSlotBasedCommands() {
            try {
        const result = await generateDynamicSlotCommands();
        console.log("Dynamic slot generation complete");
        return result;
    } catch (error) {
        console.error("Dynamic slot generation failed", error);
        return { commands: [], usedSlots: { tweakdefs: new Set(), tweakunits: new Set() }, slotDetails: [] };
    }
}

        async function parseModesFile(filePath) {
            // Delegate to config-loader module
            return parseModesFileImpl(filePath);
        }

        // --- Custom Tweaks Management (delegated to custom-tweaks.js) ---
        function loadCustomOptions() {
            customOptions = loadCustomOptionsImpl();
        }

        function saveCustomOptions() {
            saveCustomOptionsImpl(customOptions);
        }

        function addCustomTweak(event) {
            const nextOptions = addCustomTweakImpl(event, customOptions);
            if (nextOptions === customOptions) {
                return;
            }
            customOptions = nextOptions;
            saveCustomOptions();
            renderAllCustomComponents();
            updateOutput();
            if (event && event.target && typeof event.target.reset === 'function') {
                event.target.reset();
            }
        }

        function deleteCustomTweak(id) {
            customOptions = deleteCustomTweakImpl(id, customOptions);
            saveCustomOptions();
            renderAllCustomComponents();
            updateOutput();
        }

        function renderAllCustomComponents() {
            renderAllCustomComponentsImpl(customOptions);
        }

        function renderCustomTweaksTable() {
            renderCustomTweaksTableImpl(customOptions);
        }

        function renderCustomTweaksAsCheckboxes() {
            renderCustomTweaksAsCheckboxesImpl(customOptions);
        }

        function updateSheetStatus() {
            // Sheet sync removed
        }

        async function syncSlotsToSheet() {
            // Sheet sync removed
            return;
        }

        function handleSlotSnapshotUpdate(snapshot) {
            latestSlotSnapshot = snapshot || { slots: [], slotUsage: null, context: {} };

            // Sheet sync removed; no status updates or auto-sync
        }

        window.onSlotSnapshotUpdated = handleSlotSnapshotUpdate;

        // Sheet sync removed: button listeners omitted

        function updateCustomOptionUI() {
            updateCustomOptionUIImpl();
        }

        window.decodeBase64Url = function(base64Url) {
            return decodeBase64UrlImpl(base64Url);
        };

        function parseConfigData() {
            return parseConfigDataImpl();
        }

        // --- Command Generation (delegated to command-builder.js) ---
        async function generateCommands() {
            return await window.generateCommandsImpl();
        }

        // --- UI Rendering (delegated to ui-renderer.js) ---
        function renderOptions() {
            return renderOptionsImpl(formOptionsConfig, gameConfigs);
        }

        // Output generation can be triggered by many overlapping events (explicit listeners,
        // bubbled container listeners, and programmatic state restoration). Coalesce these into
        // a single run per tick and prevent concurrent executions.
        let updateInProgress = false;
        let updateScheduled = false;
        let rerunRequested = false;
        let pendingPrimaryModeChange = false;
        let lastUpdateEvent = null;
        let pendingUpdateDeferreds = [];

        function scheduleOutputUpdate() {
            if (updateScheduled) {
                return;
            }
            updateScheduled = true;
            setTimeout(runScheduledOutputUpdate, 0);
        }

        async function runScheduledOutputUpdate() {
            updateScheduled = false;
            updateInProgress = true;

            const deferreds = pendingUpdateDeferreds;
            pendingUpdateDeferreds = [];

            const primaryModeSelect = document.getElementById('primary-mode-select');
            const eventToUse = (pendingPrimaryModeChange && primaryModeSelect)
                ? { target: primaryModeSelect }
                : lastUpdateEvent;

            pendingPrimaryModeChange = false;
            lastUpdateEvent = null;

            try {
                await updateOutputImpl(eventToUse);
                deferreds.forEach(d => d.resolve());
            } catch (error) {
                deferreds.forEach(d => d.reject(error));
                console.error('updateOutput failed:', error);
            } finally {
                updateInProgress = false;

                if (rerunRequested) {
                    rerunRequested = false;
                    scheduleOutputUpdate();
                }
            }
        }

        function updateOutput(event) {
            if (event) {
                lastUpdateEvent = event;
                const target = event.target;
                if (target && target.id === 'primary-mode-select') {
                    pendingPrimaryModeChange = true;
                }
            }

            const promise = new Promise((resolve, reject) => {
                pendingUpdateDeferreds.push({ resolve, reject });
            });

            if (updateInProgress) {
                rerunRequested = true;
                return promise;
            }

            scheduleOutputUpdate();
            return promise;
        }

        function switchTab(event) {
            return switchTabImpl(event);
        }

        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
            window.addEventListener('slotPackerReady', () => {
                if (typeof updateOutput === 'function') {
                    setTimeout(() => updateOutput(), 0);
                }
            }, { once: true });
        }

        function collectAppState() {
            const state = {
                checkboxes: {},
                selects: {},
                dynamicTweaks: {},
                maxThisUnitOverrides: {}
            };

            document.querySelectorAll('#options-form-columns input[type="checkbox"]').forEach(cb => {
                if (cb.id && !cb.dataset.marker) {
                    state.checkboxes[cb.id] = cb.checked;
                }
            });

            document.querySelectorAll('#options-form-columns select').forEach(sel => {
                if (sel.id) {
                    state.selects[sel.id] = sel.value;
                }
            });

            document.querySelectorAll('input[data-marker]').forEach(cb => {
                if (cb.dataset.marker) {
                    state.dynamicTweaks[cb.dataset.marker] = cb.checked;
                }
            });

            document.querySelectorAll('input[data-maxthisunit-override="true"]').forEach(input => {
                if (input.id) {
                    state.maxThisUnitOverrides[input.id] = input.value;
                }
            });

            return state;
        }

        function applyState(configState) {
            if (!configState || typeof configState !== 'object') return false;

            for (const [id, checked] of Object.entries(configState.checkboxes || {})) {
                const checkbox = document.getElementById(id);
                if (checkbox && checkbox.type === 'checkbox') {
                    checkbox.checked = checked;
                }
            }

            for (const [id, value] of Object.entries(configState.selects || {})) {
                const select = document.getElementById(id);
                if (select && select.tagName === 'SELECT') {
                    select.value = value;
                }
            }

            for (const [marker, checked] of Object.entries(configState.dynamicTweaks || {})) {
                const checkbox = document.querySelector(`input[data-marker="${marker}"]`);
                if (checkbox) {
                    checkbox.checked = checked;
                }
            }

            for (const [id, value] of Object.entries(configState.maxThisUnitOverrides || {})) {
                const input = document.getElementById(id);
                if (input && input.type === 'number') {
                    input.value = value;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            console.log('State restoration complete');
            return true;
        }

        function saveStateToStorage() {
            try {
                const state = collectAppState();
                localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
            } catch (error) {
                console.warn('Failed to persist state to storage:', error);
            }
        }

        function restoreStateFromStorage() {
            try {
                const stored = localStorage.getItem(STATE_STORAGE_KEY);
                if (!stored) return false;
                const parsed = JSON.parse(stored);
                return applyState(parsed);
            } catch (error) {
                console.warn('Failed to restore state from storage:', error);
                return false;
            }
        }

        async function restoreState() {
            try {
                // Prefer URL config if present for backward compatibility
                const urlParams = new URLSearchParams(window.location.search);
                const configParam = urlParams.get('config');

                if (configParam) {
                    console.log('Found config parameter, restoring state...');
                    const decodedConfig = window.decodeBase64Url(configParam);
                    if (decodedConfig && decodedConfig !== 'Error decoding data') {
                        const configState = JSON.parse(decodedConfig);
                        if (applyState(configState)) {
                            saveStateToStorage();
                            return true;
                        }
                    } else {
                        console.error('Failed to decode config parameter');
                    }
                }

                // Fallback to localStorage
                const restored = restoreStateFromStorage();
                if (restored) {
                    console.log('Restored state from local storage');
                    return true;
                }

                console.log('No stored state found');
                return false;
            } catch (error) {
                console.error('Error restoring state:', error);
                return false;
            }
        }

        function clearStoredState() {
            try {
                localStorage.removeItem(STATE_STORAGE_KEY);
            } catch (error) {
                console.warn('Failed to clear stored state:', error);
            }
        }

        function setLibraryStatus(message, variant = 'info') {
            if (!libraryStatusBanner) return;
            libraryStatusBanner.textContent = message || '';
            libraryStatusBanner.className = `library-status ${variant}`;
            libraryStatusBanner.style.display = message ? 'block' : 'none';
        }

        function isLibraryReady() {
            return typeof LuaMinifier !== 'undefined' && typeof scanAllTweakFiles === 'function';
        }

        async function waitForLibraries(timeoutMs = 10000) {
            if (isLibraryReady()) {
                setLibraryStatus('', 'info');
                return;
            }

            setLibraryStatus('Loading Lua minifier…', 'info');

            await new Promise((resolve, reject) => {
                const start = performance.now();
                let rafId = null;
                let timeoutId = null;

                const cleanup = () => {
                    if (rafId !== null) {
                        cancelAnimationFrame(rafId);
                    }
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId);
                    }
                };

                const onReady = () => {
                    cleanup();
                    setLibraryStatus('', 'info');
                    resolve();
                };

                const onFail = (reason) => {
                    cleanup();
                    setLibraryStatus('Failed to load Lua minifier. Use Rebuild to retry.', 'error');
                    reject(reason instanceof Error ? reason : new Error(reason));
                };

                const checkReady = () => {
                    if (isLibraryReady()) {
                        onReady();
                        return;
                    }
                    rafId = requestAnimationFrame(checkReady);
                };

                timeoutId = setTimeout(() => onFail(new Error('Lua minifier load timed out.')), timeoutMs);

                const script = document.querySelector('script[src*="lua-minifier.js"]');
                if (script) {
                    const handleScriptLoad = () => {
                        if (isLibraryReady()) {
                            onReady();
                        }
                    };
                    const handleScriptError = () => onFail(new Error('Lua minifier failed to load.'));
                    script.addEventListener('load', handleScriptLoad, { once: true });
                    script.addEventListener('error', handleScriptError, { once: true });
                }

                rafId = requestAnimationFrame(checkReady);
            });
        }

        async function loadAndRenderTweaks() {
            setLibraryStatus('Scanning tweak files…', 'info');

            tweakFileCache = await scanAllTweakFiles();
            console.log("File cache loaded:", tweakFileCache);

            if (tweakFileCache && Object.keys(tweakFileCache).length > 0) {
                if (typeof window !== 'undefined') {
                    window.skipInitialCommandGeneration = true;
                }
                await generateDynamicCheckboxUI(tweakFileCache);
            } else {
                console.warn("No tweak file cache available - skipping dynamic UI generation");
            }

            document.querySelectorAll('select[data-is-scav-hp-generator=\"true\"]').forEach(select => {
                select.disabled = false;
            });
            document.querySelectorAll('select[data-is-hp-generator=\"true\"]').forEach(select => {
                const isRaptorHp = select.dataset.hpType === 'hp' || select.dataset.hpType === 'qhp';
                if (isRaptorHp) {
                    select.disabled = difficultyManager.isDifficultyMode();
                }
            });

            // Restore state from URL after dynamic UI is created
            // This ensures ALL checkboxes exist in the DOM before restoration
            if (typeof window !== 'undefined') {
                window.suppressOutputDuringStateRestore = true;
            }
            const stateRestored = await restoreState();
            if (typeof window !== 'undefined') {
                delete window.suppressOutputDuringStateRestore;
            }
            difficultyManager.syncFromControls({ triggerOutput: false });

            // Generate output once after defaults/state are applied.
            const delayMs = stateRestored ? 100 : 60;
            setTimeout(async () => {
                difficultyManager.syncFromControls({ triggerOutput: false });
                await updateOutput();
            }, delayMs);

            setLibraryStatus('Ready', 'success');
        }

        async function rebuildApp() {
            try {
                setLibraryStatus('Rebuilding…', 'info');
                if (rebuildButton) {
                    rebuildButton.disabled = true;
                    rebuildButton.textContent = 'Rebuilding…';
                }
                await waitForLibraries();
                await loadAndRenderTweaks();
            } catch (error) {
                console.error('Rebuild failed:', error);
                setLibraryStatus('Rebuild failed. Please try again.', 'error');
            } finally {
                if (rebuildButton) {
                    rebuildButton.disabled = false;
                    rebuildButton.textContent = 'Rebuild';
                }
            }
        }

        window.rebuildApp = rebuildApp;
        window.saveStateToStorage = saveStateToStorage;
        window.clearStoredState = clearStoredState;

        window.resetAllToDefaults = function() {
            const getDefaultsHelper = () => window.ConfigDefaults;

            const resetSection = (container) => {
                if (container && getDefaultsHelper()) {
                    getDefaultsHelper().resetSectionToDefaults(container);
                }
            };

            resetSection(document.getElementById('options-form-columns'));
            resetSection(document.getElementById('dynamic-tweaks-container'));
            resetSection(document.getElementById('multipliers-container'));

            const primaryModeSelect = document.getElementById('primary-mode-select');
            if (primaryModeSelect && typeof primaryModeSelect.dataset.defaultValue !== 'undefined') {
                primaryModeSelect.value = primaryModeSelect.dataset.defaultValue;
                primaryModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }

            if (typeof updateOutput === 'function') {
                updateOutput();
            }

            saveStateToStorage();
        };

        window.clearAllSelections = function() {
            const clearSectionCheckboxes = (container) => {
                if (!container) return;
                container.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => {
                    cb.checked = false;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                });
            };

            clearSectionCheckboxes(document.getElementById('options-form-columns'));
            clearSectionCheckboxes(document.getElementById('dynamic-tweaks-container'));

            // Reset selects to defaults if available
            document.querySelectorAll('#options-form-columns select').forEach(sel => {
                if (typeof sel.dataset.defaultValue !== 'undefined') {
                    sel.value = sel.dataset.defaultValue;
                } else if (sel.options.length > 0) {
                    sel.selectedIndex = 0;
                }
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            });

            document.querySelectorAll('input[data-maxthisunit-override="true"]').forEach(input => {
                const defaultValue = typeof input.dataset.defaultValue !== 'undefined' ? input.dataset.defaultValue : '';
                input.value = defaultValue;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });

            if (typeof updateOutput === 'function') {
                updateOutput();
            }

            saveStateToStorage();
        };

        async function initializeApp() {
            try {
                loadCustomOptions();

                if (sheetSyncStatus) {
                    updateSheetStatus('Loading sheet config…', 'pending');
                }

                if (window.GoogleSheetSync) {
                    const sheetConfig = await window.GoogleSheetSync.loadConfig();
                    if (sheetConfig && sheetConfig.enabled) {
                        updateSheetStatus(
                            sheetConfig.autoSync ? 'Auto-sync enabled' : 'Sheet sync ready',
                            sheetConfig.autoSync ? 'success' : 'pending'
                        );
                    } else {
                        updateSheetStatus('Sheet sync disabled', 'pending');
                    }
                } else {
                    updateSheetStatus('Sheet sync unavailable', 'error');
                }

                // Dynamic tweaks config no longer needed (replaced by slot packer)
                // await loadDynamicTweaksConfig();
                // console.log("Dynamic tweaks config loaded:", dynamicTweaksConfig);

                // Load slot distribution schema BEFORE command generation
                // This must happen before generateSlotBasedCommands() is called
                await loadSlotDistributionImpl();
                console.log("Slot distribution schema loaded:", window.slotDistributionData);

                // Load tweak dependency table before slot packing
                await loadTweakDependenciesImpl();
                console.log("Tweak dependency table loaded:", window.tweakDependencyTable);

                // Then load everything else in parallel
                const [parsedConfigs] = await Promise.all([
                    parseModesFile('modes.txt'),
                    loadConfigData(),
                    loadLinksContent(),
                    loadTweakMetadata()
                ]);

                gameConfigs = parsedConfigs;
                window.gameConfigs = gameConfigs;  // Update global reference
                console.log("Modes file loaded and parsed:", gameConfigs);

                renderOptions();
                difficultyManager.init({ renderMultipliers, updateOutput });

                // Generate Raptor Wave Mode selector immediately (independent of file scanning)
                generateRaptorWaveDropdownImpl(updateOutput);

                // Attach all event handlers after rendering
                attachEventHandlersImpl(formOptionsConfig);

                try {
                    await waitForLibraries();
                    await loadAndRenderTweaks();
                } catch (error) {
                    console.error("Lua minifier failed to initialize:", error);
                    setLibraryStatus('Failed to load Lua minifier. Click Rebuild to retry.', 'error');
                    if (rebuildButton) {
                        rebuildButton.style.display = 'inline-flex';
                    }
                }

            } catch (error) {
                console.error("Failed to initialize the configurator:", error);
                document.querySelector('.container').innerHTML = '<h1>Initialization Error</h1><p style="color: red;">Could not load essential configuration files (e.g., modes.txt or dynamic-tweaks.json). Please check that the files exist and refresh the page.</p><pre>' + error.stack + '</pre>';
            }
        }

        // Note: initializeApp is now called from index.html after partials load
        // document.addEventListener('DOMContentLoaded', initializeApp);
