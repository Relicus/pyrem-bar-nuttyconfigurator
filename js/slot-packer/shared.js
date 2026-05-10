// Shared helpers for slot packing extracted from slot-packer.js.

(function (globalScope) {
    function getResolver() {
        return globalScope.RuntimeResolver || (globalScope.AppRuntime && globalScope.AppRuntime.get('runtimeResolver'));
    }

    function getSlotConstants() {
        const resolver = getResolver();
        return resolver ? resolver.resolveSlotConstants() : globalScope.ConfiguratorSlotConstants;
    }

    function getSectionConstants() {
        const resolver = getResolver();
        return resolver ? resolver.resolveSectionConstants() : globalScope.ConfiguratorSectionConstants;
    }

    function getSlotLabelHelper() {
        const resolver = getResolver();
        return resolver ? resolver.resolveSlotLabelUtils() : globalScope.SlotLabelUtils;
    }

    function getPriorityHelper() {
        const resolver = getResolver();
        return resolver ? resolver.resolvePriorityUtils() : globalScope.PriorityUtils;
    }

    function mapSectionName(name) {
        const helper = getSlotLabelHelper();
        if (helper && typeof helper.mapSectionName === 'function') {
            return helper.mapSectionName(name);
        }
        if (!name) {
            return null;
        }
        if (name.includes('HP_MULTIPLIER')) {
            return (getSectionConstants() || {}).NUTTY_TWEAKS || 'NUTTY_TWEAKS';
        }
        return name;
    }

    function isCommanderSection(section) {
        const sectionConstants = getSectionConstants() || {};
        const commanderIds = sectionConstants.COMMANDER_SECTION_IDS || new Set(['ARMADA_COMMANDER', 'CORTEX_COMMANDER', 'LEGION_COMMANDER']);
        return Boolean(section && commanderIds.has(section.name));
    }

    function slotHasCommander(slot) {
        return Array.isArray(slot?.sections) && slot.sections.some(isCommanderSection);
    }

    function bundleHasCommander(bundle) {
        return Array.isArray(bundle?.sections) && bundle.sections.some(isCommanderSection);
    }

    function getPriorityMeta(section, type) {
        const helper = getPriorityHelper();
        return helper && typeof helper.getPriorityMeta === 'function'
            ? helper.getPriorityMeta(section, type)
            : { priorityRank: 99, tierRank: 99 };
    }

    function getDefaultPriority(type) {
        const helper = getPriorityHelper();
        return helper && typeof helper.getDefaultPriority === 'function'
            ? helper.getDefaultPriority(type)
            : 99;
    }

    function getDefaultTierRank() {
        const helper = getPriorityHelper();
        return helper && typeof helper.getDefaultTierRank === 'function'
            ? helper.getDefaultTierRank()
            : 99;
    }

    function getMinifiedSizeTolerance() {
        return (getSlotConstants() || {}).MINIFIED_SIZE_TOLERANCE || 0.98;
    }

    function assignPriorityMetadata(sections, dependencyMap, type) {
        const sectionByName = new Map();
        sections.forEach((section) => {
            if (section && section.name) {
                sectionByName.set(section.name, section);
            }
        });

        sections.forEach((section) => {
            const meta = getPriorityMeta(section, type) || {};
            section.basePriorityRank = typeof meta.priorityRank === 'number' ? meta.priorityRank : getDefaultPriority(type);
            section.tierRank = typeof meta.tierRank === 'number' ? meta.tierRank : getDefaultTierRank();
        });

        const memo = {};
        const visiting = new Set();
        const resolvePriority = (name) => {
            if (typeof memo[name] !== 'undefined') {
                return memo[name];
            }

            const section = sectionByName.get(name);
            const basePriority = section && typeof section.basePriorityRank === 'number'
                ? section.basePriorityRank
                : getDefaultPriority(type);

            if (visiting.has(name)) {
                return basePriority;
            }

            visiting.add(name);
            let effectivePriority = basePriority;
            const dependencies = dependencyMap && Array.isArray(dependencyMap[name]) ? dependencyMap[name] : [];

            dependencies.forEach((dependency) => {
                if (sectionByName.has(dependency)) {
                    effectivePriority = Math.max(effectivePriority, resolvePriority(dependency));
                }
            });

            visiting.delete(name);
            memo[name] = effectivePriority;
            return effectivePriority;
        };

        sections.forEach((section) => {
            if (section && section.name) {
                section.priorityRank = resolvePriority(section.name);
            }
        });
    }

    function formatSizeInfo(lines, raw, encoded, minifiedEncoded, limits) {
        const parts = [];
        if (typeof lines === 'number') parts.push(`lines ${lines}/${limits.maxLines}`);
        if (typeof raw === 'number') parts.push(`raw ${raw}/${limits.maxRaw}`);
        if (typeof encoded === 'number') parts.push(`enc ${encoded}/${limits.maxEncoded}`);
        if (typeof minifiedEncoded === 'number') {
            parts.push(`minEnc ${minifiedEncoded}/${Math.round(limits.maxEncoded * getMinifiedSizeTolerance())}`);
        }
        return parts.join(', ');
    }

    function getSlotLabel(sections) {
        if (!Array.isArray(sections) || sections.length === 0) {
            return 'EMPTY';
        }

        const uniqueNames = Array.from(new Set(sections.map((section) => section.name))).sort();
        const mappedNames = uniqueNames.map(mapSectionName).filter(Boolean);
        const uniqueLabels = Array.from(new Set(mappedNames));

        if (uniqueLabels.length === 1) {
            return uniqueLabels[0];
        }

        const concatenated = uniqueLabels.join('_');
        return concatenated.length > 50 ? uniqueLabels.map((name) => name.substring(0, 4)).join('_') : concatenated;
    }

    const api = {
        getSlotConstants,
        getSectionConstants,
        getMinifiedSizeTolerance,
        isCommanderSection,
        slotHasCommander,
        bundleHasCommander,
        getPriorityMeta,
        getDefaultPriority,
        getDefaultTierRank,
        assignPriorityMetadata,
        formatSizeInfo,
        getSlotLabel
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('slotPackerShared', api);
    }

    globalScope.SlotPackerShared = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
