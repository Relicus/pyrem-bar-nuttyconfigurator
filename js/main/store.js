// Shared main-app state store extracted from main.js.

(function (globalScope) {
    const appRuntime = globalScope.AppRuntime;

    function setState(key, value, legacyKey = key) {
        if (appRuntime) {
            appRuntime.setState(key, value, { legacyKey });
        }
        globalScope[legacyKey] = value;
        return value;
    }

    function getState(key, fallback = null) {
        if (appRuntime) {
            return appRuntime.getState(key, fallback);
        }
        return typeof globalScope[key] !== 'undefined' ? globalScope[key] : fallback;
    }

    setState('rawOptionsData', [], 'rawOptionsData');
    setState('formOptionsConfig', [], 'formOptionsConfig');
    setState('customOptions', [], 'customOptions');
    setState('gameConfigs', { maps: [], modes: [], base: [], scavengers: [] }, 'gameConfigs');
    setState('tweakFileCache', null, 'tweakFileCache');
    setState('latestSlotSnapshot', { slots: [], slotUsage: null, context: {} }, 'latestSlotSnapshot');

    const api = {
        getRawOptionsData: () => getState('rawOptionsData', []),
        setRawOptionsData: (value) => setState('rawOptionsData', value, 'rawOptionsData'),
        getFormOptionsConfig: () => getState('formOptionsConfig', []),
        setFormOptionsConfig: (value) => setState('formOptionsConfig', value, 'formOptionsConfig'),
        getCustomOptions: () => getState('customOptions', []),
        setCustomOptions: (value) => setState('customOptions', value, 'customOptions'),
        getGameConfigs: () => getState('gameConfigs', { maps: [], modes: [], base: [], scavengers: [] }),
        setGameConfigs: (value) => setState('gameConfigs', value, 'gameConfigs'),
        getTweakFileCache: () => getState('tweakFileCache', null),
        setTweakFileCache: (value) => setState('tweakFileCache', value, 'tweakFileCache'),
        getLatestSlotSnapshot: () => getState('latestSlotSnapshot', { slots: [], slotUsage: null, context: {} }),
        setLatestSlotSnapshot: (value) => setState('latestSlotSnapshot', value, 'latestSlotSnapshot')
    };

    if (appRuntime) {
        appRuntime.register('mainStore', api);
    }

    globalScope.MainStore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
