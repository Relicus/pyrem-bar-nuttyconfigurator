// Custom Tweaks — Slot State
// Slot usage prediction, resolution, and UI status updates for custom tweaks.

function getPayloadCodec() {
    return (window.AppRuntime && window.AppRuntime.get('payloadCodec'))
        || window.PayloadCodec
        || null;
}

function getSlotIo() {
    return (window.AppRuntime && window.AppRuntime.get('commandBuilderSlotIo'))
        || window.CommandBuilderSlotIo
        || null;
}

function getSlotUsageApi() {
    return (window.AppRuntime && window.AppRuntime.get('outputManagerSlotUsage'))
        || window.OutputManagerSlotUsage
        || null;
}

function getBase64Decoder() {
    if (typeof window.decodeBase64UrlImpl === 'function') {
        return window.decodeBase64UrlImpl;
    }

    if (typeof window.decodeBase64Url === 'function') {
        return window.decodeBase64Url;
    }

    return null;
}

function getLatestSlotSnapshot() {
    const store = (window.AppRuntime && window.AppRuntime.get('mainStore')) || window.MainStore;
    if (store && typeof store.getLatestSlotSnapshot === 'function') {
        return store.getLatestSlotSnapshot();
    }
    return window.latestSlotSnapshot || { slots: [], slotUsage: null, context: {} };
}

function minifyAndEncodeLua(luaCode) {
    if (!luaCode) {
        return null;
    }

    const payloadCodec = getPayloadCodec();
    if (!payloadCodec || typeof payloadCodec.encodePayload !== 'function') {
        console.warn('Failed to encode custom Lua tweak: PayloadCodec is unavailable');
        return null;
    }

    try {
        return payloadCodec.encodePayload(luaCode, {
            minify: true,
            logStats: false,
            logErrors: true
        });
    } catch (encodeError) {
        console.warn('Failed to encode custom Lua tweak:', encodeError);
        return null;
    }
}

function optimizeEncodedLuaPayload(base64Payload) {
    if (!base64Payload) {
        return null;
    }

    const decodeBase64Url = getBase64Decoder();
    if (!decodeBase64Url) {
        console.warn('Failed to optimize custom base64 tweak: decoder is unavailable');
        return null;
    }

    try {
        const decodedPayload = decodeBase64Url(base64Payload);
        if (!decodedPayload || decodedPayload === 'Error decoding data') {
            console.warn('Failed to optimize custom base64 tweak: payload could not be decoded');
            return null;
        }

        return minifyAndEncodeLua(decodedPayload);
    } catch (decodeError) {
        console.warn('Failed to optimize custom base64 tweak:', decodeError);
        return null;
    }
}

function parseCustomCheckboxData(checkbox) {
    if (!checkbox || !checkbox.dataset || !checkbox.dataset.customData) {
        return null;
    }

    try {
        return JSON.parse(checkbox.dataset.customData);
    } catch (error) {
        console.warn('Failed to parse custom tweak checkbox data:', error);
        return null;
    }
}

function createEmptySlotUsageSets() {
    return {
        tweakdefs: new Set(),
        tweakunits: new Set()
    };
}

function collectPredictedUsedSlots() {
    const usedSlots = createEmptySlotUsageSets();
    const slotRegex = /!bset\s+(tweakdefs|tweakunits)([1-9])\b/;
    const allFormElements = document.querySelectorAll('#options-form-columns input[type="checkbox"], #options-form-columns select');

    allFormElements.forEach((el) => {
        if (el.dataset.isCustom || el.dataset.isDynamic) {
            return;
        }

        if ((el.dataset.isHpGenerator || el.dataset.isScavHpGenerator) && el.value && el.dataset.slot) {
            const slotNum = Number.parseInt(el.dataset.slot, 10);
            if (Number.isNaN(slotNum)) {
                return;
            }

            if (el.dataset.slotType === 'tweakdefs') {
                usedSlots.tweakdefs.add(slotNum);
            } else if (el.dataset.slotType === 'tweakunits') {
                usedSlots.tweakunits.add(slotNum);
            }
            return;
        }

        let commands = [];
        if (el.tagName === 'SELECT' && el.value) {
            commands.push(el.value);
        } else if (el.type === 'checkbox' && el.checked && el.dataset.commandBlocks) {
            commands = JSON.parse(el.dataset.commandBlocks);
        }

        commands.forEach((cmd) => {
            if (!cmd) {
                return;
            }

            const match = cmd.match(slotRegex);
            if (!match) {
                return;
            }

            const slotNum = Number.parseInt(match[2], 10);
            if (match[1] === 'tweakdefs') {
                usedSlots.tweakdefs.add(slotNum);
            } else {
                usedSlots.tweakunits.add(slotNum);
            }
        });
    });

    return usedSlots;
}

function resolveActualUsedSlots(generatedData) {
    const slotUsageApi = getSlotUsageApi();
    if (generatedData && generatedData.slotUsage && slotUsageApi && typeof slotUsageApi.createSlotUsageSets === 'function') {
        return slotUsageApi.createSlotUsageSets(generatedData);
    }

    const latestSnapshot = getLatestSlotSnapshot();
    if (latestSnapshot && latestSnapshot.slotUsage && slotUsageApi && typeof slotUsageApi.createSlotUsageSets === 'function') {
        return slotUsageApi.createSlotUsageSets(latestSnapshot);
    }

    return null;
}

function resolveActualCustomAssignments(generatedData, customCheckboxes) {
    const assignments = new Map();
    const slotUsageApi = getSlotUsageApi();
    const slotIo = getSlotIo();

    if (!generatedData
        || !Array.isArray(generatedData.sections)
        || !slotUsageApi
        || typeof slotUsageApi.collectSlotCommandsFromSections !== 'function'
        || !slotIo
        || typeof slotIo.annotateCustomPayload !== 'function') {
        return assignments;
    }

    const slotCommandMap = slotUsageApi.collectSlotCommandsFromSections(generatedData.sections);

    customCheckboxes.forEach((checkbox) => {
        if (!checkbox.checked) {
            return;
        }

        const tweakData = parseCustomCheckboxData(checkbox);
        if (!tweakData || !tweakData.type || !tweakData.tweak) {
            return;
        }

        for (let slotNum = 1; slotNum <= 9; slotNum += 1) {
            const commandInfo = slotCommandMap.get(`${tweakData.type}-${slotNum}`);
            if (!commandInfo || !commandInfo.payload) {
                continue;
            }

            const expectedCommand = `!bset ${tweakData.type}${slotNum} ${slotIo.annotateCustomPayload(tweakData.tweak, slotNum)}`;
            if (commandInfo.payload === expectedCommand) {
                assignments.set(checkbox, slotNum);
                return;
            }
        }
    });

    return assignments;
}

/**
 * Update custom option UI with slot availability
 */
function updateCustomOptionUIImpl(generatedData = null) {
    const actualUsedSlots = resolveActualUsedSlots(generatedData);
    const predictedUsedSlots = actualUsedSlots ? null : collectPredictedUsedSlots();
    const usedTweakDefs = new Set(actualUsedSlots ? actualUsedSlots.tweakdefs : predictedUsedSlots.tweakdefs);
    const usedTweakUnits = new Set(actualUsedSlots ? actualUsedSlots.tweakunits : predictedUsedSlots.tweakunits);

    // Step 2: Update the UI for custom tweaks based on the now-accurate slot usage.
    const customCheckboxes = document.querySelectorAll('input[data-is-custom="true"]');
    const actualAssignments = resolveActualCustomAssignments(generatedData, customCheckboxes);

    customCheckboxes.forEach(checkbox => {
        const typeSpan = checkbox.nextElementSibling.nextElementSibling;
        const textSpan = checkbox.nextElementSibling;
        const tweakData = parseCustomCheckboxData(checkbox);
        if (!tweakData) {
            return;
        }

        textSpan.classList.remove('disabled');
        checkbox.disabled = false;

        if (checkbox.checked) {
            const actualAssignedSlot = actualAssignments.get(checkbox);
            if (typeof actualAssignedSlot === 'number') {
                typeSpan.textContent = `(${tweakData.type}${actualAssignedSlot})`;
            } else if (!actualUsedSlots) {
                const targetSet = (tweakData.type === 'tweakdefs') ? usedTweakDefs : usedTweakUnits;
                const assignedSlot = window.findAvailableSlot(targetSet, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
                if (assignedSlot !== null) {
                    typeSpan.textContent = `(${tweakData.type}${assignedSlot})`;
                    targetSet.add(assignedSlot);
                } else {
                    typeSpan.textContent = `(${tweakData.type} - No Slot!)`;
                }
            } else {
                typeSpan.textContent = `(${tweakData.type})`;
            }
        } else {
            typeSpan.textContent = `(${tweakData.type})`;
        }
    });

    // Step 3: Disable any UNCHECKED custom tweaks if no slots of their type are left.
    let defsAvailable = 9 - usedTweakDefs.size;
    let unitsAvailable = 9 - usedTweakUnits.size;

    customCheckboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            const tweakData = parseCustomCheckboxData(checkbox);
            if (!tweakData) {
                return;
            }

            let shouldBeDisabled = false;
            if (tweakData.type === 'tweakdefs' && defsAvailable <= 0) {
                shouldBeDisabled = true;
            }
            if (tweakData.type === 'tweakunits' && unitsAvailable <= 0) {
                shouldBeDisabled = true;
            }
            checkbox.disabled = shouldBeDisabled;
            checkbox.nextElementSibling.classList.toggle('disabled', shouldBeDisabled);
        }
    });

    const slotWarningContainer = document.getElementById('slot-warning-messages');
    if (slotWarningContainer) {
        slotWarningContainer.innerHTML = '';
        const defsSlotWord = Math.max(0, defsAvailable) === 1 ? 'slot' : 'slots';
        const unitsSlotWord = Math.max(0, unitsAvailable) === 1 ? 'slot' : 'slots';
        const message = document.createElement('p');
        message.textContent = `${Math.max(0, defsAvailable)} available tweakdefs ${defsSlotWord} and ${Math.max(0, unitsAvailable)} available tweakunits ${unitsSlotWord}`;
        slotWarningContainer.appendChild(message);
    }
}

// Export to window
window.updateCustomOptionUIImpl = updateCustomOptionUIImpl;
window.CustomTweaksSlotState = {
    getPayloadCodec,
    getSlotIo,
    getSlotUsageApi,
    getBase64Decoder,
    getLatestSlotSnapshot,
    minifyAndEncodeLua,
    optimizeEncodedLuaPayload,
    parseCustomCheckboxData,
    createEmptySlotUsageSets,
    collectPredictedUsedSlots,
    resolveActualUsedSlots,
    resolveActualCustomAssignments,
    updateCustomOptionUIImpl
};
