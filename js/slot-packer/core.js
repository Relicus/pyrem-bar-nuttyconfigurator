// Core slot packing orchestration extracted from slot-packer.js.

(function (globalScope) {
    function getShared() {
        return globalScope.AppRuntime?.get('slotPackerShared') || globalScope.SlotPackerShared;
    }

    function getMetrics() {
        return globalScope.AppRuntime?.get('slotPackerMetrics') || globalScope.SlotPackerMetrics;
    }

    function getDependencyGraph() {
        return globalScope.AppRuntime?.get('slotPackerDependencyGraph') || globalScope.SlotPackerDependencyGraph;
    }

    function getPlacement() {
        return globalScope.AppRuntime?.get('slotPackerPlacement') || globalScope.SlotPackerPlacement;
    }

    function packSectionsDynamically(sections, config, targets, type, allTweaks) {
        if (sections.length === 0) {
            return [];
        }

        const shared = getShared();
        const metrics = getMetrics();
        const dependencyGraph = getDependencyGraph();
        const placement = getPlacement();
        const slotConstants = shared.getSlotConstants() || {};
        const sectionConstants = shared.getSectionConstants() || {};
        const maxSlotCount = slotConstants.MAX_SLOT_COUNT || 9;
        const { dependencyMap, slotGroupMap, sectionLevels, orderedSections } = dependencyGraph.buildDependencyData(sections, allTweaks);
        const relevantNames = new Set([
            ...sections.map((section) => section.name),
            ...Object.keys(allTweaks?.preassignedSlots || {})
        ]);
        const relevantDependencyMap = {};

        Object.entries(dependencyMap).forEach(([name, dependencies]) => {
            if (!relevantNames.has(name)) {
                return;
            }

            const scopedDependencies = (dependencies || []).filter((dependency) => relevantNames.has(dependency));
            if (scopedDependencies.length > 0) {
                relevantDependencyMap[name] = scopedDependencies;
            }
        });

        shared.assignPriorityMetadata(sections, relevantDependencyMap, type);
        const bundles = placement.buildFileBundles(sections, sectionLevels, orderedSections, true, slotGroupMap);
        const slots = [];
        const state = {
            slots,
            slotAssignments: { ...(allTweaks?.preassignedSlots || {}) },
            dependencyMap: relevantDependencyMap,
            config,
            type,
            limitHit: false
        };

        for (const bundle of bundles) {
            const forceArmadaCommander = bundle.sections.length === 1
                && bundle.sections[0].name === (sectionConstants.ARMADA_COMMANDER || 'ARMADA_COMMANDER');

            let placedBundle = placement.placeBundleBestFit(bundle, state);
            if (!placedBundle && forceArmadaCommander) {
                console.warn(`Force-packing ARMADA_COMMANDER into its own slot despite size overage (${shared.formatSizeInfo(bundle.lines, bundle.rawChars, bundle.encodedChars, bundle.minifiedEncodedChars, config)}).`);
                placedBundle = placement.placeBundleBestFit(bundle, state, { allowSizeOverride: true });
            }

            if (placedBundle) {
                continue;
            }

            if (shared.bundleHasCommander(bundle)) {
                console.warn(`Commander bundle ${bundle.file} could not be packed (${shared.formatSizeInfo(bundle.lines, bundle.rawChars, bundle.encodedChars, bundle.minifiedEncodedChars, config)}).`);
            } else {
                console.warn(`Bundle ${bundle.file} could not be packed (${shared.formatSizeInfo(bundle.lines, bundle.rawChars, bundle.encodedChars, bundle.minifiedEncodedChars, config)}).`);
            }

            if (state.limitHit || slots.length >= maxSlotCount) {
                break;
            }
        }

        state.slotAssignments = placement.compactSlots(
            slots,
            config,
            relevantDependencyMap,
            state.slotAssignments,
            allTweaks?.preassignedSlots || {}
        );
        placement.labelSlots(slots);
        placement.logSlotAllocation(slots, config, type);
        dependencyGraph.validateDependencyConstraints(slots, state.slotAssignments, relevantDependencyMap);
        return slots;
    }

    function packIntoSlots(selectedSections, limits, slotDistribution, allTweaks) {
        const shared = getShared();
        const slotConstants = shared.getSlotConstants() || {};
        const config = {
            maxLines: slotConstants.MAX_SLOT_LINES || 700,
            maxRaw: slotConstants.MAX_SLOT_RAW_CHARS || 22000,
            maxEncoded: slotConstants.TARGET_MAX_ENCODED_SIZE || 12000,
            hardMaxEncoded: slotConstants.MAX_ENCODED_SIZE || 13000,
            bufferPct: 0.9,
            ...limits
        };
        const targets = {
            lines: Math.floor(config.maxLines * config.bufferPct),
            raw: Math.floor(config.maxRaw * config.bufferPct),
            encoded: Math.floor(config.maxEncoded * config.bufferPct)
        };

        const unitSections = selectedSections.filter((section) => section.type === 'units');
        const defSections = selectedSections.filter((section) => section.type === 'defs');

        return {
            tweakunits: packSectionsDynamically(unitSections, config, targets, 'units', allTweaks),
            tweakdefs: packSectionsDynamically(defSections, config, targets, 'defs', allTweaks)
        };
    }

    const api = {
        packIntoSlots,
        packSectionsDynamically
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('slotPackerCore', api);
    }

    globalScope.SlotPackerCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
