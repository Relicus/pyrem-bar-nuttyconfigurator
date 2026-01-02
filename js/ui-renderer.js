// UI Rendering Module
// Handles all DOM creation and rendering for the configurator

/**
 * Render options form with all UI elements
 * @param {Array} formOptionsConfig - Configuration for form options
 * @param {Object} gameConfigs - Maps, modes, base, scavengers config
 */
function renderOptionsImpl(formOptionsConfig, gameConfigs) {
    const leftColumn = document.getElementById('left-column');
    const rightColumn = document.getElementById('right-column');

    leftColumn.innerHTML = '';
    rightColumn.innerHTML = '';

    const primaryModeLabel = document.createElement('label');
    primaryModeLabel.textContent = 'Mode: ';
    const primaryModeSelect = document.createElement('select');
    primaryModeSelect.id = 'primary-mode-select';
    primaryModeSelect.innerHTML = `<option value="Raptors">Raptors</option><option value="Scavengers">Scavengers</option>`;
    primaryModeSelect.dataset.defaultValue = 'Raptors';
    primaryModeSelect.addEventListener('change', (e) => updateOutput(e));
    primaryModeLabel.appendChild(primaryModeSelect);
    leftColumn.appendChild(primaryModeLabel);

    const scavOnlyContainer = document.createElement('div');
    scavOnlyContainer.id = 'scav-only-options';

    const scavHpLabel = document.createElement('label');
    scavHpLabel.textContent = 'Scavengers HP: ';
    const scavHpSelect = document.createElement('select');
    scavHpSelect.id = 'scav-hp-select';
    scavHpSelect.dataset.isScavHpGenerator = true;
    scavHpSelect.dataset.hpType = 'scav';
    scavHpSelect.dataset.slot = '';
    scavHpSelect.dataset.slotType = 'tweakdefs';
    const scavHpOptions = [
        {v: "", t: "Default"}, {v: "1", t: "1x HP"}, {v: "1.3", t: "1.3x HP"}, {v: "1.5", t: "1.5x HP"}, {v: "1.7", t: "1.7x HP"},
        {v: "2", t: "2x HP"}, {v: "2.5", t: "2.5x HP"}, {v: "3", t: "3x HP"}, {v: "4", t: "4x HP"}, {v: "5", t: "5x HP"}
    ];
    scavHpOptions.forEach(opt => scavHpSelect.add(new Option(opt.t, opt.v)));
    scavHpSelect.value = "";
    scavHpSelect.dataset.defaultValue = "";
    scavHpSelect.addEventListener('change', updateOutput);
    scavHpLabel.appendChild(scavHpSelect);
    scavOnlyContainer.appendChild(scavHpLabel);

    const bossHpLabel = document.createElement('label');
    bossHpLabel.textContent = 'Scav Boss HP: ';
    const bossHpSelect = document.createElement('select');
    bossHpSelect.id = 'boss-hp-select';
    bossHpSelect.dataset.isScavHpGenerator = true;
    bossHpSelect.dataset.hpType = 'boss';
    bossHpSelect.dataset.slot = '5';
    bossHpSelect.dataset.slotType = 'tweakdefs';
    const bossHpOptions = [
        {v: "", t: "Default"}, {v: "1", t: "1x BHP"}, {v: "1.3", t: "1.3x BHP"}, {v: "1.5", t: "1.5x BHP"}, {v: "1.7", t: "1.7x BHP"},
        {v: "2", t: "2x BHP"}, {v: "2.5", t: "2.5x BHP"}, {v: "3", t: "3x BHP"}, {v: "4", t: "4x BHP"}, {v: "5", t: "5x BHP"},
    ];
    bossHpOptions.forEach(opt => bossHpSelect.add(new Option(opt.t, opt.v)));
    bossHpSelect.value = "";
    bossHpSelect.dataset.defaultValue = "";
    bossHpSelect.addEventListener('change', updateOutput);
    bossHpLabel.appendChild(bossHpSelect);
    scavOnlyContainer.appendChild(bossHpLabel);

    leftColumn.appendChild(scavOnlyContainer);

    const raptorOnlyContainer = document.createElement('div');
    raptorOnlyContainer.id = 'raptor-only-options';
    leftColumn.appendChild(raptorOnlyContainer);

    formOptionsConfig.forEach(optionGroup => {
        const label = document.createElement('label');
        let inputElement;

        if (optionGroup.type === 'checkbox') {
            inputElement = document.createElement('input');
            inputElement.type = 'checkbox';
            inputElement.dataset.commandBlocks = JSON.stringify(optionGroup.commandBlocks);
            inputElement.checked = optionGroup.default;
            inputElement.dataset.defaultChecked = optionGroup.default ? 'true' : 'false';
            inputElement.disabled = optionGroup.disabled || false;
            label.appendChild(inputElement);
            const displayName = getTweakDisplayName(optionGroup.label);
            const description = getTweakDescription(optionGroup.label);
            label.appendChild(document.createTextNode(' ' + displayName));
            if (description) {
                label.title = description; // Show description on hover
            }
            if (!inputElement.disabled) inputElement.addEventListener('change', updateOutput);
        } else if (optionGroup.type === 'select') {
            inputElement = document.createElement('select');
            inputElement.dataset.optionType = optionGroup.label;

            if (optionGroup.id) {
                inputElement.id = optionGroup.id;
            }
            if (optionGroup.id === 'difficulty-select') {
                label.classList.add('difficulty-group');
            }

            if (optionGroup.isHpGenerator) {
                if (!inputElement.id) {
                    inputElement.id = optionGroup.hpType === 'qhp' ? 'queen-hp-select' : 'raptor-hp-select';
                }
                inputElement.dataset.isHpGenerator = true;
                inputElement.dataset.hpType = optionGroup.hpType;
                inputElement.dataset.slot = optionGroup.slot;
                inputElement.dataset.slotType = optionGroup.slotType;
                inputElement.disabled = true;
            }

            optionGroup.choices.forEach(choice => {
                const optionElement = document.createElement('option');
                optionElement.value = choice.value;
                optionElement.textContent = choice.label;
                if (optionGroup.defaultValue && choice.value === optionGroup.defaultValue) {
                    optionElement.selected = true;
                }
                optionElement.dataset.shortLabel = choice.shortLabel || "";
                inputElement.appendChild(optionElement);
            });
            inputElement.dataset.defaultValue = optionGroup.defaultValue || "";
            label.textContent = optionGroup.label + ': ';
            label.appendChild(inputElement);
            inputElement.addEventListener('change', updateOutput);
        } else if (optionGroup.type === 'dynamic') {
            // Store config globally for reset functionality
            if (!window.dynamicTweaksConfig) {
                window.dynamicTweaksConfig = {};
            }
            window.dynamicTweaksConfig[optionGroup.tweakId] = optionGroup.config;

            // Create container for dynamic tweak with sub-options
            const container = document.createElement('div');
            container.className = 'dynamic-tweak-container';
            container.dataset.tweakId = optionGroup.tweakId;

            const hasMultipleOptions = optionGroup.config.options.length > 1;

            // Header with checkbox, name, and expand button
            const header = document.createElement('div');
            header.className = 'dynamic-tweak-header';

            // Left side: checkbox and name
            const headerLeft = document.createElement('div');
            headerLeft.className = 'tweak-header-left';

            // Main checkbox
            const mainCheckbox = document.createElement('input');
            mainCheckbox.type = 'checkbox';
            mainCheckbox.dataset.tweakId = optionGroup.tweakId;
            mainCheckbox.dataset.isDynamic = 'true';
            mainCheckbox.dataset.isMainCheckbox = 'true';

            // Set default based on options
            if (hasMultipleOptions) {
                // For multiple options, check if all have default: true
                const allDefault = optionGroup.config.options.every(opt => opt.default === true);
                mainCheckbox.checked = allDefault;
                mainCheckbox.dataset.defaultChecked = allDefault ? 'true' : 'false';
            } else {
                // For single option, use that option's default value
                const singleOptionDefault = optionGroup.config.options[0]?.default;
                mainCheckbox.checked = singleOptionDefault === true;
                mainCheckbox.dataset.defaultChecked = mainCheckbox.checked ? 'true' : 'false';
                // Store the single option ID for later reference
                mainCheckbox.dataset.singleOptionId = optionGroup.config.options[0]?.id || 'enable_all';

                // Debug log
                console.log(`Single option tweak: ${optionGroup.tweakId}, default: ${singleOptionDefault}, checked: ${mainCheckbox.checked}`);
            }

            // Display name
            const displayName = document.createElement('span');
            displayName.className = 'tweak-display-name';
            displayName.textContent = optionGroup.config.display || optionGroup.tweakId;

            headerLeft.appendChild(mainCheckbox);
            headerLeft.appendChild(displayName);
            header.appendChild(headerLeft);

            // Right side: expand button (only if multiple options)
            if (hasMultipleOptions) {
                const expandButton = document.createElement('span');
                expandButton.className = 'expand-button collapsed';
                expandButton.dataset.tweakId = optionGroup.tweakId;
                header.appendChild(expandButton);

                // Expand button click handler
                expandButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isExpanded = expandButton.classList.contains('expanded');

                    if (isExpanded) {
                        expandButton.classList.remove('expanded');
                        expandButton.classList.add('collapsed');
                        subOptionsContainer.style.display = 'none';
                        info.style.display = 'none';
                    } else {
                        expandButton.classList.remove('collapsed');
                        expandButton.classList.add('expanded');
                        subOptionsContainer.style.display = 'block';
                        info.style.display = 'block';
                    }
                });
            }

            container.appendChild(header);

            // Info text (description) - initially hidden
            const info = document.createElement('div');
            info.className = 'dynamic-tweak-info';
            info.textContent = optionGroup.config.description || '';
            info.style.display = 'none';
            container.appendChild(info);

            // Sub-options container - only show if multiple options
            const subOptionsContainer = document.createElement('div');
            subOptionsContainer.className = 'dynamic-tweak-sub-options';
            subOptionsContainer.style.display = 'none';

            // Only create sub-checkboxes if there are multiple options
            if (hasMultipleOptions) {
                optionGroup.config.options.forEach(subOption => {
                    const subLabel = document.createElement('label');
                    const subCheckbox = document.createElement('input');
                    subCheckbox.type = 'checkbox';
                    subCheckbox.dataset.tweakId = optionGroup.tweakId;
                    subCheckbox.dataset.subOptionId = subOption.id;
                    subCheckbox.dataset.isDynamic = 'true';
                    subCheckbox.dataset.isDynamicSub = 'true';
                    subCheckbox.checked = subOption.default || false;
                    subCheckbox.dataset.defaultChecked = subOption.default ? 'true' : 'false';

                    subLabel.appendChild(subCheckbox);
                    subLabel.appendChild(document.createTextNode(' ' + subOption.label));
                    subOptionsContainer.appendChild(subLabel);

                    subCheckbox.addEventListener('change', () => {
                        updateOutput();
                        updateMainCheckboxState(optionGroup.tweakId);
                    });
                });
            }

            container.appendChild(subOptionsContainer);

            // Main checkbox handler - select/deselect all sub-options
            mainCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                subOptionsContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = isChecked;
                });
                updateOutput();
            });

            // Function to update main checkbox state based on sub-options
            function updateMainCheckboxState(tweakId) {
                const subCheckboxes = subOptionsContainer.querySelectorAll('input[type="checkbox"]');
                const checkedCount = Array.from(subCheckboxes).filter(cb => cb.checked).length;

                if (checkedCount === 0) {
                    mainCheckbox.checked = false;
                    mainCheckbox.indeterminate = false;
                } else if (checkedCount === subCheckboxes.length) {
                    mainCheckbox.checked = true;
                    mainCheckbox.indeterminate = false;
                } else {
                    mainCheckbox.checked = false;
                    mainCheckbox.indeterminate = true;
                }
            }

            // Initialize main checkbox state based on sub-options defaults
            if (hasMultipleOptions) {
                updateMainCheckboxState(optionGroup.tweakId);
            }

            // Place in appropriate column (alternate)
            const targetColumn = optionGroup.column === 'right' ? rightColumn : leftColumn;
            targetColumn.appendChild(container);
            return; // Skip the normal column placement logic
        }

        // Place in appropriate column based on configuration
        if (optionGroup.label === 'Raptor Health' || optionGroup.label === 'Queen Health' || optionGroup.label === 'Difficulty' || optionGroup.label === 'Control Mode') {
            if (optionGroup.label === 'Control Mode') {
                label.classList.add('control-mode-hidden');
            }
            raptorOnlyContainer.appendChild(label);
        } else if (optionGroup.column === 'right') {
            rightColumn.appendChild(label);
        } else {
            leftColumn.appendChild(label);
        }
    });

    if (gameConfigs && (gameConfigs.maps.length > 0 || gameConfigs.modes.length > 0)) {
        let mapsLabel, modesLabel;

        if (gameConfigs.maps.length > 0) {
            mapsLabel = document.createElement('label');
            mapsLabel.textContent = 'Map: ';
            const mapsSelect = document.createElement('select');
            mapsSelect.id = 'maps-select';
            gameConfigs.maps.forEach((map, index) => {
                mapsSelect.add(new Option(map.name, index));
            });
            mapsSelect.selectedIndex = 0;
            mapsSelect.dataset.defaultValue = mapsSelect.options.length > 0 ? mapsSelect.options[0].value : '';
            mapsSelect.addEventListener('change', updateOutput);
            mapsLabel.appendChild(mapsSelect);
        }
        if (gameConfigs.modes.length > 0) {
            modesLabel = document.createElement('label');
            modesLabel.textContent = 'Start: ';
            const modesSelect = document.createElement('select');
            modesSelect.id = 'modes-select';
            modesSelect.dataset.defaultValue = '';
            modesSelect.addEventListener('change', updateOutput);
            modesLabel.appendChild(modesSelect);
        }

        const container = document.getElementById('raptor-only-options');
        if (container) {
            if (modesLabel) container.after(modesLabel);
            if (mapsLabel) container.after(mapsLabel);
        } else {
            if (mapsLabel) leftColumn.appendChild(mapsLabel);
            if (modesLabel) leftColumn.appendChild(modesLabel);
        }
    }

    renderAllCustomComponents();
    populateStartSelector();
    renderMultipliers();
}

// Export functions to window for browser use
window.renderOptionsImpl = renderOptionsImpl;

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderOptions: renderOptionsImpl };
}
