// Raptor wave selector rendering extracted from ui-generator.js.

(function (globalScope) {
    function generateRaptorWaveDropdown(updateOutputCallback) {
        const container = document.getElementById('dynamic-tweaks-container');
        if (!container) {
            console.error('No container found for Raptor Wave selector');
            return;
        }

        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'raptor-wave-dropdown-container';
        selectorContainer.id = 'raptor-wave-mode-container';

        const waveConfig = globalScope.allTweaksData?.dynamic_tweaks?.Raptor_Wave_Mode;
        const dropdownOptions = Array.isArray(waveConfig?.dropdown_options) ? waveConfig.dropdown_options : null;
        const defaultValue = waveConfig?.default;
        const selectorLabel = document.createElement('label');
        selectorLabel.className = 'raptor-wave-selector-label';
        selectorLabel.textContent = 'Raptor Wave Mode:';
        selectorContainer.appendChild(selectorLabel);

        const optionsToUse = dropdownOptions && dropdownOptions.length > 0
            ? dropdownOptions
            : [
                { value: 'none', label: 'None' },
                { value: 'mini_bosses', label: 'Mini Bosses' },
                { value: 'doom_mode', label: 'Doom Mode' }
            ];

        if (!dropdownOptions || dropdownOptions.length === 0) {
            console.warn('Raptor_Wave_Mode options missing in dynamic-tweaks.json; using fallback list.');
        }

        const savedValue = localStorage.getItem('raptorWaveMode');
        const resolvedDefault = savedValue || defaultValue
            || (optionsToUse.some((option) => option.value === 'mini_bosses') ? 'mini_bosses' : optionsToUse[0].value);
        const radioGroup = document.createElement('div');
        radioGroup.className = 'raptor-wave-radio-group';
        radioGroup.id = 'raptor-wave-mode';

        optionsToUse.forEach((option) => {
            const optionWrapper = document.createElement('label');
            optionWrapper.className = 'raptor-wave-radio-option';
            if (option.value === 'doom_mode') {
                optionWrapper.classList.add('raptor-wave-radio-option-doom');
            }

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
                if (radio.checked) {
                    localStorage.setItem('raptorWaveMode', radio.value);
                    if (typeof updateOutputCallback === 'function') {
                        updateOutputCallback();
                    }
                }
            });

            const labelText = document.createElement('span');
            labelText.className = 'raptor-wave-radio-label';
            const labelCopy = document.createElement('span');
            labelCopy.className = 'raptor-wave-radio-label-copy';
            labelCopy.textContent = option.label;
            labelText.appendChild(labelCopy);

            if (option.value === 'doom_mode') {
                const badge = document.createElement('span');
                badge.className = 'raptor-wave-radio-badge';
                badge.textContent = 'NEW';
                labelText.appendChild(badge);
            }

            optionWrapper.appendChild(radio);
            optionWrapper.appendChild(labelText);
            radioGroup.appendChild(optionWrapper);
        });

        selectorContainer.appendChild(radioGroup);

        const dropdownInfo = document.createElement('div');
        dropdownInfo.className = 'raptor-wave-dropdown-info';
        dropdownInfo.textContent = waveConfig?.description || 'Choose Mini Bosses or Doom Mode for Raptors mode';
        selectorContainer.appendChild(dropdownInfo);

        container.insertBefore(selectorContainer, container.firstChild);
        console.log('Raptor Wave Mode selector generated');
    }

    const api = {
        generateRaptorWaveDropdown
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('uiGeneratorRaptorWaveDropdown', api);
    }

    globalScope.UiGeneratorRaptorWaveDropdown = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
