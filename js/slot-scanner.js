// slot-scanner.js
// Scans tweak files for marker-delimited sections and calculates sizes

const SCANNER_START_PATTERN = /--\s*(\w+)_START/;
const SCANNER_END_PATTERN = /--\s*(\w+)_END/;

function getGlobalScope() {
    if (typeof window !== 'undefined') {
        return window;
    }

    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }

    return null;
}

function getCacheBuster() {
    const globalScope = getGlobalScope();
    if (globalScope && globalScope.ASSET_CACHE_BUSTER) {
        return globalScope.ASSET_CACHE_BUSTER;
    }
    return Date.now();
}

function getDefaultEncodeBase64Url() {
    const globalScope = getGlobalScope();
    if (globalScope && typeof globalScope.encodeBase64Url === 'function') {
        return globalScope.encodeBase64Url;
    }

    return null;
}

function inferSectionType(filePath) {
    return filePath.includes('Units_') ? 'units' : 'defs';
}

function resolveMarkerSectionName(markers) {
    if (!markers || typeof markers.start !== 'string') {
        return null;
    }

    const match = markers.start.match(SCANNER_START_PATTERN);
    return match ? match[1] : null;
}

function collectSourceFilesFromDynamicTweaks(data) {
    const files = new Set();
    const tweaks = data && typeof data === 'object' ? data.dynamic_tweaks || {} : {};

    Object.values(tweaks).forEach((config) => {
        if (config && typeof config.source_file === 'string') {
            files.add(config.source_file);
        }

        if (Array.isArray(config?.options)) {
            config.options.forEach((option) => {
                if (option && typeof option.source_file === 'string') {
                    files.add(option.source_file);
                }
            });
        }

        if (Array.isArray(config?.dropdown_options)) {
            config.dropdown_options.forEach((option) => {
                if (option && typeof option.source_file === 'string') {
                    files.add(option.source_file);
                }
            });
        }
    });

    return Array.from(files);
}

/**

 * Scans a file for START/END marker pairs and returns file metadata
 * @param {string} filePath - Relative path to file
 * @param {string} content - File content
 * @param {Object} [options] - Scanner helpers
 * @returns {Object} File metadata with sections for display and fullContent for packing
 */
function scanFileForMarkers(filePath, content, options = {}) {
    const sections = [];
    const lines = content.split(/\r?\n/);

    let currentSection = null;
    let currentStartLine = 0;
    let currentContent = [];

    lines.forEach((line, index) => {
        const startMatch = line.match(SCANNER_START_PATTERN);
        const endMatch = line.match(SCANNER_END_PATTERN);

        if (startMatch) {
            currentSection = startMatch[1];
            currentStartLine = index + 1;
            currentContent = [line];
        } else if (endMatch && currentSection === endMatch[1]) {
            currentContent.push(line);

            const sectionCode = currentContent.join('\n');
            const stats = calculateSectionStats(sectionCode, options);

            sections.push({
                name: currentSection,
                file: filePath,
                type: inferSectionType(filePath),
                startLine: currentStartLine,
                endLine: index + 1,
                lines: currentContent.length,
                rawChars: stats.rawChars,
                encodedChars: stats.encodedChars,
                ...(typeof stats.minifiedEncodedEstimate === 'number'
                    ? { minifiedEncodedEstimate: stats.minifiedEncodedEstimate }
                    : {}),
                code: sectionCode
            });

            currentSection = null;
            currentContent = [];
        } else if (currentSection) {
            currentContent.push(line);
        }
    });

    return sections;
}

// NOTE: encodeBase64Url is now a shared utility in utils.js (window.encodeBase64Url)

/**
 * Calculate section statistics (lines, raw chars, encoded chars)
 * NO MINIFICATION - marker-delimited fragments cause SyntaxError
 * @param {string} code - Section code
 * @param {Object} [options] - Encoding helpers
 * @returns {Object} Stats object with rawChars and encodedChars
 */
function calculateSectionStats(code, options = {}) {
    const rawChars = code.length;
    const encodeBase64Url = typeof options.encodeBase64Url === 'function'
        ? options.encodeBase64Url
        : getDefaultEncodeBase64Url();
    if (typeof encodeBase64Url !== 'function') {
        throw new Error('scanFileForMarkers requires an encodeBase64Url function in this runtime.');
    }

    const base64url = encodeBase64Url(code);
    const encodedChars = base64url.length;

    if (typeof options.estimateMinifiedEncoded === 'function') {
        return {
            rawChars,
            encodedChars,
            minifiedEncodedEstimate: options.estimateMinifiedEncoded(code)
        };
    }

    return { rawChars, encodedChars };
}

/**
 * Load tweak file list from dynamic-tweaks.json to avoid hardcoded paths.
 * @returns {Promise<string[]>}
 */
async function loadTweakFileList() {
    try {
        const response = await fetch(`dynamic-tweaks.json?v=${getCacheBuster()}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const fileList = collectSourceFilesFromDynamicTweaks(data);
        if (fileList.length > 0) {
            return fileList;
        }
        console.warn('dynamic-tweaks.json did not provide any source files.');
    } catch (error) {
        console.warn('Could not load dynamic tweak manifest.', error);
    }

    return [];
}

let encodedTweaksCache = null;

async function loadEncodedTweaks() {
    if (encodedTweaksCache !== null) return encodedTweaksCache;
    console.log('AES decoding disabled; using plaintext tweaks.');
    encodedTweaksCache = false;
    return null;
}

async function decodeAesCtrBase64(payloadBase64, secret) {
    const raw = Uint8Array.from(atob(payloadBase64), c => c.charCodeAt(0));
    const iv = raw.slice(0, 16);
    const ciphertext = raw.slice(16);
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(secret));
    const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-CTR' }, false, ['decrypt']);
    const plaintextBuffer = await crypto.subtle.decrypt(
        { name: 'AES-CTR', counter: iv, length: 64 },
        key,
        ciphertext
    );
    return new TextDecoder().decode(plaintextBuffer);
}

/**
 * Scan all tweak files from slot-distribution.json
 * @returns {Promise<Object>} File path -> sections array mapping
 */
async function scanAllTweakFiles() {
    console.log("Starting auto-scan of all tweak files...");

    const fileCache = {};
    const encodedMap = await loadEncodedTweaks();

    const filesToScan = await loadTweakFileList();
    if (filesToScan.length === 0) {
        console.warn('No tweak files available for scanning.');
        return fileCache;
    }

    // Scan each file
    for (const filePath of filesToScan) {
        console.log(`Scanning ${filePath}...`);

        try {
            let content = null;

            // Prefer encoded tweaks if present
            if (encodedMap && encodedMap[filePath]) {
                content = await decodeAesCtrBase64(encodedMap[filePath], ENCODED_TWEAKS_SECRET);
            } else {
                const response = await fetch(`${filePath}?v=${getCacheBuster()}`);
                if (!response.ok) {
                    console.warn(`Failed to load ${filePath}`);
                    continue;
                }
                content = await response.text();
            }

            const sections = scanFileForMarkers(filePath, content);

            if (sections.length > 0) {
                fileCache[filePath] = sections;
                console.log(`  Found ${sections.length} sections:`, sections.map(s => s.name).join(', '));
            } else {
                console.log(`  No marker-delimited sections found`);
            }
        } catch (error) {
            console.error(`Error scanning ${filePath}:`, error);
        }
    }

    console.log("Auto-scan complete. Total files with sections:", Object.keys(fileCache).length);
    return fileCache;
}

/**
 * Find a section by ID in the file cache
 * @param {Object} fileCache - Cache from scanAllTweakFiles()
 * @param {string} sectionId - Section identifier (e.g., "ARMADA_COMMANDER")
 * @returns {Object|null} Section metadata or null
 */
function findSectionInCache(fileCache, sectionId) {
    for (const sections of Object.values(fileCache)) {
        const section = sections.find(s => s.name === sectionId);
        if (section) return section;
    }
    return null;
}

// Export functions for use in main.js
if (typeof window !== 'undefined') {
    window.scanFileForMarkers = scanFileForMarkers;
    window.calculateSectionStats = calculateSectionStats;
    window.scanAllTweakFiles = scanAllTweakFiles;
    window.findSectionInCache = findSectionInCache;
    window.resolveMarkerSectionName = resolveMarkerSectionName;
    window.collectSourceFilesFromDynamicTweaks = collectSourceFilesFromDynamicTweaks;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        scanFileForMarkers,
        calculateSectionStats,
        scanAllTweakFiles,
        findSectionInCache,
        resolveMarkerSectionName,
        collectSourceFilesFromDynamicTweaks,
        inferSectionType
    };
}
