// MaxThisUnit control rendering extracted from ui-generator.js.

(function (globalScope) {
    const MAXTHISUNIT_OVERRIDE_FIELDS = [
        { id: 'maxthisunit-t3-builders', label: 'T3 Builders', marker: 'T3_BUILDERS', placeholder: '0 = infinity (remove limit)', min: 0, max: 1000 },
        { id: 'maxthisunit-unit-launchers', label: 'Unit Launchers', marker: 'UNIT_LAUNCHERS', placeholder: '0 = infinity (remove limit)', min: 0, max: 1000 },
        { id: 'maxthisunit-epic-ragnarok', label: 'Epic Ragnarok', marker: 'RAGNAROK', placeholder: '0 = infinity (remove limit)', min: 0, max: 1000 },
        { id: 'maxthisunit-epic-calamity', label: 'Epic Calamity', marker: 'CALAMITY', placeholder: '0 = infinity (remove limit)', min: 0, max: 1000 },
        { id: 'maxthisunit-epic-tyrannus', label: 'Epic Tyrannus', marker: 'T4_AIR', placeholder: '0 = infinity (remove limit)', min: 0, max: 1000 },
        { id: 'maxthisunit-epic-starfall', label: 'Epic Starfall', marker: 'STARFALL', placeholder: '0 = infinity (remove limit)', min: 0, max: 1000 }
    ];

    const MAXTHISUNIT_DEFAULT_FALLBACKS = {
        T3_BUILDERS: '10',
        UNIT_LAUNCHERS: '20',
        RAGNAROK: '80',
        CALAMITY: '80',
        T4_AIR: '80',
        STARFALL: '80'
    };

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
        wrapper.innerHTML = '<div class="tweak-divider"></div><div class="maxthisunit-header-row"><div class="maxthisunit-header">Limit Max Allowed</div></div><div class="maxthisunit-helper">Leave blank for defaults. Enter 0 to clear the limit (infinity) for that tweak when slots are packed.</div>';

        const grid = document.createElement('div');
        grid.className = 'maxthisunit-grid';

        const findDefaultValueForMarker = (markerName) => {
            if (!tweakFileCache || typeof tweakFileCache !== 'object') {
                return { value: MAXTHISUNIT_DEFAULT_FALLBACKS[markerName] || '', found: false };
            }

            let best = null;
            let found = false;
            Object.values(tweakFileCache).forEach((sections) => {
                if (!Array.isArray(sections)) {
                    return;
                }
                sections.forEach((section) => {
                    if (section && section.name === markerName && typeof section.code === 'string') {
                        const matches = Array.from(section.code.matchAll(/maxthisunit\s*=\s*(\d+)/gi))
                            .map((match) => Number.parseInt(match[1], 10))
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
            });

            if (found && best !== null) {
                return { value: String(best), found: true };
            }

            return { value: MAXTHISUNIT_DEFAULT_FALLBACKS[markerName] || '', found: false };
        };

        const normalizeEffectiveValue = (rawValue) => {
            if (!rawValue) return '';
            const trimmed = rawValue.trim();
            if (trimmed === '∞' || trimmed === '0') return '0';
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

        const updateStatus = (effectiveValue, statusElement) => {
            statusElement.textContent = effectiveValue === '' ? 'Default' : (effectiveValue === '0' ? 'Infinity (no cap)' : `${effectiveValue} max/unit`);
            statusElement.dataset.state = effectiveValue === '' ? 'default' : (effectiveValue === '0' ? 'infinity' : 'custom');
        };

        MAXTHISUNIT_OVERRIDE_FIELDS.forEach((field) => {
            const defaultInfo = findDefaultValueForMarker(field.marker);
            const hasMaxValue = defaultInfo.found || (defaultInfo.value && defaultInfo.value !== '');
            if (!hasMaxValue) {
                return;
            }

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
            if (typeof field.max === 'number') input.max = String(field.max);
            input.step = field.step ? String(field.step) : '1';

            const basePlaceholder = defaultInfo.value || field.placeholder || 'Default';
            input.dataset.placeholderOriginal = basePlaceholder;
            const defaultValue = typeof field.defaultValue !== 'undefined' ? field.defaultValue : defaultInfo.value;
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
                const max = typeof field.max === 'number' ? field.max : Number.POSITIVE_INFINITY;
                let current = Number.parseInt(normalizeEffectiveValue(input.dataset.effectiveValue || input.value || ''), 10);
                if (!Number.isFinite(current)) current = min;
                current = direction === 'up' ? current + step : current - step;
                current = Math.max(min, Math.min(max, current));
                setDisplayValue(input, String(current), basePlaceholder);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            };

            const upButton = document.createElement('button');
            upButton.type = 'button';
            upButton.className = 'maxthisunit-spin maxthisunit-spin-up';
            upButton.textContent = '▲';
            upButton.title = 'Increase';
            upButton.addEventListener('click', (event) => {
                event.preventDefault();
                adjustValue('up');
            });

            const downButton = document.createElement('button');
            downButton.type = 'button';
            downButton.className = 'maxthisunit-spin maxthisunit-spin-down';
            downButton.textContent = '▼';
            downButton.title = 'Decrease';
            downButton.addEventListener('click', (event) => {
                event.preventDefault();
                adjustValue('down');
            });

            spinnerCol.appendChild(upButton);
            spinnerCol.appendChild(downButton);
            inputShell.appendChild(input);
            inputShell.appendChild(spinnerCol);

            input.addEventListener('input', (event) => {
                const effectiveValue = normalizeEffectiveValue(input.value || input.dataset.effectiveValue || '');
                setDisplayValue(input, effectiveValue, basePlaceholder);
                updateStatus(effectiveValue, status);
                if (!globalScope.suppressOutputDuringStateRestore) {
                    if (typeof globalScope.saveStateToStorage === 'function') {
                        globalScope.saveStateToStorage();
                    }
                    if (typeof updateOutputCallback === 'function') {
                        updateOutputCallback(event);
                    }
                }
            });

            const titleWrapper = document.createElement('div');
            titleWrapper.className = 'maxthisunit-title';
            titleWrapper.appendChild(title);
            titleWrapper.appendChild(status);
            fieldWrapper.appendChild(titleWrapper);
            fieldWrapper.appendChild(inputShell);
            grid.appendChild(fieldWrapper);
        });

        wrapper.appendChild(grid);
        container.appendChild(wrapper);

        const applyVisibility = () => {
            container.querySelectorAll('.maxthisunit-field').forEach((row) => {
                const marker = row.dataset.markerTarget;
                const anyChecked = Array.from(document.querySelectorAll(`.tweak-checkbox[data-marker="${marker}"]`)).some((checkbox) => checkbox.checked);
                row.hidden = !anyChecked;
            });
        };

        container.addEventListener('change', applyVisibility);
        applyVisibility();
    }

    const api = {
        MAXTHISUNIT_OVERRIDE_FIELDS,
        MAXTHISUNIT_DEFAULT_FALLBACKS,
        renderMaxThisUnitControls
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('uiGeneratorMaxThisUnitControls', api);
    }

    globalScope.UiGeneratorMaxThisUnitControls = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
