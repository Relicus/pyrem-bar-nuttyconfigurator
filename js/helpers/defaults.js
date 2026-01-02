// Default-management helper for BAR Configurator UI
// Centralizes lookup and reset logic used across UI generator and event handlers.

(function (globalScope) {
    /**
     * Build a lookup of default selections from dynamic tweaks data.
     * @param {Object} dynamicTweaksData - Parsed dynamic-tweaks.json
     * @returns {Object} map of tweak display keys to arrays of default option IDs
     */
    function createLookupEntry(store, key) {
        if (!store[key]) {
            store[key] = { options: [], dropdown: null };
        }
        return store[key];
    }

    function registerLookupEntry(store, key, entry) {
        if (!store[key]) {
            store[key] = entry;
        }
    }

    function buildDefaultLookup(dynamicTweaksData) {
        const result = {};

        if (!dynamicTweaksData || !dynamicTweaksData.dynamic_tweaks) {
            return result;
        }

        Object.entries(dynamicTweaksData.dynamic_tweaks).forEach(([key, tweak]) => {
            if (!tweak) {
                return;
            }

            const entry = createLookupEntry(result, key);

            if (Array.isArray(tweak.options)) {
                tweak.options.forEach(option => {
                    if (option && option.default === true && option.id) {
                        entry.options.push(option.id);
                    }
                });
            }

            if (tweak.type === 'dropdown' && typeof tweak.default !== 'undefined') {
                entry.dropdown = tweak.default;
            }

            if (entry.options.length === 0 && entry.dropdown === null) {
                delete result[key];
                return;
            }

            const cleanKey = key.replace(/_/g, ' ');
            registerLookupEntry(result, cleanKey, entry);
        });

        return result;
    }

    /**
     * Determine whether a tweak display name should be enabled by default.
     * @param {string} displayName - Human-readable tweak name
     * @param {Array<string>} curatedDefaults - Hard-coded list of always-on tweak names
     * @param {Object} defaultLookup - Map produced by buildDefaultLookup
     * @returns {boolean}
     */
    function shouldEnableByDefault(displayName, curatedDefaults, defaultLookup) {
        if (!displayName) {
            return false;
        }

        const normalizedDisplay = displayName.toLowerCase().replace(/[ -]/g, '');

        const curatedMatch = Array.isArray(curatedDefaults) && curatedDefaults.some(defaultName => {
            const normalizedDefault = defaultName.toLowerCase().replace(/[ -]/g, '');
            return normalizedDisplay.includes(normalizedDefault) || normalizedDisplay === normalizedDefault;
        });

        if (curatedMatch) {
            return true;
        }

        if (!defaultLookup) {
            return false;
        }

        const baseKey = displayName.replace(/ /g, '_');
        const possibleKeys = new Set([
            baseKey,
            `NuttyB_${baseKey}`,
            displayName.replace(/-/g, '_'),
            displayName.replace(/[ -]/g, '_'),
            displayName.replace(/_/g, ' '),
            displayName,
            baseKey.toUpperCase(),
            displayName.toUpperCase().replace(/ /g, '_')
        ]);

        for (const key of possibleKeys) {
            const entry = defaultLookup[key];
            if (!entry) continue;

            if (Array.isArray(entry) && entry.length > 0) {
                return true;
            }

            if (typeof entry === 'object' && entry !== null) {
                if (Array.isArray(entry.options) && entry.options.length > 0) {
                    return true;
                }
                if (entry.dropdown !== null && typeof entry.dropdown !== 'undefined') {
                    return true;
                }
            }

            if (typeof entry === 'boolean' && entry) {
                return true;
            }
        }

        return false;
    }

    /**
     * Reset a form section to its stored defaults.
     * @param {HTMLElement} sectionElement - Section wrapper containing inputs
     */
    function resetSectionToDefaults(sectionElement) {
        if (!sectionElement) {
            return;
        }

        const inputs = sectionElement.querySelectorAll('input[type="checkbox"], input[type="radio"], input[type="range"], input[type="number"], select');
        const deferredParentUpdates = [];

        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                if (typeof input.dataset.defaultChecked !== 'undefined') {
                    input.checked = input.dataset.defaultChecked === 'true';
                    input.indeterminate = false;
                    if (input.dataset.isDynamic === 'true' && input.dataset.isMainCheckbox === 'true') {
                        deferredParentUpdates.push(input);
                    } else {
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            } else if (input.tagName === 'SELECT') {
                if (typeof input.dataset.defaultValue !== 'undefined') {
                    input.value = input.dataset.defaultValue;
                } else if (input.options.length > 0) {
                    input.selectedIndex = 0;
                }
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (input.type === 'range' || input.type === 'number') {
                if (typeof input.dataset.defaultValue !== 'undefined') {
                    input.value = input.dataset.defaultValue;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });

        deferredParentUpdates.forEach(parent => {
            const tweakId = parent.dataset.tweakId;
            if (!tweakId) return;
            const container = sectionElement || document;
            const subCheckboxes = container.querySelectorAll(`input[data-tweak-id="${tweakId}"][data-is-dynamic-sub="true"]`);
            const checkedCount = Array.from(subCheckboxes).filter(cb => cb.checked).length;
            if (checkedCount === 0) {
                parent.checked = false;
                parent.indeterminate = false;
            } else if (checkedCount === subCheckboxes.length) {
                parent.checked = true;
                parent.indeterminate = false;
            } else {
                parent.checked = false;
                parent.indeterminate = true;
            }
        });
    }

    const api = {
        buildDefaultLookup,
        shouldEnableByDefault,
        resetSectionToDefaults
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (globalScope) {
        globalScope.ConfigDefaults = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
