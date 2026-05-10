// Output section layout helpers extracted from command-builder.js.

(function (globalScope) {
    function getSlotConstants() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('slotConstants'))
            || globalScope.ConfiguratorSlotConstants
            || {};
    }

    function sortSlots(a, b) {
        if (a === 0) {
            return -1;
        }
        if (b === 0) {
            return 1;
        }
        return a - b;
    }

    function buildSlotUnits(commands, usedTweakDefs, usedTweakUnits, includeUnusedClears = false) {
        const slotConstants = getSlotConstants();
        const units = [];
        const regex = /^!bset\s+(tweakdefs|tweakunits)(\d*)\s+(.+)/i;
        const resetPayload = slotConstants.RESET_PAYLOAD || '0';

        commands.forEach((command) => {
            const match = command.match(regex);
            if (!match) {
                return;
            }

            const slotType = match[1];
            const slotNumString = match[2];
            const slotNum = slotNumString === '' ? 0 : Number.parseInt(slotNumString, 10);
            units.push({
                slotType,
                slotNum,
                commands: [`!bset ${slotType}${slotNumString} ${resetPayload}`, command]
            });
        });

        if (includeUnusedClears) {
            const maxSlotCount = slotConstants.MAX_SLOT_COUNT || 9;
            for (let index = 1; index <= maxSlotCount; index += 1) {
                if (!usedTweakDefs.has(index)) {
                    units.push({ slotType: 'tweakdefs', slotNum: index, commands: [`!bset tweakdefs${index} ${resetPayload}`] });
                }
                if (!usedTweakUnits.has(index)) {
                    units.push({ slotType: 'tweakunits', slotNum: index, commands: [`!bset tweakunits${index} ${resetPayload}`] });
                }
            }
        }

        return units;
    }

    function buildOutputSections(finalCommands, usedTweakDefs, usedTweakUnits, renameCommand, anyOptionSelected) {
        const slotConstants = getSlotConstants();
        const maxSectionLength = slotConstants.MAX_SECTION_LENGTH || 51000;
        const gameSettingsCommands = [];
        const mainSettingsCommands = [];
        const selectedTweakCommands = [];

        finalCommands.forEach((command) => {
            if (!command) {
                return;
            }

            const isSlot0 = /^!bset (tweakunits|tweakdefs)\s/.test(command);
            const isNumberedSlot = /!bset (tweakunits|tweakdefs)[1-9]/.test(command);

            if (isSlot0) {
                mainSettingsCommands.push(command);
            } else if (isNumberedSlot) {
                selectedTweakCommands.push(command);
            } else {
                gameSettingsCommands.push(command);
            }
        });

        const mainSlotUnits = buildSlotUnits(mainSettingsCommands, usedTweakDefs, usedTweakUnits, false);
        const tweakSlotUnits = buildSlotUnits(selectedTweakCommands, usedTweakDefs, usedTweakUnits, true);
        const sectionsData = [];

        const gameSettingsSection = {
            commands: [...gameSettingsCommands],
            length: gameSettingsCommands.join('\n').length
        };

        if (anyOptionSelected) {
            const neededLength = gameSettingsSection.length === 0 ? renameCommand.length : renameCommand.length + 1;
            if (gameSettingsSection.length + neededLength <= maxSectionLength) {
                gameSettingsSection.commands.push(renameCommand);
                gameSettingsSection.length += neededLength;
            }
        }

        const welcomeMessage = '$welcome-message NuttyB ModSettings made with https://relicus.github.io/pyrem-bar-nuttyconfigurator';
        if (gameSettingsSection.length + (gameSettingsSection.length > 0 ? 1 : 0) + welcomeMessage.length <= maxSectionLength) {
            const spacer = gameSettingsSection.length > 0 ? 1 : 0;
            gameSettingsSection.commands.push(welcomeMessage);
            gameSettingsSection.length += welcomeMessage.length + spacer;
        }

        sectionsData.push(gameSettingsSection);

        if (mainSlotUnits.length > 0) {
            const commands = [];
            let length = 0;
            mainSlotUnits.forEach((unit) => {
                const unitText = unit.commands.join('\n');
                const needed = commands.length === 0 ? unitText.length : unitText.length + 1;
                commands.push(unitText);
                length += needed;
            });
            sectionsData.push({ commands, length });
        }

        let currentTweaksSection = null;
        tweakSlotUnits.forEach((unit) => {
            if (!unit || !unit.commands || unit.commands.length === 0) {
                return;
            }

            const unitText = unit.commands.join('\n');
            const unitLength = unitText.length;
            if (!currentTweaksSection) {
                currentTweaksSection = { commands: [], length: 0 };
                sectionsData.push(currentTweaksSection);
            }

            const neededLength = currentTweaksSection.length === 0 ? unitLength : unitLength + 1;
            if (currentTweaksSection.length + neededLength > maxSectionLength) {
                currentTweaksSection = { commands: [unitText], length: unitLength };
                sectionsData.push(currentTweaksSection);
            } else {
                currentTweaksSection.commands.push(unitText);
                currentTweaksSection.length += neededLength;
            }
        });

        return sectionsData.map((section) => section.commands.join('\n'));
    }

    const api = {
        sortSlots,
        buildSlotUnits,
        buildOutputSections
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderSectionLayout', api);
    }

    globalScope.CommandBuilderSectionLayout = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
