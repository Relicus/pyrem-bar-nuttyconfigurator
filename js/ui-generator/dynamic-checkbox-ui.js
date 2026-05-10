// Dynamic checkbox UI orchestration extracted from ui-generator.js.

(function (globalScope) {
    function ensureLoader(container, message, state = 'loading') {
        const headerStatus = document.getElementById('available-tweaks-status');
        let loader = headerStatus && headerStatus.classList.contains('tweaks-loader')
            ? headerStatus
            : container.querySelector('.tweaks-loader');

        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'tweaks-loader';
            loader.innerHTML = '<span class="spinner"></span><span class="text"></span>';
            container.insertBefore(loader, container.firstChild);
        }

        loader.hidden = false;
        loader.dataset.state = state;
        const textElement = loader.querySelector('.text');
        if (textElement) {
            textElement.textContent = message;
        }

        return loader;
    }

    function removeLoader(loader) {
        if (!loader) {
            return;
        }

        if (loader.id === 'available-tweaks-status') {
            loader.hidden = true;
            loader.dataset.state = 'idle';
            const textElement = loader.querySelector('.text');
            if (textElement) {
                textElement.textContent = '';
            }
            return;
        }

        if (loader.parentNode) {
            loader.parentNode.removeChild(loader);
        }
    }

    function showLoaderError(loader, message) {
        if (!loader) {
            return;
        }

        loader.hidden = false;
        loader.dataset.state = 'error';
        const textElement = loader.querySelector('.text');
        if (textElement) {
            textElement.textContent = message;
        }
    }

    function getDefaultsLoader() {
        return globalScope.AppRuntime?.get('uiGeneratorDefaultsLoader') || globalScope.UiGeneratorDefaultsLoader;
    }

    function getGrouping() {
        return globalScope.AppRuntime?.get('uiGeneratorGrouping') || globalScope.UiGeneratorGrouping;
    }

    function getGroupRenderer() {
        return globalScope.AppRuntime?.get('uiGeneratorGroupRenderer') || globalScope.UiGeneratorGroupRenderer;
    }

    function getMaxThisUnitControls() {
        return globalScope.AppRuntime?.get('uiGeneratorMaxThisUnitControls') || globalScope.UiGeneratorMaxThisUnitControls;
    }

    async function generateDynamicCheckboxUI(tweakFileCache, updateOutputCallback) {
        const container = document.getElementById('dynamic-tweaks-container');
        if (!container) {
            console.error('No container found for dynamic checkboxes');
            return;
        }

        container.querySelectorAll('p').forEach((paragraph) => paragraph.remove());
        const loader = ensureLoader(container, 'Loading tweaks...');

        const callbackState = { suppressUpdateDuringInit: false };
        const existingColumnsWrapper = container.querySelector('.checkbox-columns');
        if (existingColumnsWrapper) {
            existingColumnsWrapper.remove();
        }

        try {
            const defaultsLoader = getDefaultsLoader();
            defaultsLoader?.resetDynamicSelectionRegistry?.();
            const tweakDefaults = await defaultsLoader.loadDynamicTweaksDefaults();
            const columnsWrapper = document.createElement('div');
            columnsWrapper.className = 'checkbox-columns';

            const groupedByDisplayName = getGrouping().groupTweakFilesByDisplayName(tweakFileCache);
            getGrouping().sortGroupedEntries(groupedByDisplayName).forEach(([displayName, fileGroups]) => {
                columnsWrapper.appendChild(getGroupRenderer().renderFileGroup(displayName, fileGroups, tweakDefaults, callbackState, updateOutputCallback));
            });

            container.appendChild(columnsWrapper);
            getMaxThisUnitControls().renderMaxThisUnitControls(updateOutputCallback, tweakFileCache);
            removeLoader(loader);

            setTimeout(() => {
                const checkedParents = container.querySelectorAll('.file-parent-checkbox:checked:not(:disabled)');
                callbackState.suppressUpdateDuringInit = true;
                try {
                    checkedParents.forEach((parentCheckbox) => {
                        parentCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                } finally {
                    callbackState.suppressUpdateDuringInit = false;
                }

                if (updateOutputCallback) {
                    setTimeout(() => {
                        if (globalScope.skipInitialCommandGeneration) {
                            globalScope.skipInitialCommandGeneration = false;
                            return;
                        }
                        updateOutputCallback();
                    }, 50);
                }
            }, 10);
        } catch (error) {
            console.error('Failed to render dynamic tweak UI:', error);
            showLoaderError(loader, 'Failed to load tweaks. Use Rebuild to retry.');
            throw error;
        }
    }

    const api = {
        generateDynamicCheckboxUI
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('uiGeneratorDynamicCheckboxUi', api);
    }

    globalScope.UiGeneratorDynamicCheckboxUi = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
