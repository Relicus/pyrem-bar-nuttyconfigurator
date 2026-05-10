// Custom Tweaks — Index (Orchestrator)
// Core CRUD operations and window/module exports.

/**
 * Add a new custom tweak
 * @param {Event} event - Form submit event
 * @param {Array} customOptions - Current custom options array
 * @returns {Array} Updated custom options array
 */
function addCustomTweakImpl(event, customOptions) {
    event.preventDefault();
    const form = event.target;
    const validation = window.CustomTweaksValidation;
    const slotState = window.CustomTweaksSlotState;

    const source = (form && form.dataset && form.dataset.source) ? form.dataset.source : 'base64';
    const desc = validation.getFormFieldValue(form, '[data-field="desc"]');
    const typeField = form ? form.querySelector('[data-field="type"]') : null;
    const type = typeField ? typeField.value : 'tweakdefs';
    let tweakValue = validation.getFormFieldValue(form, '[data-field="code"]');

    if (!desc || !tweakValue) return customOptions;
    validation.setValidationMessage(form, '');

    let encodedPayload = null;
    if (source === 'lua') {
        if (!validation.validateLuaInput(tweakValue, form)) return customOptions;
        encodedPayload = slotState.minifyAndEncodeLua(tweakValue);
    } else {
        tweakValue = validation.normalizeBase64Input(tweakValue);
        if (!tweakValue || !validation.BASE64_URL_REGEX.test(tweakValue)) {
            validation.setValidationMessage(form, 'Provide a valid base64url string (A-Z, a-z, 0-9, -, _).');
            return customOptions;
        }
        encodedPayload = slotState.optimizeEncodedLuaPayload(tweakValue);
        if (!encodedPayload) {
            validation.setValidationMessage(form, 'Provide a valid base64url Lua payload that can be decoded and optimized.');
            return customOptions;
        }
    }

    if (!encodedPayload) return customOptions;

    if (encodedPayload.length > validation.CUSTOM_ENCODED_CHAR_LIMIT) {
        validation.setValidationMessage(form, `Encoded tweak exceeds ${validation.CUSTOM_ENCODED_CHAR_LIMIT} characters and will not fit in a slot.`);
        return customOptions;
    }

    validation.setValidationMessage(form, 'Saved custom tweak.', 'success');

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

// Export functions to window for browser use
window.addCustomTweakImpl = addCustomTweakImpl;
window.deleteCustomTweakImpl = deleteCustomTweakImpl;

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadCustomOptions: window.loadCustomOptionsImpl,
        saveCustomOptions: window.saveCustomOptionsImpl,
        addCustomTweak: addCustomTweakImpl,
        deleteCustomTweak: deleteCustomTweakImpl,
        renderCustomTweaksTable: window.renderCustomTweaksTableImpl,
        renderCustomTweaksAsCheckboxes: window.renderCustomTweaksAsCheckboxesImpl,
        renderAllCustomComponents: window.renderAllCustomComponentsImpl,
        updateCustomOptionUI: window.updateCustomOptionUIImpl
    };
}
