// Shared priority rules for slot packing and execution ordering.

(function (globalScope) {
    const DEF_PRIORITY = {
        HP: 0,
        WAVES: 1,
        BUILDERS: 2,
        T2: 3,
        T3: 4,
        T4: 5,
        OTHER: 6
    };

    const UNIT_PRIORITY = {
        T1: 1,
        T2: 2,
        T3: 3,
        T4: 4,
        OTHER: 5
    };

    function getSectionFile(section) {
        return section && typeof section.file === 'string' ? section.file : '';
    }

    function getTierRankFromFile(filePath) {
        const file = typeof filePath === 'string' ? filePath : '';
        if (/(^|[_-])T1([_.-]|$)/i.test(file)) return UNIT_PRIORITY.T1;
        if (/(^|[_-])T2([_.-]|$)/i.test(file)) return UNIT_PRIORITY.T2;
        if (/(^|[_-])T3([_.-]|$)/i.test(file)) return UNIT_PRIORITY.T3;
        if (/(^|[_-])T4([_.-]|$)/i.test(file)) return UNIT_PRIORITY.T4;
        return 99;
    }

    function isHpPrioritySection(section) {
        if (!section) {
            return false;
        }

        if (section.isHpMultiplier) {
            return true;
        }

        const marker = typeof section.marker === 'string' ? section.marker : '';
        const name = typeof section.name === 'string' ? section.name : '';
        const key = marker || name;

        return /^(HP|QHP|SCAV_HP|BOSS_HP)_/i.test(key);
    }

    function getDefsPriorityRank(section) {
        if (isHpPrioritySection(section)) {
            return DEF_PRIORITY.HP;
        }

        const file = getSectionFile(section);
        if (/Defs_Waves_/i.test(file)) {
            return DEF_PRIORITY.WAVES;
        }
        if (/Builders/i.test(file)) {
            return DEF_PRIORITY.BUILDERS;
        }
        if (/(^|[_-])T2([_.-]|$)/i.test(file)) {
            return DEF_PRIORITY.T2;
        }
        if (/(^|[_-])T3([_.-]|$)/i.test(file)) {
            return DEF_PRIORITY.T3;
        }
        if (/(^|[_-])T4([_.-]|$)/i.test(file)) {
            return DEF_PRIORITY.T4;
        }

        return DEF_PRIORITY.OTHER;
    }

    function getUnitsPriorityRank(section, tierRank) {
        const fileTier = typeof tierRank === 'number' ? tierRank : getTierRankFromFile(getSectionFile(section));
        if (fileTier >= UNIT_PRIORITY.T1 && fileTier <= UNIT_PRIORITY.T4) {
            return fileTier;
        }
        return UNIT_PRIORITY.OTHER;
    }

    function getPriorityMeta(section, type) {
        const filePath = getSectionFile(section);
        const tierRank = getTierRankFromFile(filePath);
        const priorityRank = type === 'defs'
            ? getDefsPriorityRank(section)
            : getUnitsPriorityRank(section, tierRank);

        return {
            priorityRank,
            tierRank
        };
    }

    function getDefaultPriority(type) {
        return type === 'defs' ? DEF_PRIORITY.OTHER : UNIT_PRIORITY.OTHER;
    }

    function getDefaultTierRank() {
        return 99;
    }

    const api = {
        DEF_PRIORITY,
        UNIT_PRIORITY,
        getPriorityMeta,
        getDefaultPriority,
        getDefaultTierRank,
        getTierRankFromFile,
        isHpPrioritySection
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (globalScope) {
        globalScope.PriorityUtils = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
