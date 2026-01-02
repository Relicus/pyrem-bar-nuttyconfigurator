// Shared slot label utilities for BAR Configurator
// Provides centralized mapping so slot-packer and command-builder stay in sync.

(function (globalScope) {
    const SECTION_LABEL_MAP = {
        RAGNAROK: 'EPICS',
        CALAMITY: 'EPICS',
        STARFALL: 'EPICS',
        BASTION: 'EPICS',
        SENTINEL: 'EPICS',
        FORTRESS: 'EPICS',
        EPICS_BUILDOPTIONS: 'EPICS',
        T3_BUILDERS: 'T3_BUILD',
        T3_ECO: 'T3_ECO',
        T4_ECO: 'T4_ECO',
        ARMADA_COMMANDER: 'COM_ARMADA',
        CORTEX_COMMANDER: 'COM_CORTEX',
        LEGION_COMMANDER: 'COM_LEGION',
        MINI_BOSSES: 'MINI_BOSSES',
        EXP_WAVE: 'EXP_WAVE',
        'HP_MULTIPLIER_0.5x': 'NUTTY_TWEAKS',
        'HP_MULTIPLIER_1.5x': 'NUTTY_TWEAKS',
        HP_MULTIPLIER_2x: 'NUTTY_TWEAKS'
    };

    function normalizeSectionName(name) {
        if (!name) {
            return null;
        }

        if (Object.prototype.hasOwnProperty.call(SECTION_LABEL_MAP, name)) {
            return SECTION_LABEL_MAP[name];
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
        SECTION_LABEL_MAP,
        mapSectionName: normalizeSectionName,
        mapSectionNames
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (globalScope) {
        globalScope.SlotLabelUtils = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
