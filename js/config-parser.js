// Config Parser Module
// Configuration loading, parsing, and start selector population.

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
 * Parse configuration data and build form options
 */
window.parseConfigDataImpl = function() {
    // Initialize config arrays
    if (typeof rawOptionsData !== 'undefined') rawOptionsData = [];
    if (typeof formOptionsConfig !== 'undefined') formOptionsConfig = [];

    // REMOVED: Control Mode and Difficulty groups - Simplified manual mode only
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
        formOptionsConfig.push(dynamicHPGroup, dynamicQHPGroup);

        // Dynamic tweaks no longer used (replaced by slot packer)
        // Previously: dynamicTweaksConfig would add dynamic options here

        console.log(`Loaded ${formOptionsConfig.length} total options`);
        console.log("formOptionsConfig:", formOptionsConfig);
    }
};
