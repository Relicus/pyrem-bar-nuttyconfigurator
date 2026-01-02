// Command Builder module for BAR Configurator
// Generates final commands from user selections and splits into sections

// Global array to collect slot files for batch saving
let pendingSlotFiles = [];

// Only allow the temp slot writer when running locally
function isLocalSlotWriterAvailable() {
    if (typeof window === 'undefined' || !window.location || !window.location.hostname) {
        return false;
    }

    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
}

const slotLabelHelperForBuilder = (function () {
    if (typeof window !== 'undefined' && window.SlotLabelUtils) {
        return window.SlotLabelUtils;
    }
    if (typeof require === 'function') {
        try {
            return require('./helpers/slot-utils');
        } catch (e) {
            return null;
        }
    }
    return null;
})();

const priorityHelperForBuilder = (function () {
    if (typeof window !== 'undefined' && window.PriorityUtils) {
        return window.PriorityUtils;
    }
    if (typeof require === 'function') {
        try {
            return require('./helpers/priority-utils');
        } catch (e) {
            return null;
        }
    }
    return null;
})();

const mapSectionNameForBuilder = slotLabelHelperForBuilder && typeof slotLabelHelperForBuilder.mapSectionName === 'function'
    ? slotLabelHelperForBuilder.mapSectionName
    : (name) => {
        if (!name) return null;
        if (name.includes('HP_MULTIPLIER')) {
            return 'NUTTY_TWEAKS';
        }
        if (name === 'EPIC_ELYSIUM') {
            return 'EPIC_ELYSIUM';
        }
        return name;
    };

function getPriorityMetaForBuilder(section) {
    if (!priorityHelperForBuilder || typeof priorityHelperForBuilder.getPriorityMeta !== 'function') {
        return null;
    }

    const file = typeof section?.file === 'string' ? section.file : '';
    const type = section?.type || (file.includes('Units_') ? 'units' : 'defs');
    return priorityHelperForBuilder.getPriorityMeta(section, type);
}

function formatMultiplierForMarker(multiplier) {
    return String(multiplier || '')
        .toUpperCase()
        .replace(/[^0-9A-Z]/g, '_');
}

    function compressSlotSection(section) {
        // String-aware compaction: preserve string literals, trim around punctuation elsewhere
        let result = '';
        let inString = false;
        let stringChar = '';
        let buffer = '';

        const flushBuffer = () => {
            if (!buffer) return;
            // trim whitespace runs and spaces around punctuation in buffer (non-string code only)
            const compacted = buffer
                .replace(/\s*([{}(),=;])\s*/g, '$1')
                .replace(/\s+/g, ' ')
                .trim();
            result += compacted;
            buffer = '';
        };

        for (let i = 0; i < section.length; i++) {
            const ch = section[i];
            const prev = i > 0 ? section[i - 1] : '';

            if ((ch === '"' || ch === "'") && prev !== '\\') {
                if (!inString) {
                    flushBuffer();
                    inString = true;
                    stringChar = ch;
                    result += ch;
                } else if (ch === stringChar) {
                    inString = false;
                    stringChar = '';
                    result += ch;
                } else {
                    result += ch;
                }
                continue;
            }

            if (inString) {
                result += ch;
                continue;
            }

            // Outside strings: accumulate for compaction
            if (ch === '\n') {
                buffer += ' ';
            } else {
                buffer += ch;
            }
        }

        flushBuffer();
        return result.trim();
    }

function minifySlotBody(content) {
    let contentToSave = content || '';

    if (contentToSave && window.LuaMinifier && typeof window.LuaMinifier.minify === 'function') {
        try {
            contentToSave = window.LuaMinifier.minify(contentToSave);
        } catch (e) {
            console.warn(`Could not minify slot body: ${e.message}`);
        }
    }

    const sections = contentToSave.split('\n\n');
    const processedSections = [];

    for (const section of sections) {
        if (!section) continue;

        const markerMatch = section.match(/^(--\s*[A-Z_][A-Z0-9_]*(?:_START|_END)?)\s*\n(.*)$/s);
        if (markerMatch) {
            const marker = markerMatch[1];
            const code = compressSlotSection(markerMatch[2]);
            processedSections.push(code ? `${marker}\n${code}` : marker);
        } else {
            const minified = compressSlotSection(section);
            if (minified) {
                processedSections.push(minified);
            }
        }
    }

    return processedSections.join('\n\n');
}

function deriveSlotLabelFromSections(sections) {
    if (!sections || sections.length === 0) {
        return 'EMPTY';
    }

    const uniqueNames = Array.from(new Set(
        sections
            .map(section => section && section.name)
            .filter(Boolean)
    ));

    if (uniqueNames.length === 0) {
        return 'EMPTY';
    }

    const mapped = uniqueNames
        .map(mapSectionNameForBuilder)
        .filter(Boolean);
    const uniqueLabels = Array.from(new Set(mapped));

    return uniqueLabels.join('_') || 'EMPTY';
}

const SLOT_LABEL_MAX_LENGTH = 12;

function sanitizeSlotLabel(label) {
    if (!label) {
        return 'EMPTY';
    }

    const normalized = label
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    if (!normalized) {
        return 'EMPTY';
    }

    if (normalized.length <= SLOT_LABEL_MAX_LENGTH) {
        return normalized;
    }

    const parts = normalized.split('_').filter(Boolean);
    if (parts.length === 0) {
        return normalized.slice(0, SLOT_LABEL_MAX_LENGTH);
    }

    let result = '';
    for (const part of parts) {
        const needsJoin = result.length > 0;
        const available = SLOT_LABEL_MAX_LENGTH - result.length - (needsJoin ? 1 : 0);
        if (available <= 0) {
            break;
        }

        const chunk = part.slice(0, available);
        if (!chunk) {
            continue;
        }

        result += (needsJoin ? '_' : '') + chunk;

        if (result.length >= SLOT_LABEL_MAX_LENGTH) {
            break;
        }
    }

    return result || normalized.slice(0, SLOT_LABEL_MAX_LENGTH);
}

const MAXTHISUNIT_OVERRIDE_INPUTS = [
    { id: 'maxthisunit-t3-builders', section: 'T3_BUILDERS' },
    { id: 'maxthisunit-unit-launchers', section: 'UNIT_LAUNCHERS' },
    { id: 'maxthisunit-epic-ragnarok', section: 'RAGNAROK' },
    { id: 'maxthisunit-epic-calamity', section: 'CALAMITY' },
    { id: 'maxthisunit-epic-tyrannus', section: 'T4_AIR' },
    { id: 'maxthisunit-epic-starfall', section: 'STARFALL' }
];

const WELCOME_MESSAGE_CMD = '$welcome-message NuttyB ModSettings made with https://relicus.github.io/pyrem-bar-nuttyconfigurator';

function getMaxThisUnitOverrides() {
    const overrides = {};

    MAXTHISUNIT_OVERRIDE_INPUTS.forEach(cfg => {
        const input = document.getElementById(cfg.id);
        if (!input) {
            return;
        }

        const rawValue = (input.value || '').trim();
        const effectiveValue = (input.dataset.effectiveValue || '').trim();
        const candidate = effectiveValue || rawValue;
        if (candidate === '') {
            return;
        }

        const normalized = candidate === '∞' ? '0' : candidate;
        const parsed = Number.parseInt(normalized, 10);
        if (Number.isFinite(parsed) && parsed >= 0) {
            overrides[cfg.section] = parsed;
        }
    });

    return overrides;
}

function buildSlotSummaryLine(slotType, slotNum, sections, slotLabel) {
    const normalizeMarker = (m) => m.replace(/_(START|END)$/, '');

    const syntheticMarkers = sections
        .filter(s => s && s.isSynthetic && s.marker)
        .map(s => normalizeMarker(s.marker));
    if (syntheticMarkers.length > 0) {
        return `--${sanitizeSlotLabel(syntheticMarkers.join('_'))}`;
    }

    const labelSource = slotLabel || deriveSlotLabelFromSections(sections);
    const summaryLabel = sanitizeSlotLabel(labelSource);

    return `--${summaryLabel}`;
}

function isHpPrioritySection(section) {
    if (priorityHelperForBuilder && typeof priorityHelperForBuilder.isHpPrioritySection === 'function') {
        return priorityHelperForBuilder.isHpPrioritySection(section);
    }

    if (!section) {
        return false;
    }

    const marker = typeof section.marker === 'string' ? section.marker : '';
    const name = typeof section.name === 'string' ? section.name : '';
    const key = marker || name;

    return /^(HP|QHP|SCAV_HP|BOSS_HP)_/i.test(key);
}

function orderSectionsForSlotExecution(sections) {
    if (!Array.isArray(sections) || sections.length <= 1) {
        return Array.isArray(sections) ? sections : [];
    }

    const fallbackPriority = (section) => (isHpPrioritySection(section) ? 0 : 10);
    const getPriority = (section) => {
        if (section && typeof section.priorityRank === 'number') {
            return section.priorityRank;
        }
        const meta = getPriorityMetaForBuilder(section);
        if (meta && typeof meta.priorityRank === 'number') {
            return meta.priorityRank;
        }
        return fallbackPriority(section);
    };
    const getTier = (section) => {
        if (section && typeof section.tierRank === 'number') {
            return section.tierRank;
        }
        const meta = getPriorityMetaForBuilder(section);
        if (meta && typeof meta.tierRank === 'number') {
            return meta.tierRank;
        }
        return 99;
    };

    return [...sections].sort((a, b) => {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }

        const aTier = getTier(a);
        const bTier = getTier(b);
        if (aTier !== bTier) {
            return aTier - bTier;
        }

        const aLine = typeof a.startLine === 'number' ? a.startLine : 0;
        const bLine = typeof b.startLine === 'number' ? b.startLine : 0;
        if (aLine !== bLine) {
            return aLine - bLine;
        }

        const aName = String(a?.name || '');
        const bName = String(b?.name || '');
        return aName.localeCompare(bName);
    });
}

/**
 * Queue slot content for saving to temporary file
 * @param {string} slotName - Name of the slot (e.g., 'tweakdefs0', 'tweakunits1')
 * @param {string} content - Raw Lua content to save
 * @param {Object} options - Additional options ({ summaryLine, preMinified })
 */
function saveTempSlotFile(slotName, content, options = {}) {
    const { summaryLine = null, preMinified = false } = options;
    const rawLength = content ? content.length : 0;

    let contentToSave = preMinified ? (content || '') : minifySlotBody(content || '');

    if (summaryLine) {
        const summary = summaryLine.trim();
        if (summary) {
            contentToSave = contentToSave ? `${summary}\n${contentToSave}` : summary;
        }
    }

    pendingSlotFiles.push({
        name: slotName,
        content: contentToSave
    });

    console.log(`Queued ${slotName} for saving (${contentToSave.length} chars from ${rawLength} raw chars)`);

    return contentToSave;
}

/**
 * Clear pending slot files array
 */
function clearTempSlotFiles() {
    pendingSlotFiles = [];
    console.log(`ðŸ—‘ï¸ Cleared pending slot files queue`);
}

function annotateCustomPayload(base64Payload, slotNumber) {
    const payload = (base64Payload || "").trim();
    if (!payload) {
        return payload;
    }
    if (typeof window === "undefined" ||
        typeof window.decodeBase64Url !== "function" ||
        typeof window.encodeBase64Url !== "function") {
        return payload;
    }

    const slotLabel = String(slotNumber || 0).padStart(2, "0");
    const prefixComment = `-- CUSTOM_${slotLabel} slot ${slotNumber || 0}`;

    try {
        const decoded = window.decodeBase64Url(payload);
        if (!decoded || decoded === "Error decoding data") {
            console.warn("Could not decode custom tweak payload, skipping annotation");
            return payload;
        }
        const lines = decoded.split(/\r?\n/);
        if (lines.length === 0) {
            lines.push(prefixComment);
        } else if (/^--\s*CUSTOM_/i.test(lines[0])) {
            lines[0] = prefixComment;
        } else {
            lines.unshift(prefixComment);
        }
        const annotated = lines.join("\n");
        return window.encodeBase64Url(annotated, true);
    } catch (error) {
        console.warn("Failed to annotate custom tweak payload, using original base64:", error);
        return payload;
    }
}

/**
 * Helper function to encode and validate a slot
 * @param {string} slotType - Type of slot ('tweakunits' or 'tweakdefs')
 * @param {number|string} slotNum - Slot number (0 for main, 1+ for others)
 * @param {Array} sections - Array of section objects with code property
 * @param {Object} commands - Array to push commands to
 * @param {Object} usedSlots - Object tracking used slots
 * @param {Object} [options] - Additional metadata (e.g., slotLabel)
 * @returns {boolean} Success status
 */
function encodeAndValidateSlot(slotType, slotNum, sections, commands, usedSlots, options = {}) {
    try {
        const orderedSections = orderSectionsForSlotExecution(sections);

        // Combine all sections (ordered for execution)
        const combinedCode = orderedSections.map(s => s.code).join('\n\n');
        const rawCombinedLength = combinedCode.length;

        // Save temp file before encoding
        const slotName = slotNum === 0 ? slotType : `${slotType}${slotNum}`;
        const summaryLine = buildSlotSummaryLine(slotType, slotNum, orderedSections, options.slotLabel);
        const finalContent = saveTempSlotFile(slotName, combinedCode, { summaryLine });

        // Encode to base64
        const base64url = window.encodeBase64Url(finalContent, true);
        const actualEncodedSize = base64url.length;
        const utilizationPct = Math.round(actualEncodedSize / 13000 * 100);

        // Validate final encoded size (13k limit)
        const isArmadaCommander = sections.length === 1 && sections[0].name === 'ARMADA_COMMANDER';

        if (!isArmadaCommander && actualEncodedSize > 13000) {
            const errMsg = `SLOT SIZE ERROR: ${slotName} exceeds 13k limit (${actualEncodedSize}/13000). Split sections further.`;
            console.error(errMsg);
            console.error(`   Sections: ${sections.map(s => s.name).join(', ')}`);
            throw new Error(errMsg);
        } else {
            if (actualEncodedSize > 12000) {
                console.warn(`- ${slotName}: ${actualEncodedSize}/13000 chars (${utilizationPct}%) â€” approaching 13k limit, consider splitting.`);
            } else {
                console.log(`- ${slotName}: ${sections.length} sections - Final: ${actualEncodedSize}/${13000} chars (${utilizationPct}%)`);
            }
        }

        // Generate command
        const command = slotNum === 0
            ? `!bset ${slotType} ${base64url}`  // No number for slot 0
            : `!bset ${slotType}${slotNum} ${base64url}`;

        commands.push(command);
        usedSlots[slotType].add(slotNum);

        const sectionNames = orderedSections.map(s => s.name || 'UNKNOWN');
        const sectionFiles = Array.from(new Set(orderedSections.map(s => s.file || 'unknown')));

        return {
            slotType,
            slotNum,
            slotName,
            slotLabel: (summaryLine || '').replace(/^--/, '') || 'EMPTY',
            summaryLine,
            sectionCount: sections.length,
            sectionNames,
            sectionFiles,
            rawSectionChars: rawCombinedLength,
            minifiedLength: finalContent.length,
            encodedSize: actualEncodedSize,
            utilizationPct,
            command
        };
    } catch (error) {
        const slotName = slotNum === 0 ? slotType : `${slotType}${slotNum}`;
        console.error(`Error encoding ${slotName}:`, error);
        return null;
    }
}

/**
 * Write all pending slot files to disk via the temp-slot-writer server
 */
async function writeTempSlotFilesToDisk() {
    if (pendingSlotFiles.length === 0) {
        console.log('No pending slot files to write');
        return;
    }

    if (!isLocalSlotWriterAvailable()) {
        console.log('â„¹ï¸ Skipping temp slot writer (not running on localhost).');
        console.log('Files that would have been written:');
        pendingSlotFiles.forEach(file => {
            console.log(`  - ${file.name}.lua (${file.content.length} chars)`);
        });
        return;
    }

    try {
        const response = await fetch('http://localhost:3456/save-slots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clearFirst: true,  // Clear old files before writing new ones
                slots: pendingSlotFiles
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`âœ… ${result.message}`);
            pendingSlotFiles = [];  // Clear the queue
        } else {
            throw new Error(`Server responded with ${response.status}`);
        }
    } catch (error) {
        console.warn(`âš ï¸ Could not write temp slot files to disk. Make sure temp-slot-writer.js is running.`);
        console.warn(`   Run: node bar-configurator/temp-slot-writer.js`);
        console.warn(`   Error: ${error.message}`);

        // Fallback: log the files that would have been written
        console.log('Files that would have been written:');
        pendingSlotFiles.forEach(file => {
            console.log(`  - ${file.name}.lua (${file.content.length} chars)`);
        });
    }
}

/**
 * Generate dynamic slot commands from checked section checkboxes
 * @param {Object} tweakFileCache - Cached tweak file data (file path -> sections array)
 * @param {Function} packIntoSlots - Slot packing function
 * @param {Function} getSlotSummary - Get summary of slot usage
 * @returns {Promise<Object>} Commands and used slots
 */
async function generateDynamicSlotCommands(tweakFileCache, packIntoSlots, getSlotSummary) {
    console.log("Generating dynamic slot commands...");

    // Use dynamic packing if file cache is available
    if (!tweakFileCache) {
        console.log("Dynamic slot generation not available - file cache not loaded");
        return null;
    }

    const selectedSections = [];

    // Helper function to calculate encoded size
    function calculateEncodedSize(code) {
        try {
            return window.encodeBase64Url(code).length;
        } catch (e) {
            console.error("Error calculating encoded size:", e);
            return code.length * 1.4; // Estimate
        }
    }

    const maxThisUnitOverrides = getMaxThisUnitOverrides();

    const applyEpicMaxOverride = (code, sectionName, numericValue) => {
        const epicUnitMap = {
            RAGNAROK: 'epic_ragnarok',
            CALAMITY: 'epic_calamity',
            STARFALL: 'epic_starfall'
        };
        const unitId = epicUnitMap[sectionName] || 'epic_calamity';
        const valueStr = String(numericValue);
        const valueLine = `maxthisunit=${valueStr},`;

        let replaced = false;
        const updated = code.replace(/maxthisunit\s*=\s*\d+,?/i, match => {
            if (replaced) return match;
            replaced = true;
            return valueLine;
        });
        if (replaced) {
            return updated;
        }

        const insertIntoUnitTable = (input) => {
            const insertAfterLine = (pattern) => {
                if (!pattern.test(input)) return null;
                return input.replace(pattern, (match, line, indent = '') => {
                    return `${line}${indent}${valueLine}\n`;
                });
            };

            const descPattern = /(\bdescription\s*=\s*.*?,\s*\r?\n)([ \t]*)/i;
            const namePattern = /(\bname\s*=\s*.*?,\s*\r?\n)([ \t]*)/i;

            let next = insertAfterLine(descPattern);
            if (next) return next;

            next = insertAfterLine(namePattern);
            if (next) return next;

            const tableStartPattern = new RegExp(`(a\\.${unitId}\\s*=\\s*b\\([^\\{]*\\{\\s*\\r?\\n)([ \\t]*)`, 'i');
            if (tableStartPattern.test(input)) {
                return input.replace(tableStartPattern, (match, start, indent = '  ') => {
                    return `${start}${indent}${valueLine}\n`;
                });
            }

            return null;
        };

        const injected = insertIntoUnitTable(code);
        if (injected) {
            return injected;
        }

        const ensureRegex = new RegExp(`(ensureBuildOptions\\([^\\)]*'${unitId}'\\))`, 'i');
        if (ensureRegex.test(code)) {
            return code.replace(ensureRegex, `$1\n a.${unitId}.maxthisunit=${valueStr}`);
        }

        const endRegex = new RegExp(`(\\nend\\s*\\n--\\s*${sectionName}_END)`, 'i');
        if (endRegex.test(code)) {
            return code.replace(endRegex, `\n a.${unitId}.maxthisunit=${valueStr}$1`);
        }

        return `${code}\n a.${unitId}.maxthisunit=${valueStr}`;
    };

    
    const appendMaxSuffix = (text, limit) => {
        const base = (text || '').replace(/\s*(?:x\d+\s*Max|-?\s*Max\s*\d+)\s*$/i, '').replace(/\s+$/g, '');
        if (!Number.isFinite(limit) || limit <= 0) {
            return base;
        }
        return `${base} x${limit} Max`;
    };

    const updateTextFieldWithMax = (code, fieldName, limit) => {
        if (!code || !fieldName) return code;
        const regex = new RegExp(`(${fieldName}\\s*=\\s*)(\\[\\[(.*?)\\]\\]|(['"\`])((?:[^\\\\]|\\\\.|\\n)*?)\\4)`, 'gis');
        return code.replace(regex, (match, prefix, fullValue, multiContent, quote, quotedContent) => {
            const content = typeof multiContent === 'string' ? multiContent : quotedContent;
            const updated = appendMaxSuffix(content, limit);
            if (typeof multiContent === 'string') {
                return `${prefix}[[${updated}]]`;
            }
            const q = quote || '"';
            return `${prefix}${q}${updated}${q}`;
        });
    };

    const injectAideMaxOverrides = (code, numericValue) => {
        // Only adjust the T3 ground aide (m..'t3aide') and air aide (m..'t3airaide') blocks in-place
        const updateBlock = (input, callPattern) => {
            const replaceRegex = new RegExp(`(${callPattern}[\\s\\S]*?maxthisunit\\s*=\\s*)\\d+`, 'g');
            if (numericValue === null) {
                return input.replace(replaceRegex, (match) => match.replace(/maxthisunit\\s*=\\s*\\d+/i, ''));
            }
            return input.replace(replaceRegex, `$1${numericValue}`);
        };

        // Keep Aide tooltips/descriptions aligned with the applied limit
        const updateAideText = (input, callPattern) => {
            const blockRegex = new RegExp(`(${callPattern}[\\s\\S]*?\\}\\))`, 'i');
            return input.replace(blockRegex, (block) => {
                let updatedBlock = updateTextFieldWithMax(block, 'i18n_en_tooltip', numericValue);
                updatedBlock = updateTextFieldWithMax(updatedBlock, 'description', numericValue);
                return updatedBlock;
            });
        };

        let updated = code;
        updated = updateBlock(updated, "h\\(m\\.\\.\\'decom\\',j,\\s*\\{");      // ground aide
        updated = updateBlock(updated, "h\\('armfify',j,\\s*\\{");            // air aide
        updated = updateAideText(updated, "h\\(m\\.\\.\\'decom\\',j,\\s*\\{"); // ground aide text
        updated = updateAideText(updated, "h\\('armfify',j,\\s*\\{");         // air aide text

        if (numericValue === null) {
            updated = updated
                .replace(/,\\s*,/g, ',')
                .replace(/,\\s*}/g, '}')
                .replace(/(\\r?\\n)\\s*(\\r?\\n)+/g, '$1');
        }

        return updated;
    };

    const applyMaxThisUnitOverride = (sectionObj) => {
        if (!sectionObj || !sectionObj.code || !sectionObj.name) {
            return sectionObj;
        }

        const overrideValue = maxThisUnitOverrides[sectionObj.name];
        if (!Number.isFinite(overrideValue)) {
            return sectionObj;
        }

        const numericValue = Math.max(0, Math.floor(overrideValue));
        const appliedValue = numericValue === 0 ? 9999 : numericValue;
        let updatedCode = sectionObj.code;

        if (sectionObj.name === 'T3_BUILDERS') {
            updatedCode = injectAideMaxOverrides(updatedCode, appliedValue);
        } else if (sectionObj.name === 'UNIT_LAUNCHERS' || sectionObj.name === 'T4_AIR') {
            const pattern = /maxthisunit\s*=\s*\d+,?/gi;
            const hasMaxThisUnit = pattern.test(updatedCode);
            if (!hasMaxThisUnit) {
                return sectionObj;
            }

            const replacement = `maxthisunit=${appliedValue},`;
            updatedCode = updatedCode.replace(pattern, replacement);
        } else if (sectionObj.name === 'RAGNAROK' || sectionObj.name === 'CALAMITY' || sectionObj.name === 'STARFALL') {
            updatedCode = applyEpicMaxOverride(updatedCode, sectionObj.name, appliedValue);
        } else {
            return sectionObj;
        }

        // Append or strip the max info in user-facing descriptions/tooltips (skip complex multi-unit T3 builder section)
        if (sectionObj.name !== 'T3_BUILDERS') {
            updatedCode = updateTextFieldWithMax(updatedCode, 'i18n_en_tooltip', appliedValue);
            updatedCode = updateTextFieldWithMax(updatedCode, 'description', appliedValue);
        }

        if (updatedCode === sectionObj.code) {
            return sectionObj;
        }

        return {
            ...sectionObj,
            code: updatedCode,
            lines: updatedCode.split('\n').length,
            rawChars: updatedCode.length,
            encodedChars: calculateEncodedSize(updatedCode)
        };
    };

    // Separate Main files from other selections (now includes HP multipliers)
    const mainSections = { units: [], defs: [] };  // Arrays to collect multiple sections
    const regularSections = [];
    const hpSections = [];

    // 1. CHECK FOR HP MULTIPLIERS FIRST (priority ordering decides placement)
    const hpGenerators = document.querySelectorAll('[data-is-hp-generator="true"]');
    hpGenerators.forEach(el => {
        const multiplier = el.value;
        if (multiplier && multiplier !== "" && multiplier !== "1") {  // Don't include 1x (no change)
            const type = el.dataset.hpType;

            if (typeof window.generateLuaTweakRaw === 'function') {
                const luaCode = window.generateLuaTweakRaw(type, multiplier);

                const markerMultiplier = formatMultiplierForMarker(multiplier);
                const markerName = `${type.toUpperCase()}_${markerMultiplier}X_START`;
                const markerEnd = markerName.replace('_START', '_END');

                // Pack HP multipliers as synthetic defs (priority handles placement)
                hpSections.push({
                    name: markerName,
                    code: `--${markerName}\n${luaCode}\n--${markerEnd}`,
                    type: 'defs',
                    lines: luaCode.split('\n').length,
                    rawChars: luaCode.length,
                    encodedChars: calculateEncodedSize(luaCode),
                    file: 'generated-hp-multiplier',
                    marker: markerName,
                    isSynthetic: true,
                    isHpMultiplier: true
                });

                console.log(`Added HP multiplier to defs pool: ${type.toUpperCase()} ${multiplier}x`);
            } else {
                console.warn("generateLuaTweakRaw not available - HP multiplier skipped");
            }
        }
    });

    // Check for Raptor Wave Mode selection (radio group)
    const raptorWaveSelected = document.querySelector('input[name="raptor-wave-mode"]:checked');
    const raptorWaveValue = raptorWaveSelected ? raptorWaveSelected.value : 'none';
    const primaryModeSelectEl = document.getElementById('primary-mode-select');
    const isScavengersMode = primaryModeSelectEl && primaryModeSelectEl.value === 'Scavengers';
    if (!isScavengersMode && raptorWaveValue !== 'none') {
        let fileName = '';
        let sectionName = '';

        if (raptorWaveValue === 'mini_bosses') {
            fileName = 'tweaks/Defs_Waves_Mini_Bosses.lua';
            sectionName = 'MINI_BOSSES';
        } else if (raptorWaveValue === 'experimental_wave') {
            fileName = 'tweaks/Defs_Waves_Experimental_Wave_Challenge.lua';
            sectionName = 'EXP_WAVE';
        }

        if (fileName && tweakFileCache[fileName]) {
            const sections = tweakFileCache[fileName];
            sections.forEach(section => {
                if (section.name.includes(sectionName)) {
                    regularSections.push({
                        ...section,
                        file: fileName
                    });
                    console.log(`Added Raptor Wave Mode: ${raptorWaveValue} - ${section.name}`);
                }
            });
        }
    }

    // Also check for Scavenger HP multipliers (pack as regular defs)
    const scavHpGenerators = document.querySelectorAll('[data-is-scav-hp-generator="true"]');
    scavHpGenerators.forEach(el => {
        const multiplier = el.value;
        if (multiplier && multiplier !== "" && multiplier !== "1") {
            const type = el.dataset.hpType;

            if (typeof window.generateLuaTweakRaw === 'function') {
                const luaCode = window.generateLuaTweakRaw(type, multiplier);

                const markerMultiplier = formatMultiplierForMarker(multiplier);
                const markerName = `SCAV_HP_${markerMultiplier}X_START`;
                const markerEnd = markerName.replace('_START', '_END');

                // Pack Scav HP multipliers as synthetic defs (priority handles placement)
                hpSections.push({
                    name: markerName,
                    code: `--${markerName}\n${luaCode}\n--${markerEnd}`,
                    type: 'defs',
                    lines: luaCode.split('\n').length,
                    rawChars: luaCode.length,
                    encodedChars: calculateEncodedSize(luaCode),
                    file: 'generated-scav-hp-multiplier',
                    marker: markerName,
                    isSynthetic: true,
                    isHpMultiplier: true
                });

                console.log(`Added Scav HP multiplier to defs pool: ${type.toUpperCase()} ${multiplier}x`);
            } else {
                console.warn("generateLuaTweakRaw not available - Scav HP multiplier skipped");
            }
        }
    });

    // 2. THEN CHECK MARKER-BASED CHECKBOXES
    const checkedBoxes = document.querySelectorAll('.tweak-checkbox:checked');
    const checkedMarkers = new Set(Array.from(checkedBoxes).map(cb => cb.dataset.marker));
    const hasEvoCommander = ['ARMADA_COMMANDER', 'CORTEX_COMMANDER', 'LEGION_COMMANDER']
        .some(marker => checkedMarkers.has(marker));
    console.log(`Found ${checkedBoxes.length} checked sections`);

    const epicUnitMarkers = ['RAGNAROK', 'CALAMITY', 'STARFALL', 'BASTION', 'SENTINEL', 'FORTRESS'];

    // For each checked section, get section data
    checkedBoxes.forEach(checkbox => {
        const filePath = checkbox.dataset.file;
        const markerName = checkbox.dataset.marker;
        const type = checkbox.dataset.type;

        if (markerName === 'EVO_XP' && !hasEvoCommander) {
            return;
        }

        // Check if this is an epic unit
        if (epicUnitMarkers.some(marker => markerName.includes(marker))) {
            console.log(`Epic unit detected: ${markerName}`);
        }

        // Find section in cache
        if (tweakFileCache[filePath]) {
            const section = tweakFileCache[filePath].find(s => s.name === markerName);
            if (section) {
                let sectionData = {
                    ...section,
                    file: filePath,
                    type: type
                };

                sectionData = applyMaxThisUnitOverride(sectionData);

                // Check if this is a Main file (should go to slot 0)
                if (filePath.includes('Units_Main.lua') || filePath.includes('Defs_Main.lua')) {
                    if (type === 'units') {
                        mainSections.units.push(sectionData);  // Add to array instead of replacing
                    } else if (type === 'defs') {
                        mainSections.defs.push(sectionData);  // Add to array instead of replacing
                    }
                    console.log(`Main section selected: ${markerName} from ${filePath}`);
                } else {
                    regularSections.push(sectionData);
                    console.log(`Selected: ${markerName} from ${filePath}`);
                }
            }
        }
    });

    if (hasEvoCommander) {
        const evoXpAlreadySelected = regularSections.some(section => section.name === 'EVO_XP')
            || mainSections.units.some(section => section.name === 'EVO_XP')
            || mainSections.defs.some(section => section.name === 'EVO_XP');

        if (!evoXpAlreadySelected) {
            let evoSection = null;
            let evoFilePath = null;

            for (const [filePath, sections] of Object.entries(tweakFileCache)) {
                const found = sections.find(section => section.name === 'EVO_XP');
                if (found) {
                    evoSection = found;
                    evoFilePath = filePath;
                    break;
                }
            }

            if (evoSection && evoFilePath) {
                const sectionData = applyMaxThisUnitOverride({
                    ...evoSection,
                    file: evoFilePath,
                    type: evoSection.type
                });
                regularSections.push(sectionData);
                console.log('Auto-enabled EVO_XP for evolving commanders');
            } else {
                console.warn('EVO_XP section not found; skipping auto-enable');
            }
        }
    }

    // Add HP multipliers and regular sections to selectedSections
    selectedSections.push(...hpSections, ...regularSections);

    // Check if we have any selections (Main, HP, or regular)
    if (selectedSections.length === 0 && mainSections.units.length === 0 && mainSections.defs.length === 0) {
        console.warn("No sections selected for slot packing");
        return { commands: [], usedSlots: { tweakdefs: new Set(), tweakunits: new Set() }, slotDetails: [] };
    }

    const commands = [];
    const usedSlots = { tweakdefs: new Set(), tweakunits: new Set() };
    const slotMetadata = [];

    // Clear old temp files before generating new ones
    clearTempSlotFiles();

    // First, handle Main sections (slot 0)
    if (mainSections.units.length > 0) {
        const unitMainMeta = encodeAndValidateSlot('tweakunits', 0, mainSections.units, commands, usedSlots);
        if (unitMainMeta) {
            slotMetadata.push(unitMainMeta);
        }
    }

    if (mainSections.defs.length > 0) {
        const defMainMeta = encodeAndValidateSlot('tweakdefs', 0, mainSections.defs, commands, usedSlots);
        if (defMainMeta) {
            slotMetadata.push(defMainMeta);
        }
    }

    // Then pack regular sections into numbered slots
    let packed = { tweakunits: [], tweakdefs: [] };

    const limits = {
        maxLines: 700,
        maxRaw: 22000,
        maxEncoded: 12000,  // Target ~12k to leave headroom under 13k cap
        bufferPct: 0.9
    };

    if (selectedSections.length > 0) {
        console.log(`Packing ${selectedSections.length} regular sections into numbered slots...`);

        // Load slot distribution schema if available
        let slotDistribution = null;
        try {
            if (typeof window.slotDistributionData !== 'undefined' && window.slotDistributionData) {
                slotDistribution = window.slotDistributionData;
                console.log("Using slot distribution schema from slotDistributionData");
            }
        } catch (e) {
            console.warn("Could not load slot distribution schema:", e);
        }

        // Load dependency table if available
        const dependencyTable = (typeof window.tweakDependencyTable !== 'undefined' && window.tweakDependencyTable)
            ? window.tweakDependencyTable
            : null;
        const dependencyMap = dependencyTable && dependencyTable.deps ? dependencyTable.deps : null;
        const packerDeps = dependencyMap ? { dependencyMap } : null;

        packed = packIntoSlots(selectedSections, limits, slotDistribution, packerDeps);
    } else {
        // No regular sections to pack
        console.log("No regular sections to pack into numbered slots");
    }

    // Sort slots by slot number for sequential display
    packed.tweakunits.sort((a, b) => a.slotNum - b.slotNum);
    packed.tweakdefs.sort((a, b) => a.slotNum - b.slotNum);

    // Generate commands for all packed slots using the helper function
    for (const slot of packed.tweakunits) {
        const unitMeta = encodeAndValidateSlot('tweakunits', slot.slotNum, slot.sections, commands, usedSlots, { slotLabel: slot.label });
        if (unitMeta) {
            slotMetadata.push(unitMeta);
        }
    }

    for (const slot of packed.tweakdefs) {
        const defMeta = encodeAndValidateSlot('tweakdefs', slot.slotNum, slot.sections, commands, usedSlots, { slotLabel: slot.label });
        if (defMeta) {
            slotMetadata.push(defMeta);
        }
    }

    // Write all queued temp slot files to disk
    await writeTempSlotFilesToDisk();

    return { commands, usedSlots, slotDetails: slotMetadata };
}

/**
 * Split commands into sections that fit within size limits
 * @param {Array<string>} commands - Array of commands to split
 * @param {string} lobbyName - Lobby name/rename command
 * @param {number} maxSectionLength - Maximum section length (default: 51000)
 * @returns {Object} Sections of commands and lobby name
 */
function splitCommandsIntoSections(commands, lobbyName, maxSectionLength = 51000) {
    const sectionsData = [];
    const allCommandsToSection = commands;

    for (const cmd of allCommandsToSection) {
        if (!cmd) continue;
        let placed = false;
        for (const section of sectionsData) {
            const neededLength = section.length === 0 ? cmd.length : cmd.length + 1;
            if (section.length + neededLength <= maxSectionLength) {
                section.commands.push(cmd);
                section.length += neededLength;
                placed = true;
                break;
            }
        }
        if (!placed) {
            sectionsData.push({ commands: [cmd], length: cmd.length });
        }
    }

    const anyOptionSelected = commands.length > 0;

    if (anyOptionSelected) {
        if (sectionsData.length === 0) {
            sectionsData.push({ commands: [lobbyName], length: lobbyName.length });
        } else {
            const lastSection = sectionsData[sectionsData.length - 1];
            const neededLength = lastSection.length === 0 ? lobbyName.length : lobbyName.length + 1;

            if (lastSection.length + neededLength <= maxSectionLength) {
                lastSection.commands.push(lobbyName);
                lastSection.length += neededLength;
            } else {
                sectionsData.push({ commands: [lobbyName], length: lobbyName.length });
            }
        }
    }

    const finalSections = sectionsData.map(section => {
        const text = section.commands.join('\n');
        if (!text) return '';
        return text.endsWith('\n') ? text : `${text}\n`;
    });

    return { lobbyName: (anyOptionSelected ? lobbyName : 'No Options Selected'), sections: finalSections };
}

/**
 * Main command generation function
 * Delegates to main.js global functions and dependencies
 */
async function generateCommandsImpl() {
    const presetCommands = [];
    const mapsSelect = document.getElementById('maps-select');
    const modesSelect = document.getElementById('modes-select');

    if (mapsSelect && mapsSelect.value !== "") {
        const selectedMap = gameConfigs.maps[mapsSelect.value];
        if (selectedMap && selectedMap.commands) presetCommands.push(...selectedMap.commands);
    }
    if (modesSelect && modesSelect.value !== "") {
        const selectedMode = gameConfigs.modes[modesSelect.value];
        if (selectedMode && selectedMode.commands) presetCommands.push(...selectedMode.commands);
    }

    // Generate slot-based commands from slot-distribution.json
    const slotResult = await generateSlotBasedCommands() || {
        commands: [],
        usedSlots: { tweakdefs: new Set(), tweakunits: new Set() },
        slotDetails: []
    };
    const slotBasedCommands = slotResult.commands || [];
    const slotDetails = Array.isArray(slotResult.slotDetails) ? slotResult.slotDetails : [];

    const standardCommands = [];
    const customTweaksToProcess = [];
    const tweaksNeedingSlots = [];
    const dynamicTweaksToGenerate = [];
    const formElements = document.querySelectorAll('#options-form-columns input[type="checkbox"], #options-form-columns select, #custom-options-form-columns input[type="checkbox"]');

    // First, collect all dynamic tweaks with checked sub-options or main checkboxes
    const processedTweaks = new Set();
    formElements.forEach(el => {
        // Handle dynamic tweak sub-options
        if (el.dataset.isDynamic && el.dataset.isDynamicSub && el.checked) {
            const tweakId = el.dataset.tweakId;
            console.log("Found checked sub-option:", tweakId, el.dataset.subOptionId);

            // Skip if already processed this tweak
            if (processedTweaks.has(tweakId)) {
                return;
            }
            processedTweaks.add(tweakId);

            const selectedOptions = [];
            // Find all checked sub-options for this tweak
            document.querySelectorAll(`input[data-tweak-id="${tweakId}"][data-is-dynamic-sub="true"]:checked`).forEach(subEl => {
                selectedOptions.push(subEl.dataset.subOptionId);
            });

            if (selectedOptions.length > 0) {
                dynamicTweaksToGenerate.push({ tweakId, selectedOptions });
            }
            return;
        }
        // Handle main checkbox for single sub-option tweaks
        else if (el.dataset.isDynamic && el.dataset.isMainCheckbox && el.checked) {
            const tweakId = el.dataset.tweakId;
            console.log("Found checked main checkbox:", tweakId);

            // Skip if already processed
            if (processedTweaks.has(tweakId)) {
                return;
            }

            // Dynamic tweaks no longer used (replaced by slot packer)
            // Previously would check dynamicTweaksConfig here
            return;
        }
        // Skip other dynamic tweak markers
        else if (el.dataset.isDynamic) {
            return;
        }
        else if (el.dataset.isCustom) {
            if (el.checked) customTweaksToProcess.push(JSON.parse(el.dataset.customData));
        }
        else if (el.dataset.isHpGenerator || el.dataset.isScavHpGenerator) {
            // HP multipliers are now handled by dynamic slot packing
            // Skip them here to avoid duplicate commands
            // They will be included in generateDynamicSlotCommands()
        }
        else {
            let commands = [];
            if (el.tagName === 'SELECT' && !el.id.includes('maps-select') && !el.id.includes('modes-select') && !el.id.includes('primary-mode-select')) {
                if (el.value) commands.push(el.value);
            }
            else if (el.type === 'checkbox' && el.checked) {
                commands = JSON.parse(el.dataset.commandBlocks);
            }
            commands.forEach(cmd => {
                if (cmd) {
                    // Check if command has placeholder slot (tweakdefsX or tweakunitsX)
                    const match = cmd.match(/!bset (tweakdefs|tweakunits)X (.+)/);
                    if (match) {
                        // Extract type and encoded data
                        const slotType = match[1];
                        const encodedData = match[2];
                        tweaksNeedingSlots.push({ type: slotType, data: encodedData });
                    } else {
                        standardCommands.push(cmd.trim());
                    }
                }
            });
        }
    });

    // Initialize used slots from slot-based commands
    const usedTweakDefs = new Set(slotResult.usedSlots.tweakdefs);
    const usedTweakUnits = new Set(slotResult.usedSlots.tweakunits);
    // Match both slot 0 (no number) and numbered slots
    const slotRegex = /!bset\s+(tweakdefs|tweakunits)(\d*)\b/;

    // Also track slots from standard commands
    [...standardCommands].forEach(cmd => {
        const match = cmd.match(slotRegex);
        if (match) {
            const slotNum = match[2] === '' ? 0 : parseInt(match[2], 10);
            if (match[1] === 'tweakdefs') usedTweakDefs.add(slotNum);
            else if (match[1] === 'tweakunits') usedTweakUnits.add(slotNum);
        }
    });

    // Process tweaks that need slot assignment
    // Slot 0 is reserved; assign starting at slot 1
    const autoAssignedCommands = [];
    tweaksNeedingSlots.forEach(tweak => {
        const targetSet = (tweak.type === 'tweakdefs') ? usedTweakDefs : usedTweakUnits;
        const availableSlot = window.findAvailableSlot(targetSet);
        if (availableSlot !== null) {
            autoAssignedCommands.push(`!bset ${tweak.type}${availableSlot} ${tweak.data}`);
            targetSet.add(availableSlot);
        } else {
            console.warn(`All slots for '${tweak.type}' are full. Could not add tweak.`);
        }
    });

    // Process dynamic tweaks (generate on-demand)
    const dynamicCommands = [];
    console.log("Dynamic tweaks to generate:", dynamicTweaksToGenerate);
    for (const dynamicTweak of dynamicTweaksToGenerate) {
        console.log(`Generating tweak: ${dynamicTweak.tweakId} with options:`, dynamicTweak.selectedOptions);
        const result = await generateDynamicTweak(dynamicTweak.tweakId, dynamicTweak.selectedOptions);
        console.log(`Generation result for ${dynamicTweak.tweakId}:`, result);
        if (result && result.base64url) {
            const targetSet = (result.slot_type === 'tweakdefs') ? usedTweakDefs : usedTweakUnits;
            const availableSlot = window.findAvailableSlot(targetSet);
            if (availableSlot !== null) {
                dynamicCommands.push(`!bset ${result.slot_type}${availableSlot} ${result.base64url}`);
                targetSet.add(availableSlot);
                console.log(`Generated dynamic tweak: ${dynamicTweak.tweakId} (${result.selected_count}/${result.total_count} options)`);
            } else {
                console.warn(`All slots for '${result.slot_type}' are full. Could not add dynamic tweak.`);
            }
        }
    }

    // Process custom tweaks
    const customCommands = [];
    customTweaksToProcess.forEach(tweak => {
        if (!tweak || !tweak.tweak || !tweak.type) {
            console.warn('Custom tweak missing required data, skipping entry');
            return;
        }
        const targetSet = (tweak.type === 'tweakdefs') ? usedTweakDefs : usedTweakUnits;
        const availableSlot = window.findAvailableSlot(targetSet);
        if (availableSlot !== null) {
            const payload = annotateCustomPayload(tweak.tweak, availableSlot);
            customCommands.push(`!bset ${tweak.type}${availableSlot} ${payload}`);
            targetSet.add(availableSlot);
        } else {
            console.warn(`All slots for '${tweak.type}' are full. Could not add custom tweak.`);
        }
    });

    const anyOptionSelected = presetCommands.length > 0 || standardCommands.length > 0 || autoAssignedCommands.length > 0 || customCommands.length > 0 || dynamicCommands.length > 0 || slotBasedCommands.length > 0;
    const finalCommands = [];

    // --- CORRECT COMMAND ORDER ---
    // Only add base/scavenger commands if a standard game mode option was chosen.
    const isGameModeTriggered = presetCommands.length > 0 || standardCommands.length > 0 || autoAssignedCommands.length > 0 || dynamicCommands.length > 0 || slotBasedCommands.length > 0;

    if(isGameModeTriggered) {
        const primaryModeSelect = document.getElementById('primary-mode-select');

        // 1. BASE/SCAVENGER MODE COMMANDS (modes.txt content) - FIRST
        if (gameConfigs.base.length > 0) {
            finalCommands.push(...gameConfigs.base);
        }
        if (primaryModeSelect && primaryModeSelect.value === 'Scavengers' && gameConfigs.scavengers.length > 0) {
            finalCommands.push(...gameConfigs.scavengers);
        }

        // 2. MAP AND MODE PRESETS (includes !preset coop which resets everything) - BEFORE multipliers
        finalCommands.push(...presetCommands);

        // 3. GAME MULTIPLIERS AFTER PRESETS (!multiplier_*) - So they don't get reset by !preset coop
        const multiplierCommands = typeof window.getMultiplierCommands === 'function' ? window.getMultiplierCommands() : [];
        finalCommands.push(...multiplierCommands);
    }

    // 4. DYNAMIC SLOT ASSIGNMENTS (marker-based sections + HP multipliers)
    finalCommands.push(...slotBasedCommands);

    // 5. STANDARD COMMANDS
    finalCommands.push(...standardCommands);

    // 6. AUTO-ASSIGNED SLOT COMMANDS
    finalCommands.push(...autoAssignedCommands);

    // 7. DYNAMIC GENERATED TWEAKS
    finalCommands.push(...dynamicCommands);

    // 8. CUSTOM USER TWEAKS
    finalCommands.push(...customCommands);

    const primaryModeSelect = document.getElementById('primary-mode-select');
    const isScavengers = primaryModeSelect && primaryModeSelect.value === 'Scavengers';

    let renameCommand = isScavengers ? `$rename PvE [PMod] NuttyB Scavengers ` : `$rename PvE [PMod] NuttyB Raptors `;
    const renameParts = [];

    if (isScavengers) {
        const scavHpSelect = document.getElementById('scav-hp-select');
        const bossHpSelect = document.getElementById('boss-hp-select');
        const scavHpText = scavHpSelect && scavHpSelect.value ? scavHpSelect.options[scavHpSelect.selectedIndex].text : '';
        const bossHpText = bossHpSelect && bossHpSelect.value ? bossHpSelect.options[bossHpSelect.selectedIndex].text : '';

        const combinedScavHp = [scavHpText, bossHpText].filter(Boolean).join(' ');
        if (combinedScavHp) {
            const formattedHpPart = combinedScavHp.replace(/\./g, '_');
            renameParts.push(`[${formattedHpPart}]`);
        }

    } else {
        let extraRaptorsPart = "", raptorHealthPart = "", queenHealthPart = "", difficultyPart = "";
        document.querySelectorAll('#raptor-only-options select').forEach(el => {
            const o = el.options[el.selectedIndex];
            if (o.value) {
                if ((el.dataset.hpType === 'hp' || el.dataset.hpType === 'qhp') && o.value === "1") {
                    return;
                }
                const g = formOptionsConfig.find(gr => gr.label === el.dataset.optionType);
                if (g) {
                    const c = g.choices.find(ch => ch.value === o.value);
                    if (c && c.shortLabel !== undefined) {
                        if (g.label === "Extras") extraRaptorsPart = c.shortLabel;
                        else if (g.label === "Raptor Health") raptorHealthPart = c.shortLabel;
                        else if (g.label === "Queen Health") queenHealthPart = c.shortLabel;
                        else if (g.label === "Difficulty") difficultyPart = c.shortLabel;
                    }
                }
            }
        });

        if (extraRaptorsPart) renameParts.push(extraRaptorsPart);
        const controlMode = document.getElementById('control-mode-select');
        const isDifficultyMode = !controlMode || controlMode.value !== 'custom';

        let queenCountPart = "";
        if (typeof window !== 'undefined' && typeof window.getMultiplierValues === 'function') {
            const multiplierValues = window.getMultiplierValues() || {};
            const queenCountValue = multiplierValues.raptor_queen_count;
            if (Number.isFinite(queenCountValue) && queenCountValue > 0) {
                queenCountPart = `[Qx${Math.round(queenCountValue)}]`;
            }
        }
        if (difficultyPart && isDifficultyMode) renameParts.push(`[${difficultyPart}]`);
        if (queenCountPart) renameParts.push(queenCountPart);

        if (queenHealthPart) renameParts.push(`[${queenHealthPart}]`);
        if (raptorHealthPart) renameParts.push(`[${raptorHealthPart}]`);
    }

    const noMexCommand = '!unit_restrictions_noextractors 1';
    const allowMexCommand = '!unit_restrictions_noextractors 0';
    const lastNoMexIndex = finalCommands.lastIndexOf(noMexCommand);
    const lastAllowMexIndex = finalCommands.lastIndexOf(allowMexCommand);
    const noMexEnabled = lastNoMexIndex > -1 && lastNoMexIndex > lastAllowMexIndex;

    if (renameParts.length > 0) {
        renameCommand += renameParts.join('');
    }
    if (noMexEnabled) {
        renameCommand += `[No Mex]`;
    }

    // NEW STRUCTURE: Game Settings = Base config, Main Settings = Slot 0, Tweaks Part 1+ = Numbered slots
    const MAX_SECTION_LENGTH = 51000;

    // Separate commands into three categories
    const gameSettingsCommands = [];  // Base configuration, multipliers, etc. (no slot commands)
    const mainSettingsCommands = [];  // Slot 0 commands (!bset tweakunits/tweakdefs without number)
    const selectedTweakCommands = [];  // Numbered slots (!bset tweakunits1+, tweakdefs1+)

    // Three-way separation: game settings vs main settings (slot 0) vs tweaks (numbered slots)
    finalCommands.forEach(cmd => {
        if (cmd) {
            // Check if this is a slot 0 command (no number)
            const isSlot0 = /^!bset (tweakunits|tweakdefs)\s/.test(cmd);
            // Check if this is a numbered slot command (slot 1+)
            const isNumberedSlot = /!bset (tweakunits|tweakdefs)[1-9]/.test(cmd);

            if (isSlot0) {
                // Slot 0 commands go to Main Settings
                mainSettingsCommands.push(cmd);
            } else if (isNumberedSlot) {
                // Numbered slots (1+) go to Tweaks Part 1, 2, 3...
                selectedTweakCommands.push(cmd);
            } else {
                // Everything else goes to game settings
                gameSettingsCommands.push(cmd);
            }
        }
    });

    // Build slot units (clear + payload) so they stay together in sections
    const buildSlotUnits = (commands, includeUnusedClears = false) => {
        const units = [];
        const regex = /^!bset\s+(tweakdefs|tweakunits)(\d*)\s+(.+)/i;
        const resetPayload = '0';
        commands.forEach(c => {
            const m = c.match(regex);
            if (!m) return;
            const slotType = m[1];
            const slotNumStr = m[2];
            const slotNum = slotNumStr === '' ? 0 : parseInt(slotNumStr, 10);
            units.push({
                slotType,
                slotNum,
                commands: [`!bset ${slotType}${slotNumStr} ${resetPayload}`, c]
            });
        });

        if (includeUnusedClears) {
            for (let i = 1; i <= 9; i++) {
                if (!usedTweakDefs.has(i)) {
                    units.push({ slotType: 'tweakdefs', slotNum: i, commands: [`!bset tweakdefs${i} ${resetPayload}`] });
                }
                if (!usedTweakUnits.has(i)) {
                    units.push({ slotType: 'tweakunits', slotNum: i, commands: [`!bset tweakunits${i} ${resetPayload}`] });
                }
            }
        }

        return units;
    };

    const mainSlotUnits = buildSlotUnits(mainSettingsCommands, false);
    const tweakSlotUnits = buildSlotUnits(selectedTweakCommands, true);

    // Also add base/scavenger mode to game settings if not already included
    if (window.gameConfigs && window.gameConfigs.base && window.gameConfigs.base.length > 0) {
        // Add base commands at the beginning if not already there
        window.gameConfigs.base.forEach(baseCmd => {
            if (!gameSettingsCommands.includes(baseCmd)) {
                gameSettingsCommands.unshift(baseCmd);
            }
        });
    }
    if (primaryModeSelect && primaryModeSelect.value === 'Scavengers' &&
        window.gameConfigs && window.gameConfigs.scavengers && window.gameConfigs.scavengers.length > 0) {
        // Add scavenger commands if not already there
        window.gameConfigs.scavengers.forEach(scavCmd => {
            if (!gameSettingsCommands.includes(scavCmd)) {
                gameSettingsCommands.push(scavCmd);
            }
        });
    }

    // Build sections
    const sectionsData = [];

    // 1. Game Settings section: Base settings + Multipliers + lobby name (always shown)
    const gameSettingsSection = { commands: [...gameSettingsCommands], length: gameSettingsCommands.join('\n').length };

    // Add rename command to Game Settings
    if (anyOptionSelected) {
        const neededLength = gameSettingsSection.length === 0 ? renameCommand.length : renameCommand.length + 1;
        if (gameSettingsSection.length + neededLength <= MAX_SECTION_LENGTH) {
            gameSettingsSection.commands.push(renameCommand);
            gameSettingsSection.length += neededLength;
        }
    }

    // Append welcome/configurator message at the end of game settings
    if (gameSettingsSection.length + (gameSettingsSection.length > 0 ? 1 : 0) + WELCOME_MESSAGE_CMD.length <= MAX_SECTION_LENGTH) {
        const spacer = gameSettingsSection.length > 0 ? 1 : 0;
        gameSettingsSection.commands.push(WELCOME_MESSAGE_CMD);
        gameSettingsSection.length += WELCOME_MESSAGE_CMD.length + spacer;
    }

    // Always include the game settings section
    sectionsData.push(gameSettingsSection);

    // 2. Main Settings section: Slot 0 commands (if any)
    if (mainSlotUnits.length > 0) {
        const commands = [];
        let length = 0;
        mainSlotUnits.forEach(unit => {
            const unitText = unit.commands.join('\n');
            const needed = commands.length === 0 ? unitText.length : unitText.length + 1;
            commands.push(unitText);
            length += needed;
        });

        const mainSettingsSection = {
            commands,
            length
        };
        sectionsData.push(mainSettingsSection);
    }

    // 3. Tweaks Part 1+: All numbered slot tweaks (split as needed)
    let currentTweaksSection = null;
    for (const unit of tweakSlotUnits) {
        if (!unit || !unit.commands || unit.commands.length === 0) continue;
        const unitText = unit.commands.join('\n');
        const unitLength = unitText.length;

        if (!currentTweaksSection) {
            currentTweaksSection = { commands: [], length: 0 };
            sectionsData.push(currentTweaksSection);
        }

        const neededLength = currentTweaksSection.length === 0 ? unitLength : unitLength + 1;
        if (currentTweaksSection.length + neededLength > MAX_SECTION_LENGTH) {
            currentTweaksSection = { commands: [unitText], length: unitLength };
            sectionsData.push(currentTweaksSection);
        } else {
            currentTweaksSection.commands.push(unitText);
            currentTweaksSection.length += neededLength;
        }
    }

    // If no options selected but we have a rename command
    if (!anyOptionSelected && sectionsData.length === 0) {
        return { lobbyName: 'No Options Selected', sections: [], slotUsage: { tweakdefs: [], tweakunits: [] } };
    }

    const finalSections = sectionsData.map(section => section.commands.join('\n'));

    // Create slot usage summary
    // Merge slot usage from packing metadata and any auto/dynamic/custom assignment tracking
    const defSlotsSet = new Set(usedTweakDefs);
    const unitSlotsSet = new Set(usedTweakUnits);

    slotDetails.forEach(slot => {
        if (slot && typeof slot.slotNum !== 'undefined') {
            if (slot.slotType === 'tweakdefs') defSlotsSet.add(slot.slotNum);
            if (slot.slotType === 'tweakunits') unitSlotsSet.add(slot.slotNum);
        }
    });

    const sortSlots = (a, b) => {
        if (a === 0) return -1;
        if (b === 0) return 1;
        return a - b;
    };

    const slotUsage = {
        tweakdefs: Array.from(defSlotsSet).sort(sortSlots),
        tweakunits: Array.from(unitSlotsSet).sort(sortSlots)
    };

    const resultPayload = {
        lobbyName: (anyOptionSelected ? renameCommand : 'No Options Selected'),
        sections: finalSections,
        slotUsage: slotUsage,
        slotDetails
    };

    if (typeof window.onSlotSnapshotUpdated === 'function') {
        try {
            window.onSlotSnapshotUpdated({
                slots: slotDetails,
                slotUsage,
                context: {
                    lobbyName: resultPayload.lobbyName,
                    mode: primaryModeSelect ? primaryModeSelect.value : 'Unknown',
                    timestamp: new Date().toISOString()
                }
            });
        } catch (callbackError) {
            console.warn('Slot snapshot callback failed:', callbackError);
        }
    }

    return resultPayload;
}

// Export functions - for browser use
window.generateCommandsImpl = generateCommandsImpl;
window.generateDynamicSlotCommandsImpl = generateDynamicSlotCommands;
window.splitCommandsIntoSectionsImpl = splitCommandsIntoSections;

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateCommands: generateCommandsImpl, generateDynamicSlotCommands, splitCommandsIntoSections };
}
