// Custom Tweaks Module
// Manages user-defined custom tweaks

const CUSTOM_TWEAKS_KEY = 'nuttyb-custom-tweaks';
const CUSTOM_LUA_CHAR_LIMIT = 9000;
const CUSTOM_ENCODED_CHAR_LIMIT = 12000;
const LUA_ALLOWED_CHARS = /^[\t\n\r -~]*$/;
const BASE64_URL_REGEX = /^[A-Za-z0-9_-]+={0,2}$/;

function normalizeBase64Input(input) {
    return (input || '')
        .replace(/\s+/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function minifyAndEncodeLua(luaCode) {
    let workingCode = luaCode;

    if (window.LuaMinifier && typeof window.LuaMinifier.minify === 'function') {
        try {
            workingCode = window.LuaMinifier.minify(luaCode);
        } catch (error) {
            console.warn('Failed to minify custom Lua tweak, using original text:', error);
            workingCode = luaCode;
        }
    }

    if (!workingCode) {
        return null;
    }

    try {
        return window.encodeBase64Url(workingCode, true);
    } catch (encodeError) {
        console.warn('Failed to encode custom Lua tweak:', encodeError);
        return null;
    }
}

function validateLuaInput(luaCode) {
    if (luaCode.length > CUSTOM_LUA_CHAR_LIMIT) {
        alert(`Lua snippet is too long. Please keep it under ${CUSTOM_LUA_CHAR_LIMIT} characters before encoding.`);
        return false;
    }
    if (!LUA_ALLOWED_CHARS.test(luaCode)) {
        alert('Lua contains unsupported characters. Only ASCII text, tabs, and new lines are allowed.');
        return false;
    }
    return true;
}

function getFormFieldValue(form, selector) {
    const el = form ? form.querySelector(selector) : null;
    return el ? el.value.trim() : '';
}

/**
 * Load custom options from localStorage
 */
function loadCustomOptionsImpl() {
    const savedTweaks = localStorage.getItem(CUSTOM_TWEAKS_KEY);
    return savedTweaks ? JSON.parse(savedTweaks) : [];
}

/**
 * Save custom options to localStorage
 * @param {Array} customOptions - Array of custom tweak objects
 */
function saveCustomOptionsImpl(customOptions) {
    localStorage.setItem(CUSTOM_TWEAKS_KEY, JSON.stringify(customOptions));
}

/**
 * Add a new custom tweak
 * @param {Event} event - Form submit event
 * @param {Array} customOptions - Current custom options array
 * @returns {Array} Updated custom options array
 */
function addCustomTweakImpl(event, customOptions) {
    event.preventDefault();
    const form = event.target;
    const source = (form && form.dataset && form.dataset.source) ? form.dataset.source : 'base64';
    const desc = getFormFieldValue(form, '[data-field="desc"]');
    const typeField = form ? form.querySelector('[data-field="type"]') : null;
    const type = typeField ? typeField.value : 'tweakdefs';
    let tweakValue = getFormFieldValue(form, '[data-field="code"]');

    if (!desc || !tweakValue) return customOptions;

    let encodedPayload = null;
    if (source === 'lua') {
        if (!validateLuaInput(tweakValue)) return customOptions;
        encodedPayload = minifyAndEncodeLua(tweakValue);
    } else {
        tweakValue = normalizeBase64Input(tweakValue);
        if (!tweakValue || !BASE64_URL_REGEX.test(tweakValue)) {
            alert('Please provide a valid base64url string (A-Z, a-z, 0-9, -, _).');
            return customOptions;
        }
        encodedPayload = tweakValue;
    }

    if (!encodedPayload) return customOptions;

    if (encodedPayload.length > CUSTOM_ENCODED_CHAR_LIMIT) {
        alert(`Encoded tweak exceeds ${CUSTOM_ENCODED_CHAR_LIMIT} characters and will not fit in a slot.`);
        return customOptions;
    }

    return [
        ...customOptions,
        { id: Date.now(), desc, type, tweak: encodedPayload, source }
    ];
}

/**
 * Delete a custom tweak by ID
 * @param {number} id - ID of tweak to delete
 * @param {Array} customOptions - Current custom options array
 * @returns {Array} Updated custom options array
 */
function deleteCustomTweakImpl(id, customOptions) {
    return customOptions.filter(tweak => tweak.id !== id);
}

/**
 * Render custom tweaks table
 * @param {Array} customOptions - Array of custom tweak objects
 */
function renderCustomTweaksTableImpl(customOptions) {
    const customTweaksTableBody = document.querySelector('#custom-tweaks-table tbody');
    customTweaksTableBody.innerHTML = '';
    if (customOptions.length === 0) {
        customTweaksTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No custom tweaks saved</td></tr>';
        return;
    }
    customOptions.forEach(tweak => {
        const row = customTweaksTableBody.insertRow();
        row.insertCell().textContent = tweak.desc;
        const typeCell = row.insertCell();
        const sourceLabel = tweak.source === 'lua' ? 'Lua' : 'Base64';
        typeCell.title = `${tweak.type} (${sourceLabel})`;
        typeCell.textContent = `${tweak.type} · ${sourceLabel}`;
        const commandsCell = row.insertCell();
        window.createCommandCell(commandsCell, tweak.tweak, 'Copy');
        const deleteCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-tweak-btn';
        deleteBtn.dataset.id = tweak.id;
        deleteCell.appendChild(deleteBtn);
    });
}

/**
 * Render custom tweaks as checkboxes in the options form
 * @param {Array} customOptions - Array of custom tweak objects
 */
function renderCustomTweaksAsCheckboxesImpl(customOptions) {
    const customSettingsContainer = document.getElementById('custom-settings-container');
    const customLeftColumn = document.getElementById('custom-left-column');
    const customRightColumn = document.getElementById('custom-right-column');

    customLeftColumn.innerHTML = '';
    customRightColumn.innerHTML = '';
    if (customOptions.length > 0) {
        customSettingsContainer.style.display = 'block';
        customOptions.forEach((tweak, index) => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.isCustom = 'true';
            checkbox.dataset.customData = JSON.stringify({ type: tweak.type, tweak: tweak.tweak, source: tweak.source || 'base64' });
            checkbox.addEventListener('change', updateOutput);

            const textSpan = document.createElement('span');
            textSpan.className = 'custom-option-label-text';
            textSpan.textContent = ` ${tweak.desc}`;

            const typeSpan = document.createElement('span');
            typeSpan.className = 'custom-option-type-display';
            typeSpan.textContent = `(${tweak.type})`;

            label.appendChild(checkbox);
            label.appendChild(textSpan);
            label.appendChild(typeSpan);

            if (index % 2 === 0) customLeftColumn.appendChild(label);
            else customRightColumn.appendChild(label);
        });
    } else {
        customSettingsContainer.style.display = 'none';
    }
}

/**
 * Render all custom components (table and checkboxes)
 * @param {Array} customOptions - Array of custom tweak objects
 */
function renderAllCustomComponentsImpl(customOptions) {
    renderCustomTweaksTableImpl(customOptions);
    renderCustomTweaksAsCheckboxesImpl(customOptions);
}

/**
 * Update custom option UI with slot availability
 */
function updateCustomOptionUIImpl() {
    const usedTweakDefs = new Set();
    const usedTweakUnits = new Set();
    // Regex to find 'tweakdefs' or 'tweakunits' followed by a number from 1-9
    const slotRegex = /!bset\s+(tweakdefs|tweakunits)([1-9])\b/;

    const allFormElements = document.querySelectorAll('#options-form-columns input[type="checkbox"], #options-form-columns select');

    // Step 1: Scan all standard options to find which numbered slots are currently being used.
    allFormElements.forEach(el => {
        if (el.dataset.isCustom) return; // Skip custom tweaks in this initial scan.
        if (el.dataset.isDynamic) return; // Skip dynamic tweaks - they're handled separately

        // Handle HP/Scav generator dropdowns which have a dedicated, numbered slot.
        if ((el.dataset.isHpGenerator || el.dataset.isScavHpGenerator) && el.value && el.dataset.slot) {
            const slotNum = parseInt(el.dataset.slot, 10);
            if (!isNaN(slotNum)) { // Ensure the slot is a valid number.
                if (el.dataset.slotType === 'tweakdefs') usedTweakDefs.add(slotNum);
                else if (el.dataset.slotType === 'tweakunits') usedTweakUnits.add(slotNum);
            }
            return; // Done processing this HP element.
        }

        // Handle standard checkboxes and other select dropdowns.
        let commands = [];
        if (el.tagName === 'SELECT' && el.value) {
            commands.push(el.value);
        } else if (el.type === 'checkbox' && el.checked && el.dataset.commandBlocks) {
            commands = JSON.parse(el.dataset.commandBlocks);
        }

        commands.forEach(cmd => {
            if (!cmd) return;
            const match = cmd.match(slotRegex);
            if (match) {
                // match[1] is 'tweakdefs' or 'tweakunits'
                // match[2] is the slot number character (e.g., '4')
                const slotNum = parseInt(match[2], 10);
                if (match[1] === 'tweakdefs') usedTweakDefs.add(slotNum);
                else if (match[1] === 'tweakunits') usedTweakUnits.add(slotNum);
            }
        });
    });

    // Step 2: Update the UI for custom tweaks based on the now-accurate slot usage.
    const customCheckboxes = document.querySelectorAll('input[data-is-custom="true"]');
    customCheckboxes.forEach(checkbox => {
        const typeSpan = checkbox.nextElementSibling.nextElementSibling;
        const textSpan = checkbox.nextElementSibling;
        const tweakData = JSON.parse(checkbox.dataset.customData);
        textSpan.classList.remove('disabled');

        if (checkbox.checked) {
            // If checked, find the first available slot and assign it for display.
            const targetSet = (tweakData.type === 'tweakdefs') ? usedTweakDefs : usedTweakUnits;
            const assignedSlot = window.findAvailableSlot(targetSet, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
            if (assignedSlot !== null) {
                typeSpan.textContent = `(${tweakData.type}${assignedSlot})`;
                // IMPORTANT: Add the slot to the set so the next checked custom tweak doesn't re-use it.
                targetSet.add(assignedSlot);
            } else {
                typeSpan.textContent = `(${tweakData.type} - No Slot!)`;
            }
        } else {
             // If not checked, just show its base type.
             typeSpan.textContent = `(${tweakData.type})`;
        }
    });

    // Step 3: Disable any UNCHECKED custom tweaks if no slots of their type are left.
    let defsAvailable = 9 - usedTweakDefs.size;
    let unitsAvailable = 9 - usedTweakUnits.size;

    customCheckboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            const tweakData = JSON.parse(checkbox.dataset.customData);
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

    // Step 4: Update the warning message with the final count.
    const slotWarningContainer = document.getElementById('slot-warning-messages');
    slotWarningContainer.innerHTML = '';
    const defsSlotWord = Math.max(0, defsAvailable) === 1 ? 'slot' : 'slots';
    const unitsSlotWord = Math.max(0, unitsAvailable) === 1 ? 'slot' : 'slots';
    const message = document.createElement('p');
    message.textContent = `${Math.max(0, defsAvailable)} available tweakdefs ${defsSlotWord} and ${Math.max(0, unitsAvailable)} available tweakunits ${unitsSlotWord}`;
    slotWarningContainer.appendChild(message);
}

// Export functions to window for browser use
window.loadCustomOptionsImpl = loadCustomOptionsImpl;
window.saveCustomOptionsImpl = saveCustomOptionsImpl;
window.addCustomTweakImpl = addCustomTweakImpl;
window.deleteCustomTweakImpl = deleteCustomTweakImpl;
window.renderCustomTweaksTableImpl = renderCustomTweaksTableImpl;
window.renderCustomTweaksAsCheckboxesImpl = renderCustomTweaksAsCheckboxesImpl;
window.renderAllCustomComponentsImpl = renderAllCustomComponentsImpl;
window.updateCustomOptionUIImpl = updateCustomOptionUIImpl;

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadCustomOptions: loadCustomOptionsImpl,
        saveCustomOptions: saveCustomOptionsImpl,
        addCustomTweak: addCustomTweakImpl,
        deleteCustomTweak: deleteCustomTweakImpl,
        renderCustomTweaksTable: renderCustomTweaksTableImpl,
        renderCustomTweaksAsCheckboxes: renderCustomTweaksAsCheckboxesImpl,
        renderAllCustomComponents: renderAllCustomComponentsImpl,
        updateCustomOptionUI: updateCustomOptionUIImpl
    };
}
