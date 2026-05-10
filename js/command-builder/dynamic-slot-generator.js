// Dynamic slot generation orchestration extracted from command-builder.js.

(function (globalScope) {
    function getSlotConstants() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('slotConstants'))
            || globalScope.ConfiguratorSlotConstants
            || {};
    }

    function getSelectionScanner() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderSelectionScanner'))
            || globalScope.CommandBuilderSelectionScanner;
    }

    function getSlotIo() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderSlotIo'))
            || globalScope.CommandBuilderSlotIo;
    }

    function getDependencyGraph() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('slotPackerDependencyGraph'))
            || globalScope.SlotPackerDependencyGraph;
    }

    function getSlotDistributionData() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.getState('slotDistributionData', null))
            || globalScope.slotDistributionData
            || null;
    }

    function getDependencyTable() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.getState('tweakDependencyTable', null))
            || globalScope.tweakDependencyTable
            || null;
    }

    function buildPreassignedSlots(mainSections) {
        const preassignedSlots = {};
        [...(mainSections.units || []), ...(mainSections.defs || [])].forEach((section) => {
            if (section && section.name) {
                preassignedSlots[section.name] = 0;
            }
        });
        return preassignedSlots;
    }

    function buildPackerDependencies(mainSections) {
        const dependencyTable = getDependencyTable();
        const dependencyGraph = getDependencyGraph();
        const dependencyService = dependencyGraph && typeof dependencyGraph.createDependencyService === 'function'
            ? dependencyGraph.createDependencyService(dependencyTable || {})
            : null;
        const normalizedDependencyMap = dependencyService && dependencyService.dependencyMap && typeof dependencyService.dependencyMap === 'object'
            ? dependencyService.dependencyMap
            : (dependencyTable && dependencyTable.deps ? dependencyTable.deps : null);
        const slotGroups = dependencyTable && (dependencyTable.slot_groups || dependencyTable.slotGroups)
            ? (dependencyTable.slot_groups || dependencyTable.slotGroups)
            : null;

        return {
            preassignedSlots: buildPreassignedSlots(mainSections),
            ...(normalizedDependencyMap ? { dependencyMap: normalizedDependencyMap } : {}),
            ...(slotGroups ? { slotGroups } : {})
        };
    }

    async function generateDynamicSlotCommands(tweakFileCache, packIntoSlots) {
        console.log('Generating dynamic slot commands...');

        if (!tweakFileCache) {
            console.log('Dynamic slot generation not available - file cache not loaded');
            return null;
        }

        const selectionScanner = getSelectionScanner();
        const slotIo = getSlotIo();
        const slotConstants = getSlotConstants();
        const selection = selectionScanner.scanSelectedSections(tweakFileCache);
        const selectedSections = selection.selectedSections;
        const mainSections = selection.mainSections;

        if (selectedSections.length === 0 && mainSections.units.length === 0 && mainSections.defs.length === 0) {
            console.warn('No sections selected for slot packing');
            return {
                commands: [],
                usedSlots: { tweakdefs: new Set(), tweakunits: new Set() },
                slotDetails: []
            };
        }

        const commands = [];
        const usedSlots = { tweakdefs: new Set(), tweakunits: new Set() };
        const slotMetadata = [];

        slotIo.clearTempSlotFiles();

        if (mainSections.units.length > 0) {
            const unitMeta = slotIo.encodeAndValidateSlot('tweakunits', 0, mainSections.units, commands, usedSlots);
            if (unitMeta) {
                slotMetadata.push(unitMeta);
            }
        }

        if (mainSections.defs.length > 0) {
            const defMeta = slotIo.encodeAndValidateSlot('tweakdefs', 0, mainSections.defs, commands, usedSlots);
            if (defMeta) {
                slotMetadata.push(defMeta);
            }
        }

        let packed = { tweakunits: [], tweakdefs: [] };
        const limits = {
            maxLines: slotConstants.MAX_SLOT_LINES || 700,
            maxRaw: slotConstants.MAX_SLOT_RAW_CHARS || 22000,
            maxEncoded: slotConstants.TARGET_MAX_ENCODED_SIZE || 12000,
            bufferPct: 0.9
        };

        if (selectedSections.length > 0) {
            console.log(`Packing ${selectedSections.length} regular sections into numbered slots...`);

            packed = packIntoSlots(
                selectedSections,
                limits,
                getSlotDistributionData(),
                buildPackerDependencies(mainSections)
            );
        }

        packed.tweakunits.sort((a, b) => a.slotNum - b.slotNum);
        packed.tweakdefs.sort((a, b) => a.slotNum - b.slotNum);

        packed.tweakunits.forEach((slot) => {
            const unitMeta = slotIo.encodeAndValidateSlot('tweakunits', slot.slotNum, slot.sections, commands, usedSlots, { slotLabel: slot.label });
            if (unitMeta) {
                slotMetadata.push(unitMeta);
            }
        });

        packed.tweakdefs.forEach((slot) => {
            const defMeta = slotIo.encodeAndValidateSlot('tweakdefs', slot.slotNum, slot.sections, commands, usedSlots, { slotLabel: slot.label });
            if (defMeta) {
                slotMetadata.push(defMeta);
            }
        });

        await slotIo.writeTempSlotFilesToDisk();

        return {
            commands,
            usedSlots,
            slotDetails: slotMetadata
        };
    }

    const api = {
        generateDynamicSlotCommands
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderDynamicSlots', api);
    }

    globalScope.CommandBuilderDynamicSlots = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
