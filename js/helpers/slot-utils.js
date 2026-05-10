// Shared slot label utilities for BAR Configurator
// Provides centralized mapping so slot-packer and command-builder stay in sync.

(function (globalScope) {
    function getSectionRegistry() {
        if (globalScope.AppRuntime) {
            const runtimeRegistry = globalScope.AppRuntime.get('sectionConstants');
            if (runtimeRegistry) {
                return runtimeRegistry;
            }
        }

        if (globalScope.ConfiguratorSectionConstants) {
            return globalScope.ConfiguratorSectionConstants;
        }

        if (typeof require === 'function') {
            try {
                return require('../constants/sections');
            } catch (error) {
                return null;
            }
        }

        return null;
    }

    function getSectionLabelMap() {
        return getSectionRegistry()?.SECTION_SLOT_LABEL_MAP || {};
    }

    function normalizeSectionName(name) {
        if (!name) {
            return null;
        }

        const registry = getSectionRegistry();
        if (registry && typeof registry.mapSectionToSlotLabel === 'function') {
            return registry.mapSectionToSlotLabel(name);
        }

        const labelMap = getSectionLabelMap();
        if (Object.prototype.hasOwnProperty.call(labelMap, name)) {
            return labelMap[name];
        }

        if (name.startsWith('T4_ECO_')) {
            return 'T4_ECO';
        }

        if (name.includes('HP_MULTIPLIER')) {
            return 'NUTTY_TWEAKS';
        }

        return name;
    }

    function mapSectionNames(names) {
        if (!Array.isArray(names)) {
            return [];
        }
        return names
            .map(normalizeSectionName)
            .filter(Boolean);
    }

    const api = {
        SECTION_LABEL_MAP: getSectionLabelMap(),
        mapSectionName: normalizeSectionName,
        mapSectionNames
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (globalScope) {
        if (globalScope.AppRuntime) {
            globalScope.AppRuntime.register('slotLabelUtils', api);
        }
        globalScope.SlotLabelUtils = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));

/**
 * Find an available slot for tweak assignment
 * SHARED UTILITY - used in command-builder/core.js, custom-tweaks/slot-state.js
 * @param {Set} usedSlots - Set of currently used slot numbers
 * @param {Array} possibleSlots - Array of possible slot numbers/values
 * @returns {number|string|null} Available slot or null if none available
 */
window.findAvailableSlot = function(usedSlots, possibleSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    for (const slot of possibleSlots) {
        if (!usedSlots.has(slot)) {
            return slot;
        }
    }
    return null;
};

