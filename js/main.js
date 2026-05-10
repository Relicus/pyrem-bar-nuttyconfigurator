/**
 * @fileoverview Main application facade for BAR Configurator.
 *
 * Runtime Contract:
 * - Preserves the legacy globals consumed by classic-script modules.
 * - Delegates state, multipliers, persistence, and bootstrap work to extracted modules.
 * - Keeps `initializeApp()` as the single browser entrypoint loaded from `index.html`.
 */

(function (globalScope) {
    function getApi(runtimeKey, legacyKey) {
        if (globalScope.AppRuntime) {
            const resolved = globalScope.AppRuntime.get(runtimeKey);
            if (resolved) {
                return resolved;
            }
        }
        return globalScope[legacyKey] || null;
    }

    function requireApi(runtimeKey, legacyKey) {
        const api = getApi(runtimeKey, legacyKey);
        if (!api) {
            throw new Error(`Missing ${runtimeKey} API. Check script load order for extracted main modules.`);
        }
        return api;
    }

    const store = requireApi('mainStore', 'MainStore');
    const multipliersStore = requireApi('mainMultipliersStore', 'MainMultipliersStore');
    const multipliersRenderer = requireApi('mainMultipliersRenderer', 'MainMultipliersRenderer');
    const customTweaks = requireApi('mainCustomTweaksController', 'MainCustomTweaksController');
    const persistence = requireApi('mainStatePersistence', 'MainStatePersistence');
    const bootstrap = requireApi('mainBootstrap', 'MainBootstrap');

    function parseConfigData() {
        return globalScope.parseConfigDataImpl();
    }

    function populateStartSelector() {
        return globalScope.populateStartSelectorImpl();
    }

    function renderMultipliers() {
        return multipliersRenderer.renderMultipliers();
    }

    function renderOptions() {
        return globalScope.renderOptionsImpl(store.getFormOptionsConfig(), store.getGameConfigs());
    }

    function generateCommands() {
        return globalScope.generateCommandsImpl();
    }

    function loadCustomOptions() {
        return customTweaks.loadCustomOptions();
    }

    function saveCustomOptions() {
        return customTweaks.saveCustomOptions();
    }

    function addCustomTweak(event) {
        return customTweaks.addCustomTweak(event);
    }

    function deleteCustomTweak(id) {
        return customTweaks.deleteCustomTweak(id);
    }

    function renderAllCustomComponents() {
        return customTweaks.renderAllCustomComponents();
    }

    function renderCustomTweaksTable() {
        return customTweaks.renderCustomTweaksTable();
    }

    function renderCustomTweaksAsCheckboxes() {
        return customTweaks.renderCustomTweaksAsCheckboxes();
    }

    function updateCustomOptionUI() {
        return customTweaks.updateCustomOptionUI();
    }

    function decodeBase64Url(value) {
        return globalScope.decodeBase64UrlImpl(value);
    }

    globalScope.parseConfigData = parseConfigData;
    globalScope.populateStartSelector = populateStartSelector;
    globalScope.renderMultipliers = renderMultipliers;
    globalScope.renderOptions = renderOptions;
    globalScope.generateCommands = generateCommands;
    globalScope.loadCustomOptions = loadCustomOptions;
    globalScope.saveCustomOptions = saveCustomOptions;
    globalScope.addCustomTweak = addCustomTweak;
    globalScope.deleteCustomTweak = deleteCustomTweak;
    globalScope.renderCustomTweaksTable = renderCustomTweaksTable;
    globalScope.renderCustomTweaksAsCheckboxes = renderCustomTweaksAsCheckboxes;
    globalScope.renderAllCustomComponents = renderAllCustomComponents;
    globalScope.updateCustomOptionUI = updateCustomOptionUI;
    globalScope.decodeBase64Url = decodeBase64Url;
    globalScope.getMultiplierValues = multipliersStore.getMultiplierValues;
    globalScope.getMultiplierCommands = multipliersStore.getMultiplierCommands;
    globalScope.generateLuaTweak = multipliersStore.generateLuaTweak;
    globalScope.onSlotSnapshotUpdated = customTweaks.handleSlotSnapshotUpdate;
    globalScope.saveStateToStorage = persistence.saveStateToStorage;
    globalScope.clearStoredState = persistence.clearStoredState;
    globalScope.rebuildApp = bootstrap.rebuildApp;
    globalScope.resetAllToDefaults = bootstrap.resetAllToDefaults;
    globalScope.clearAllSelections = bootstrap.clearAllSelections;
    globalScope.initializeApp = bootstrap.initializeApp;

    if (typeof globalScope.addEventListener === 'function') {
        globalScope.addEventListener('slotPackerReady', () => {
            if (typeof globalScope.updateOutput === 'function') {
                setTimeout(() => globalScope.updateOutput(), 0);
            }
        }, { once: true });
    }

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainFacade', {
            parseConfigData,
            populateStartSelector,
            renderMultipliers,
            renderOptions,
            generateCommands,
            loadCustomOptions,
            saveCustomOptions,
            addCustomTweak,
            deleteCustomTweak,
            renderCustomTweaksTable,
            renderCustomTweaksAsCheckboxes,
            renderAllCustomComponents,
            updateCustomOptionUI,
            decodeBase64Url,
            initializeApp: bootstrap.initializeApp
        });
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
