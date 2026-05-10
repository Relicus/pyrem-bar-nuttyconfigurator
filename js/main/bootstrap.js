// Application bootstrap extracted from main.js.

(function (globalScope) {
    function getStore() {
        return globalScope.AppRuntime?.get('mainStore') || globalScope.MainStore;
    }

    function getPersistence() {
        return globalScope.AppRuntime?.get('mainStatePersistence') || globalScope.MainStatePersistence;
    }

    function getStatus() {
        return globalScope.AppRuntime?.get('mainLibraryStatus') || globalScope.MainLibraryStatus;
    }

    function getCustomTweaks() {
        return globalScope.AppRuntime?.get('mainCustomTweaksController') || globalScope.MainCustomTweaksController;
    }

    function getDefaultsLoader() {
        return globalScope.AppRuntime?.get('uiGeneratorDefaultsLoader') || globalScope.UiGeneratorDefaultsLoader;
    }

    async function loadAndRenderTweaks() {
        const store = getStore();
        const persistence = getPersistence();
        const status = getStatus();
        status.setLibraryStatus('Scanning tweak files...', 'info');

        const tweakFileCache = await globalScope.scanAllTweakFiles();
        store.setTweakFileCache(tweakFileCache);

        if (tweakFileCache && Object.keys(tweakFileCache).length > 0) {
            globalScope.skipInitialCommandGeneration = true;
            await globalScope.generateDynamicCheckboxUIImpl(tweakFileCache, globalScope.updateOutput);
        }

        document.querySelectorAll('select[data-is-scav-hp-generator="true"]').forEach((select) => {
            select.disabled = false;
        });
        document.querySelectorAll('select[data-is-hp-generator="true"]').forEach((select) => {
            if (select.dataset.hpType === 'hp' || select.dataset.hpType === 'qhp') {
                select.disabled = false;
            }
        });

        globalScope.suppressOutputDuringStateRestore = true;
        const stateRestored = await persistence.restoreState();
        delete globalScope.suppressOutputDuringStateRestore;
        setTimeout(async () => {
            await globalScope.updateOutput();
        }, stateRestored ? 100 : 60);

        status.setLibraryStatus('Ready', 'success');
    }

    async function rebuildApp() {
        const status = getStatus();
        const rebuildButton = document.getElementById('rebuild-button');
        try {
            status.setLibraryStatus('Rebuilding...', 'info');
            if (rebuildButton) {
                rebuildButton.disabled = true;
                rebuildButton.textContent = 'Rebuilding...';
            }
            await status.waitForLibraries();
            await loadAndRenderTweaks();
        } catch (error) {
            console.error('Rebuild failed:', error);
            status.setLibraryStatus('Rebuild failed. Please try again.', 'error');
        } finally {
            if (rebuildButton) {
                rebuildButton.disabled = false;
                rebuildButton.textContent = 'Rebuild';
            }
        }
    }

    function resetAllToDefaults() {
        const defaultsHelper = globalScope.ConfigDefaults || globalScope.AppRuntime?.get('defaultUtils');
        const resetSection = (container) => {
            if (container && defaultsHelper) {
                defaultsHelper.resetSectionToDefaults(container);
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
        globalScope.updateOutput();
        getPersistence().saveStateToStorage();
    }

    function clearAllSelections() {
        const clearSectionCheckboxes = (container) => {
            if (!container) return;
            container.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach((checkbox) => {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            });
        };

        clearSectionCheckboxes(document.getElementById('options-form-columns'));
        clearSectionCheckboxes(document.getElementById('dynamic-tweaks-container'));
        document.querySelectorAll('#options-form-columns select').forEach((select) => {
            if (typeof select.dataset.defaultValue !== 'undefined') select.value = select.dataset.defaultValue;
            else if (select.options.length > 0) select.selectedIndex = 0;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        document.querySelectorAll('input[data-maxthisunit-override="true"]').forEach((input) => {
            input.value = typeof input.dataset.defaultValue !== 'undefined' ? input.dataset.defaultValue : '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        globalScope.updateOutput();
        getPersistence().saveStateToStorage();
    }

    async function initializeApp() {
        const store = getStore();
        const status = getStatus();
        const customTweaks = getCustomTweaks();

        try {
            customTweaks.loadCustomOptions();
            await globalScope.loadSlotDistributionImpl();
            await globalScope.loadTweakDependenciesImpl();

            const [parsedConfigs] = await Promise.all([
                globalScope.parseModesFileImpl('modes.txt'),
                globalScope.loadConfigDataImpl(),
                globalScope.loadLinksContentImpl(),
                globalScope.loadTweakMetadata()
            ]);

            const defaultsLoader = getDefaultsLoader();
            if (defaultsLoader && typeof defaultsLoader.loadDynamicTweaksDefaults === 'function') {
                await defaultsLoader.loadDynamicTweaksDefaults();
            }

            store.setGameConfigs(parsedConfigs);
            store.setRawOptionsData(globalScope.rawOptionsData || []);
            store.setFormOptionsConfig(globalScope.formOptionsConfig || []);
            globalScope.renderOptions();
            globalScope.generateRaptorWaveDropdownImpl(globalScope.updateOutput);
            globalScope.attachEventHandlersImpl(store.getFormOptionsConfig());

            try {
                await status.waitForLibraries();
                await loadAndRenderTweaks();
            } catch (error) {
                console.error('Lua minifier failed to initialize:', error);
                status.setLibraryStatus('Failed to load Lua minifier. Click Rebuild to retry.', 'error');
                const rebuildButton = document.getElementById('rebuild-button');
                if (rebuildButton) {
                    rebuildButton.hidden = false;
                }
            }
        } catch (error) {
            console.error('Failed to initialize the configurator:', error);
            document.querySelector('.container').innerHTML = `<h1>Initialization Error</h1><p class="init-error">Could not load essential configuration files. Please refresh the page.</p><pre>${error.stack}</pre>`;
        }
    }

    const api = {
        loadAndRenderTweaks,
        rebuildApp,
        resetAllToDefaults,
        clearAllSelections,
        initializeApp
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainBootstrap', api);
    }
    globalScope.MainBootstrap = api;
    globalScope.rebuildApp = rebuildApp;
    globalScope.resetAllToDefaults = resetAllToDefaults;
    globalScope.clearAllSelections = clearAllSelections;
    globalScope.initializeApp = initializeApp;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
