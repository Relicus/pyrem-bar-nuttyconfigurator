// DOM-driven selection scanning extracted from command-builder.js.

(function (globalScope) {
    function getSectionConstants() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('sectionConstants'))
            || globalScope.ConfiguratorSectionConstants
            || {};
    }

    function getSlotLabeling() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderSlotLabeling'))
            || globalScope.CommandBuilderSlotLabeling;
    }

    function getTransforms() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderMaxThisUnitTransformers'))
            || globalScope.CommandBuilderMaxThisUnitTransformers;
    }

    function getDependencyExpander() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderDependencyExpander'))
            || globalScope.CommandBuilderDependencyExpander;
    }

    function getSelectionHelper() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('uiGeneratorDefaultsLoader'))
            || globalScope.UiGeneratorDefaultsLoader;
    }

    function buildSyntheticHpSection(prefix, type, multiplier, fileName) {
        const slotLabeling = getSlotLabeling();
        const transforms = getTransforms();

        if (typeof globalScope.generateLuaTweakRaw !== 'function' || !slotLabeling || !transforms) {
            return null;
        }

        const luaCode = globalScope.generateLuaTweakRaw(type, multiplier);
        const markerMultiplier = slotLabeling.formatMultiplierForMarker(multiplier);
        const markerName = `${prefix}_${markerMultiplier}X_START`;
        const markerEnd = markerName.replace('_START', '_END');

        return {
            name: markerName,
            code: `--${markerName}\n${luaCode}\n--${markerEnd}`,
            type: 'defs',
            lines: luaCode.split('\n').length,
            rawChars: luaCode.length,
            encodedChars: transforms.calculateEncodedSize(luaCode),
            file: fileName,
            marker: markerName,
            isSynthetic: true,
            isHpMultiplier: true
        };
    }

    function addWaveSelection(regularSections, tweakFileCache, raptorWaveValue) {
        const sectionConstants = getSectionConstants();
        const waveConfig = sectionConstants.RAPTOR_WAVE_FILE_MAP && sectionConstants.RAPTOR_WAVE_FILE_MAP[raptorWaveValue];
        if (!waveConfig || !tweakFileCache[waveConfig.fileName]) {
            return;
        }

        tweakFileCache[waveConfig.fileName].forEach((section) => {
            if (section.name.includes(waveConfig.sectionName)) {
                regularSections.push({
                    ...section,
                    file: waveConfig.fileName
                });
                console.log(`Added Raptor Wave Mode: ${raptorWaveValue} - ${section.name}`);
            }
        });
    }

    function getMarkerAliases(filePath, markerName) {
        return [markerName];
    }

    function selectSectionFromCache(selectionEntry, tweakFileCache, applyMaxThisUnitOverride, mainSections, regularSections) {
        const filePath = selectionEntry.file;
        const markerName = selectionEntry.marker;
        const type = selectionEntry.type;
        const sections = tweakFileCache[filePath];

        if (!sections) {
            return;
        }

        const matchedSections = getMarkerAliases(filePath, markerName)
            .map((alias) => sections.find((entry) => entry.name === alias))
            .filter(Boolean);

        if (matchedSections.length === 0) {
            return;
        }

        matchedSections.forEach((section) => {
            let sectionData = {
                ...section,
                file: filePath,
                type
            };

            sectionData = applyMaxThisUnitOverride(sectionData);

            if (filePath.includes('Units_Main.lua') || filePath.includes('Defs_Main.lua')) {
                if (type === 'units') {
                    mainSections.units.push(sectionData);
                } else if (type === 'defs') {
                    mainSections.defs.push(sectionData);
                }
                console.log(`Main section selected: ${section.name} from ${filePath}`);
                return;
            }

            regularSections.push(sectionData);
            console.log(`Selected: ${section.name} from ${filePath}`);
        });
    }

    function autoEnableEvoXp(tweakFileCache, regularSections, mainSections, applyMaxThisUnitOverride) {
        const sectionConstants = getSectionConstants();
        const evoXp = sectionConstants.EVO_XP || 'EVO_XP';
        const evoXpAlreadySelected = regularSections.some((section) => section.name === evoXp)
            || mainSections.units.some((section) => section.name === evoXp)
            || mainSections.defs.some((section) => section.name === evoXp);

        if (evoXpAlreadySelected) {
            return;
        }

        let evoSection = null;
        let evoFilePath = null;

        for (const [filePath, sections] of Object.entries(tweakFileCache)) {
            const found = sections.find((section) => section.name === evoXp);
            if (found) {
                evoSection = found;
                evoFilePath = filePath;
                break;
            }
        }

        if (!evoSection || !evoFilePath) {
            console.warn('EVO_XP section not found; skipping auto-enable');
            return;
        }

        regularSections.push(applyMaxThisUnitOverride({
            ...evoSection,
            file: evoFilePath,
            type: evoSection.type
        }));
        console.log('Auto-enabled EVO_XP for evolving commanders');
    }

    function getCheckedDynamicSelections() {
        const selectionHelper = getSelectionHelper();
        if (selectionHelper && typeof selectionHelper.getDynamicSelectionEntries === 'function') {
            return selectionHelper.getDynamicSelectionEntries({ checkedOnly: true });
        }

        return Array.from(document.querySelectorAll('.tweak-checkbox:checked')).map((checkbox) => ({
            selectionId: checkbox.dataset.selectionId || '',
            marker: checkbox.dataset.marker || '',
            file: checkbox.dataset.file || '',
            type: checkbox.dataset.type || '',
            checked: checkbox.checked === true
        }));
    }

    function isDoomModeSelected(raptorWaveValue, isScavengersMode) {
        return !isScavengersMode && raptorWaveValue === 'doom_mode';
    }

    function isDoomModeCurrentlySelected() {
        const raptorWaveSelected = document.querySelector('input[name="raptor-wave-mode"]:checked');
        const raptorWaveValue = raptorWaveSelected ? raptorWaveSelected.value : 'none';
        const primaryModeSelect = document.getElementById('primary-mode-select');
        const isScavengersMode = primaryModeSelect && primaryModeSelect.value === 'Scavengers';
        return isDoomModeSelected(raptorWaveValue, isScavengersMode);
    }

    // Inverse gate: when Doom Mode is NOT selected, drop any multipliers whose id
    // starts with `doom_` from the emitted command list. Mirrors the existing
    // doom-mode HP-multiplier skip pattern below in scanSelectedSections.
    function shouldEmitMultiplierCommand(multiplierConfig) {
        if (!multiplierConfig || !multiplierConfig.id) {
            return true;
        }
        if (multiplierConfig.id.indexOf('doom_') === 0 && !isDoomModeCurrentlySelected()) {
            return false;
        }
        return true;
    }

    function scanSelectedSections(tweakFileCache) {
        const sectionConstants = getSectionConstants();
        const transforms = getTransforms();

        if (!tweakFileCache || !transforms) {
            return {
                selectedSections: [],
                mainSections: { units: [], defs: [] }
            };
        }

        const mainSections = { units: [], defs: [] };
        const regularSections = [];
        const hpSections = [];
        const applyMaxThisUnitOverride = (section) => transforms.applyMaxThisUnitOverride(section);

        const raptorWaveSelected = document.querySelector('input[name="raptor-wave-mode"]:checked');
        const raptorWaveValue = raptorWaveSelected ? raptorWaveSelected.value : 'none';
        const primaryModeSelect = document.getElementById('primary-mode-select');
        const isScavengersMode = primaryModeSelect && primaryModeSelect.value === 'Scavengers';
        const doomModeSelected = isDoomModeSelected(raptorWaveValue, isScavengersMode);

        document.querySelectorAll('[data-is-hp-generator="true"]').forEach((element) => {
            if (doomModeSelected) {
                console.log(`Skipping generic HP multiplier in Doom Mode: ${element.dataset.hpType.toUpperCase()}`);
                return;
            }

            if (isScavengersMode) {
                return;
            }

            const hpType = element.dataset.hpType;
            if (hpType !== 'hp' && hpType !== 'qhp') {
                return;
            }

            const multiplier = element.value;
            if (!multiplier || multiplier === '1') {
                return;
            }

            const section = buildSyntheticHpSection(hpType.toUpperCase(), hpType, multiplier, 'generated-hp-multiplier');
            if (section) {
                hpSections.push(section);
                console.log(`Added HP multiplier to defs pool: ${hpType.toUpperCase()} ${multiplier}x`);
            }
        });

        if (!isScavengersMode && raptorWaveValue !== 'none') {
            addWaveSelection(regularSections, tweakFileCache, raptorWaveValue);
        }

        document.querySelectorAll('[data-is-scav-hp-generator="true"]').forEach((element) => {
            const multiplier = element.value;
            if (!multiplier || multiplier === '1') {
                return;
            }

            if (doomModeSelected) {
                console.log(`Skipping scav HP multiplier in Doom Mode: ${element.dataset.hpType.toUpperCase()}`);
                return;
            }

            const section = buildSyntheticHpSection('SCAV_HP', element.dataset.hpType, multiplier, 'generated-scav-hp-multiplier');
            if (section) {
                hpSections.push(section);
                console.log(`Added Scav HP multiplier to defs pool: ${element.dataset.hpType.toUpperCase()} ${multiplier}x`);
            }
        });

        const checkedSelections = getCheckedDynamicSelections();
        const checkedMarkers = new Set(checkedSelections.map((selection) => selection.marker));
        const hasEvoCommander = [
            sectionConstants.ARMADA_COMMANDER || 'ARMADA_COMMANDER',
            sectionConstants.CORTEX_COMMANDER || 'CORTEX_COMMANDER',
            sectionConstants.LEGION_COMMANDER || 'LEGION_COMMANDER'
        ].some((marker) => checkedMarkers.has(marker));

        const epicUnitMarkers = sectionConstants.EPIC_UNIT_MARKERS || [];
        checkedSelections.forEach((selection) => {
            const markerName = selection.marker;

            if (markerName === (sectionConstants.EVO_XP || 'EVO_XP') && !hasEvoCommander) {
                return;
            }

            if (epicUnitMarkers.some((marker) => markerName && markerName.includes(marker))) {
                console.log(`Epic unit detected: ${markerName}`);
            }

            selectSectionFromCache(selection, tweakFileCache, applyMaxThisUnitOverride, mainSections, regularSections);
        });

        if (hasEvoCommander) {
            autoEnableEvoXp(tweakFileCache, regularSections, mainSections, applyMaxThisUnitOverride);
        }

        const dependencyExpander = getDependencyExpander();
        if (dependencyExpander && typeof dependencyExpander.expandSectionDependencies === 'function') {
            dependencyExpander.expandSectionDependencies(mainSections, regularSections, tweakFileCache, applyMaxThisUnitOverride);
        }

        return {
            selectedSections: [...hpSections, ...regularSections],
            mainSections
        };
    }

    const api = {
        buildSyntheticHpSection,
        scanSelectedSections,
        isDoomModeSelected,
        isDoomModeCurrentlySelected,
        shouldEmitMultiplierCommand
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderSelectionScanner', api);
    }

    globalScope.CommandBuilderSelectionScanner = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
