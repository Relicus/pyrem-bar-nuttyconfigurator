// Custom Tweaks — Storage
// localStorage persistence for user-defined custom tweaks.

const CUSTOM_TWEAKS_KEY = 'nuttyb-custom-tweaks';

/**
 * Load custom options from localStorage
 */
function loadCustomOptionsImpl() {
    const savedTweaks = localStorage.getItem(CUSTOM_TWEAKS_KEY);
    if (!savedTweaks) {
        return [];
    }

    try {
        const parsed = JSON.parse(savedTweaks);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Failed to parse saved custom tweaks, resetting to empty list:', error);
        return [];
    }
}

/**
 * Save custom options to localStorage
 * @param {Array} customOptions - Array of custom tweak objects
 */
function saveCustomOptionsImpl(customOptions) {
    localStorage.setItem(CUSTOM_TWEAKS_KEY, JSON.stringify(customOptions));
}

// Export functions to window for browser use
window.loadCustomOptionsImpl = loadCustomOptionsImpl;
window.saveCustomOptionsImpl = saveCustomOptionsImpl;

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadCustomOptions: loadCustomOptionsImpl,
        saveCustomOptions: saveCustomOptionsImpl
    };
}
