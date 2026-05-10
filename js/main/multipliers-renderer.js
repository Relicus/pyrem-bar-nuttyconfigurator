// Multiplier UI rendering extracted from main.js.

(function (globalScope) {
    function getStore() {
        return globalScope.AppRuntime?.get('mainMultipliersStore') || globalScope.MainMultipliersStore;
    }

    function getUpdateOutput() {
        return globalScope.updateOutput || globalScope.AppRuntime?.get('mainOutputUpdater');
    }

    function renderMultipliers() {
        const store = getStore();
        const resourceContainer = document.getElementById('resource-multipliers');
        const raptorContainer = document.getElementById('raptor-multipliers');
        if (!resourceContainer || !raptorContainer || !store) {
            return;
        }

        const values = store.getMultiplierValues();
        resourceContainer.innerHTML = '';
        raptorContainer.innerHTML = '';

        store.multipliersConfig.forEach((section) => {
            const container = section.section === 'resource' ? resourceContainer : raptorContainer;
            section.multipliers.forEach((multiplier) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'multiplier-control';
                const label = document.createElement('label');
                label.textContent = multiplier.label;
                label.htmlFor = `${multiplier.id}-input`;
                const controlsWrapper = document.createElement('div');
                controlsWrapper.className = 'multiplier-controls';
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.id = `${multiplier.id}-slider`;
                slider.min = multiplier.min;
                slider.max = multiplier.max;
                slider.step = multiplier.step;
                const initialValue = store.clampMultiplierValue(values[multiplier.id], multiplier);
                slider.value = initialValue;
                slider.dataset.defaultValue = multiplier.default;

                const input = document.createElement('input');
                input.type = 'number';
                input.id = `${multiplier.id}-input`;
                input.min = multiplier.min;
                input.max = multiplier.max;
                input.step = multiplier.step;
                input.value = store.formatMultiplierValueForDisplay(initialValue, multiplier);
                input.className = 'multiplier-input';
                input.dataset.defaultValue = store.formatMultiplierValueForDisplay(multiplier.default, multiplier);

                const spinnerWrapper = document.createElement('div');
                spinnerWrapper.className = 'input-spinner-wrapper';
                const spinnerButtons = document.createElement('div');
                spinnerButtons.className = 'spinner-buttons';
                const upButton = document.createElement('button');
                upButton.type = 'button';
                upButton.className = 'spinner-button spinner-button-up';
                upButton.textContent = '+';
                const downButton = document.createElement('button');
                downButton.type = 'button';
                downButton.className = 'spinner-button spinner-button-down';
                downButton.textContent = '-';

                const updateButtonStates = (currentValue = store.clampMultiplierValue(input.value, multiplier)) => {
                    upButton.disabled = currentValue >= multiplier.max;
                    downButton.disabled = currentValue <= multiplier.min;
                };

                const applyMultiplierValue = (value, shouldUpdateOutput = true) => {
                    const sanitized = store.clampMultiplierValue(value, multiplier);
                    input.value = store.formatMultiplierValueForDisplay(sanitized, multiplier);
                    slider.value = sanitized;
                    updateButtonStates(sanitized);
                    store.saveMultiplierValues();
                    if (shouldUpdateOutput && typeof getUpdateOutput() === 'function') {
                        getUpdateOutput()();
                    }
                };

                upButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    input.stepUp();
                    applyMultiplierValue(input.value);
                });
                downButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    input.stepDown();
                    applyMultiplierValue(input.value);
                });
                slider.addEventListener('input', (event) => applyMultiplierValue(event.target.value, false));
                slider.addEventListener('change', (event) => applyMultiplierValue(event.target.value, true));
                input.addEventListener('input', (event) => applyMultiplierValue(event.target.value));

                spinnerButtons.appendChild(upButton);
                spinnerButtons.appendChild(downButton);
                spinnerWrapper.appendChild(input);
                spinnerWrapper.appendChild(spinnerButtons);
                updateButtonStates();
                controlsWrapper.appendChild(slider);
                controlsWrapper.appendChild(spinnerWrapper);
                wrapper.appendChild(label);
                wrapper.appendChild(controlsWrapper);
                container.appendChild(wrapper);
            });
        });
    }

    const api = { renderMultipliers };
    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainMultipliersRenderer', api);
    }
    globalScope.MainMultipliersRenderer = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
