// Output Manager Module
// Manages command output generation and display

/**
 * Update output display with generated commands
 * @param {Event} event - Event that triggered the update
 */
window.updateOutputImpl = async function(event) {
    const primaryModeSelect = document.getElementById('primary-mode-select');
    const raptorOnlyContainer = document.getElementById('raptor-only-options');
    const scavOnlyContainer = document.getElementById('scav-only-options');
    const scavHpSelect = document.getElementById('scav-hp-select');
    const bossHpSelect = document.getElementById('boss-hp-select');
    const lobbyNameDisplay = document.getElementById('lobby-name-display');
    const resetSlotsOutput = document.getElementById('reset-slots-output');
    const raptorWaveContainer = document.getElementById('raptor-wave-mode-container');

    // Handle mode switching and reset defaults
    if (primaryModeSelect && raptorOnlyContainer && scavOnlyContainer) {
        const newMode = primaryModeSelect.value;
        const modeChanged = event && event.target === primaryModeSelect;

        if (modeChanged) {
            if (newMode === 'Scavengers') {
                scavHpSelect.value = "1.3";
                bossHpSelect.value = "1.3";
                raptorOnlyContainer.querySelectorAll('select').forEach(sel => sel.value = "");

                const noneRadio = document.querySelector('input[name="raptor-wave-mode"][value="none"]');
                if (noneRadio) {
                    noneRadio.checked = true;
                }
            } else { // Switching back to Raptors
                scavHpSelect.value = "";
                bossHpSelect.value = "";
                raptorOnlyContainer.querySelectorAll('select[data-option-type]').forEach(sel => {
                    if (typeof formOptionsConfig !== 'undefined') {
                        const optionGroup = formOptionsConfig.find(og => og.label === sel.dataset.optionType);
                        if (optionGroup) {
                            sel.value = optionGroup.defaultValue || "";
                        }
                    }
                });

                const waveConfig = window.allTweaksData?.dynamic_tweaks?.Raptor_Wave_Mode;
                const defaultWave = waveConfig?.default || 'mini_bosses';
                const defaultRadio = document.querySelector(`input[name="raptor-wave-mode"][value="${defaultWave}"]`);
                if (defaultRadio) {
                    defaultRadio.checked = true;
                }
            }
        }

        const isScavengers = newMode === 'Scavengers';
        raptorOnlyContainer.hidden = isScavengers;
        scavOnlyContainer.hidden = !isScavengers;
        if (raptorWaveContainer) {
            raptorWaveContainer.hidden = isScavengers;
        }

        if (typeof document !== 'undefined' && document.body) {
            const currentWaveSelection = document.querySelector('input[name="raptor-wave-mode"]:checked');
            const doomSelected = !isScavengers && currentWaveSelection && currentWaveSelection.value === 'doom_mode';
            document.body.classList.toggle('doom-mode-active', !!doomSelected);
        }
    }

    // Generate commands
    let generatedData;
    if (typeof generateCommands === 'function') {
        generatedData = await generateCommands();
    } else {
        console.error('generateCommands function not available');
        return;
    }

    // Update lobby name display
    if (lobbyNameDisplay) {
        lobbyNameDisplay.textContent = generatedData.lobbyName;
    }
    const lobbyCopyBtn = document.getElementById('copy-lobby-name-btn');
    if (lobbyCopyBtn) {
        const lobbyPayload = (generatedData && generatedData.lobbyName) ? generatedData.lobbyName.trim() : '';
        lobbyCopyBtn.dataset.copyText = lobbyPayload;
        lobbyCopyBtn.disabled = lobbyPayload.length === 0;
    }

    // Populate reset-all-slots helper once
    if (resetSlotsOutput && !resetSlotsOutput.value) {
        const slots = [];
        const resetPayload = '0'; // explicit payload so resets are not empty
        for (let i = 0; i <= 9; i++) {
            const suffix = i === 0 ? '' : i;
            slots.push(`!bset tweakdefs${suffix} ${resetPayload}`);
        }
        for (let i = 0; i <= 9; i++) {
            const suffix = i === 0 ? '' : i;
            slots.push(`!bset tweakunits${suffix} ${resetPayload}`);
        }
        resetSlotsOutput.value = slots.join('\n');
    }

    // Update section outputs (lean layout)
    const sections = Array.isArray(generatedData.sections) ? generatedData.sections : [];

    // Game settings (first section)
    const gameSection = document.getElementById('game-settings-section');
    const gameOutput = document.getElementById('command-output-game');
    const gameText = sections[0] || '';
    if (gameOutput && gameSection) {
        gameOutput.value = gameText;
        gameSection.hidden = !gameText;
    }

    const updateCustomOptionUiWithGeneratedData = typeof window.updateCustomOptionUIImpl === 'function'
        ? window.updateCustomOptionUIImpl
        : (typeof updateCustomOptionUI === 'function' ? updateCustomOptionUI : null);

    if (typeof updateCustomOptionUiWithGeneratedData === 'function') {
        updateCustomOptionUiWithGeneratedData(generatedData);
    }

    // Main settings (slot 0)
    const mainSection = document.getElementById('main-settings-section');
    const mainOutput = document.getElementById('command-output-main');
    const mainText = sections[1] || '';
    if (mainOutput && mainSection) {
        mainOutput.value = mainText;
        mainSection.hidden = !mainText;
    }

    // Tweaks (remaining sections) built dynamically
    const tweakContainer = document.getElementById('tweak-sections');
    if (tweakContainer) {
        tweakContainer.innerHTML = '';
        const tweakSections = sections.slice( mainText ? 2 : 1 );
        tweakSections.forEach((text, idx) => {
            if (!text) return;

            const part = idx + 1;
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'command-output-section';

            const header = document.createElement('div');
            header.className = 'command-output-section-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-button';
            copyBtn.dataset.target = `command-output-tweaks-${part}`;
            copyBtn.textContent = tweakSections.length === 1 ? 'Copy Tweaks' : `Copy Tweaks Part ${part}`;

            const textarea = document.createElement('textarea');
            textarea.id = `command-output-tweaks-${part}`;
            textarea.rows = 5;
            textarea.readOnly = true;
            textarea.className = 'command-output-textarea';
            textarea.value = text;

            header.appendChild(copyBtn);
            sectionDiv.appendChild(header);
            sectionDiv.appendChild(textarea);
            tweakContainer.appendChild(sectionDiv);
        });
    }

    // Quick copy buttons for tweaks and multipliers
    const gameTweaksCopyBtn = document.getElementById('copy-game-tweaks-btn');
    if (gameTweaksCopyBtn) {
        // Raptor/Queen HP slot commands only (encoded !bset lines) + lobby name
        const hpCommands = [];
        if (generatedData && Array.isArray(generatedData.slotDetails)) {
            generatedData.slotDetails.forEach(detail => {
                if (!detail || !Array.isArray(detail.sectionNames) || !detail.command) return;
                const hasHpSection = detail.sectionNames.some(name => typeof name === 'string' && /^Q?HP_/.test(name));
                if (hasHpSection) {
                    hpCommands.push(detail.command);
                }
            });
        }

        const lobbyLine = (generatedData && generatedData.lobbyName) || (lobbyNameDisplay ? lobbyNameDisplay.textContent : '');
        const trimmedLobby = (lobbyLine || '').trim();
        const payloadParts = hpCommands.filter(Boolean);
        if (trimmedLobby) {
            payloadParts.push(trimmedLobby);
        }

        const payload = payloadParts.join('\n').trim();
        gameTweaksCopyBtn.dataset.copyText = payload;
        gameTweaksCopyBtn.disabled = payload.length === 0;
    }

    const multipliersCopyBtn = document.getElementById('copy-game-multipliers-btn');
    if (multipliersCopyBtn) {
        const multiplierCommands = typeof window.getMultiplierCommands === 'function'
            ? window.getMultiplierCommands()
            : [];
        const payload = Array.isArray(multiplierCommands) ? multiplierCommands.filter(Boolean).join('\n') : '';
        multipliersCopyBtn.dataset.copyText = payload;
        multipliersCopyBtn.disabled = payload.length === 0;
    }

    // Populate "Copy All Generated Commands" textarea: full bulk-paste block —
    // game settings + main settings (if visible) + every active tweak slot + lobby rename.
    const allCommandsOutput = document.getElementById('all-commands-output');
    if (allCommandsOutput) {
        const pieces = [];

        // 1. Game settings textarea
        const gameOutputEl = document.getElementById('command-output-game');
        if (gameOutputEl) {
            pieces.push(gameOutputEl.value);
        }

        // 2. Main settings textarea — only if its section is currently visible
        const mainSectionEl = document.getElementById('main-settings-section');
        const mainOutputEl = document.getElementById('command-output-main');
        if (mainSectionEl && mainOutputEl && !mainSectionEl.hidden) {
            pieces.push(mainOutputEl.value);
        }

        // 3. Dynamic tweak slot textareas in DOM order (deterministic from dynamic-slot-generator.js)
        document.querySelectorAll('[id^="command-output-tweaks-"]').forEach(textarea => {
            pieces.push(textarea.value);
        });

        // 4. Lobby rename command — same payload the Copy Lobby Name button uses
        if (generatedData && generatedData.lobbyName) {
            pieces.push(generatedData.lobbyName);
        }

        const cleaned = pieces
            .map(piece => (typeof piece === 'string' ? piece.trim() : ''))
            .filter(piece => piece.length > 0);
        allCommandsOutput.value = cleaned.join('\n');
    }

    // Display slot usage information (with per-slot remaining space when available)
    if (generatedData.slotUsage) {
        const slotUsageContainer = document.getElementById('slot-usage-display');
        const slotUsageApi = (window.AppRuntime && window.AppRuntime.get('outputManagerSlotUsage'))
            || window.OutputManagerSlotUsage;
        if (slotUsageContainer && slotUsageApi && typeof slotUsageApi.renderSlotUsage === 'function') {
            slotUsageApi.renderSlotUsage(slotUsageContainer, generatedData, sections);
        }
    }

    if (typeof attachCopyButtonHandlers === 'function') {
        attachCopyButtonHandlers();
    }

};
