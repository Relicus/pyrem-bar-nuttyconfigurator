// Custom Tweaks — Rendering
// DOM rendering for custom tweak tables and checkboxes.

function getCustomTweakCheckboxId(tweakId) {
    return `custom-tweak-checkbox-${tweakId}`;
}

function normalizeCheckedCustomTweakIds(checkedIds) {
    return new Set((Array.isArray(checkedIds) ? checkedIds : []).map(id => String(id)));
}

function collectCheckedCustomTweakIdsImpl() {
    return Array.from(document.querySelectorAll('#custom-options-form-columns input[data-is-custom="true"]:checked'))
        .map(checkbox => checkbox.dataset.customTweakId || null)
        .filter(Boolean);
}

/**
 * Render custom tweaks table
 * @param {Array} customOptions - Array of custom tweak objects
 */
function renderCustomTweaksTableImpl(customOptions) {
    const customTweaksTableBody = document.querySelector('#custom-tweaks-table tbody');
    if (!customTweaksTableBody) {
        return;
    }

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
function renderCustomTweaksAsCheckboxesImpl(customOptions, renderOptions = {}) {
    const customSettingsContainer = document.getElementById('custom-settings-container');
    const customLeftColumn = document.getElementById('custom-left-column');
    const customRightColumn = document.getElementById('custom-right-column');
    const checkedIds = normalizeCheckedCustomTweakIds(renderOptions.checkedIds);

    if (!customSettingsContainer || !customLeftColumn || !customRightColumn) {
        return;
    }

    customLeftColumn.innerHTML = '';
    customRightColumn.innerHTML = '';
    if (customOptions.length > 0) {
        customSettingsContainer.hidden = false;
        customOptions.forEach((tweak, index) => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = getCustomTweakCheckboxId(tweak.id);
            checkbox.dataset.isCustom = 'true';
            checkbox.dataset.customTweakId = String(tweak.id);
            checkbox.dataset.customData = JSON.stringify({ type: tweak.type, tweak: tweak.tweak, source: tweak.source || 'base64' });
            checkbox.checked = checkedIds.has(String(tweak.id));
            checkbox.addEventListener('change', updateOutput);
            label.htmlFor = checkbox.id;

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
        customSettingsContainer.hidden = true;
    }
}

/**
 * Render all custom components (table and checkboxes)
 * @param {Array} customOptions - Array of custom tweak objects
 */
function renderAllCustomComponentsImpl(customOptions, renderOptions = {}) {
    renderCustomTweaksTableImpl(customOptions);
    renderCustomTweaksAsCheckboxesImpl(customOptions, renderOptions);
}

// Export to window
window.getCustomTweakCheckboxId = getCustomTweakCheckboxId;
window.collectCheckedCustomTweakIdsImpl = collectCheckedCustomTweakIdsImpl;
window.renderCustomTweaksTableImpl = renderCustomTweaksTableImpl;
window.renderCustomTweaksAsCheckboxesImpl = renderCustomTweaksAsCheckboxesImpl;
window.renderAllCustomComponentsImpl = renderAllCustomComponentsImpl;
