// Core command assembly extracted from command-builder.js.

(function (globalScope) {
    function getGameConfigs() {
        return globalScope.gameConfigs || globalScope.AppRuntime?.getState('gameConfigs', { maps: [], modes: [], base: [], scavengers: [] }) || { maps: [], modes: [], base: [], scavengers: [] };
    }

    function getDynamicSlotsApi() {
        return globalScope.AppRuntime?.get('commandBuilderDynamicSlots') || globalScope.CommandBuilderDynamicSlots;
    }

    function getSlotIo() {
        return globalScope.AppRuntime?.get('commandBuilderSlotIo') || globalScope.CommandBuilderSlotIo;
    }

    function getRenameBuilder() {
        return globalScope.AppRuntime?.get('commandBuilderRenameBuilder') || globalScope.CommandBuilderRenameBuilder;
    }

    function getSectionLayout() {
        return globalScope.AppRuntime?.get('commandBuilderSectionLayout') || globalScope.CommandBuilderSectionLayout;
    }

    function getCustomTweaksSlotState() {
        return globalScope.AppRuntime?.get('customTweaksSlotState') || globalScope.CustomTweaksSlotState;
    }

    function splitCommandsIntoSections(commands, lobbyName, maxSectionLength = 51000) {
        const sectionsData = [];

        commands.forEach((command) => {
            if (!command) {
                return;
            }

            let placed = false;
            sectionsData.forEach((section) => {
                if (placed) {
                    return;
                }

                const neededLength = section.length === 0 ? command.length : command.length + 1;
                if (section.length + neededLength <= maxSectionLength) {
                    section.commands.push(command);
                    section.length += neededLength;
                    placed = true;
                }
            });

            if (!placed) {
                sectionsData.push({ commands: [command], length: command.length });
            }
        });

        const anyOptionSelected = commands.length > 0;
        if (anyOptionSelected) {
            const lastSection = sectionsData[sectionsData.length - 1];
            if (!lastSection) {
                sectionsData.push({ commands: [lobbyName], length: lobbyName.length });
            } else {
                const neededLength = lastSection.length === 0 ? lobbyName.length : lobbyName.length + 1;
                if (lastSection.length + neededLength <= maxSectionLength) {
                    lastSection.commands.push(lobbyName);
                    lastSection.length += neededLength;
                } else {
                    sectionsData.push({ commands: [lobbyName], length: lobbyName.length });
                }
            }
        }

        return {
            lobbyName: anyOptionSelected ? lobbyName : 'No Options Selected',
            sections: sectionsData.map((section) => {
                const text = section.commands.join('\n');
                return text && !text.endsWith('\n') ? `${text}\n` : text;
            })
        };
    }

    function collectDirectSelections() {
        const result = {
            standardCommands: [],
            customTweaksToProcess: [],
            tweaksNeedingSlots: [],
            dynamicTweaksToGenerate: []
        };
        const processedTweaks = new Set();
        const formElements = document.querySelectorAll('#options-form-columns input[type="checkbox"], #options-form-columns select, #custom-options-form-columns input[type="checkbox"]');

        formElements.forEach((element) => {
            if (element.dataset.isDynamic && element.dataset.isDynamicSub && element.checked) {
                const tweakId = element.dataset.tweakId;
                if (processedTweaks.has(tweakId)) {
                    return;
                }

                processedTweaks.add(tweakId);
                const selectedOptions = [];
                document.querySelectorAll(`input[data-tweak-id="${tweakId}"][data-is-dynamic-sub="true"]:checked`).forEach((subElement) => {
                    selectedOptions.push(subElement.dataset.subOptionId);
                });
                if (selectedOptions.length > 0) {
                    result.dynamicTweaksToGenerate.push({ tweakId, selectedOptions });
                }
                return;
            }

            if (element.dataset.isDynamic || element.dataset.isHpGenerator || element.dataset.isScavHpGenerator) {
                return;
            }

            if (element.dataset.isCustom) {
                if (element.checked) {
                    const customTweaksSlotState = getCustomTweaksSlotState();
                    let parsedData = null;

                    if (customTweaksSlotState && typeof customTweaksSlotState.parseCustomCheckboxData === 'function') {
                        parsedData = customTweaksSlotState.parseCustomCheckboxData(element);
                    }

                    if (!parsedData && element.dataset.customData) {
                        try {
                            parsedData = JSON.parse(element.dataset.customData);
                        } catch (error) {
                            console.warn('Failed to parse custom tweak checkbox data during selection scan:', error);
                        }
                    }

                    if (parsedData) {
                        result.customTweaksToProcess.push(parsedData);
                    }
                }
                return;
            }

            let commands = [];
            if (element.tagName === 'SELECT' && !element.id.includes('maps-select') && !element.id.includes('modes-select') && !element.id.includes('primary-mode-select')) {
                if (element.value) {
                    commands.push(element.value);
                }
            } else if (element.type === 'checkbox' && element.checked) {
                commands = JSON.parse(element.dataset.commandBlocks || '[]');
            }

            commands.forEach((command) => {
                if (!command) {
                    return;
                }

                const match = command.match(/!bset (tweakdefs|tweakunits)X (.+)/);
                if (match) {
                    result.tweaksNeedingSlots.push({ type: match[1], data: match[2] });
                } else {
                    result.standardCommands.push(command.trim());
                }
            });
        });

        return result;
    }

    async function generateCommandsImpl() {
        const gameConfigs = getGameConfigs();
        const mapsSelect = document.getElementById('maps-select');
        const modesSelect = document.getElementById('modes-select');
        const dynamicSlotsApi = getDynamicSlotsApi();
        const slotIo = getSlotIo();
        const renameBuilder = getRenameBuilder();
        const sectionLayout = getSectionLayout();

        const presetCommands = [];
        if (mapsSelect && mapsSelect.value !== '' && gameConfigs.maps[mapsSelect.value]) {
            presetCommands.push(...(gameConfigs.maps[mapsSelect.value].commands || []));
        }
        if (modesSelect && modesSelect.value !== '' && gameConfigs.modes[modesSelect.value]) {
            presetCommands.push(...(gameConfigs.modes[modesSelect.value].commands || []));
        }

        const slotResult = await dynamicSlotsApi.generateDynamicSlotCommands(globalScope.AppRuntime?.getState('tweakFileCache', null), globalScope.packIntoSlots) || {
            commands: [],
            usedSlots: { tweakdefs: new Set(), tweakunits: new Set() },
            slotDetails: []
        };

        const directSelections = collectDirectSelections();
        const usedTweakDefs = new Set(slotResult.usedSlots.tweakdefs || []);
        const usedTweakUnits = new Set(slotResult.usedSlots.tweakunits || []);
        const slotRegex = /!bset\s+(tweakdefs|tweakunits)(\d*)\b/;

        directSelections.standardCommands.forEach((command) => {
            const match = command.match(slotRegex);
            if (!match) {
                return;
            }
            const slotNumber = match[2] === '' ? 0 : Number.parseInt(match[2], 10);
            if (match[1] === 'tweakdefs') {
                usedTweakDefs.add(slotNumber);
            } else {
                usedTweakUnits.add(slotNumber);
            }
        });

        const autoAssignedCommands = [];
        directSelections.tweaksNeedingSlots.forEach((tweak) => {
            const targetSet = tweak.type === 'tweakdefs' ? usedTweakDefs : usedTweakUnits;
            const availableSlot = globalScope.findAvailableSlot(targetSet);
            if (availableSlot !== null) {
                autoAssignedCommands.push(`!bset ${tweak.type}${availableSlot} ${tweak.data}`);
                targetSet.add(availableSlot);
            }
        });

        const dynamicCommands = [];
        if (typeof globalScope.generateDynamicTweak === 'function') {
            for (const tweak of directSelections.dynamicTweaksToGenerate) {
                const result = await globalScope.generateDynamicTweak(tweak.tweakId, tweak.selectedOptions);
                if (result && result.base64url) {
                    const targetSet = result.slot_type === 'tweakdefs' ? usedTweakDefs : usedTweakUnits;
                    const availableSlot = globalScope.findAvailableSlot(targetSet);
                    if (availableSlot !== null) {
                        dynamicCommands.push(`!bset ${result.slot_type}${availableSlot} ${result.base64url}`);
                        targetSet.add(availableSlot);
                    }
                }
            }
        }

        const customCommands = [];
        directSelections.customTweaksToProcess.forEach((tweak) => {
            if (!tweak || !tweak.tweak || !tweak.type) {
                return;
            }
            const targetSet = tweak.type === 'tweakdefs' ? usedTweakDefs : usedTweakUnits;
            const availableSlot = globalScope.findAvailableSlot(targetSet);
            if (availableSlot !== null) {
                const payload = slotIo.annotateCustomPayload(tweak.tweak, availableSlot);
                customCommands.push(`!bset ${tweak.type}${availableSlot} ${payload}`);
                targetSet.add(availableSlot);
            }
        });

        const isGameModeTriggered = presetCommands.length > 0 || directSelections.standardCommands.length > 0 || autoAssignedCommands.length > 0 || dynamicCommands.length > 0 || slotResult.commands.length > 0;
        const finalCommands = [];
        const primaryModeSelect = document.getElementById('primary-mode-select');

        if (isGameModeTriggered) {
            if (Array.isArray(gameConfigs.base) && gameConfigs.base.length > 0) {
                finalCommands.push(...gameConfigs.base);
            }
            if (primaryModeSelect && primaryModeSelect.value === 'Scavengers' && Array.isArray(gameConfigs.scavengers) && gameConfigs.scavengers.length > 0) {
                finalCommands.push(...gameConfigs.scavengers);
            }
            finalCommands.push(...presetCommands);
            finalCommands.push(...(typeof globalScope.getMultiplierCommands === 'function' ? globalScope.getMultiplierCommands() : []));
        }

        finalCommands.push(...slotResult.commands, ...directSelections.standardCommands, ...autoAssignedCommands, ...dynamicCommands, ...customCommands);
        const renameCommand = renameBuilder.buildRenameCommand(finalCommands);
        const finalSections = sectionLayout.buildOutputSections(finalCommands, usedTweakDefs, usedTweakUnits, renameCommand, finalCommands.length > 0 || customCommands.length > 0);

        const slotUsage = {
            tweakdefs: Array.from(usedTweakDefs).sort(sectionLayout.sortSlots),
            tweakunits: Array.from(usedTweakUnits).sort(sectionLayout.sortSlots)
        };

        const resultPayload = {
            lobbyName: finalCommands.length > 0 ? renameCommand : 'No Options Selected',
            sections: finalSections,
            slotUsage,
            slotDetails: Array.isArray(slotResult.slotDetails) ? slotResult.slotDetails : []
        };

        if (typeof globalScope.onSlotSnapshotUpdated === 'function') {
            globalScope.onSlotSnapshotUpdated({
                slots: resultPayload.slotDetails,
                slotUsage,
                context: {
                    lobbyName: resultPayload.lobbyName,
                    mode: primaryModeSelect ? primaryModeSelect.value : 'Unknown',
                    timestamp: new Date().toISOString()
                }
            });
        }

        return resultPayload;
    }

    const api = {
        splitCommandsIntoSections,
        generateCommandsImpl
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderCore', api);
    }

    globalScope.CommandBuilderCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
