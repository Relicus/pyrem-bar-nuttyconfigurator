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
        raptorOnlyContainer.style.display = isScavengers ? 'none' : 'block';
        scavOnlyContainer.style.display = isScavengers ? 'block' : 'none';
        if (raptorWaveContainer) {
            raptorWaveContainer.style.display = isScavengers ? 'none' : 'block';
        }
        if (!isScavengers && typeof window.syncDifficultySelection === 'function') {
            window.syncDifficultySelection(false);
        }
    }

    // Update custom option UI visibility
    if (typeof updateCustomOptionUI === 'function') {
        updateCustomOptionUI();
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
        gameSection.style.display = gameText ? 'grid' : 'none';
    }

    // Main settings (slot 0)
    const mainSection = document.getElementById('main-settings-section');
    const mainOutput = document.getElementById('command-output-main');
    const mainText = sections[1] || '';
    if (mainOutput && mainSection) {
        mainOutput.value = mainText;
        mainSection.style.display = mainText ? 'grid' : 'none';
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
            sectionDiv.style.display = 'grid';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'flex-end';
            header.style.width = '100%';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-button';
            copyBtn.dataset.target = `command-output-tweaks-${part}`;
            copyBtn.textContent = tweakSections.length === 1 ? 'Copy Tweaks' : `Copy Tweaks Part ${part}`;

            const textarea = document.createElement('textarea');
            textarea.id = `command-output-tweaks-${part}`;
            textarea.rows = 5;
            textarea.readOnly = true;
            textarea.style.width = '100%';
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

    // Display slot usage information (with per-slot remaining space when available)
    if (generatedData.slotUsage) {
        const slotUsageContainer = document.getElementById('slot-usage-display');
        if (slotUsageContainer) {
            const limit = 13000;
            const slotCommandMap = collectSlotCommandsFromSections(sections);
            const details = Array.isArray(generatedData.slotDetails) ? generatedData.slotDetails : [];
            const detailMap = new Map();
            details.forEach(d => {
                if (d && typeof d.slotType === 'string' && typeof d.slotNum !== 'undefined') {
                    detailMap.set(`${d.slotType}-${d.slotNum}`, d);
                }
            });

            const fmt = (val) => {
                if (val >= 10000) return `${Math.round(val / 1000)}k`;
                if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                return `${val}`;
            };

            const formatSlot = (type, num) => {
                const label = num === 0 ? type : `${type}${num}`;
                const detail = detailMap.get(`${type}-${num}`);
                if (!detail || typeof detail.encodedSize !== 'number') {
                    return { slotType: type, slotNum: num, label, used: null, free: null };
                }
                const used = Math.max(0, Math.floor(detail.encodedSize));
                const free = Math.max(0, limit - used);
                return { slotType: type, slotNum: num, label, used, free };
            };

            // Count and format tweakdefs slots
            const defCount = generatedData.slotUsage.tweakdefs?.length || 0;
            const defSlots = defCount > 0 ? generatedData.slotUsage.tweakdefs.map(slot => formatSlot('tweakdefs', slot)) : [];

            // Count and format tweakunits slots
            const unitCount = generatedData.slotUsage.tweakunits?.length || 0;
            const unitSlots = unitCount > 0 ? generatedData.slotUsage.tweakunits.map(slot => formatSlot('tweakunits', slot)) : [];

            // Calculate total
            const totalSlots = defCount + unitCount;
            const totalCapacity = limit * 20;
            const totalUsed = Array.from(detailMap.values())
                .map(d => (typeof d.encodedSize === 'number' ? Math.max(0, Math.floor(d.encodedSize)) : 0))
                .reduce((a, b) => a + b, 0);
            const totalPct = totalUsed > 0
                ? Math.round((totalUsed / totalCapacity) * 100)
                : Math.round((totalSlots / 20) * 100);
            const totalColor = totalSlots > 15 ? '#ff6666' : (totalSlots > 10 ? '#ffaa00' : '#66ff66');

            const createCopyButtonForSlot = (slot) => {
                const button = document.createElement('button');
                button.className = 'copy-button slot-copy-button';
                button.textContent = 'Copy';

                const key = `${slot.slotType}-${slot.slotNum}`;
                const commandInfo = slotCommandMap.get(key) || {};
                const detail = detailMap.get(key);
                const resetLine = commandInfo.reset || `!bset ${slot.slotType}${slot.slotNum === 0 ? '' : slot.slotNum} 0`;
                const payloadLine = commandInfo.payload || detail?.command || '';
                const linesToCopy = [];

                if (resetLine) linesToCopy.push(resetLine);
                if (payloadLine) linesToCopy.push(payloadLine);

                if (linesToCopy.length === 0) {
                    button.disabled = true;
                    button.title = 'No command available for this slot';
                    return button;
                }

                button.dataset.copyText = linesToCopy.join('\n');
                button.title = payloadLine
                    ? `Copy reset + payload for ${slot.label}`
                    : `Copy reset command for ${slot.label}`;

                return button;
            };

            const renderSlotSection = (title, slots) => {
                const column = document.createElement('div');
                column.className = 'slot-usage-column';

                const heading = document.createElement('div');
                heading.innerHTML = `<strong>${title} (${slots.length}/10):</strong>`;
                column.appendChild(heading);

                if (!slots.length) {
                    const none = document.createElement('span');
                    none.style.color = '#666';
                    none.textContent = 'None used';
                    column.appendChild(none);
                    return column;
                }

                const list = document.createElement('div');
                list.className = 'slot-list';

                slots.forEach(s => {
                    const row = document.createElement('div');
                    row.className = 'slot-row';

                    const copyBtn = createCopyButtonForSlot(s);
                    const text = document.createElement('span');
                    text.className = 'slot-row-text';
                    text.textContent = s.used === null
                        ? `${s.label}`
                        : `${s.label} (${fmt(s.used)}/${fmt(limit)}, ${fmt(s.free)} free)`;

                    row.appendChild(copyBtn);
                    row.appendChild(text);
                    list.appendChild(row);
                });

                column.appendChild(list);
                return column;
            };

            slotUsageContainer.innerHTML = '';

            const card = document.createElement('div');
            card.className = 'slot-usage-card';

            const header = document.createElement('div');
            header.className = 'slot-usage-header';
            header.innerHTML = `<strong>Total Slot Usage: <span style="color: ${totalColor};">${totalSlots}/20</span> (${totalPct}%)</strong>`;
            card.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'slot-usage-grid';
            grid.appendChild(renderSlotSection('Definitions', defSlots));
            grid.appendChild(renderSlotSection('Units', unitSlots));
            card.appendChild(grid);

            slotUsageContainer.appendChild(card);
        }
    }

    if (typeof attachCopyButtonHandlers === 'function') {
        attachCopyButtonHandlers();
    }

    function collectSlotCommandsFromSections(sectionList) {
        const map = new Map();
        const regex = /^!bset\s+(tweakdefs|tweakunits)(\d*)\s+(.+)$/i;

        sectionList.forEach(sectionText => {
            if (!sectionText) return;
            sectionText.split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                if (!trimmed) return;

                const m = trimmed.match(regex);
                if (!m) return;

                const slotType = m[1].toLowerCase();
                const slotNum = m[2] === '' ? 0 : parseInt(m[2], 10);
                const payload = m[3].trim();
                const key = `${slotType}-${slotNum}`;
                const entry = map.get(key) || { reset: null, payload: null };

                if (payload === '0' && !entry.reset) {
                    entry.reset = trimmed;
                } else if (payload !== '0') {
                    entry.payload = trimmed; // prefer the latest payload line
                }

                map.set(key, entry);
            });
        });

        return map;
    }
};
