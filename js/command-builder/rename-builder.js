// Lobby rename command builder extracted from command-builder.js.

(function (globalScope) {
    function getMultiplierValues() {
        return typeof globalScope.getMultiplierValues === 'function' ? globalScope.getMultiplierValues() || {} : {};
    }

    function getFormOptionsConfig() {
        return globalScope.formOptionsConfig || globalScope.AppRuntime?.getState('formOptionsConfig', []);
    }

    function getRaptorWaveValue() {
        const selected = document.querySelector('input[name="raptor-wave-mode"]:checked');
        return selected ? selected.value : 'none';
    }

    function buildRenameCommand(finalCommands = []) {
        const primaryModeSelect = document.getElementById('primary-mode-select');
        const isScavengers = primaryModeSelect && primaryModeSelect.value === 'Scavengers';
        const isDoomMode = !isScavengers && getRaptorWaveValue() === 'doom_mode';
        let renameCommand = isScavengers
            ? '$rename PvE [PMod] NuttyB Scavengers '
            : (isDoomMode ? '$rename PvE [PMod] NuttyB Doom ' : '$rename PvE [PMod] NuttyB Raptors ');
        const renameParts = [];

        if (isScavengers) {
            const scavHpSelect = document.getElementById('scav-hp-select');
            const bossHpSelect = document.getElementById('boss-hp-select');
            const scavHpText = scavHpSelect && scavHpSelect.value
                ? scavHpSelect.options[scavHpSelect.selectedIndex].text
                : '';
            const bossHpText = bossHpSelect && bossHpSelect.value
                ? bossHpSelect.options[bossHpSelect.selectedIndex].text
                : '';

            const combinedScavHp = [scavHpText, bossHpText].filter(Boolean).join(' ');
            if (combinedScavHp) {
                renameParts.push(`[${combinedScavHp.replace(/\./g, '_')}]`);
            }
        } else {
            const formOptionsConfig = getFormOptionsConfig();
            let extraRaptorsPart = '';
            let raptorHealthPart = '';
            let queenHealthPart = '';

            document.querySelectorAll('#raptor-only-options select').forEach((element) => {
                const selectedOption = element.options[element.selectedIndex];
                if (!selectedOption || !selectedOption.value) {
                    return;
                }

                if ((element.dataset.hpType === 'hp' || element.dataset.hpType === 'qhp') && selectedOption.value === '1') {
                    return;
                }

                const group = formOptionsConfig.find((entry) => entry.label === element.dataset.optionType);
                if (!group) {
                    return;
                }

                const choice = group.choices.find((entry) => entry.value === selectedOption.value);
                if (!choice || typeof choice.shortLabel === 'undefined') {
                    return;
                }

                if (group.label === 'Extras') {
                    extraRaptorsPart = choice.shortLabel;
                } else if (group.label === 'Raptor Health') {
                    raptorHealthPart = choice.shortLabel;
                } else if (group.label === 'Queen Health') {
                    queenHealthPart = choice.shortLabel;
                }
            });

            if (extraRaptorsPart && !isDoomMode) {
                renameParts.push(extraRaptorsPart);
            }

            const multiplierValues = getMultiplierValues();
            const queenCountValue = multiplierValues.raptor_queen_count;
            if (Number.isFinite(queenCountValue) && queenCountValue > 0) {
                renameParts.push(`[Qx${Math.round(queenCountValue)}]`);
            }

            if (queenHealthPart && !isDoomMode) {
                renameParts.push(`[${queenHealthPart}]`);
            }
            if (raptorHealthPart && !isDoomMode) {
                renameParts.push(`[${raptorHealthPart}]`);
            }
        }

        const noMexCommand = '!unit_restrictions_noextractors 1';
        const allowMexCommand = '!unit_restrictions_noextractors 0';
        const lastNoMexIndex = finalCommands.lastIndexOf(noMexCommand);
        const lastAllowMexIndex = finalCommands.lastIndexOf(allowMexCommand);
        const noMexEnabled = lastNoMexIndex > -1 && lastNoMexIndex > lastAllowMexIndex;

        if (renameParts.length > 0) {
            renameCommand += renameParts.join('');
        }
        if (noMexEnabled && !isDoomMode) {
            renameCommand += '[No Mex]';
        }

        return renameCommand;
    }

    const api = {
        buildRenameCommand
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderRenameBuilder', api);
    }

    globalScope.CommandBuilderRenameBuilder = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
