// Tweak Metadata Handler
let tweaksMetadata = null;

function getCacheBuster() {
    if (typeof window !== 'undefined' && window.ASSET_CACHE_BUSTER) {
        return window.ASSET_CACHE_BUSTER;
    }
    return Date.now();
}

async function loadTweakMetadata() {
    try {
        const response = await fetch(`tweaks-metadata.json?v=${getCacheBuster()}`);

        if (!response.ok) {
            console.warn('Could not load tweaks-metadata.json, using default names');
            return null;
        }
        tweaksMetadata = await response.json();
        return tweaksMetadata;
    } catch (error) {
        console.warn('Error loading metadata:', error);
        return null;
    }
}

/**
 * Generic getter for tweak metadata fields
 * @param {string} internalName - Internal tweak name
 * @param {string} field - Field to get (display, description, category, author)
 * @param {*} fallback - Fallback value if field not found
 * @returns {*} Field value or fallback
 */
function getTweakMetadataField(internalName, field, fallback) {
    if (!tweaksMetadata || !tweaksMetadata.tweaks[internalName]) {
        return fallback;
    }
    return tweaksMetadata.tweaks[internalName][field] || fallback;
}

function getTweakDisplayName(internalName) {
    return getTweakMetadataField(internalName, 'display', internalName.replace(/_/g, ' '));
}

function getTweakDescription(internalName) {
    return getTweakMetadataField(internalName, 'description', '');
}

function getTweakCategory(internalName) {
    return getTweakMetadataField(internalName, 'category', 'Other');
}

function getTweakAuthor(internalName) {
    return getTweakMetadataField(internalName, 'author', '');
}
