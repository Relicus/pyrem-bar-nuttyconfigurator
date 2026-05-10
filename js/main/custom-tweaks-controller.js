// Custom tweak orchestration extracted from main.js.

(function (globalScope) {
    function getStore() {
        return globalScope.AppRuntime?.get('mainStore') || globalScope.MainStore;
    }

    function getUpdateOutput() {
        return globalScope.updateOutput;
    }

    function collectCheckedCustomTweakIds() {
        if (typeof globalScope.collectCheckedCustomTweakIdsImpl === 'function') {
            return globalScope.collectCheckedCustomTweakIdsImpl();
        }

        return Array.from(document.querySelectorAll('#custom-options-form-columns input[data-is-custom="true"]:checked'))
            .map((checkbox) => checkbox.dataset.customTweakId || null)
            .filter(Boolean);
    }

    function saveSelectionState() {
        if (typeof globalScope.saveStateToStorage === 'function') {
            globalScope.saveStateToStorage();
        }
    }

    function loadCustomOptions() {
        const store = getStore();
        const nextOptions = typeof globalScope.loadCustomOptionsImpl === 'function' ? globalScope.loadCustomOptionsImpl() : [];
        store.setCustomOptions(nextOptions);
        return nextOptions;
    }

    function saveCustomOptions() {
        const store = getStore();
        if (typeof globalScope.saveCustomOptionsImpl === 'function') {
            globalScope.saveCustomOptionsImpl(store.getCustomOptions());
        }
    }

    function renderAllCustomComponents(checkedIds = null) {
        const store = getStore();
        const resolvedCheckedIds = Array.isArray(checkedIds) ? checkedIds : collectCheckedCustomTweakIds();
        if (typeof globalScope.renderAllCustomComponentsImpl === 'function') {
            globalScope.renderAllCustomComponentsImpl(store.getCustomOptions(), { checkedIds: resolvedCheckedIds });
        }
    }

    function renderCustomTweaksTable() {
        const store = getStore();
        if (typeof globalScope.renderCustomTweaksTableImpl === 'function') {
            globalScope.renderCustomTweaksTableImpl(store.getCustomOptions());
        }
    }

    function renderCustomTweaksAsCheckboxes() {
        const store = getStore();
        if (typeof globalScope.renderCustomTweaksAsCheckboxesImpl === 'function') {
            globalScope.renderCustomTweaksAsCheckboxesImpl(store.getCustomOptions());
        }
    }

    function addCustomTweak(event) {
        const store = getStore();
        const currentOptions = store.getCustomOptions();
        const checkedIds = new Set(collectCheckedCustomTweakIds());
        const nextOptions = globalScope.addCustomTweakImpl(event, currentOptions);
        if (nextOptions === currentOptions) {
            return;
        }

        const newlyAddedTweak = nextOptions.length > currentOptions.length ? nextOptions[nextOptions.length - 1] : null;
        if (newlyAddedTweak && typeof newlyAddedTweak.id !== 'undefined') {
            checkedIds.add(String(newlyAddedTweak.id));
        }

        store.setCustomOptions(nextOptions);
        saveCustomOptions();
        renderAllCustomComponents(Array.from(checkedIds));
        saveSelectionState();
        if (typeof getUpdateOutput() === 'function') {
            getUpdateOutput()();
        }
        if (event?.target && typeof event.target.reset === 'function') {
            event.target.reset();
        }
    }

    function deleteCustomTweak(id) {
        const store = getStore();
        const checkedIds = collectCheckedCustomTweakIds().filter(checkedId => checkedId !== String(id));
        store.setCustomOptions(globalScope.deleteCustomTweakImpl(id, store.getCustomOptions()));
        saveCustomOptions();
        renderAllCustomComponents(checkedIds);
        saveSelectionState();
        if (typeof getUpdateOutput() === 'function') {
            getUpdateOutput()();
        }
    }

    function handleSlotSnapshotUpdate(snapshot) {
        getStore().setLatestSlotSnapshot(snapshot || { slots: [], slotUsage: null, context: {} });
    }

    function updateCustomOptionUI() {
        if (typeof globalScope.updateCustomOptionUIImpl === 'function') {
            globalScope.updateCustomOptionUIImpl();
        }
    }

    const api = {
        loadCustomOptions,
        saveCustomOptions,
        addCustomTweak,
        deleteCustomTweak,
        renderCustomTweaksTable,
        renderCustomTweaksAsCheckboxes,
        renderAllCustomComponents,
        handleSlotSnapshotUpdate,
        updateCustomOptionUI,
        updateSheetStatus: () => {},
        syncSlotsToSheet: async () => {}
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainCustomTweaksController', api);
    }

    globalScope.MainCustomTweaksController = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
