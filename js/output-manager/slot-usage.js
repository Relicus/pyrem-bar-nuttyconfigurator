// Slot-usage rendering extracted from output-manager.js.

(function (globalScope) {
    function getLimit() {
        return (globalScope.ConfiguratorSlotConstants && globalScope.ConfiguratorSlotConstants.MAX_ENCODED_SIZE) || 13000;
    }

    function collectSlotCommandsFromSections(sectionList) {
        const map = new Map();
        const regex = /^!bset\s+(tweakdefs|tweakunits)(\d*)\s+(.+)$/i;

        sectionList.forEach((sectionText) => {
            if (!sectionText) return;
            sectionText.split(/\r?\n/).forEach((line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const match = trimmed.match(regex);
                if (!match) return;

                const slotType = match[1].toLowerCase();
                const slotNum = match[2] === '' ? 0 : Number.parseInt(match[2], 10);
                const payload = match[3].trim();
                const key = `${slotType}-${slotNum}`;
                const entry = map.get(key) || { reset: null, payload: null };

                if (payload === '0' && !entry.reset) {
                    entry.reset = trimmed;
                } else if (payload !== '0') {
                    entry.payload = trimmed;
                }

                map.set(key, entry);
            });
        });

        return map;
    }

    function normalizeSlotUsageList(list) {
        if (!Array.isArray(list)) {
            return [];
        }

        return list
            .map((slot) => Number.parseInt(slot, 10))
            .filter((slot) => Number.isInteger(slot) && slot >= 0);
    }

    function createSlotUsageSets(generatedData) {
        const slotUsage = generatedData && generatedData.slotUsage ? generatedData.slotUsage : {};
        return {
            tweakdefs: new Set(normalizeSlotUsageList(slotUsage.tweakdefs)),
            tweakunits: new Set(normalizeSlotUsageList(slotUsage.tweakunits))
        };
    }

    function renderSlotUsage(slotUsageContainer, generatedData, sections) {
        const limit = getLimit();
        const slotCommandMap = collectSlotCommandsFromSections(sections);
        const slotUsageSets = createSlotUsageSets(generatedData);
        const details = Array.isArray(generatedData.slotDetails) ? generatedData.slotDetails : [];
        const detailMap = new Map();
        details.forEach((detail) => {
            if (detail && typeof detail.slotType === 'string' && typeof detail.slotNum !== 'undefined') {
                detailMap.set(`${detail.slotType}-${detail.slotNum}`, detail);
            }
        });

        const formatCompact = (value) => {
            if (value >= 10000) return `${Math.round(value / 1000)}k`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
            return `${value}`;
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

        const defSlots = Array.from(slotUsageSets.tweakdefs).sort((a, b) => a - b).map((slot) => formatSlot('tweakdefs', slot));
        const unitSlots = Array.from(slotUsageSets.tweakunits).sort((a, b) => a - b).map((slot) => formatSlot('tweakunits', slot));
        const totalSlots = defSlots.length + unitSlots.length;
        const totalCapacity = limit * 20;
        const totalUsed = Array.from(detailMap.values())
            .map((detail) => (typeof detail.encodedSize === 'number' ? Math.max(0, Math.floor(detail.encodedSize)) : 0))
            .reduce((sum, value) => sum + value, 0);
        const totalPct = totalUsed > 0 ? Math.round((totalUsed / totalCapacity) * 100) : Math.round((totalSlots / 20) * 100);
        const totalTone = totalSlots > 15 ? 'error' : (totalSlots > 10 ? 'warn' : 'ok');

        const createCopyButtonForSlot = (slot) => {
            const button = document.createElement('button');
            button.className = 'copy-button slot-copy-button';
            button.textContent = 'Copy';

            const key = `${slot.slotType}-${slot.slotNum}`;
            const commandInfo = slotCommandMap.get(key) || {};
            const detail = detailMap.get(key);
            const resetLine = commandInfo.reset || `!bset ${slot.slotType}${slot.slotNum === 0 ? '' : slot.slotNum} 0`;
            const payloadLine = commandInfo.payload || detail?.command || '';
            const linesToCopy = [resetLine, payloadLine].filter(Boolean);

            if (linesToCopy.length === 0) {
                button.disabled = true;
                button.title = 'No command available for this slot';
                return button;
            }

            button.dataset.copyText = linesToCopy.join('\n');
            button.title = payloadLine ? `Copy reset + payload for ${slot.label}` : `Copy reset command for ${slot.label}`;
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
                none.className = 'slot-usage-none';
                none.textContent = 'None used';
                column.appendChild(none);
                return column;
            }

            const list = document.createElement('div');
            list.className = 'slot-list';
            slots.forEach((slot) => {
                const row = document.createElement('div');
                row.className = 'slot-row';
                const text = document.createElement('span');
                text.className = 'slot-row-text';
                text.textContent = slot.used === null
                    ? `${slot.label}`
                    : `${slot.label} (${formatCompact(slot.used)}/${formatCompact(limit)}, ${formatCompact(slot.free)} free)`;
                row.appendChild(createCopyButtonForSlot(slot));
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
        header.innerHTML = `<strong>Total Slot Usage: <span class="slot-usage-total slot-usage-total-${totalTone}">${totalSlots}/20</span> (${totalPct}%)</strong>`;
        card.appendChild(header);
        const grid = document.createElement('div');
        grid.className = 'slot-usage-grid';
        grid.appendChild(renderSlotSection('Definitions', defSlots));
        grid.appendChild(renderSlotSection('Units', unitSlots));
        card.appendChild(grid);
        slotUsageContainer.appendChild(card);
    }

    const api = { collectSlotCommandsFromSections, createSlotUsageSets, renderSlotUsage };
    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('outputManagerSlotUsage', api);
    }
    globalScope.OutputManagerSlotUsage = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
