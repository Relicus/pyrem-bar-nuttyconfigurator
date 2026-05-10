// Shared storage keys for the BAR configurator.

(function (globalScope) {
    const storageConstants = {
        STATE_STORAGE_KEY: 'nuttyb-state-v1',
        MULTIPLIERS_KEY: 'nuttyb-game-multipliers',
        CUSTOM_TWEAKS_KEY: 'nuttyb-custom-tweaks'
    };

    if (globalScope && globalScope.AppRuntime) {
        globalScope.AppRuntime.register('storageConstants', storageConstants);
    }

    if (globalScope) {
        globalScope.ConfiguratorStorageConstants = storageConstants;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
