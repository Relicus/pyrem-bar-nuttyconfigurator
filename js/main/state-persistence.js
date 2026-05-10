// State capture and restoration extracted from main.js.

(function (globalScope) {
    const storageConstants = globalScope.ConfiguratorStorageConstants || globalScope.AppRuntime?.get('storageConstants') || {};

    function getSelectionHelper() {
        return globalScope.AppRuntime?.get('uiGeneratorDefaultsLoader') || globalScope.UiGeneratorDefaultsLoader;
    }

    function collectAppState() {
        const state = {
            checkboxes: {},
            selects: {},
            dynamicTweaks: {},
            maxThisUnitOverrides: {}
        };

        document.querySelectorAll('#options-form-columns input[type="checkbox"], #custom-options-form-columns input[type="checkbox"]').forEach((checkbox) => {
            if (checkbox.id && !checkbox.dataset.marker) {
                state.checkboxes[checkbox.id] = checkbox.checked;
            }
        });
        document.querySelectorAll('#options-form-columns select').forEach((select) => {
            if (select.id) {
                state.selects[select.id] = select.value;
            }
        });
        const selectionHelper = getSelectionHelper();
        if (selectionHelper && typeof selectionHelper.capturePersistedDynamicTweaks === 'function') {
            state.dynamicTweaks = selectionHelper.capturePersistedDynamicTweaks();
        } else {
            document.querySelectorAll('input[data-marker]').forEach((checkbox) => {
                if (checkbox.dataset.marker) {
                    state.dynamicTweaks[checkbox.dataset.marker] = checkbox.checked;
                }
            });
        }
        document.querySelectorAll('input[data-maxthisunit-override="true"]').forEach((input) => {
            if (input.id) {
                state.maxThisUnitOverrides[input.id] = input.value;
            }
        });

        return state;
    }

    function applyState(configState) {
        if (!configState || typeof configState !== 'object') {
            return false;
        }

        Object.entries(configState.checkboxes || {}).forEach(([id, checked]) => {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.type === 'checkbox') {
                checkbox.checked = checked;
            }
        });

        Object.entries(configState.selects || {}).forEach(([id, value]) => {
            const select = document.getElementById(id);
            if (select && select.tagName === 'SELECT') {
                select.value = value;
            }
        });

        const selectionHelper = getSelectionHelper();
        if (selectionHelper && typeof selectionHelper.applyPersistedDynamicTweaks === 'function') {
            selectionHelper.applyPersistedDynamicTweaks(configState.dynamicTweaks || {});
        } else {
            Object.entries(configState.dynamicTweaks || {}).forEach(([marker, checked]) => {
                document.querySelectorAll(`input[data-marker="${marker}"]`).forEach((checkbox) => {
                    checkbox.checked = checked;
                });
            });
        }

        Object.entries(configState.maxThisUnitOverrides || {}).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input && input.type === 'number') {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        return true;
    }

    function saveStateToStorage() {
        try {
            localStorage.setItem(storageConstants.STATE_STORAGE_KEY || 'nuttyb-state-v1', JSON.stringify(collectAppState()));
        } catch (error) {
            console.warn('Failed to persist state to storage:', error);
        }
    }

    function restoreStateFromStorage() {
        try {
            const stored = localStorage.getItem(storageConstants.STATE_STORAGE_KEY || 'nuttyb-state-v1');
            if (!stored) return false;
            return applyState(JSON.parse(stored));
        } catch (error) {
            console.warn('Failed to restore state from storage:', error);
            return false;
        }
    }

    async function restoreState() {
        try {
            const urlParams = new URLSearchParams(globalScope.location.search);
            const configParam = urlParams.get('config');
            if (configParam) {
                const decodedConfig = globalScope.decodeBase64Url(configParam);
                if (decodedConfig && decodedConfig !== 'Error decoding data') {
                    const configState = JSON.parse(decodedConfig);
                    if (applyState(configState)) {
                        saveStateToStorage();
                        return true;
                    }
                }
            }
            return restoreStateFromStorage();
        } catch (error) {
            console.error('Error restoring state:', error);
            return false;
        }
    }

    function clearStoredState() {
        try {
            localStorage.removeItem(storageConstants.STATE_STORAGE_KEY || 'nuttyb-state-v1');
        } catch (error) {
            console.warn('Failed to clear stored state:', error);
        }
    }

    const api = {
        collectAppState,
        applyState,
        saveStateToStorage,
        restoreStateFromStorage,
        restoreState,
        clearStoredState
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainStatePersistence', api);
    }

    globalScope.MainStatePersistence = api;
    globalScope.saveStateToStorage = saveStateToStorage;
    globalScope.clearStoredState = clearStoredState;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
