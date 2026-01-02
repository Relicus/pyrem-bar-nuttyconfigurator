// Event Handlers Module
// Manages all UI event listeners for BAR Configurator

/**
 * Switch between tabs
 * @param {Event} event - Click event from tab button
 */
window.switchTabImpl = function(event) {
    const targetTabId = event.target.dataset.tab + '-tab';
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => button.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(targetTabId).classList.add('active');

    if (event.target.dataset.tab === 'custom') {
        if (typeof renderCustomTweaksTable === 'function') renderCustomTweaksTable();
    }
};

/**
 * Attach copy button handlers
 */
window.attachCopyButtonHandlers = function() {
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        if (button.dataset.copyBound === 'true') {
            return;
        }
        const targetId = button.dataset.target;
        button.dataset.copyBound = 'true';
        button.addEventListener('click', event => {
            const btn = event.currentTarget;
            const targetTextArea = targetId ? document.getElementById(targetId) : null;
            const explicitCopyText = btn.dataset.copyText;
            const textToCopy = explicitCopyText || (targetTextArea ? targetTextArea.value : '');
            if (!textToCopy) {
                return;
            }
            const originalText = btn.textContent;
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = originalText; }, 2000);
                }).catch(err => { console.error('Failed to copy: ', err); });
        });
    });
};

/**
 * Attach table button handlers (copy row, delete tweak)
 */
window.attachTableButtonHandlers = function() {
    const customTweaksTableBody = document.querySelector('#custom-tweaks-table tbody');

    [customTweaksTableBody].forEach(tbody => {
        if (!tbody) return;
        tbody.addEventListener('click', event => {
            const button = event.target;
            if (button.matches('.copy-row-button')) {
                const textToCopy = button.dataset.command || button.dataset.tweakCode;
                if (!textToCopy) return;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = button.textContent;
                    button.textContent = 'Copied!';
                    setTimeout(() => { button.textContent = originalText; }, 2000);
                }).catch(err => { console.error('Failed to copy command: ', err); });
            } else if (button.matches('.delete-tweak-btn')) {
                if (typeof deleteCustomTweak === 'function') {
                    deleteCustomTweak(parseInt(button.dataset.id, 10));
                }
            }
        });
    });
};

/**
 * Attach reset button handlers
 */
window.attachResetButtonHandlers = function(formOptionsConfig) {
    const getDefaultsHelper = () => window.ConfigDefaults;

    const resetGameTweaks = () => {
        const container = document.getElementById('options-form-columns');
        if (container && getDefaultsHelper()) {
            getDefaultsHelper().resetSectionToDefaults(container);
        }

        const primaryModeSelect = document.getElementById('primary-mode-select');
        if (primaryModeSelect && typeof primaryModeSelect.dataset.defaultValue !== 'undefined') {
            primaryModeSelect.value = primaryModeSelect.dataset.defaultValue;
            primaryModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (typeof updateOutput === 'function') updateOutput();
        if (typeof window.saveStateToStorage === 'function') {
            window.saveStateToStorage();
        }
    };

    const clearGameTweaks = () => {
        const container = document.getElementById('options-form-columns');
        if (!container) return;

        const checkboxes = container.querySelectorAll('input[type="checkbox"]:not(:disabled)');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });

        if (typeof updateOutput === 'function') updateOutput();
        if (typeof window.saveStateToStorage === 'function') {
            window.saveStateToStorage();
        }
    };

    const clearAvailableTweaks = () => {
        const container = document.getElementById('dynamic-tweaks-container');
        if (!container) return;

        container.querySelectorAll('input.tweak-checkbox:not(:disabled)').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });

        container.querySelectorAll('input[data-maxthisunit-override="true"]').forEach(input => {
            const basePlaceholder = input.dataset.placeholderOriginal || input.placeholder || '';
            const defaultValue = typeof input.dataset.defaultValue !== 'undefined' ? input.dataset.defaultValue : '';
            if (defaultValue === '0') {
                input.value = '';
                input.dataset.effectiveValue = '0';
                input.placeholder = '∞';
            } else if (defaultValue === '') {
                input.value = '';
                delete input.dataset.effectiveValue;
                input.placeholder = basePlaceholder || input.placeholder;
            } else {
                input.value = defaultValue;
                input.dataset.effectiveValue = defaultValue;
                input.placeholder = basePlaceholder || defaultValue || input.placeholder;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });

        if (typeof updateOutput === 'function') updateOutput();
        if (typeof window.saveStateToStorage === 'function') {
            window.saveStateToStorage();
        }
    };

    const resetAvailableTweaks = () => {
        const container = document.getElementById('dynamic-tweaks-container');
        if (!container) return;

        if (getDefaultsHelper()) {
            getDefaultsHelper().resetSectionToDefaults(container);
        }

        container.querySelectorAll('input[data-maxthisunit-override="true"]').forEach(input => {
            const basePlaceholder = input.dataset.placeholderOriginal || input.placeholder || '';
            const defaultValue = typeof input.dataset.defaultValue !== 'undefined' ? input.dataset.defaultValue : '';
            if (defaultValue === '0') {
                input.value = '';
                input.dataset.effectiveValue = '0';
                input.placeholder = '∞';
            } else if (defaultValue === '') {
                input.value = '';
                delete input.dataset.effectiveValue;
                input.placeholder = basePlaceholder || input.placeholder;
            } else {
                input.value = defaultValue;
                input.dataset.effectiveValue = defaultValue;
                input.placeholder = basePlaceholder || defaultValue || input.placeholder;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });

        if (typeof updateOutput === 'function') updateOutput();
        if (typeof window.saveStateToStorage === 'function') {
            window.saveStateToStorage();
        }
    };

    const resetMultipliers = () => {
        const container = document.getElementById('multipliers-container');
        if (!container) return;

        if (getDefaultsHelper()) {
            getDefaultsHelper().resetSectionToDefaults(container);
        }

        if (typeof updateOutput === 'function') updateOutput();
        if (typeof window.saveStateToStorage === 'function') {
            window.saveStateToStorage();
        }
    };

    document.querySelectorAll('.section-reset-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            switch (section) {
                case 'game-tweaks':
                    resetGameTweaks();
                    break;
                case 'available-tweaks':
                    resetAvailableTweaks();
                    break;
                case 'multipliers':
                    resetMultipliers();
                    break;
                default:
                    break;
            }
        });
    });

    document.querySelectorAll('.section-clear-btn').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;
            if (section === 'game-tweaks') {
                clearGameTweaks();
            } else if (section === 'available-tweaks') {
                clearAvailableTweaks();
            }
        });
    });
};

/**
 * Attach form submission handler for custom tweaks
 */
window.attachFormSubmissionHandler = function() {
    const customForms = document.querySelectorAll('.custom-add-form');
    customForms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (typeof addCustomTweak === 'function') {
                addCustomTweak(event);
            }
        });
    });
};

/**
 * Attach tab button handlers
 */
window.attachTabButtonHandlers = function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.addEventListener('click', window.switchTabImpl));
};

/**
 * Attach global state control buttons (Defaults / None / Rebuild)
 */
window.attachStateButtonsHandler = function() {
    const defaultsBtn = document.getElementById('defaults-button');
    if (defaultsBtn) {
        defaultsBtn.addEventListener('click', () => {
            if (typeof window.resetAllToDefaults === 'function') {
                window.resetAllToDefaults();
            }
        });
    }

    const noneBtn = document.getElementById('clear-button');
    if (noneBtn) {
        noneBtn.addEventListener('click', () => {
            if (typeof window.clearAllSelections === 'function') {
                window.clearAllSelections();
            }
        });
    }

    const rebuildBtn = document.getElementById('rebuild-button');
    if (rebuildBtn) {
        rebuildBtn.addEventListener('click', async () => {
            if (typeof window.rebuildApp === 'function') {
                await window.rebuildApp();
            } else {
                console.warn('Rebuild function is not available yet.');
            }
        });
    }
};

/**
 * Attach all event handlers
 * @param {Array} formOptionsConfig - Form options configuration
 */
window.attachEventHandlersImpl = function(formOptionsConfig) {
    attachCopyButtonHandlers();
    attachTableButtonHandlers();
    attachResetButtonHandlers(formOptionsConfig);
    attachFormSubmissionHandler();
    attachTabButtonHandlers();
    attachStateButtonsHandler();
    attachOutputRefreshHandlers();
};

/**
 * Fallback: ensure output refreshes when inputs change
 */
window.attachOutputRefreshHandlers = function() {
    const formContainers = Array.from(document.querySelectorAll('.custom-add-form'));
    const containers = [
        document.getElementById('options-form-columns'),
        document.getElementById('dynamic-tweaks-container'),
        document.getElementById('multipliers-container')
    ].filter(Boolean).concat(formContainers);

    const triggerUpdate = (event) => {
        // Ignore programmatic events (state restoration/default application) to avoid
        // spamming output generation; explicit callers will trigger updates themselves.
        if (event && event.isTrusted === false) {
            return;
        }

        if (typeof updateOutput === 'function') {
            updateOutput(event);
        }
        if (typeof window.saveStateToStorage === 'function') {
            window.saveStateToStorage();
        }
    };

    containers.forEach(container => {
        container.addEventListener('change', triggerUpdate);
        container.addEventListener('input', (e) => {
            const target = e && e.target;
            if (target && target.type === 'range') {
                return;
            }
            triggerUpdate(e);
        });
    });
};
