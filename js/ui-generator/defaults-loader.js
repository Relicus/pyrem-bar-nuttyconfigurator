// Shared defaults-loading helpers extracted from ui-generator.js.

(function (globalScope) {
    let cachedDefaults = null;
    let loadingPromise = null;
    let selectionMetadata = null;
    const registeredSelectionElements = new Set();

    function normalizeFilePath(filePath) {
        return String(filePath || '')
            .replace(/\\/g, '/')
            .replace(/^\.\//, '')
            .toLowerCase();
    }

    function normalizeSectionType(slotType) {
        if (slotType === 'tweakunits' || slotType === 'units') {
            return 'units';
        }
        if (slotType === 'tweakdefs' || slotType === 'defs') {
            return 'defs';
        }
        return slotType || '';
    }

    function sanitizeDomToken(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            || 'selection';
    }

    function extractMarkerSectionName(markers, fallbackId) {
        const startMarker = markers && markers.start ? String(markers.start) : '';
        const startMatch = startMarker.match(/--\s*([A-Z0-9_]+)_START/i);
        if (startMatch && startMatch[1]) {
            return startMatch[1].toUpperCase();
        }

        return String(fallbackId || '').toUpperCase();
    }

    function createSelectionRecord(tweakKey, tweakConfig, option, filePath) {
        const optionId = option && option.id ? String(option.id) : 'option';
        const sectionName = extractMarkerSectionName(option && option.markers, optionId);
        const type = normalizeSectionType(tweakConfig && tweakConfig.slot_type);
        const normalizedFilePath = normalizeFilePath(filePath);

        return {
            stableId: `dynamic-${sanitizeDomToken(tweakKey)}-${sanitizeDomToken(optionId)}`,
            domId: `dynamic-selection-${sanitizeDomToken(tweakKey)}-${sanitizeDomToken(optionId)}`,
            tweakKey,
            optionId,
            marker: sectionName,
            type,
            filePath: normalizedFilePath,
            fileName: normalizedFilePath ? normalizedFilePath.split('/').pop() : ''
        };
    }

    function buildSelectionMetadata(data) {
        const byExactKey = {};
        const byMarker = {};
        const dynamicTweaks = data && data.dynamic_tweaks ? data.dynamic_tweaks : {};

        Object.entries(dynamicTweaks).forEach(([tweakKey, tweakConfig]) => {
            if (!tweakConfig || !Array.isArray(tweakConfig.options)) {
                return;
            }

            tweakConfig.options.forEach((option) => {
                const configuredFiles = [];
                if (option && option.source_file) {
                    configuredFiles.push(option.source_file);
                }
                if (tweakConfig.source_file) {
                    configuredFiles.push(tweakConfig.source_file);
                }

                const uniqueFiles = Array.from(new Set(configuredFiles.map(normalizeFilePath).filter(Boolean)));
                const records = uniqueFiles.length > 0
                    ? uniqueFiles.map((filePath) => createSelectionRecord(tweakKey, tweakConfig, option, filePath))
                    : [createSelectionRecord(tweakKey, tweakConfig, option, '')];

                records.forEach((record) => {
                    const exactKey = `${record.filePath}|${record.type}|${record.marker}`;
                    if (record.filePath) {
                        byExactKey[exactKey] = record;
                    }

                    if (!byMarker[record.marker]) {
                        byMarker[record.marker] = [];
                    }
                    byMarker[record.marker].push(record);
                });
            });
        });

        return { byExactKey, byMarker };
    }

    function resolveDynamicSelectionIdentity(filePath, marker, type) {
        const normalizedFilePath = normalizeFilePath(filePath);
        const normalizedType = normalizeSectionType(type);
        const normalizedMarker = String(marker || '').toUpperCase();
        const exactKey = `${normalizedFilePath}|${normalizedType}|${normalizedMarker}`;

        if (selectionMetadata && selectionMetadata.byExactKey[exactKey]) {
            return selectionMetadata.byExactKey[exactKey];
        }

        const markerMatches = selectionMetadata && selectionMetadata.byMarker[normalizedMarker]
            ? selectionMetadata.byMarker[normalizedMarker].filter((entry) => !normalizedType || entry.type === normalizedType)
            : [];

        if (markerMatches.length === 1) {
            return markerMatches[0];
        }

        const fallbackToken = [normalizedFilePath || 'unknown-file', normalizedType || 'unknown-type', normalizedMarker || 'unknown-marker']
            .map(sanitizeDomToken)
            .join('-');

        return {
            stableId: `dynamic-fallback-${fallbackToken}`,
            domId: `dynamic-selection-${fallbackToken}`,
            tweakKey: null,
            optionId: null,
            marker: normalizedMarker,
            type: normalizedType,
            filePath: normalizedFilePath,
            fileName: normalizedFilePath ? normalizedFilePath.split('/').pop() : ''
        };
    }

    function registerDynamicSelectionElement(checkbox) {
        if (!checkbox) {
            return checkbox;
        }

        registeredSelectionElements.add(checkbox);
        return checkbox;
    }

    function resetDynamicSelectionRegistry() {
        registeredSelectionElements.clear();
    }

    function getDynamicSelectionEntries(options = {}) {
        const checkedOnly = options.checkedOnly === true;

        return Array.from(registeredSelectionElements)
            .filter((element) => element && element.isConnected)
            .map((element) => ({
                element,
                selectionId: element.dataset.selectionId || '',
                marker: element.dataset.marker || '',
                file: element.dataset.file || '',
                type: element.dataset.type || '',
                checked: element.checked === true,
                defaultChecked: element.dataset.defaultChecked === 'true'
            }))
            .filter((entry) => !checkedOnly || entry.checked);
    }

    function capturePersistedDynamicTweaks() {
        const byId = {};
        const byMarker = {};

        getDynamicSelectionEntries().forEach((entry) => {
            if (entry.selectionId) {
                byId[entry.selectionId] = entry.checked;
            }
            if (entry.marker && typeof byMarker[entry.marker] === 'undefined') {
                byMarker[entry.marker] = entry.checked;
            }
        });

        return { byId, byMarker };
    }

    function applyPersistedDynamicTweaks(dynamicTweaksState) {
        if (!dynamicTweaksState) {
            return 0;
        }

        const byId = dynamicTweaksState.byId && typeof dynamicTweaksState.byId === 'object'
            ? dynamicTweaksState.byId
            : null;
        const byMarker = dynamicTweaksState.byMarker && typeof dynamicTweaksState.byMarker === 'object'
            ? dynamicTweaksState.byMarker
            : (byId ? null : dynamicTweaksState);
        let appliedCount = 0;

        if (byId) {
            Object.entries(byId).forEach(([selectionId, checked]) => {
                getDynamicSelectionEntries().forEach((entry) => {
                    if (entry.selectionId === selectionId) {
                        entry.element.checked = checked === true;
                        appliedCount += 1;
                    }
                });
            });
        }

        if (byMarker) {
            Object.entries(byMarker).forEach(([marker, checked]) => {
                getDynamicSelectionEntries().forEach((entry) => {
                    if (entry.marker === marker) {
                        entry.element.checked = checked === true;
                        appliedCount += 1;
                    }
                });
            });
        }

        return appliedCount;
    }

    function assignDynamicSelectionIdentity(checkbox, sectionDescriptor) {
        if (!checkbox || !sectionDescriptor) {
            return null;
        }

        const identity = resolveDynamicSelectionIdentity(
            sectionDescriptor.filePath || checkbox.dataset.file,
            sectionDescriptor.marker || sectionDescriptor.name || checkbox.dataset.marker,
            sectionDescriptor.type || checkbox.dataset.type
        );

        checkbox.dataset.selectionId = identity.stableId;
        checkbox.dataset.isDynamic = 'true';
        checkbox.id = identity.domId;

        return registerDynamicSelectionElement(checkbox), identity;
    }

    function getCacheBuster() {
        if (typeof globalScope.ASSET_CACHE_BUSTER !== 'undefined') {
            return globalScope.ASSET_CACHE_BUSTER;
        }
        return Date.now();
    }

    function buildDefaultLookup(data) {
        const defaultsHelper = globalScope.ConfigDefaults || globalScope.AppRuntime?.get('defaultUtils');
        if (defaultsHelper && typeof defaultsHelper.buildDefaultLookup === 'function') {
            return defaultsHelper.buildDefaultLookup(data);
        }

        const fallback = {};
        Object.entries(data.dynamic_tweaks || {}).forEach(([key, config]) => {
            if (!config) {
                return;
            }
            const cleanKey = key.replace(/_/g, ' ');
            if (Array.isArray(config.options)) {
                const defaults = config.options.filter((option) => option && option.default === true).map((option) => option.id);
                if (defaults.length > 0) {
                    fallback[key] = { options: defaults, dropdown: null };
                    fallback[cleanKey] = fallback[key];
                }
            }
            if (config.type === 'dropdown' && typeof config.default !== 'undefined') {
                fallback[key] = fallback[key] || { options: [], dropdown: null };
                fallback[key].dropdown = config.default;
                fallback[cleanKey] = fallback[key];
            }
        });

        return fallback;
    }

    function storeDynamicTweaksData(data) {
        globalScope.allTweaksData = data;
        globalScope.dynamicTweaksConfig = data.dynamic_tweaks || {};
        console.log('Loaded dependency metadata:', Object.keys(data.dynamic_tweaks || {}).length, 'tweaks');
        cachedDefaults = buildDefaultLookup(data);
        selectionMetadata = buildSelectionMetadata(data);
        return cachedDefaults;
    }

    async function loadDynamicTweaksDefaults() {
        if (cachedDefaults) {
            return cachedDefaults;
        }

        if (globalScope.allTweaksData && globalScope.allTweaksData.dynamic_tweaks) {
            return storeDynamicTweaksData(globalScope.allTweaksData);
        }

        if (loadingPromise) {
            return loadingPromise;
        }

        loadingPromise = (async () => {
            try {
                const response = await fetch(`dynamic-tweaks.json?v=${getCacheBuster()}`);
                const data = await response.json();

                return storeDynamicTweaksData(data);
            } catch (error) {
                console.warn('Could not load dynamic-tweaks.json defaults:', error);
                return {};
            } finally {
                loadingPromise = null;
            }
        })();

        return loadingPromise;
    }

    const api = {
        assignDynamicSelectionIdentity,
        applyPersistedDynamicTweaks,
        capturePersistedDynamicTweaks,
        getDynamicSelectionEntries,
        getCacheBuster,
        loadDynamicTweaksDefaults,
        resetDynamicSelectionRegistry,
        resolveDynamicSelectionIdentity
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('uiGeneratorDefaultsLoader', api);
    }

    globalScope.UiGeneratorDefaultsLoader = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
