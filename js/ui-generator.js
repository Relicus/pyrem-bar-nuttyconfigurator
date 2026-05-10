// UI Generator public facade for BAR Configurator.

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
            throw new Error(`Missing ${runtimeKey} API. Check script load order for extracted ui-generator modules.`);
        }
        return api;
    }

    function generateDynamicCheckboxUIImpl() {
        return requireApi('uiGeneratorDynamicCheckboxUi', 'UiGeneratorDynamicCheckboxUi').generateDynamicCheckboxUI.apply(null, arguments);
    }

    function generateRaptorWaveDropdownImpl() {
        return requireApi('uiGeneratorRaptorWaveDropdown', 'UiGeneratorRaptorWaveDropdown').generateRaptorWaveDropdown.apply(null, arguments);
    }

    globalScope.generateDynamicCheckboxUIImpl = generateDynamicCheckboxUIImpl;
    globalScope.generateRaptorWaveDropdownImpl = generateRaptorWaveDropdownImpl;

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('uiGeneratorFacade', {
            generateDynamicCheckboxUIImpl,
            generateRaptorWaveDropdownImpl
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            generateDynamicCheckboxUI: generateDynamicCheckboxUIImpl,
            generateRaptorWaveDropdown: generateRaptorWaveDropdownImpl
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
