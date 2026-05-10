// Shared section ordering helpers extracted from command-builder.js.

(function (globalScope) {
    function getResolver() {
        return globalScope.RuntimeResolver || (globalScope.AppRuntime && globalScope.AppRuntime.get('runtimeResolver'));
    }

    function getPriorityHelper() {
        const resolver = getResolver();
        return resolver ? resolver.resolvePriorityUtils() : globalScope.PriorityUtils;
    }

    function getPriorityMeta(section) {
        const priorityHelper = getPriorityHelper();
        if (!priorityHelper || typeof priorityHelper.getPriorityMeta !== 'function') {
            return null;
        }

        const file = typeof section?.file === 'string' ? section.file : '';
        const type = section?.type || (file.includes('Units_') ? 'units' : 'defs');
        return priorityHelper.getPriorityMeta(section, type);
    }

    function isHpPrioritySection(section) {
        const priorityHelper = getPriorityHelper();
        if (priorityHelper && typeof priorityHelper.isHpPrioritySection === 'function') {
            return priorityHelper.isHpPrioritySection(section);
        }

        if (!section) {
            return false;
        }

        const marker = typeof section.marker === 'string' ? section.marker : '';
        const name = typeof section.name === 'string' ? section.name : '';
        const key = marker || name;

        return /^(HP|QHP|SCAV_HP|BOSS_HP)_/i.test(key);
    }

    function orderSectionsForSlotExecution(sections) {
        if (!Array.isArray(sections) || sections.length <= 1) {
            return Array.isArray(sections) ? sections : [];
        }

        const fallbackPriority = (section) => (isHpPrioritySection(section) ? 0 : 10);
        const getPriority = (section) => {
            if (section && typeof section.priorityRank === 'number') {
                return section.priorityRank;
            }

            const meta = getPriorityMeta(section);
            if (meta && typeof meta.priorityRank === 'number') {
                return meta.priorityRank;
            }

            return fallbackPriority(section);
        };

        const getTier = (section) => {
            if (section && typeof section.tierRank === 'number') {
                return section.tierRank;
            }

            const meta = getPriorityMeta(section);
            if (meta && typeof meta.tierRank === 'number') {
                return meta.tierRank;
            }

            return 99;
        };

        return [...sections].sort((a, b) => {
            const aPriority = getPriority(a);
            const bPriority = getPriority(b);
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            const aTier = getTier(a);
            const bTier = getTier(b);
            if (aTier !== bTier) {
                return aTier - bTier;
            }

            const aLine = typeof a?.startLine === 'number' ? a.startLine : 0;
            const bLine = typeof b?.startLine === 'number' ? b.startLine : 0;
            if (aLine !== bLine) {
                return aLine - bLine;
            }

            return String(a?.name || '').localeCompare(String(b?.name || ''));
        });
    }

    const api = {
        getPriorityMeta,
        isHpPrioritySection,
        orderSectionsForSlotExecution
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderSectionOrdering', api);
    }

    globalScope.CommandBuilderSectionOrdering = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
