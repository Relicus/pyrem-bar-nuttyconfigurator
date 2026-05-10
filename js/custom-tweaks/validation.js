// Custom Tweaks — Validation
// Input validation, normalization, and form message helpers.

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

function getValidationMessageNode(form) {
    if (!form) {
        return null;
    }

    let messageNode = form.querySelector('.custom-form-message');
    if (!messageNode) {
        messageNode = document.createElement('p');
        messageNode.className = 'custom-form-message';
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton && submitButton.parentNode) {
            submitButton.parentNode.insertBefore(messageNode, submitButton);
        } else {
            form.appendChild(messageNode);
        }
    }

    return messageNode;
}

function setValidationMessage(form, message, variant = 'error') {
    const messageNode = getValidationMessageNode(form);
    if (!messageNode) {
        return;
    }

    messageNode.textContent = message || '';
    messageNode.dataset.variant = variant;
    messageNode.hidden = !message;
}

function validateLuaInput(luaCode, form) {
    if (luaCode.length > CUSTOM_LUA_CHAR_LIMIT) {
        setValidationMessage(form, `Lua snippet is too long. Keep it under ${CUSTOM_LUA_CHAR_LIMIT} characters before encoding.`);
        return false;
    }
    if (!LUA_ALLOWED_CHARS.test(luaCode)) {
        setValidationMessage(form, 'Lua contains unsupported characters. Only ASCII text, tabs, and new lines are allowed.');
        return false;
    }
    return true;
}

function getFormFieldValue(form, selector) {
    const el = form ? form.querySelector(selector) : null;
    return el ? el.value.trim() : '';
}

// Export to window for sibling modules
window.CustomTweaksValidation = {
    CUSTOM_LUA_CHAR_LIMIT,
    CUSTOM_ENCODED_CHAR_LIMIT,
    LUA_ALLOWED_CHARS,
    BASE64_URL_REGEX,
    normalizeBase64Input,
    setValidationMessage,
    validateLuaInput,
    getFormFieldValue
};
