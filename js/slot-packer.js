// slot-packer.js
// Packs selected sections into slots using First-Fit-Decreasing algorithm

// ============================================================================
// DYNAMIC SLOT NAMING SYSTEM
// ============================================================================

const slotLabelHelperForPacker = (function () {
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

const mapSectionNameForPacker = slotLabelHelperForPacker && typeof slotLabelHelperForPacker.mapSectionName === 'function'
    ? slotLabelHelperForPacker.mapSectionName
    : (name) => {
        if (!name) return null;
        if (name.includes('HP_MULTIPLIER')) {
            return 'NUTTY_TWEAKS';
        }
        return name;
    };

// Allow a small tolerance when using minified size estimates to avoid rejecting
// sections that will fit after final slot minification.
const MINIFIED_SIZE_TOLERANCE = 1.01; // ~1% headroom to reduce overflow risk

const COMMANDER_SECTION_IDS = new Set([
    'ARMADA_COMMANDER',
    'CORTEX_COMMANDER',
    'LEGION_COMMANDER'
]);

function isCommanderSection(section) {
    return !!(section && COMMANDER_SECTION_IDS.has(section.name));
}

function slotHasCommander(slot) {
    return Array.isArray(slot?.sections) && slot.sections.some(isCommanderSection);
}

function bundleHasCommander(bundle) {
    return Array.isArray(bundle?.sections) && bundle.sections.some(isCommanderSection);
}

const priorityHelperForPacker = (function () {
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

const getPriorityMetaForPacker = priorityHelperForPacker && typeof priorityHelperForPacker.getPriorityMeta === 'function'
    ? priorityHelperForPacker.getPriorityMeta
    : (section, type) => ({ priorityRank: 99, tierRank: 99 });

const getDefaultPriorityForPacker = priorityHelperForPacker && typeof priorityHelperForPacker.getDefaultPriority === 'function'
    ? priorityHelperForPacker.getDefaultPriority
    : (type) => 99;

const getDefaultTierForPacker = priorityHelperForPacker && typeof priorityHelperForPacker.getDefaultTierRank === 'function'
    ? priorityHelperForPacker.getDefaultTierRank
    : () => 99;

function assignPriorityMetadata(sections, dependencyMap, type) {
    const sectionByName = new Map();

    sections.forEach(section => {
        if (section && section.name) {
            sectionByName.set(section.name, section);
        }
    });

    sections.forEach(section => {
        const meta = getPriorityMetaForPacker(section, type) || {};
        const basePriority = typeof meta.priorityRank === 'number'
            ? meta.priorityRank
            : getDefaultPriorityForPacker(type);
        const tierRank = typeof meta.tierRank === 'number'
            ? meta.tierRank
            : getDefaultTierForPacker();

        section.basePriorityRank = basePriority;
        section.tierRank = tierRank;
    });

    const memo = {};
    const visiting = new Set();
    const resolvePriority = (name) => {
        if (memo[name] !== undefined) {
            return memo[name];
        }

        const section = sectionByName.get(name);
        const basePriority = section && typeof section.basePriorityRank === 'number'
            ? section.basePriorityRank
            : getDefaultPriorityForPacker(type);

        if (visiting.has(name)) {
            return basePriority;
        }

        visiting.add(name);
        let effectivePriority = basePriority;

        const deps = dependencyMap && Array.isArray(dependencyMap[name]) ? dependencyMap[name] : [];
        deps.forEach(dep => {
            if (!sectionByName.has(dep)) {
                return;
            }
            effectivePriority = Math.max(effectivePriority, resolvePriority(dep));
        });

        visiting.delete(name);
        memo[name] = effectivePriority;
        return effectivePriority;
    };

    sections.forEach(section => {
        if (!section || !section.name) {
            return;
        }
        section.priorityRank = resolvePriority(section.name);
    });
}

function getSectionMinifiedEstimate(section) {
    if (!section) return 0;
    if (typeof section.minifiedEncodedEstimate === 'number') {
        return section.minifiedEncodedEstimate;
    }
    const estimate = estimateMinifiedEncoded(section.code || '');
    section.minifiedEncodedEstimate = estimate;
    return estimate;
}

function formatSizeInfo(lines, raw, enc, minEnc, limits) {
    const parts = [];
    if (typeof lines === 'number') parts.push(`lines ${lines}/${limits.maxLines}`);
    if (typeof raw === 'number') parts.push(`raw ${raw}/${limits.maxRaw}`);
    if (typeof enc === 'number') parts.push(`enc ${enc}/${limits.maxEncoded}`);
    if (typeof minEnc === 'number') parts.push(`minEnc ${minEnc}/${Math.round(limits.maxEncoded * MINIFIED_SIZE_TOLERANCE)}`);
    return parts.join(', ');
}
/**
 * Get display label for a slot based on sections it contains
 * @param {Array} sections - Array of section objects with name property
 * @returns {string} Label for slot - concatenated section names
 */
function getSlotLabel(sections) {
    if (!sections || sections.length === 0) {
        return 'EMPTY';
    }

    // Collect all unique section names directly (no label mapping)
    const sectionNames = new Set();

    for (const section of sections) {
        sectionNames.add(section.name);
    }

    // Convert Set to array and sort for consistency
    const uniqueNames = Array.from(sectionNames).sort();

    const mappedNames = uniqueNames
        .map(mapSectionNameForPacker)
        .filter(Boolean);
    const uniqueLabels = Array.from(new Set(mappedNames));

    if (uniqueLabels.length === 1) {
        return uniqueLabels[0];
    }

    // Multiple sections - concatenate them with underscores
    const concatenated = uniqueLabels.join('_');

    // If too long (>50 chars), use abbreviated form
    if (concatenated.length > 50) {
        return uniqueLabels.map(name => name.substring(0, 4)).join('_');
    }

    return concatenated;
}

/**
 * Pack sections into slots with triple-limit enforcement and dependency awareness
 * FULLY DYNAMIC: No hardcoded slot assignments, incremental allocation only
 * @param {Array} selectedSections - Array of section metadata objects
 * @param {Object} limits - Limit configuration
 * @param {Object} slotDistribution - IGNORED - kept for compatibility
 * @param {Object} allTweaks - Optional: tweaks metadata for dependency resolution
 * @returns {Object} Packed slots { tweakunits: [...], tweakdefs: [...] }
 */
function packIntoSlots(selectedSections, limits, slotDistribution, allTweaks) {
    const MAX_ENCODED_SIZE = 13000; // Hard cap for encoded slot size

    const defaultLimits = {
        maxLines: 700,
        maxRaw: 22000,
        maxEncoded: 12000, // target under 13k to leave buffer for final encoding
        bufferPct: 0.9 // Target 90% utilization of the 12k target
    };

    const config = { ...defaultLimits, ...limits };

    // Calculate target values (85% of max)
    const targets = {
        lines: Math.floor(config.maxLines * config.bufferPct),
        raw: Math.floor(config.maxRaw * config.bufferPct),
        encoded: Math.floor(config.maxEncoded * config.bufferPct)
    };

    // Separate sections by type (Main sections handled separately in command-builder.js)
    const unitSections = selectedSections.filter(s => s.type === 'units');
    const defSections = selectedSections.filter(s => s.type === 'defs');

    // Pack each type with DYNAMIC incremental allocation and dependency awareness
    const result = {
        tweakunits: packSectionsDynamically(unitSections, config, targets, 'units', allTweaks),
        tweakdefs: packSectionsDynamically(defSections, config, targets, 'defs', allTweaks)
    };

    return result;
}

/**
 * Pack sections dynamically using FFD with dependency-aware slot allocation
 * @param {Array} sections - Sections to pack
 * @param {Object} config - Limit configuration
 * @param {Object} targets - Target utilization values
 * @param {string} type - 'units' or 'defs'
 * @param {Object} allTweaks - Optional: all tweaks object for dependency lookup
 * @returns {Array} Array of slot objects with incremental slot numbers
 */
function packSectionsDynamically(sections, config, targets, type, allTweaks) {
    if (sections.length === 0) return [];

    // Build dependency data (deps map + levels + topo ordering)
    const { dependencyMap, sectionLevels, orderedSections } = buildDependencyData(sections, allTweaks);
    assignPriorityMetadata(sections, dependencyMap, type);
    // Independent sections: build bundles per section for maximum packing flexibility
    const bundles = buildFileBundles(sections, sectionLevels, orderedSections, true);

    const slots = [];
    const state = {
        currentSlot: createEmptySlot(),
        currentSlotNumber: 1, // Start from slot 1 (slot 0 reserved for Main)
        slots,
        slotAssignments: {}, // Track which slot each section is assigned to (for dependency validation)
        dependencyMap,
        config,
        type,
        limitHit: false
    };

    for (const bundle of bundles) {
        const forceArmadaCommander = bundle.sections.length === 1 && bundle.sections[0].name === 'ARMADA_COMMANDER';
        const isCommanderBundle = bundleHasCommander(bundle);

        if (isCommanderBundle) {
            if (state.currentSlot.sections.length > 0) {
                finalizeSlot(slots, state.currentSlot, state.currentSlotNumber++);
                if (state.currentSlotNumber > 9) {
                    console.warn(`Warning: Exceeded maximum 9 slots for ${type}. Some sections may not be included.`);
                    break;
                }
                state.currentSlot = createEmptySlot();
            }

            if (state.currentSlotNumber > 9) {
                break;
            }

            let placedCommander = tryPlaceBundleInSlot(state.currentSlot, bundle, state.currentSlotNumber, config, dependencyMap, state.slotAssignments);
            if (!placedCommander && forceArmadaCommander) {
                const sizeInfo = formatSizeInfo(bundle.lines, bundle.rawChars, bundle.encodedChars, bundle.minifiedEncodedChars, config);
                console.warn(`Force-packing ARMADA_COMMANDER into its own slot despite size overage (${sizeInfo}).`);
                placedCommander = tryPlaceBundleInSlot(state.currentSlot, bundle, state.currentSlotNumber, config, dependencyMap, state.slotAssignments, true);
            }

            if (placedCommander) {
                finalizeSlot(slots, state.currentSlot, state.currentSlotNumber++);
                if (state.currentSlotNumber > 9) {
                    console.warn(`Warning: Exceeded maximum 9 slots for ${type}. Some sections may not be included.`);
                    break;
                }
                state.currentSlot = createEmptySlot();
                continue;
            }

            const sizeInfo = formatSizeInfo(bundle.lines, bundle.rawChars, bundle.encodedChars, bundle.minifiedEncodedChars, config);
            console.warn(`Commander bundle ${bundle.file} could not be packed (${sizeInfo}).`);
            continue;
        }

        // Try current slot first
        if (tryPlaceBundleInSlot(state.currentSlot, bundle, state.currentSlotNumber, config, dependencyMap, state.slotAssignments)) {
            continue;
        }

        // Finalize current slot if it had content, then open a fresh slot
        if (state.currentSlot.sections.length > 0) {
            finalizeSlot(slots, state.currentSlot, state.currentSlotNumber++);
            if (state.currentSlotNumber > 9) {
                console.warn(`Warning: Exceeded maximum 9 slots for ${type}. Some sections may not be included.`);
                break;
            }
            state.currentSlot = createEmptySlot();
        }

        if (state.currentSlotNumber > 9) {
            break;
        }

        // Try to fit the bundle in the fresh slot
        let placedFresh = tryPlaceBundleInSlot(state.currentSlot, bundle, state.currentSlotNumber, config, dependencyMap, state.slotAssignments);

        // Armada commander is allowed to ignore the encoded limit and force a dedicated slot
        if (!placedFresh && forceArmadaCommander) {
            const sizeInfo = formatSizeInfo(bundle.lines, bundle.rawChars, bundle.encodedChars, bundle.minifiedEncodedChars, config);
            console.warn(`Force-packing ARMADA_COMMANDER into its own slot despite size overage (${sizeInfo}).`);
            placedFresh = tryPlaceBundleInSlot(state.currentSlot, bundle, state.currentSlotNumber, config, dependencyMap, state.slotAssignments, true);
        }

        if (placedFresh) {
            continue;
        }

        // Last-resort fallback: the bundle itself is too large, so split its sections
        console.warn(`Bundle ${bundle.file} exceeds slot limits; splitting sections as fallback. (${formatSizeInfo(bundle.lines, bundle.rawChars, bundle.encodedChars, bundle.minifiedEncodedChars, config)})`);

        for (const section of bundle.sections) {
            const sectionMinEnc = getSectionMinifiedEstimate(section);
            const placed = placeSectionWithSlotRoll(section, sectionMinEnc, state);
            if (state.limitHit) {
                break;
            }
            if (!placed) {
                console.warn(`Section ${section.name} from ${bundle.file} could not be packed (${formatSizeInfo(section.lines, section.rawChars, section.encodedChars, sectionMinEnc, config)})`);
            }
        }

        if (state.currentSlotNumber > 9 || state.limitHit) {
            break;
        }
    }

    finalizeRemainingSlot(state);
    labelSlots(slots);
    // Skip compaction to preserve priority ordering across slots.
    logSlotAllocation(slots, config, type);
    validateDependencyConstraints(slots, state.slotAssignments, dependencyMap);

    return slots;
}

/**
 * Bundle sections by their source file while preserving ordering and dependency levels
 * @param {Array} sections - Sections to bundle
 * @param {Object} sectionLevels - Map of section name -> dependency level
 * @param {Array} orderedNames - Topologically ordered section names
 * @param {boolean} [splitIntoSections=false] - If true, create bundles per section (no file grouping)
 * @returns {Array} Bundles keyed by file (or per-section), sorted by priority and dependency order
 */
function buildFileBundles(sections, sectionLevels = {}, orderedNames = [], splitIntoSections = false) {
    const bundleMap = {};
    const bundles = [];
    const orderIndex = {};

    orderedNames.forEach((name, idx) => {
        if (orderIndex[name] === undefined) {
            orderIndex[name] = idx;
        }
    });

    const addBundle = (bundleKey, section) => {
        if (!bundleMap[bundleKey]) {
            bundleMap[bundleKey] = {
                file: bundleKey,
                type: section.type,
                sections: [],
                lines: 0,
                rawChars: 0,
                encodedChars: 0,
                minifiedEncodedChars: 0,
                level: Infinity,
                firstOrderIndex: Infinity,
                priorityRank: Number.NEGATIVE_INFINITY,
                tierRank: Number.POSITIVE_INFINITY
            };
            bundles.push(bundleMap[bundleKey]);
        }

        const bundle = bundleMap[bundleKey];
        bundle.sections.push(section);
        bundle.lines += section.lines;
        bundle.rawChars += section.rawChars;
        bundle.encodedChars += section.encodedChars;
        bundle.minifiedEncodedChars += getSectionMinifiedEstimate(section);

        const lvl = sectionLevels[section.name];
        if (typeof lvl === 'number' && lvl < bundle.level) {
            bundle.level = lvl;
        }

        const idx = orderIndex[section.name];
        if (typeof idx === 'number' && idx < bundle.firstOrderIndex) {
            bundle.firstOrderIndex = idx;
        }

        const fallbackPriority = getDefaultPriorityForPacker(section.type);
        const priority = typeof section.priorityRank === 'number'
            ? section.priorityRank
            : (typeof section.basePriorityRank === 'number' ? section.basePriorityRank : fallbackPriority);
        bundle.priorityRank = Math.max(bundle.priorityRank, priority);

        const tierRank = typeof section.tierRank === 'number' ? section.tierRank : 99;
        if (tierRank < bundle.tierRank) {
            bundle.tierRank = tierRank;
        }
    };

    sections.forEach(section => {
        const fileKey = section.file || '__NO_FILE__';
        const key = splitIntoSections ? `${fileKey}::${section.name}` : fileKey;
        addBundle(key, section);
    });

    bundles.forEach(bundle => {
        bundle.sections.sort((a, b) => {
            // Force EPICS_BUILDOPTIONS to the end of its bundle to keep epics ahead of the helper
            if (a.name === 'EPICS_BUILDOPTIONS' && b.name !== 'EPICS_BUILDOPTIONS') return 1;
            if (b.name === 'EPICS_BUILDOPTIONS' && a.name !== 'EPICS_BUILDOPTIONS') return -1;

            const aLine = typeof a.startLine === 'number' ? a.startLine : 0;
            const bLine = typeof b.startLine === 'number' ? b.startLine : 0;
            return aLine - bLine;
        });

        bundle.level = bundle.level === Infinity ? 0 : bundle.level;
        if (bundle.firstOrderIndex === Infinity) {
            bundle.firstOrderIndex = bundles.length; // stable fallback
        }
        if (!Number.isFinite(bundle.priorityRank)) {
            bundle.priorityRank = getDefaultPriorityForPacker(bundle.type);
        }
        if (!Number.isFinite(bundle.tierRank)) {
            bundle.tierRank = 99;
        }
    });

    bundles.sort((a, b) => {
        if (a.priorityRank !== b.priorityRank) {
            return a.priorityRank - b.priorityRank;
        }
        if (a.tierRank !== b.tierRank) {
            return a.tierRank - b.tierRank;
        }
        if (a.level !== b.level) {
            return a.level - b.level;
        }
        return a.firstOrderIndex - b.firstOrderIndex;
    });

    return bundles;
}

/**
 * Try to place an entire bundle into a slot (size + dependency aware)
 * @param {Object} slot - Slot object
 * @param {Object} bundle - Bundle to place
 * @param {number} slotNumber - Slot number being filled
 * @param {Object} config - Limit configuration
 * @param {Object} dependencyMap - Dependency map
 * @param {Object} slotAssignments - Current slot assignments
 * @param {boolean} allowSizeOverride - Skip size check (for forced bundles)
 * @returns {boolean} True if placed
 */
function tryPlaceBundleInSlot(slot, bundle, slotNumber, config, dependencyMap, slotAssignments, allowSizeOverride = false) {
    const fitsLimits = allowSizeOverride || canBundleFitInSlot(slot, bundle, config);
    if (!fitsLimits) return false;
    if (!canBundleRespectDependencies(slotNumber, bundle, slotAssignments, dependencyMap)) return false;
    addBundleToSlot(slot, bundle);
    bundle.sections.forEach(section => {
        slotAssignments[section.name] = slotNumber;
    });
    return true;
}

/**
 * Finalize a slot by assigning its number and storing it
 * @param {Array} slots - Slots collection
 * @param {Object} slot - Slot object
 * @param {number} slotNumber - Slot number to assign
 */
function finalizeSlot(slots, slot, slotNumber) {
    slot.slotNum = slotNumber;
    slots.push(slot);
}

/**
 * Finalize the current slot if it has content and is within the slot cap
 * @param {Object} state - Packing state
 */
function finalizeRemainingSlot(state) {
    if (state.currentSlot.sections.length > 0 && state.currentSlotNumber <= 9) {
        finalizeSlot(state.slots, state.currentSlot, state.currentSlotNumber);
    }
}

/**
 * Try to place a single section, rolling to a new slot if needed
 * @param {Object} section - Section metadata
 * @param {number} sectionMinEnc - Cached minified encoded size
 * @param {Object} state - Packing state (currentSlot, currentSlotNumber, slots, config, dependencyMap, slotAssignments, type, limitHit)
 * @returns {boolean} True if placed
 */
function placeSectionWithSlotRoll(section, sectionMinEnc, state) {
    const { config, dependencyMap, slotAssignments, type } = state;
    const tryPlace = () => canFitInSlot(state.currentSlot, section, config) &&
        canRespectDependencies(state.currentSlot, section, slotAssignments, dependencyMap);

    if (tryPlace()) {
        addToSlot(state.currentSlot, section);
        slotAssignments[section.name] = state.currentSlotNumber;
        return true;
    }

    if (state.currentSlot.sections.length > 0) {
        finalizeSlot(state.slots, state.currentSlot, state.currentSlotNumber++);
        if (state.currentSlotNumber > 9) {
            console.warn(`Warning: Exceeded maximum 9 slots for ${type}. Some sections may not be included.`);
            state.limitHit = true;
            return false;
        }
        state.currentSlot = createEmptySlot();
    }

    if (state.currentSlotNumber > 9) {
        state.limitHit = true;
        return false;
    }

    if (tryPlace()) {
        addToSlot(state.currentSlot, section);
        slotAssignments[section.name] = state.currentSlotNumber;
        return true;
    }

    return false;
}

/**
 * Build dependency map + levels + topo order in one pass (leaner than separate steps)
 * @param {Array} sections - Sections being packed
 * @param {Object} allTweaks - Tweaks metadata
 * @returns {Object} { dependencyMap, sectionLevels, orderedSections }
 */
function buildDependencyData(sections, allTweaks) {
    const dependencyMap = buildDependencyMap(allTweaks);
    const { levels: sectionLevels, orderedSections } = computeTopologicalLevels(sections, dependencyMap);
    return { dependencyMap, sectionLevels, orderedSections };
}

/**
 * Topological ordering with level calculation (Kahn) to avoid recursive walkers
 * @param {Array} sections - Sections being packed
 * @param {Object} dependencyMap - Map of dependencies
 * @returns {Object} { levels, orderedSections }
 */
function computeTopologicalLevels(sections, dependencyMap) {
    const levels = {};
    const indegree = {};
    const graph = {};
    const sectionNames = new Set(sections.map(s => s.name));

    // Initialize nodes from sections
    sectionNames.forEach(name => {
        indegree[name] = indegree[name] || 0;
        graph[name] = graph[name] || [];
    });

    // Build graph edges dep -> section
    for (const [name, deps] of Object.entries(dependencyMap)) {
        if (!graph[name]) {
            graph[name] = [];
        }
        deps.forEach(dep => {
            if (!graph[dep]) {
                graph[dep] = [];
            }
            indegree[name] = (indegree[name] || 0) + 1;
            graph[dep].push(name);
            if (indegree[dep] === undefined) {
                indegree[dep] = 0;
            }
        });
    }

    // Queue nodes with indegree 0
    const queue = Object.keys(graph).filter(node => indegree[node] === 0).sort();
    queue.forEach(node => {
        levels[node] = 0;
    });

    const ordered = [];

    while (queue.length) {
        const node = queue.shift();
        ordered.push(node);
        const neighbors = graph[node] || [];
        neighbors.forEach(n => {
            indegree[n] -= 1;
            const candidateLevel = (levels[node] || 0) + 1;
            if (candidateLevel > (levels[n] || 0)) {
                levels[n] = candidateLevel;
            }
            if (indegree[n] === 0) {
                queue.push(n);
            }
        });
    }

    // Handle cycles by logging and assigning level 0
    Object.entries(indegree).forEach(([node, deg]) => {
        if (deg > 0) {
            console.warn(`Circular dependency detected involving ${node}`);
            if (levels[node] === undefined) {
                levels[node] = 0;
            }
            ordered.push(node);
        }
    });

    // Filter ordered names to the sections we actually pack
    const orderedSections = ordered.filter(name => sectionNames.has(name));

    // Ensure every section has a level
    sectionNames.forEach(name => {
        if (levels[name] === undefined) {
            levels[name] = 0;
        }
    });

    return { levels, orderedSections };
}

/**
 * Estimate base64url encoded length after light minification (mirrors command-builder fallback)
 * @param {string} code - Lua code to estimate
 * @returns {number} Estimated encoded length
 */
function estimateMinifiedEncoded(code) {
    if (!code) return 0;

    let minified = code;

    if (typeof window !== 'undefined' &&
        window.LuaMinifier &&
        typeof window.LuaMinifier.minify === 'function') {
        try {
            minified = window.LuaMinifier.minify(code);
        } catch (e) {
            // fall through to manual compression
        }
    }

    minified = minified
        .replace(/--(?!\s*[A-Z_][A-Z0-9_]*(?:_START|_END)?)[^\n\r]*/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}(),=;])\s*/g, '$1')
        .trim();

    try {
        if (typeof window !== 'undefined' && typeof window.encodeBase64Url === 'function') {
            return window.encodeBase64Url(minified, true).length;
        }
    } catch (e) {
        // ignore and fallback
    }

    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(minified).toString('base64').replace(/=+$/, '').length;
        }
    } catch (e) {
        // ignore and fallback
    }

    return Math.ceil(minified.length * 4 / 3);
}

/**
 * Check if an entire bundle can fit into a slot
 * @param {Object} slot - Slot object
 * @param {Object} bundle - Bundle with aggregated metrics
 * @param {Object} limits - Limit configuration
 * @returns {boolean} True if bundle fits
 */
function canBundleFitInSlot(slot, bundle, limits) {
    const slotContainsCommander = slotHasCommander(slot);
    const bundleContainsCommander = bundleHasCommander(bundle);

    if (slotContainsCommander) {
        return false; // Commander slots cannot accept additional sections
    }

    if (bundleContainsCommander && slot.sections.length > 0) {
        return false; // Commanders must occupy a dedicated slot
    }

    const newLines = slot.lines + bundle.lines;
    const newRaw = slot.rawChars + bundle.rawChars;
    const newEncoded = slot.encodedChars + bundle.encodedChars;
    const newMinifiedEncoded = slot.minifiedEncodedChars + (bundle.minifiedEncodedChars || bundle.encodedChars);

    if (newLines > limits.maxLines || newRaw > limits.maxRaw) {
        return false;
    }

    if (newEncoded <= limits.maxEncoded) {
        return true;
    }

    return newMinifiedEncoded <= limits.maxEncoded * MINIFIED_SIZE_TOLERANCE;
}

/**
 * Add an entire bundle to a slot (aggregated to reduce per-section math)
 * @param {Object} slot - Slot object
 * @param {Object} bundle - Bundle to add
 */
function addBundleToSlot(slot, bundle) {
    bundle.sections.forEach(section => {
        slot.sections.push(section);
    });
    slot.lines += bundle.lines;
    slot.rawChars += bundle.rawChars;
    slot.encodedChars += bundle.encodedChars;
    slot.minifiedEncodedChars += bundle.minifiedEncodedChars || bundle.encodedChars;
}

/**
 * Check dependencies for a full bundle against existing slot assignments
 * @param {number} targetSlotNumber - Slot number we plan to place the bundle in
 * @param {Object} bundle - Bundle to validate
 * @param {Object} slotAssignments - Map of section name -> slot number
 * @param {Object} dependencyMap - Map of dependencies
 * @returns {boolean} True if dependencies are satisfied
 */
function canBundleRespectDependencies(targetSlotNumber, bundle, slotAssignments, dependencyMap) {
    for (const section of bundle.sections) {
        const deps = dependencyMap[section.name] || [];
        for (const dep of deps) {
            const depSlot = slotAssignments[dep];
            if (depSlot !== undefined && depSlot > targetSlotNumber) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Build a map of section name -> dependencies from tweak metadata
 * @param {Object} allTweaks - Tweaks configuration object
 * @returns {Object} Map of { sectionName: [dependencies] }
 */
function buildDependencyMap(allTweaks) {
    const depMap = {};

    if (allTweaks && allTweaks.dependencyMap && typeof allTweaks.dependencyMap === 'object') {
        return allTweaks.dependencyMap;
    }

    if (allTweaks && allTweaks.deps && typeof allTweaks.deps === 'object') {
        return allTweaks.deps;
    }

    if (!allTweaks || !allTweaks.dynamic_tweaks) {
        return depMap;
    }

    const addDependencies = (sectionName, deps) => {
        if (!sectionName || !Array.isArray(deps) || deps.length === 0) {
            return;
        }
        depMap[sectionName] = Array.from(new Set(deps));
    };

    const markerToSectionName = (markers) => {
        if (!markers || typeof markers.start !== 'string') return null;
        const m = markers.start.match(/--\s*(\w+)_START/);
        return m && m[1] ? m[1] : null;
    };

    for (const [name, tweak] of Object.entries(allTweaks.dynamic_tweaks)) {
        if (!tweak) continue;

        const deps = Array.isArray(tweak.dependencies) ? [...tweak.dependencies] : [];

        // Ensure builders sit immediately after main defs by default
        if (name === 'T3_BUILDERS' && !deps.includes('MAIN_DEFS')) {
            deps.unshift('MAIN_DEFS');
        }

        addDependencies(name, deps);

        const options = Array.isArray(tweak.options) ? tweak.options : [];
        const dropdownOptions = Array.isArray(tweak.dropdown_options) ? tweak.dropdown_options : [];
        const allOptions = options.concat(dropdownOptions);

        allOptions.forEach(option => {
            const sectionName = markerToSectionName(option?.markers);
            if (sectionName) {
                addDependencies(sectionName, deps);
            }
        });
    }

    return depMap;
}

/**
 * Check if adding section to slot respects dependency constraints
 * Dependencies must be in same or earlier slot than the dependent
 * @param {Object} slot - Current slot
 * @param {Object} section - Section to add
 * @param {Object} slotAssignments - Map of section name -> slot number
 * @param {Object} dependencyMap - Map of dependencies
 * @returns {boolean} True if dependencies are respected
 */
function canRespectDependencies(slot, section, slotAssignments, dependencyMap) {
    const deps = dependencyMap[section.name] || [];
    const currentSlotNum = Math.max(...slot.sections.map(s => slotAssignments[s.name] || 0), 0) + 1;

    for (const dep of deps) {
        const depSlot = slotAssignments[dep];
        if (depSlot !== undefined && depSlot > currentSlotNum) {
            // Dependency is in a later slot - violation!
            return false;
        }
    }

    return true;
}

/**
 * Validate all dependency constraints were satisfied
 * @param {Array} slots - Packed slots
 * @param {Object} slotAssignments - Map of section name -> slot number
 * @param {Object} dependencyMap - Map of dependencies
 */
function validateDependencyConstraints(slots, slotAssignments, dependencyMap) {
    let violations = 0;

    for (const [section, deps] of Object.entries(dependencyMap)) {
        const sectionSlot = slotAssignments[section];
        if (!sectionSlot) continue; // Section not included

        for (const dep of deps) {
            const depSlot = slotAssignments[dep];
            if (!depSlot) {
                console.warn(`Dependency warning: ${section} depends on ${dep}, but ${dep} is not included`);
                violations++;
            } else if (depSlot > sectionSlot) {
                console.error(`Dependency violation: ${section} (slot ${sectionSlot}) depends on ${dep} (slot ${depSlot})`);
                violations++;
            }
        }
    }

    if (violations > 0) {
        console.warn(`Total dependency violations: ${violations}`);
    }
}

// NOTE: Old slot determination functions removed - using pure incremental allocation now

/**
 * Create empty slot object
 * @returns {Object} Empty slot
 */
function createEmptySlot() {
    return {
        slotNum: 0,
        sections: [],
        lines: 0,
        rawChars: 0,
        encodedChars: 0,
        minifiedEncodedChars: 0,
        label: 'EMPTY'  // Will be calculated when slot is finalized
    };
}

/**
 * Check if section can fit in slot
 * @param {Object} slot - Slot object
 * @param {Object} section - Section metadata
 * @param {Object} limits - Limit configuration
 * @returns {boolean} True if fits
 */
function canFitInSlot(slot, section, limits) {
    const slotContainsCommander = slotHasCommander(slot);
    const sectionIsCommander = isCommanderSection(section);

    if (slotContainsCommander) {
        return false; // Do not mix anything into a commander slot
    }

    if (sectionIsCommander && slot.sections.length > 0) {
        return false; // Commanders must be alone
    }

    const newLines = slot.lines + section.lines;
    const newRaw = slot.rawChars + section.rawChars;
    const newEncoded = slot.encodedChars + section.encodedChars;
    const newMinifiedEncoded = slot.minifiedEncodedChars + getSectionMinifiedEstimate(section);

    if (newLines > limits.maxLines || newRaw > limits.maxRaw) {
        return false;
    }

    if (newEncoded <= limits.maxEncoded) {
        return true;
    }

    return newMinifiedEncoded <= limits.maxEncoded * MINIFIED_SIZE_TOLERANCE;
}

/**
 * Add section to slot
 * @param {Object} slot - Slot object
 * @param {Object} section - Section metadata
 */
function addToSlot(slot, section) {
    slot.sections.push(section);
    slot.lines += section.lines;
    slot.rawChars += section.rawChars;
    slot.encodedChars += section.encodedChars;
    slot.minifiedEncodedChars += getSectionMinifiedEstimate(section);
}

/**
 * Validate slot against limits AFTER final encoding
 * @param {Object} slot - Slot object
 * @param {Array} sections - Sections to combine and encode
 * @param {Object} limits - Limit configuration
 * @param {Function} encodeFunc - Function to perform final encoding (e.g., window.encodeBase64Url)
 * @returns {Object} Validation result { valid: boolean, violations: [], finalEncodedSize: number }
 */
function validateSlotAfterEncoding(slot, sections, limits, encodeFunc) {
    const violations = [];
    let finalEncodedSize = 0;

    // First check pre-encoding limits
    if (slot.lines > limits.maxLines) {
        violations.push(`Lines: ${slot.lines} > ${limits.maxLines}`);
    }
    if (slot.rawChars > limits.maxRaw) {
        violations.push(`Raw chars: ${slot.rawChars} > ${limits.maxRaw}`);
    }
    if (slot.encodedChars > limits.maxEncoded) {
        violations.push(`Estimated encoded chars: ${slot.encodedChars} > ${limits.maxEncoded}`);
    }

    // If encoding function provided, check actual final encoded size
    if (encodeFunc && sections && sections.length > 0) {
        try {
            const combinedCode = sections.map(s => s.code).join('\n\n');
            const actualEncoded = encodeFunc(combinedCode);
            finalEncodedSize = actualEncoded.length;

            if (finalEncodedSize > limits.maxEncoded) {
                violations.push(`CRITICAL - Final encoded size: ${finalEncodedSize} > ${limits.maxEncoded} (game limit)`);
            }
        } catch (e) {
            violations.push(`Error during final encoding validation: ${e.message}`);
        }
    }

    return {
        valid: violations.length === 0,
        violations,
        finalEncodedSize
    };
}

/**
 * Validate slot against limits
 * @param {Object} slot - Slot object
 * @param {Object} limits - Limit configuration
 * @returns {Object} Validation result { valid: boolean, violations: [] }
 */
function validateSlot(slot, limits) {
    const violations = [];

    if (slot.lines > limits.maxLines) {
        violations.push(`Lines: ${slot.lines} > ${limits.maxLines}`);
    }
    if (slot.rawChars > limits.maxRaw) {
        violations.push(`Raw chars: ${slot.rawChars} > ${limits.maxRaw}`);
    }
    if (slot.encodedChars > limits.maxEncoded) {
        violations.push(`Encoded chars: ${slot.encodedChars} > ${limits.maxEncoded}`);
    }

    return {
        valid: violations.length === 0,
        violations
    };
}

/**
 * Combine code from multiple sections
 * @param {Array} sections - Array of section metadata
 * @returns {string} Combined code
 */
function combineCodeSections(sections) {
    return sections.map(s => s.code).join('\n\n');
}

/**
 * Generate slot summary for logging
 * @param {Object} slot - Slot object
 * @param {string} slotType - 'tweakunits' or 'tweakdefs'
 * @param {number} [maxEncodedOverride] - Optional encoded cap to compute utilization
 * @returns {string} Summary string
 */
function getSlotSummary(slot, slotType, maxEncodedOverride) {
    const sectionNames = slot.sections.map(s => s.name).join(', ');
    const MAX_ENCODED_SIZE = typeof maxEncodedOverride === 'number' ? maxEncodedOverride : 13000;
    const utilization = Math.round(slot.encodedChars / MAX_ENCODED_SIZE * 100);

    return `${slotType}${slot.slotNum}: ${slot.sections.length} sections (${sectionNames}) - ${slot.lines}L, ${slot.rawChars}R, ${slot.encodedChars}E (${utilization}%)`;
}

/**
 * Apply labels to all slots
 * @param {Array} slots - Slots to label
 */
function labelSlots(slots) {
    slots.forEach(slot => {
        slot.label = getSlotLabel(slot.sections);
    });
}

/**
 * Log slot allocation summary
 * @param {Array} slots - Slots
 * @param {Object} config - Limit configuration
 * @param {string} type - Slot type label
 */
function logSlotAllocation(slots, config, type) {
    if (typeof window !== 'undefined' && !window.DEBUG_SLOT_PACKER) {
        return;
    }
    const lastSlotNumber = slots.length > 0 ? slots[slots.length - 1].slotNum : 0;
    console.log(`Dynamic packing for ${type}: ${slots.length} slots allocated (1-${lastSlotNumber})`);
    slots.forEach(slot => {
        console.log(`  Slot ${slot.slotNum} [${slot.label}]: ${getSlotSummary(slot, type, config.maxEncoded)}`);
    });
}

/**
 * Compact slots by trying to move sections from later slots into earlier ones
 * while respecting size limits and dependencies.
 * Mutates the slots array in place and removes emptied tail slots.
 * @param {Array} slots - Slots array
 * @param {Object} config - Limit configuration
 * @param {Object} dependencyMap - Dependency map
 */
function compactSlots(slots, config, dependencyMap) {
    if (slots.length <= 1) return;
    // Recompute slot assignments for dependency checks
    const slotAssignments = {};
    slots.forEach(slot => {
        slot.sections.forEach(section => {
            slotAssignments[section.name] = slot.slotNum;
        });
    });

    // Try to move sections from later slots into earlier ones
    for (let i = 0; i < slots.length; i++) {
        const targetSlot = slots[i];
        for (let j = slots.length - 1; j > i; j--) {
            const donorSlot = slots[j];
            // iterate over a copy since we'll mutate
            const donorSections = [...donorSlot.sections];
            for (const section of donorSections) {
                const fitsLimits = canFitInSlot(targetSlot, section, config);
                const respectsDeps = canRespectDependencies(targetSlot, section, slotAssignments, dependencyMap);
                if (fitsLimits && respectsDeps) {
                    // Move section
                    addToSlot(targetSlot, section);
                    donorSlot.sections = donorSlot.sections.filter(s => s !== section);
                    slotAssignments[section.name] = targetSlot.slotNum;
                }
            }
        }
    }

    // Drop emptied slots (from the end backward)
    for (let k = slots.length - 1; k >= 0; k--) {
        if (slots[k].sections.length === 0) {
            slots.splice(k, 1);
        }
    }

    // Re-number slots sequentially
    slots.sort((a, b) => a.slotNum - b.slotNum);
    slots.forEach((slot, idx) => {
        slot.slotNum = idx + 1;
    });
}

// Export functions for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        packIntoSlots,
        validateSlot,
        validateSlotAfterEncoding,
        combineCodeSections,
        getSlotSummary,
        buildDependencyMap,
        validateDependencyConstraints
    };
}

if (typeof window !== 'undefined') {
    window.packIntoSlots = packIntoSlots;
    window.getSlotSummary = getSlotSummary;
    if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event('slotPackerReady'));
    }
}
