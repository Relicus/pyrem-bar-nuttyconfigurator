// Shared tweak identity and section identifiers for BAR configurator consumers.

(function (globalScope) {
    const SECTION_SLOT_LABEL_MAP = {
        RAGNAROK: 'EPICS',
        CALAMITY: 'EPICS',
        STARFALL: 'EPICS_2',
        BASTION: 'EPICS_3',
        SENTINEL: 'EPICS_3',
        FORTRESS: 'EPICS_3',
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

    const SECTION_CANONICAL_ALIASES = {
        BASTION: 'LEGENDARY_BASTION',
        CROSS_FACTION: 'Cross_Faction_T2',
        LRPC: 'LRPC_v2',
        ELYSIUM: 'EPIC_ELYSIUM'
    };

    const tweakIdentityDefinitions = [
        {
            key: 'MAIN',
            metadataKey: 'Main',
            displayGroup: 'Main',
            aliases: [
                'MAIN',
                'MAIN_DEFS',
                'MAIN_UNITS',
                'Main',
                'Main Tweaks',
                'Main Gameplay Tweaks (Defs)',
                'Main Gameplay Tweaks (Units)'
            ],
            files: [
                'tweaks/Defs_Main.lua',
                'tweaks/Units_Main.lua'
            ]
        },
        {
            key: 'EVOLVING_COMMANDERS',
            metadataKey: 'NuttyB_Evolving_Commanders',
            displayGroup: 'Evolving Commanders',
            aliases: [
                'EVOLVING_COMMANDERS',
                'NuttyB_Evolving_Commanders',
                'NuttyB Evolving Commanders',
                'NuttyB Evolving Commanders Armada',
                'NuttyB Evolving Commanders Cortex',
                'NuttyB Evolving Commanders Legion',
                'ARMADA_COMMANDER',
                'CORTEX_COMMANDER',
                'LEGION_COMMANDER'
            ],
            files: [
                'tweaks/Units_NuttyB_Evolving_Commanders_Armada.lua',
                'tweaks/Units_NuttyB_Evolving_Commanders_Cortex.lua',
                'tweaks/Units_NuttyB_Evolving_Commanders_Legion.lua'
            ]
        },
        {
            key: 'CROSS_FACTION_T2',
            metadataKey: 'Cross_Faction_T2',
            displayGroup: 'T2 Cross Faction',
            aliases: [
                'CROSS_FACTION',
                'CROSS_FACTION_T2',
                'Cross_Faction_T2',
                'Cross Faction T2',
                'T2 Cross Faction'
            ],
            files: ['tweaks/Defs_Cross_Faction_T2.lua']
        },
        {
            key: 'T3_ECO',
            metadataKey: 'T3_Eco',
            displayGroup: 'T3 Eco',
            aliases: ['T3_ECO', 'T3 Eco', 'T3 Economy Buildings'],
            files: ['tweaks/Defs_T3_Eco.lua']
        },
        {
            key: 'T4_ECO',
            metadataKey: 'T4_Eco',
            displayGroup: 'T4 Eco',
            aliases: ['T4_ECO', 'T4 Eco'],
            files: ['tweaks/Defs_T4_Eco.lua', 'tweaks/Units_T4_Eco.lua']
        },
        {
            key: 'T3_BUILDERS',
            metadataKey: 'T3_Builders',
            displayGroup: 'T3 Builders',
            aliases: ['T3_BUILDERS', 'T3 Builders', 'T3 Builder Units'],
            files: ['tweaks/Defs_T3_Builders.lua']
        },
        {
            key: 'UNIT_LAUNCHERS',
            metadataKey: 'Unit_Launchers',
            displayGroup: 'Unit Launchers',
            aliases: ['UNIT_LAUNCHERS', 'Unit Launchers'],
            files: ['tweaks/Defs_Unit_Launchers.lua']
        },
        {
            key: 'LRPC_V2',
            metadataKey: 'LRPC_v2',
            displayGroup: 'T2 LRPC v2',
            aliases: ['LRPC', 'LRPC_v2', 'LRPC Rebalance v2', 'LRPC v2', 'T2 LRPC v2'],
            files: ['tweaks/Units_LRPC_v2.lua']
        },
        {
            key: 'T4_DEFENSES',
            metadataKey: 'T4_Defenses',
            displayGroup: 'T4 Defenses',
            aliases: ['T4_Defenses', 'T4 Defenses', 'T4 Defences Test'],
            files: ['tweaks/Defs_T4_Defenses.lua']
        },
        {
            key: 'T4_AIR',
            metadataKey: 'T4_Air',
            displayGroup: 'T4 Air',
            aliases: ['T4_AIR', 'T4_Air', 'T4 Air', 'T4 Air Rework'],
            files: ['tweaks/Defs_T4_Air.lua', 'tweaks/Units_T4_Air.lua']
        },
        {
            key: 'T4_EPICS',
            metadataKey: 'T4_EPICS',
            displayGroup: 'T4 Epics',
            aliases: ['T4_EPICS', 'T4 Epics', 'Epics - New'],
            files: ['tweaks/Defs_T4_Epics.lua']
        },
        {
            key: 'MEGA_NUKE',
            metadataKey: 'Mega_Nuke',
            displayGroup: 'Mega Nuke',
            aliases: ['MEGA_NUKE', 'Mega_Nuke', 'Mega Nuke'],
            files: ['tweaks/Defs_Mega_Nuke.lua']
        },
        {
            key: 'MINI_BOSSES',
            metadataKey: 'Mini_Bosses',
            displayGroup: 'Mini Bosses',
            aliases: ['MINI_BOSSES', 'Mini_Bosses', 'Mini Bosses'],
            files: ['tweaks/Defs_Waves_Mini_Bosses.lua'],
            excludeFromUiGrouping: true
        },
        {
            key: 'EXP_WAVE',
            metadataKey: 'Experimental_Wave_Challenge',
            displayGroup: 'Experimental Wave Challenge',
            aliases: ['EXP_WAVE', 'Experimental_Wave_Challenge', 'Experimental Wave Challenge'],
            files: ['tweaks/Defs_Waves_Experimental_Wave_Challenge.lua'],
            excludeFromUiGrouping: true
        },
        {
            key: 'DOOM_MODE',
            metadataKey: 'Doom_Mode',
            displayGroup: 'Doom Mode',
            aliases: ['DOOM_MODE', 'Doom_Mode', 'Doom Mode'],
            files: ['tweaks/Defs_Waves_Doom_Mode.lua']
        }
    ];

    function normalizeToken(value) {
        return String(value || '')
            .trim()
            .replace(/\\/g, '/')
            .replace(/\.lua$/i, '')
            .replace(/^\.\//, '')
            .replace(/^(Defs_|Units_)/, '')
            .replace(/[_\-()]/g, ' ')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    function registerAlias(map, alias, entry) {
        const normalized = normalizeToken(alias);
        if (!normalized) {
            return;
        }
        map.set(normalized, entry);
    }

    function buildIdentityIndex() {
        const byAlias = new Map();
        tweakIdentityDefinitions.forEach((entry) => {
            (entry.aliases || []).forEach((alias) => registerAlias(byAlias, alias, entry));
            (entry.files || []).forEach((filePath) => {
                registerAlias(byAlias, filePath, entry);
                const fileName = filePath.split('/').pop();
                registerAlias(byAlias, fileName, entry);
            });
        });
        return byAlias;
    }

    const tweakIdentityByAlias = buildIdentityIndex();

    function getTweakIdentity(value) {
        if (!value) {
            return null;
        }

        if (typeof value === 'object') {
            const candidates = [
                value.key,
                value.filePath,
                value.fileName,
                value.displayName,
                value.originalDisplayName,
                value.rawDisplayName,
                value.name
            ];

            for (const candidate of candidates) {
                const entry = getTweakIdentity(candidate);
                if (entry) {
                    return entry;
                }
            }

            return null;
        }

        return tweakIdentityByAlias.get(normalizeToken(value)) || null;
    }

    function normalizeTweakIdentity(value) {
        const entry = getTweakIdentity(value);
        return entry ? entry.key : null;
    }

    function getTweakDisplayGroupName(value, fallback) {
        const entry = getTweakIdentity(value);
        return entry ? entry.displayGroup : (fallback || null);
    }

    function getMetadataLookupKey(value) {
        const entry = getTweakIdentity(value);
        return entry ? entry.metadataKey : null;
    }

    function shouldExcludeFromUiGrouping(value) {
        const entry = getTweakIdentity(value);
        return Boolean(entry && entry.excludeFromUiGrouping);
    }

    function mapSectionToSlotLabel(name) {
        if (!name) {
            return null;
        }

        if (Object.prototype.hasOwnProperty.call(SECTION_SLOT_LABEL_MAP, name)) {
            return SECTION_SLOT_LABEL_MAP[name];
        }

        if (name.startsWith('T4_ECO_')) {
            return 'T4_ECO';
        }

        if (name.includes('HP_MULTIPLIER')) {
            return 'NUTTY_TWEAKS';
        }

        return name;
    }

    function normalizeSectionIdentity(name) {
        if (!name) {
            return null;
        }

        return SECTION_CANONICAL_ALIASES[name] || name;
    }

    function isDedicatedWaveSection(sectionName) {
        return ['MINI_BOSSES', 'EXP_WAVE', 'DOOM_MODE'].some((prefix) => typeof sectionName === 'string' && sectionName.startsWith(prefix));
    }

    const sectionConstants = {
        ARMADA_COMMANDER: 'ARMADA_COMMANDER',
        CORTEX_COMMANDER: 'CORTEX_COMMANDER',
        LEGION_COMMANDER: 'LEGION_COMMANDER',
        EPICS_BUILDOPTIONS: 'EPICS_BUILDOPTIONS',
        EVO_XP: 'EVO_XP',
        EPIC_ELYSIUM: 'EPIC_ELYSIUM',
        NUTTY_TWEAKS: 'NUTTY_TWEAKS',
        COMMANDER_SECTION_IDS: new Set([
            'ARMADA_COMMANDER',
            'CORTEX_COMMANDER',
            'LEGION_COMMANDER'
        ]),
        DEDICATED_RAPTOR_WAVE_PREFIXES: [
            'MINI_BOSSES',
            'EXP_WAVE',
            'DOOM_MODE'
        ],
        EPIC_UNIT_MARKERS: [
            'RAGNAROK',
            'CALAMITY',
            'STARFALL',
            'BASTION',
            'SENTINEL',
            'FORTRESS'
        ],
        MAXTHISUNIT_SECTION_IDS: [
            'T3_BUILDERS',
            'UNIT_LAUNCHERS',
            'RAGNAROK',
            'CALAMITY',
            'T4_AIR',
            'STARFALL'
        ],
        RAPTOR_WAVE_FILE_MAP: {
            mini_bosses: {
                fileName: 'tweaks/Defs_Waves_Mini_Bosses.lua',
                sectionName: 'MINI_BOSSES'
            },
            experimental_wave: {
                fileName: 'tweaks/Defs_Waves_Experimental_Wave_Challenge.lua',
                sectionName: 'EXP_WAVE'
            },
            doom_mode: {
                fileName: 'tweaks/Defs_Waves_Doom_Mode.lua',
                sectionName: 'DOOM_MODE'
            }
        },
        SECTION_SLOT_LABEL_MAP,
        SECTION_CANONICAL_ALIASES,
        TWEAK_IDENTITIES: tweakIdentityDefinitions,
        getTweakIdentity,
        normalizeTweakIdentity,
        getTweakDisplayGroupName,
        getMetadataLookupKey,
        shouldExcludeFromUiGrouping,
        mapSectionToSlotLabel,
        normalizeSectionIdentity,
        isDedicatedWaveSection
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sectionConstants;
    }

    if (globalScope && globalScope.AppRuntime) {
        globalScope.AppRuntime.register('sectionConstants', sectionConstants);
    }

    if (globalScope) {
        globalScope.ConfiguratorSectionConstants = sectionConstants;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
