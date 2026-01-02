// UI Generator module for BAR Configurator
// Generates dynamic checkbox UI from scanned tweak files

function getCacheBuster() {
    if (typeof window !== 'undefined' && window.ASSET_CACHE_BUSTER) {
        return window.ASSET_CACHE_BUSTER;
    }
    return Date.now();
}

const MAXTHISUNIT_OVERRIDE_FIELDS = [
    { id: 'maxthisunit-t3-builders', label: 'T3 Builders', marker: 'T3_BUILDERS', placeholder: '0 = ∞ (remove limit)', min: 0, max: 1000 },
    { id: 'maxthisunit-unit-launchers', label: 'Unit Launchers', marker: 'UNIT_LAUNCHERS', placeholder: '0 = ∞ (remove limit)', min: 0, max: 1000 },
    { id: 'maxthisunit-epic-ragnarok', label: 'Epic Ragnarok', marker: 'RAGNAROK', placeholder: '0 = ∞ (remove limit)', min: 0, max: 1000 },
    { id: 'maxthisunit-epic-calamity', label: 'Epic Calamity', marker: 'CALAMITY', placeholder: '0 = ∞ (remove limit)', min: 0, max: 1000 },
    { id: 'maxthisunit-epic-tyrannus', label: 'Epic Tyrannus', marker: 'T4_AIR', placeholder: '0 = ∞ (remove limit)', min: 0, max: 1000 },
    { id: 'maxthisunit-epic-starfall', label: 'Epic Starfall', marker: 'STARFALL', placeholder: '0 = ∞ (remove limit)', min: 0, max: 1000 }
];

const MAXTHISUNIT_DEFAULT_FALLBACKS = {
    T3_BUILDERS: '10',
    UNIT_LAUNCHERS: '20',
    RAGNAROK: '80',
    CALAMITY: '80',
    T4_AIR: '80',
    STARFALL: '80'
};

/**
 * Generate dynamic checkbox UI from scanned tweak files (section-level with parent-child hierarchy)
 * Groups files by their display name (after removing Defs_/Units_ prefixes) and combines sections
 * @param {Object} tweakFileCache - File path -> sections array mapping
 * @param {Function} updateOutputCallback - Callback to update output when checkboxes change
 */
async function loadDynamicTweaksDefaults() {
    try {
        const response = await fetch(`dynamic-tweaks.json?v=${getCacheBuster()}`);
        const data = await response.json();

        // Store full metadata globally for dependency system
        window.allTweaksData = data;
        window.dynamicTweaksConfig = data.dynamic_tweaks || {};
        console.log('Loaded dependency metadata:', Object.keys(data.dynamic_tweaks || {}).length, 'tweaks');

        if (window.ConfigDefaults && typeof window.ConfigDefaults.buildDefaultLookup === 'function') {
            return window.ConfigDefaults.buildDefaultLookup(data);
        }

        const fallback = {};
        Object.entries(data.dynamic_tweaks || {}).forEach(([key, config]) => {
            if (!config) return;
            const cleanKey = key.replace(/_/g, ' ');
            if (Array.isArray(config.options)) {
                const defaults = config.options.filter(opt => opt && opt.default === true).map(opt => opt.id);
                if (defaults.length > 0) {
                    fallback[key] = { options: defaults, dropdown: null };
                    fallback[cleanKey] = fallback[key];
                }
            }
            if (config.type === 'dropdown' && typeof config.default !== 'undefined') {
                fallback[key] = fallback[key] || { options: [], dropdown: null };
                fallback[key].dropdown = config.default;
                fallback[cleanKey] = fallback[key];
            }
        });

        return fallback;
    } catch (error) {
        console.warn("Could not load dynamic-tweaks.json defaults:", error);
        return {};
    }
}

/**
 * Generate Raptor Wave Mode selector (radio buttons, independent of file scanning)
 * @param {Function} updateOutputCallback - Callback to update output when selection changes
 */
function generateRaptorWaveDropdown(updateOutputCallback) {
    console.log("Generating Raptor Wave Mode selector...");

    const container = document.getElementById('dynamic-tweaks-container');
    if (!container) {
        console.error("No container found for Raptor Wave selector");
        return;
    }

    // Create selector container (reuses dropdown container styling)
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'raptor-wave-dropdown-container';
    selectorContainer.id = 'raptor-wave-mode-container';

    const waveConfig = window.allTweaksData?.dynamic_tweaks?.Raptor_Wave_Mode;
    const dropdownOptions = Array.isArray(waveConfig?.dropdown_options) ? waveConfig.dropdown_options : null;
    const defaultValue = waveConfig?.default;

    const selectorLabel = document.createElement('label');
    selectorLabel.style.display = 'block';
    selectorLabel.style.marginBottom = '6px';
    selectorLabel.style.fontWeight = 'bold';
    selectorLabel.textContent = 'Raptor Wave Mode:';

    selectorContainer.appendChild(selectorLabel);

    const optionsToUse = (dropdownOptions && dropdownOptions.length > 0) ? dropdownOptions : [
        { value: 'none', label: 'None' },
        { value: 'mini_bosses', label: 'Mini Bosses' },
        { value: 'experimental_wave', label: 'Experimental Wave Challenge' }
    ];

    if (!dropdownOptions || dropdownOptions.length === 0) {
        console.warn('Raptor_Wave_Mode options missing in dynamic-tweaks.json; using fallback list.');
    }

    const resolvedDefault = defaultValue
        || (optionsToUse.some(opt => opt.value === 'mini_bosses') ? 'mini_bosses' : optionsToUse[0].value);

    const radioGroup = document.createElement('div');
    radioGroup.className = 'raptor-wave-radio-group';
    radioGroup.id = 'raptor-wave-mode';

    optionsToUse.forEach(option => {
        const optionWrapper = document.createElement('label');
        optionWrapper.className = 'raptor-wave-radio-option';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'raptor-wave-mode';
        radio.value = option.value;
        radio.id = `raptor-wave-mode-${option.value}`;
        radio.className = 'raptor-wave-radio-input';

        const isDefault = option.value === resolvedDefault;
        radio.checked = isDefault;
        radio.dataset.defaultChecked = isDefault ? 'true' : 'false';

        radio.addEventListener('change', () => {
            if (radio.checked && typeof updateOutputCallback === 'function') {
                updateOutputCallback();
            }
        });

        const labelText = document.createElement('span');
        labelText.className = 'raptor-wave-radio-label';
        labelText.textContent = option.label;

        optionWrapper.appendChild(radio);
        optionWrapper.appendChild(labelText);
        radioGroup.appendChild(optionWrapper);
    });

    selectorContainer.appendChild(radioGroup);

    const dropdownInfo = document.createElement('div');
    dropdownInfo.style.fontSize = '0.9em';
    dropdownInfo.style.color = '#888';
    dropdownInfo.style.marginTop = '5px';
    dropdownInfo.textContent = waveConfig?.description || 'Choose between standard Mini Bosses or Experimental Wave Challenge for Raptors mode';
    selectorContainer.appendChild(dropdownInfo);

    // Insert at the beginning of the container
    container.insertBefore(selectorContainer, container.firstChild);

    console.log("Raptor Wave Mode selector generated");
}

function renderMaxThisUnitControls(updateOutputCallback, tweakFileCache) {
    const container = document.getElementById('dynamic-tweaks-container');
    if (!container) {
        return;
    }

    const existing = document.getElementById('maxthisunit-overrides');
    if (existing) {
        existing.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'maxthisunit-overrides';
    wrapper.className = 'maxthisunit-overrides';

    const divider = document.createElement('div');
    divider.className = 'tweak-divider';
    wrapper.appendChild(divider);

    const headerRow = document.createElement('div');
    headerRow.className = 'maxthisunit-header-row';

    const header = document.createElement('div');
    header.className = 'maxthisunit-header';
    header.textContent = 'Limit Max Allowed';
    headerRow.appendChild(header);

    wrapper.appendChild(headerRow);

    const helper = document.createElement('div');
    helper.className = 'maxthisunit-helper';
    helper.textContent = 'Leave blank for defaults. Enter 0 to clear the limit (∞) for that tweak when slots are packed.';
    wrapper.appendChild(helper);

    const grid = document.createElement('div');
    grid.className = 'maxthisunit-grid';

    const findDefaultValueForMarker = (markerName) => {
        if (!tweakFileCache || typeof tweakFileCache !== 'object') {
            return { value: MAXTHISUNIT_DEFAULT_FALLBACKS[markerName] || '', found: false };
        }

        let best = null;
        let found = false;
        Object.values(tweakFileCache).forEach(sections => {
            if (Array.isArray(sections)) {
                sections.forEach(section => {
                    if (section && section.name === markerName && typeof section.code === 'string') {
                        const matches = Array.from(section.code.matchAll(/maxthisunit\s*=\s*(\d+)/gi))
                            .map(m => Number.parseInt(m[1], 10))
                            .filter(Number.isFinite);
                        if (matches.length > 0) {
                            found = true;
                            const localMax = Math.max(...matches);
                            if (best === null || localMax > best) {
                                best = localMax;
                            }
                        }
                    }
                });
            }
        });

        if (found && best !== null && best !== undefined) {
            return { value: String(best), found: true };
        }

        return { value: MAXTHISUNIT_DEFAULT_FALLBACKS[markerName] || '', found: false };
    };

    const formatStatus = (val) => {
        if (val === '') return 'Default';
        if (val === '0') return '∞ (no cap)';
        return `${val} max/unit`;
    };

    const normalizeEffectiveValue = (rawVal) => {
        if (!rawVal) return '';
        const trimmed = rawVal.trim();
        if (trimmed === '∞') return '0';
        if (trimmed === '0') return '0';
        const parsed = Number.parseInt(trimmed, 10);
        return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : '';
    };

    const setDisplayValue = (input, effectiveValue, originalPlaceholder) => {
        const basePlaceholder = originalPlaceholder || input.dataset.placeholderOriginal || input.placeholder || '';
        if (effectiveValue === '0') {
            input.value = '';
            input.dataset.effectiveValue = '0';
            input.placeholder = '∞';
        } else if (effectiveValue === '') {
            input.value = '';
            delete input.dataset.effectiveValue;
            input.placeholder = basePlaceholder;
        } else {
            input.value = effectiveValue;
            input.dataset.effectiveValue = effectiveValue;
            input.placeholder = basePlaceholder;
        }
    };

    const updateStatus = (effectiveVal, statusEl) => {
        statusEl.textContent = formatStatus(effectiveVal);
        statusEl.dataset.state = effectiveVal === '' ? 'default' : (effectiveVal === '0' ? 'infinity' : 'custom');
    };

    MAXTHISUNIT_OVERRIDE_FIELDS.forEach(field => {
        const fieldWrapper = document.createElement('label');
        fieldWrapper.className = 'maxthisunit-field';
        fieldWrapper.dataset.markerTarget = field.marker;

        const title = document.createElement('span');
        title.className = 'maxthisunit-label';
        title.textContent = field.label;

        const input = document.createElement('input');
        input.type = 'number';
        input.inputMode = 'numeric';
        input.id = field.id;
        input.dataset.markerTarget = field.marker;
        input.dataset.maxthisunitOverride = 'true';
        input.min = typeof field.min === 'number' ? String(field.min) : '0';
        if (typeof field.max === 'number') {
            input.max = String(field.max);
        }
        input.step = field.step ? String(field.step) : '1';
        const defaultInfo = findDefaultValueForMarker(field.marker);
        const hasMaxValue = defaultInfo.found || (defaultInfo.value && defaultInfo.value !== '');
        if (!hasMaxValue) {
            return; // Skip rendering if the marker has no maxthisunit in code
        }

        const defaultFromCode = defaultInfo.value;
        const basePlaceholder = defaultFromCode || field.placeholder || 'Default';
        input.dataset.placeholderOriginal = basePlaceholder;
        input.placeholder = basePlaceholder;
        const defaultValue = typeof field.defaultValue !== 'undefined' ? field.defaultValue : defaultFromCode;
        setDisplayValue(input, normalizeEffectiveValue(defaultValue), basePlaceholder);
        input.dataset.defaultValue = defaultValue;

        const status = document.createElement('span');
        status.className = 'maxthisunit-status';
        updateStatus(normalizeEffectiveValue(defaultValue), status);

        const inputShell = document.createElement('div');
        inputShell.className = 'maxthisunit-input-shell';

        const spinnerCol = document.createElement('div');
        spinnerCol.className = 'maxthisunit-spinner-col';

        const adjustValue = (direction) => {
            const step = Number(field.step || 1) || 1;
            const min = typeof field.min === 'number' ? field.min : 0;
            const hasMax = typeof field.max === 'number';
            const max = hasMax ? field.max : Number.POSITIVE_INFINITY;
            let current = Number.parseInt(normalizeEffectiveValue(input.dataset.effectiveValue || input.value || ''), 10);
            if (!Number.isFinite(current)) {
                current = min;
            }
            current = direction === 'up' ? current + step : current - step;
            if (current < min) current = min;
            if (hasMax && current > max) current = max;
            setDisplayValue(input, String(current), basePlaceholder);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        };

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'maxthisunit-spin maxthisunit-spin-up';
        upBtn.textContent = '▲';
        upBtn.title = 'Increase';
        upBtn.addEventListener('click', (e) => {
            e.preventDefault();
            adjustValue('up');
        });

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'maxthisunit-spin maxthisunit-spin-down';
        downBtn.textContent = '▼';
        downBtn.title = 'Decrease';
        downBtn.addEventListener('click', (e) => {
            e.preventDefault();
            adjustValue('down');
        });

        spinnerCol.appendChild(upBtn);
        spinnerCol.appendChild(downBtn);
        inputShell.appendChild(input);
        inputShell.appendChild(spinnerCol);

        const syncStatus = () => updateStatus(normalizeEffectiveValue(input.dataset.effectiveValue || input.value || ''), status);

        input.addEventListener('input', (e) => {
            const effective = normalizeEffectiveValue(input.value || input.dataset.effectiveValue || '');
            setDisplayValue(input, effective, basePlaceholder);
            updateStatus(effective, status);

            const suppressOutput = (typeof window !== 'undefined' && window.suppressOutputDuringStateRestore);
            if (!suppressOutput) {
                if (typeof window.saveStateToStorage === 'function') {
                    window.saveStateToStorage();
                }
                if (typeof updateOutputCallback === 'function') {
                    updateOutputCallback(e);
                }
            }
        });

        input.addEventListener('blur', syncStatus);
        input.addEventListener('change', syncStatus);

        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'maxthisunit-title';
        titleWrapper.appendChild(title);
        titleWrapper.appendChild(status);

        fieldWrapper.appendChild(titleWrapper);
        fieldWrapper.appendChild(inputShell);
        updateStatus(normalizeEffectiveValue(input.dataset.effectiveValue || input.value || ''), status);
        grid.appendChild(fieldWrapper);
    });

    wrapper.appendChild(grid);
    container.appendChild(wrapper);

    const applyVisibility = () => {
        const rows = container.querySelectorAll('.maxthisunit-field');
        rows.forEach(row => {
            const marker = row.dataset.markerTarget;
            if (!marker) return;
            const checkboxes = Array.from(document.querySelectorAll(`.tweak-checkbox[data-marker="${marker}"]`));
            const anyChecked = checkboxes.some(cb => cb.checked);
            row.style.display = anyChecked ? '' : 'none';
        });
    };

    container.addEventListener('change', () => {
        applyVisibility();
    });

    applyVisibility();
}

async function generateDynamicCheckboxUI(tweakFileCache, updateOutputCallback) {
    console.log("Generating dynamic checkbox UI from scanned sections...");

    const container = document.getElementById('dynamic-tweaks-container');
    if (!container) {
        console.error("No container found for dynamic checkboxes");
        return;
    }

    // Remove placeholder scanning text if present
    container.querySelectorAll('p').forEach(p => p.remove());

    // Show loading indicator while UI is rebuilt
    let loader = container.querySelector('.tweaks-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'tweaks-loader';
        loader.innerHTML = '<span class="spinner"></span><span class="text">Loading tweaks...</span>';
        container.insertBefore(loader, container.firstChild);
    } else {
        loader.style.display = 'flex';
        const textEl = loader.querySelector('.text');
        if (textEl) textEl.textContent = 'Loading tweaks...';
    }

    let suppressUpdateDuringInit = false; // Avoid spamming updateOutput while applying defaults

    // Clear only the checkboxes section, not the dropdown
    const existingColumnsWrapper = container.querySelector('.checkbox-columns');
    if (existingColumnsWrapper) {
        existingColumnsWrapper.remove();
    }

    // Load defaults
    const tweakDefaults = await loadDynamicTweaksDefaults();

    // Create 2-column wrapper for checkboxes
    const columnsWrapper = document.createElement('div');
    columnsWrapper.className = 'checkbox-columns';

    // Step 1: Group files by their display name (cleaned name)
    const groupedByDisplayName = {};
    const displayNameRenames = {
        'LRPC Rebalance v2': 'LRPC v2',
        'LRPC v2': 'T2 LRPC v2',
        'T4 Defences Test': 'T4 Defenses',
        'T4 Air Rework': 'T4 Air',
        'Epics - New': 'T4 Epics'
    };

    Object.entries(tweakFileCache).forEach(([filePath, sections]) => {
        const fileName = filePath.split('/').pop().replace('.lua', '');

        // Skip Mini Bosses and Experimental Wave Challenge files (handled by Raptor Wave Mode selector)
        if (fileName.includes('Mini_Bosses') || fileName.includes('Experimental_Wave_Challenge')) {
            console.log(`Skipping ${fileName} - handled by Raptor Wave Mode selector`);
            return;
        }

        // Clean up display name: remove Defs_/Units_ prefixes, replace underscores with spaces
        const originalRawDisplayName = fileName
            .replace(/^(Defs_|Units_)/, '')  // Remove Defs_ or Units_ prefix
            .replace(/_/g, ' ')               // Replace underscores with spaces
            .replace(/ - /g, ' - ');          // Clean up spacing around dashes

        let rawDisplayName = originalRawDisplayName;

        // Specialized renames for LRPC and Cross-Faction
        if (/^LRPC/i.test(rawDisplayName) || rawDisplayName.toLowerCase().includes('lrpc')) {
            rawDisplayName = 'T2 LRPC v2';
        }
        if (rawDisplayName.toLowerCase().includes('cross faction')) {
            rawDisplayName = 'T2 Cross Faction';
        }

        let displayName = displayNameRenames[rawDisplayName] || rawDisplayName;
        if (rawDisplayName.includes('Evolving Commanders')) {
            displayName = 'Evolving Commanders';
        }

        // Normalize all Main files to a single "Main" group so it always sorts first
        if (/\bmain\b/i.test(displayName)) {
            displayName = 'Main';
        }

        // Initialize group if it doesn't exist
        if (!groupedByDisplayName[displayName]) {
            groupedByDisplayName[displayName] = [];
        }

        // Add file and its sections to the group
        groupedByDisplayName[displayName].push({
            filePath: filePath,
            fileName: fileName,
            rawDisplayName: rawDisplayName,
            originalDisplayName: originalRawDisplayName,
            sections: sections
        });
    });

    // Step 2: Create UI for each grouped parent
    const getGroupPriority = (name) => {
        const lower = name.toLowerCase();
        if (lower === 'main') return 0; // Always first
        if (lower === 'evolving commanders') return 1; // First in second column
        return 2;
    };

    const sortedGroups = Object.entries(groupedByDisplayName).sort(([aName], [bName]) => {
        const priorityA = getGroupPriority(aName);
        const priorityB = getGroupPriority(bName);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return aName.localeCompare(bName);
    });

    sortedGroups.forEach(([displayName, fileGroups]) => {
        // Check if this is Main group (Main.lua files)
        const isMainGroup = displayName.toLowerCase() === 'main';

        // Create parent group container
        const fileGroup = document.createElement('div');
        fileGroup.className = 'file-group';
        if (isMainGroup) {
            fileGroup.className += ' main-group'; // Add special class for styling
        }

        // Parent checkbox for group with expand button
        const fileHeader = document.createElement('div');
        fileHeader.className = 'file-header';

        // Left side: checkbox + group name
        const fileHeaderLeft = document.createElement('div');
        fileHeaderLeft.className = 'file-header-left';

        const parentCheckbox = document.createElement('input');
        parentCheckbox.type = 'checkbox';
        parentCheckbox.className = 'file-parent-checkbox';
        // Use display name as identifier for the parent
        parentCheckbox.id = `file-${displayName.replace(/ /g, '-')}`;

        const forceDefaultAll = displayName.toLowerCase().includes('t4 defenses') || displayName.toLowerCase().includes('t4 epics');

        // Main tweaks are checked by default and disabled
        if (isMainGroup) {
            parentCheckbox.checked = true;
            parentCheckbox.disabled = true;
            parentCheckbox.dataset.defaultChecked = 'true';
        } else {
            const curatedDefaults = [
                'NuttyB Evolving Commanders',
                'Epics - New',
                'T4 Epics',
                'T4 Defenses',
                'T4 Air',
                'T3 Builders',
                'T3 Eco',
                'T4 Eco',
                'Unit Launchers'
            ];

            const defaultCheckName = (fileGroups && fileGroups[0] && (fileGroups[0].originalDisplayName || fileGroups[0].rawDisplayName))
                ? (fileGroups[0].originalDisplayName || fileGroups[0].rawDisplayName)
                : displayName;
            const shouldBeDefault = window.ConfigDefaults && typeof window.ConfigDefaults.shouldEnableByDefault === 'function'
                ? window.ConfigDefaults.shouldEnableByDefault(defaultCheckName, curatedDefaults, tweakDefaults)
                : curatedDefaults.some(defaultName =>
                    defaultCheckName.toLowerCase().includes(defaultName.toLowerCase().replace(/ /g, '')) ||
                    defaultCheckName.toLowerCase().replace(/[ -]/g, '') === defaultName.toLowerCase().replace(/[ -]/g, '')
                );

            const parentDefault = shouldBeDefault || forceDefaultAll;
            parentCheckbox.dataset.defaultChecked = parentDefault ? 'true' : 'false';
            if (parentDefault) {
                parentCheckbox.checked = true;
                console.log(`Setting default for ${displayName}: checked (default enabled tweak)`);
            }
        }

        const fileLabel = document.createElement('label');
        fileLabel.className = 'file-label';
        fileLabel.htmlFor = parentCheckbox.id;
        fileLabel.textContent = isMainGroup ? `${displayName} (Always Enabled)` : displayName;

        fileHeaderLeft.appendChild(parentCheckbox);
        fileHeaderLeft.appendChild(fileLabel);
        fileHeader.appendChild(fileHeaderLeft);

        // Determine total sections across grouped files (for expand handling)
        const totalSections = fileGroups.reduce((sum, fg) => {
            return sum + (Array.isArray(fg.sections) ? fg.sections.length : 0);
        }, 0);
        const hasMultipleSections = totalSections > 1;

        // Right side: expand button (only when multiple sections)
        const expandButton = document.createElement('span');
        if (hasMultipleSections) {
            expandButton.className = 'expand-button collapsed';
            fileHeader.appendChild(expandButton);
        }

        fileGroup.appendChild(fileHeader);

        // Container for child checkboxes (sections from all files in this group)
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'children-checkboxes';

        // Track all child checkboxes for parent state management
        const childCheckboxes = [];

        // Step 3: Add sections from all files in this group
        const sortedFileGroups = [...fileGroups].sort((a, b) => {
            const aName = a.rawDisplayName || a.fileName || '';
            const bName = b.rawDisplayName || b.fileName || '';
            return aName.localeCompare(bName);
        });

        let singleSectionAttached = false;
        let visibleSectionCount = 0;

        sortedFileGroups.forEach(fileGroup => {
            const sortedSections = Array.isArray(fileGroup.sections)
                ? [...fileGroup.sections].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                : [];

            sortedSections.forEach(section => {
                // Check if this section should be hidden (using dynamic-tweaks.json config)
                let shouldHide = false;

                // Look up hidden flag from dynamic-tweaks config
                // The section name corresponds to an option ID within a tweak group
                let matchedOption = null;
                Object.entries(window.dynamicTweaksConfig || {}).forEach(([tweakKey, tweakConfig]) => {
                    if (tweakConfig.options) {
                        tweakConfig.options.forEach(option => {
                            // Match by comparing marker names (uppercase) with option identifiers
                            const optionId = option.id.toUpperCase();
                            if (section.name === `${tweakKey.replace(/_/g, '_')}_${optionId}` ||
                                section.name === optionId) {
                                if (option.hidden === true) {
                                    shouldHide = true;
                                    console.log(`Hiding section: ${section.name} (marked as hidden)`);
                                }
                                matchedOption = option;
                            }
                        });
                    }
                });

                // Alternative: Check if this is a forced-hidden section
                if (section.name === 'EPICS_BUILDOPTIONS' || section.name === 'EVO_XP') {
                    shouldHide = true;
                    console.log(`Hiding ${section.name} checkbox (auto-enable feature)`);
                }

                // Skip visible rendering, but inject hidden sections so they are still processed
                if (shouldHide) {
                    const hiddenLabel = document.createElement('label');
                    hiddenLabel.className = 'section-checkbox hidden-section';
                    hiddenLabel.style.display = 'none';

                    const hiddenCheckbox = document.createElement('input');
                    hiddenCheckbox.type = 'checkbox';
                    hiddenCheckbox.className = 'tweak-checkbox';
                    hiddenCheckbox.dataset.file = fileGroup.filePath;
                    hiddenCheckbox.dataset.marker = section.name;
                    hiddenCheckbox.dataset.type = section.type;
                    hiddenCheckbox.id = `section-${section.name}`;

                    const defaultState = matchedOption && typeof matchedOption.default !== 'undefined'
                        ? matchedOption.default
                        : true;
                    const autoEnable = matchedOption && matchedOption.auto_enable === true;
                    hiddenCheckbox.checked = autoEnable || defaultState === true;
                    hiddenCheckbox.dataset.defaultChecked = hiddenCheckbox.checked ? 'true' : 'false';

                    childCheckboxes.push(hiddenCheckbox);
                    hiddenLabel.appendChild(hiddenCheckbox);
                    childrenContainer.appendChild(hiddenLabel);
                    return;
                }

                visibleSectionCount += 1;

                // If there's only one visible section, attach it directly to the parent checkbox
                if (!hasMultipleSections && !singleSectionAttached) {
                    parentCheckbox.classList.add('tweak-checkbox');
                    parentCheckbox.dataset.file = fileGroup.filePath;
                    parentCheckbox.dataset.marker = section.name;
                    parentCheckbox.dataset.type = section.type;
                    parentCheckbox.id = `section-${section.name}`;
                    // Preserve existing defaultChecked if set via curated defaults
                    if (typeof parentCheckbox.dataset.defaultChecked === 'undefined') {
                        const defaultFlag = isMainGroup ? true : (forceDefaultAll ? true : (matchedOption && typeof matchedOption.default !== 'undefined' ? matchedOption.default : false));
                        parentCheckbox.dataset.defaultChecked = defaultFlag ? 'true' : 'false';
                        parentCheckbox.checked = defaultFlag;
                    }
                    singleSectionAttached = true;
                    return;
                }

                const label = document.createElement('label');
                label.className = 'section-checkbox';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'tweak-checkbox';
                // Preserve original file path for data attributes
                checkbox.dataset.file = fileGroup.filePath;
                checkbox.dataset.marker = section.name;
                checkbox.dataset.type = section.type;
                checkbox.id = `section-${section.name}`;

                // Main tweaks sections are checked by default and disabled
                if (isMainGroup) {
                    checkbox.checked = true;
                    checkbox.disabled = true;
                    checkbox.dataset.defaultChecked = 'true';
                } else if (forceDefaultAll) {
                    checkbox.checked = true;
                    checkbox.dataset.defaultChecked = 'true';
                } else if (matchedOption && typeof matchedOption.default !== 'undefined') {
                    checkbox.dataset.defaultChecked = matchedOption.default ? 'true' : 'false';
                } else {
                    checkbox.dataset.defaultChecked = checkbox.checked ? 'true' : 'false';
                }

                const span = document.createElement('span');
                const rawName = section.name.replace(/_/g, ' ');
                const isEpicsGroup = displayName.toLowerCase().includes('epic');
                const normalized = rawName.trim();
                const displayText = (isEpicsGroup && !normalized.toUpperCase().startsWith('EPIC ')) ? `EPIC ${normalized}` : normalized;
                span.textContent = displayText;

                label.appendChild(checkbox);
                label.appendChild(span);
                childrenContainer.appendChild(label);

                childCheckboxes.push(checkbox);

                // Add change listener for child checkbox
                checkbox.addEventListener('change', () => {
                    updateParentCheckboxState();
                    if (!suppressUpdateDuringInit && updateOutputCallback) updateOutputCallback();
                });
            });
        });

        if (visibleSectionCount === 0) {
            fileGroup.style.display = 'none';
        }

        fileGroup.appendChild(childrenContainer);

        // Parent checkbox change handler - select/deselect all children (skip for Main group)
        if (!isMainGroup) {
            parentCheckbox.addEventListener('change', () => {
                const isChecked = parentCheckbox.checked;
                childCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                });
                if (!suppressUpdateDuringInit && updateOutputCallback) updateOutputCallback();
            });
        }

        // Expand/collapse button handler (only if button exists)
        if (hasMultipleSections) {
            expandButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = expandButton.classList.contains('collapsed');

                if (isCollapsed) {
                    expandButton.classList.remove('collapsed');
                    expandButton.classList.add('expanded');
                    childrenContainer.classList.add('show');
                } else {
                    expandButton.classList.remove('expanded');
                    expandButton.classList.add('collapsed');
                    childrenContainer.classList.remove('show');
                }
            });
        } else {
            // Single-section groups keep children collapsed/hidden unless they actually contain visible children
            if (childCheckboxes.length > 0) {
                childrenContainer.classList.add('show');
            }
        }

        // Function to update parent checkbox state based on children
        function updateParentCheckboxState() {
            const checkedCount = childCheckboxes.filter(cb => cb.checked).length;
            const totalCount = childCheckboxes.length;

            if (checkedCount === 0) {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = false;
            } else if (checkedCount === totalCount) {
                parentCheckbox.checked = true;
                parentCheckbox.indeterminate = false;
            } else {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = true;
            }
        }

        columnsWrapper.appendChild(fileGroup);
    });

    container.appendChild(columnsWrapper);
    console.log("Dynamic UI generated with combined parent groups for files with matching display names");

    renderMaxThisUnitControls(updateOutputCallback, tweakFileCache);

    // Hide loader once UI is ready
    if (loader) {
        loader.style.display = 'none';
    }

    // After UI is generated, check all parent checkboxes that are marked as checked
    // This will trigger their change handlers and check all child sections
    setTimeout(() => {
        const checkedParents = container.querySelectorAll('.file-parent-checkbox:checked:not(:disabled)');
        suppressUpdateDuringInit = true;
        try {
            checkedParents.forEach(parentCheckbox => {
                // Trigger change event to check all children
                const event = new Event('change', { bubbles: true });
                parentCheckbox.dispatchEvent(event);
            });
        } finally {
            suppressUpdateDuringInit = false;
        }
        console.log(`Auto-checked ${checkedParents.length} default-enabled tweaks`);

        // Trigger initial command generation after checkboxes are set
        if (updateOutputCallback) {
            setTimeout(() => {
                if (typeof window !== 'undefined' && window.skipInitialCommandGeneration) {
                    window.skipInitialCommandGeneration = false;
                    return;
                }
                console.log("Triggering initial command generation...");
                updateOutputCallback();
            }, 50);
        }
    }, 10);
}

// Export functions - for browser use
const generateDynamicCheckboxUIImpl = generateDynamicCheckboxUI;
const generateRaptorWaveDropdownImpl = generateRaptorWaveDropdown;

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateDynamicCheckboxUI, generateRaptorWaveDropdown };
}
