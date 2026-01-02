// Utility Functions Module
// General helper and utility functions for BAR Configurator

/**
 * Populate start selector with mode options
 */
window.populateStartSelectorImpl = function() {
    const startSelect = document.getElementById('modes-select');
    if (!startSelect) return;

    const originalValue = startSelect.value;
    startSelect.innerHTML = '';

    if (typeof gameConfigs !== 'undefined' && gameConfigs && gameConfigs.modes) {
        gameConfigs.modes.forEach((mode, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = mode.name;
            startSelect.appendChild(option);
        });

        if (Array.from(startSelect.options).some(opt => opt.value === originalValue)) {
            startSelect.value = originalValue;
        } else if (startSelect.options.length > 0) {
            startSelect.selectedIndex = 0;
        }
        startSelect.dataset.defaultValue = startSelect.value || '';
    }

    if (typeof updateOutput === 'function') {
        updateOutput();
    }
};

/**
 * Load configuration data
 */
window.loadConfigDataImpl = async function() {
    // No longer loading encoded_all_tweaks.txt - all tweaks are now dynamic!
    if (typeof parseConfigData === 'function') {
        parseConfigData();
    }
    console.log("All tweaks loaded from dynamic-tweaks.json");
};

/**
 * Decode base64url encoded string
 * @param {string} base64Url - Base64URL encoded string
 * @returns {string} Decoded string
 */
window.decodeBase64UrlImpl = function(base64Url) {
    if (!base64Url) return '';
    try {
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padding = base64.length % 4;
        if (padding) base64 += '===='.slice(padding);
        const decodedData = atob(base64);
        return new TextDecoder('utf-8').decode(Uint8Array.from(decodedData, c => c.charCodeAt(0)));
    } catch (e) {
        console.error(`Base64URL decoding failed for: ${base64Url}`, e);
        return 'Error decoding data';
    }
};

/**
 * Parse configuration data and build form options
 */
window.parseConfigDataImpl = function() {
    // Initialize config arrays
    if (typeof rawOptionsData !== 'undefined') rawOptionsData = [];
    if (typeof formOptionsConfig !== 'undefined') formOptionsConfig = [];

    const controlModeGroup = {
        label: "Control Mode", type: "select", column: "left", id: "control-mode-select",
        defaultValue: "custom",
        choices: [
            { label: "Difficulty Mode", value: "difficulty", shortLabel: "Difficulty" },
            { label: "Custom Mode", value: "custom", shortLabel: "Custom" },
        ]
    };
    const difficultyGroup = {
        label: "Difficulty", type: "select", column: "left", id: "difficulty-select",
        defaultValue: "1",
        choices: [
            { label: "x1", value: "1", shortLabel: "Dx1" },
            { label: "x2", value: "2", shortLabel: "Dx2" },
            { label: "x3", value: "3", shortLabel: "Dx3" },
            { label: "x4", value: "4", shortLabel: "Dx4" },
            { label: "x5", value: "5", shortLabel: "Dx5" },
            { label: "x6", value: "6", shortLabel: "Dx6" },
            { label: "x7", value: "7", shortLabel: "Dx7" },
            { label: "x8", value: "8", shortLabel: "Dx8" },
            { label: "x9", value: "9", shortLabel: "Dx9" },
            { label: "x10", value: "10", shortLabel: "Dx10" },
        ]
    };
    const dynamicHPGroup = {
        label: "Raptor Health", type: "select", isHpGenerator: true, hpType: 'hp', column: 'left',
        defaultValue: "1.3",
        choices: [
            { label: "Default", value: "", shortLabel: "" }, { label: "1x RHP", value: "1", shortLabel: "1xRHP" },
            { label: "1.3x RHP", value: "1.3", shortLabel: "1_3xRHP" }, { label: "1.5x RHP", value: "1.5", shortLabel: "1_5xRHP" },
            { label: "1.7x RHP", value: "1.7", shortLabel: "1_7xRHP" }, { label: "2x RHP", value: "2", shortLabel: "2xRHP" },
            { label: "2.5x RHP", value: "2.5", shortLabel: "2_5xRHP" }, { label: "3x RHP", value: "3", shortLabel: "3xRHP" },
            { label: "4x RHP", value: "4", shortLabel: "4xRHP" }, { label: "5x RHP", value: "5", shortLabel: "5xRHP" },
        ]
    };
    const dynamicQHPGroup = {
        label: "Queen Health", type: "select", isHpGenerator: true, hpType: 'qhp', column: 'left',
        defaultValue: "1.3",
        choices: [
             { label: "Default", value: "", shortLabel: "" }, { label: "1x QHP", value: "1", shortLabel: "1xQHP" },
             { label: "1.3x QHP", value: "1.3", shortLabel: "1_3xQHP" }, { label: "1.5x QHP", value: "1.5", shortLabel: "1_5xQHP" },
             { label: "1.7x QHP", value: "1.7", shortLabel: "1_7xQHP" }, { label: "2x QHP", value: "2", shortLabel: "2xQHP" },
             { label: "2.5x QHP", value: "2.5", shortLabel: "2_5xQHP" }, { label: "3x QHP", value: "3", shortLabel: "3xQHP" },
             { label: "4x QHP", value: "4", shortLabel: "4xQHP" }, { label: "5x QHP", value: "5", shortLabel: "5xQHP" },
        ]
    };

    // Add HP generators first
    if (typeof formOptionsConfig !== 'undefined') {
        formOptionsConfig.push(controlModeGroup, difficultyGroup, dynamicHPGroup, dynamicQHPGroup);

        // Dynamic tweaks no longer used (replaced by slot packer)
        // Previously: dynamicTweaksConfig would add dynamic options here

        console.log(`Loaded ${formOptionsConfig.length} total options`);
        console.log("formOptionsConfig:", formOptionsConfig);
    }
};

/**
 * Encode text to Base64URL format with UTF-8 support
 * SHARED UTILITY - used in command-builder.js, multiplier-handler.js, slot-scanner.js
 * @param {string} text - Text to encode
 * @param {boolean} skipMinify - Skip minification (for non-Lua content)
 * @returns {string} Base64URL-encoded string
 */
window.encodeBase64Url = function(text, skipMinify = false) {
    try {
        // Minify Lua code before encoding (unless skipped)
        let textToEncode = text;
        if (!skipMinify && typeof LuaMinifier !== 'undefined' && typeof LuaMinifier.minify === 'function') {
            try {
                // Attempt to minify as Lua code using aggressive C-style minifier
                textToEncode = LuaMinifier.minify(text);
                const stats = LuaMinifier.getStats(text, textToEncode);
                console.log(`LuaMinifier: ${stats.originalSize} chars -> ${stats.minifiedSize} chars (${stats.reduction}% reduction, saved ${stats.saved} bytes)`);
            } catch (minifyError) {
                // If minification fails, use original text
                console.warn("Minification failed, using original text:", minifyError.message);
                textToEncode = text;
            }
        }

        // Convert string to UTF-8 bytes then to base64
        const utf8Bytes = new TextEncoder().encode(textToEncode);
        const latin1String = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
        return btoa(latin1String)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    } catch (e) {
        console.error("Encoding error:", e);
        // Fallback: try direct encoding (may fail for non-Latin1)
        return btoa(text)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
};

/**
 * Create a DOM cell with command text and copy button
 * SHARED UTILITY - used in ui-renderer.js, custom-tweaks.js
 * @param {HTMLElement} cell - The table cell to populate
 * @param {string} commandText - Command text to display
 * @param {string} buttonText - Copy button text (default: 'Copy')
 */
window.createCommandCell = function(cell, commandText, buttonText = 'Copy') {
    const wrapper = document.createElement('div');
    wrapper.className = 'command-cell-wrapper';

    const textSpan = document.createElement('span');
    textSpan.className = 'command-text';
    textSpan.textContent = commandText;
    textSpan.title = commandText;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = buttonText;
    copyBtn.className = 'copy-row-button';
    copyBtn.dataset.command = commandText;

    wrapper.appendChild(textSpan);
    wrapper.appendChild(copyBtn);
    cell.appendChild(wrapper);
};

/**
 * Find an available slot for tweak assignment
 * SHARED UTILITY - used in command-builder.js, custom-tweaks.js
 * @param {Set} usedSlots - Set of currently used slot numbers
 * @param {Array} possibleSlots - Array of possible slot numbers/values
 * @returns {number|string|null} Available slot or null if none available
 */
window.findAvailableSlot = function(usedSlots, possibleSlots = [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    for (const slot of possibleSlots) {
        if (!usedSlots.has(slot)) {
            return slot;
        }
    }
    return null;
};
