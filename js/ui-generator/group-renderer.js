// Group-level tweak checkbox rendering extracted from ui-generator.js.

(function (globalScope) {
    function getGrouping() {
        return globalScope.AppRuntime?.get('uiGeneratorGrouping') || globalScope.UiGeneratorGrouping;
    }

    function getDefaultsHelper() {
        return globalScope.ConfigDefaults || globalScope.AppRuntime?.get('defaultUtils');
    }

    function getSelectionHelper() {
        return globalScope.AppRuntime?.get('uiGeneratorDefaultsLoader') || globalScope.UiGeneratorDefaultsLoader;
    }

    function getSectionConstants() {
        return globalScope.AppRuntime?.get('sectionConstants') || globalScope.ConfiguratorSectionConstants || {};
    }

    function shouldHideSection(sectionName) {
        const sectionConstants = getSectionConstants();
        let matchedOption = null;
        let shouldHide = false;

        Object.entries(globalScope.dynamicTweaksConfig || {}).forEach(([tweakKey, tweakConfig]) => {
            if (!Array.isArray(tweakConfig.options)) {
                return;
            }

            tweakConfig.options.forEach((option) => {
                const optionId = option.id.toUpperCase();
                if (sectionName === `${tweakKey.replace(/_/g, '_')}_${optionId}` || sectionName === optionId) {
                    matchedOption = option;
                    shouldHide = option.hidden === true;
                }
            });
        });

        if (sectionName === (sectionConstants.EPICS_BUILDOPTIONS || 'EPICS_BUILDOPTIONS')
            || sectionName === (sectionConstants.EVO_XP || 'EVO_XP')) {
            shouldHide = true;
        }

        return { shouldHide, matchedOption };
    }

    function attachOutputAwareCheckbox(checkbox, callbackState, updateOutputCallback, onChange) {
        checkbox.addEventListener('change', () => {
            onChange();
            if (!callbackState.suppressUpdateDuringInit && updateOutputCallback) {
                updateOutputCallback();
            }
        });
    }

    function renderFileGroup(displayName, fileGroups, tweakDefaults, callbackState, updateOutputCallback) {
        const grouping = getGrouping();
        const defaultsHelper = getDefaultsHelper();
        const isMainGroup = displayName.toLowerCase() === 'main';
        const forceDefaultAll = displayName.toLowerCase().includes('t4 defenses') || displayName.toLowerCase().includes('t4 epics');
        const fileGroup = document.createElement('div');
        fileGroup.className = `file-group${isMainGroup ? ' main-group' : ''}`;

        const fileHeader = document.createElement('div');
        fileHeader.className = 'file-header';
        const fileHeaderLeft = document.createElement('div');
        fileHeaderLeft.className = 'file-header-left';
        const parentCheckbox = document.createElement('input');
        parentCheckbox.type = 'checkbox';
        parentCheckbox.className = 'file-parent-checkbox';
        parentCheckbox.id = `file-${displayName.replace(/ /g, '-')}`;

        if (isMainGroup) {
            parentCheckbox.checked = true;
            parentCheckbox.disabled = true;
            parentCheckbox.dataset.defaultChecked = 'true';
        } else {
            const curatedDefaults = ['NuttyB Evolving Commanders', 'Epics - New', 'T4 Epics', 'T4 Defenses', 'T4 Air', 'T3 Builders', 'T3 Eco', 'T4 Eco', 'Unit Launchers'];
            const defaultCheckName = fileGroups[0]?.originalDisplayName || fileGroups[0]?.rawDisplayName || displayName;
            const shouldBeDefault = defaultsHelper && typeof defaultsHelper.shouldEnableByDefault === 'function'
                ? defaultsHelper.shouldEnableByDefault(defaultCheckName, curatedDefaults, tweakDefaults)
                : curatedDefaults.some((defaultName) => defaultCheckName.toLowerCase().replace(/[ -]/g, '').includes(defaultName.toLowerCase().replace(/[ -]/g, '')));
            const parentDefault = shouldBeDefault || forceDefaultAll;
            parentCheckbox.dataset.defaultChecked = parentDefault ? 'true' : 'false';
            parentCheckbox.checked = parentDefault;
        }

        const fileLabel = document.createElement('label');
        fileLabel.className = 'file-label';
        fileLabel.htmlFor = parentCheckbox.id;
        fileLabel.textContent = isMainGroup ? `${displayName} (Always Enabled)` : displayName;
        fileHeaderLeft.appendChild(parentCheckbox);
        fileHeaderLeft.appendChild(fileLabel);
        fileHeader.appendChild(fileHeaderLeft);

        const totalSections = fileGroups.reduce((sum, group) => sum + (Array.isArray(group.sections) ? group.sections.length : 0), 0);
        const hasMultipleSections = totalSections > 1;
        const expandButton = document.createElement('span');
        if (hasMultipleSections) {
            expandButton.className = 'expand-button collapsed';
            fileHeader.appendChild(expandButton);
        }

        fileGroup.appendChild(fileHeader);
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'children-checkboxes';
        const childCheckboxes = [];
        const sortedFileGroups = [...fileGroups].sort((a, b) => (a.rawDisplayName || a.fileName || '').localeCompare(b.rawDisplayName || b.fileName || ''));
        let singleSectionAttached = false;
        let visibleSectionCount = 0;

        sortedFileGroups.forEach((fileGroupEntry) => {
            const sortedSections = Array.isArray(fileGroupEntry.sections)
                ? [...fileGroupEntry.sections].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                : [];

            sortedSections.forEach((section) => {
                if (grouping.isDedicatedWaveSection(section.name)) {
                    return;
                }

                const { shouldHide, matchedOption } = shouldHideSection(section.name);
                if (shouldHide) {
                    const hiddenLabel = document.createElement('label');
                    hiddenLabel.className = 'section-checkbox hidden-section';
                    hiddenLabel.hidden = true;
                    const hiddenCheckbox = document.createElement('input');
                    hiddenCheckbox.type = 'checkbox';
                    hiddenCheckbox.className = 'tweak-checkbox';
                    hiddenCheckbox.dataset.file = fileGroupEntry.filePath;
                    hiddenCheckbox.dataset.marker = section.name;
                    hiddenCheckbox.dataset.type = section.type;
                    hiddenCheckbox.id = `section-${section.name}`;
                    const defaultState = matchedOption && typeof matchedOption.default !== 'undefined' ? matchedOption.default : true;
                    const autoEnable = matchedOption && matchedOption.auto_enable === true;
                    hiddenCheckbox.checked = autoEnable || defaultState === true;
                    hiddenCheckbox.dataset.defaultChecked = hiddenCheckbox.checked ? 'true' : 'false';
                    getSelectionHelper()?.assignDynamicSelectionIdentity(hiddenCheckbox, {
                        filePath: fileGroupEntry.filePath,
                        marker: section.name,
                        type: section.type
                    });
                    childCheckboxes.push(hiddenCheckbox);
                    hiddenLabel.appendChild(hiddenCheckbox);
                    childrenContainer.appendChild(hiddenLabel);
                    return;
                }

                visibleSectionCount += 1;
                if (!hasMultipleSections && !singleSectionAttached) {
                    parentCheckbox.classList.add('tweak-checkbox');
                    parentCheckbox.dataset.file = fileGroupEntry.filePath;
                    parentCheckbox.dataset.marker = section.name;
                    parentCheckbox.dataset.type = section.type;
                    if (typeof parentCheckbox.dataset.defaultChecked === 'undefined') {
                        const defaultFlag = isMainGroup ? true : (forceDefaultAll ? true : Boolean(matchedOption?.default));
                        parentCheckbox.dataset.defaultChecked = defaultFlag ? 'true' : 'false';
                        parentCheckbox.checked = defaultFlag;
                    }
                    getSelectionHelper()?.assignDynamicSelectionIdentity(parentCheckbox, {
                        filePath: fileGroupEntry.filePath,
                        marker: section.name,
                        type: section.type
                    });
                    fileLabel.htmlFor = parentCheckbox.id;
                    singleSectionAttached = true;
                    return;
                }

                const label = document.createElement('label');
                label.className = 'section-checkbox';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'tweak-checkbox';
                checkbox.dataset.file = fileGroupEntry.filePath;
                checkbox.dataset.marker = section.name;
                checkbox.dataset.type = section.type;
                if (isMainGroup || forceDefaultAll) {
                    checkbox.checked = true;
                    checkbox.dataset.defaultChecked = 'true';
                    if (isMainGroup) checkbox.disabled = true;
                } else if (matchedOption && typeof matchedOption.default !== 'undefined') {
                    checkbox.dataset.defaultChecked = matchedOption.default ? 'true' : 'false';
                } else {
                    checkbox.dataset.defaultChecked = checkbox.checked ? 'true' : 'false';
                }
                getSelectionHelper()?.assignDynamicSelectionIdentity(checkbox, {
                    filePath: fileGroupEntry.filePath,
                    marker: section.name,
                    type: section.type
                });

                const rawName = section.name.replace(/_/g, ' ').trim();
                const displayText = displayName.toLowerCase().includes('epic') && !rawName.toUpperCase().startsWith('EPIC ')
                    ? `EPIC ${rawName}`
                    : rawName;
                const span = document.createElement('span');
                span.textContent = displayText;
                label.appendChild(checkbox);
                label.appendChild(span);
                childrenContainer.appendChild(label);
                childCheckboxes.push(checkbox);
                attachOutputAwareCheckbox(checkbox, callbackState, updateOutputCallback, updateParentCheckboxState);
            });
        });

        fileGroup.hidden = visibleSectionCount === 0;
        fileGroup.appendChild(childrenContainer);

        function updateParentCheckboxState() {
            const checkedCount = childCheckboxes.filter((checkbox) => checkbox.checked).length;
            if (checkedCount === 0) {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = false;
            } else if (checkedCount === childCheckboxes.length) {
                parentCheckbox.checked = true;
                parentCheckbox.indeterminate = false;
            } else {
                parentCheckbox.checked = false;
                parentCheckbox.indeterminate = true;
            }
        }

        if (!isMainGroup) {
            parentCheckbox.addEventListener('change', () => {
                const isChecked = parentCheckbox.checked;
                childCheckboxes.forEach((checkbox) => {
                    checkbox.checked = isChecked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                });
                if (!callbackState.suppressUpdateDuringInit && updateOutputCallback) {
                    updateOutputCallback();
                }
            });
        }

        if (hasMultipleSections) {
            expandButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const collapsed = expandButton.classList.contains('collapsed');
                expandButton.classList.toggle('collapsed', !collapsed);
                expandButton.classList.toggle('expanded', collapsed);
                childrenContainer.classList.toggle('show', collapsed);
            });
        } else if (childCheckboxes.length > 0) {
            childrenContainer.classList.add('show');
        }

        return fileGroup;
    }

    const api = {
        renderFileGroup
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('uiGeneratorGroupRenderer', api);
    }

    globalScope.UiGeneratorGroupRenderer = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
