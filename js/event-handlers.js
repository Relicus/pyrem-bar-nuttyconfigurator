// Event Handlers Module
// Manages all UI event listeners for BAR Configurator

/** Shared clipboard helper — single source of truth for copy feedback */
let _activeCopiedButton = null;
let _activeCopiedOriginalText = null;

function _clearCopiedState() {
    if (_activeCopiedButton) {
        _activeCopiedButton.textContent = _activeCopiedOriginalText;
        _activeCopiedButton = null;
        _activeCopiedOriginalText = null;
    }
}

function copyToClipboard(button, text) {
    if (!text) return;
    _clearCopiedState();
    const originalText = button.textContent;
    navigator.clipboard.writeText(text)
        .then(() => {
            _activeCopiedButton = button;
            _activeCopiedOriginalText = originalText;
            button.textContent = 'Copied!';
        })
        .catch(err => { console.error('Failed to copy: ', err); });
}

// Clear "Copied!" state when any button on the page is clicked
document.addEventListener('click', (event) => {
    if (!_activeCopiedButton) return;
    const clickedButton = event.target.closest('button');
    if (clickedButton && clickedButton !== _activeCopiedButton) {
        _clearCopiedState();
    }
}, true);

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
            copyToClipboard(btn, textToCopy);
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
                copyToClipboard(button, textToCopy);
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
