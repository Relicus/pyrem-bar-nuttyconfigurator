// Slot placement helpers extracted from slot-packer.js.

(function (globalScope) {
    function getShared() {
        return globalScope.AppRuntime?.get('slotPackerShared') || globalScope.SlotPackerShared;
    }

    function getMetrics() {
        return globalScope.AppRuntime?.get('slotPackerMetrics') || globalScope.SlotPackerMetrics;
    }

    function getDependencyGraph() {
        return globalScope.AppRuntime?.get('slotPackerDependencyGraph') || globalScope.SlotPackerDependencyGraph;
    }

    function buildFileBundles(sections, sectionLevels = {}, orderedNames = [], splitIntoSections = false, slotGroupMap = {}) {
        const shared = getShared();
        const metrics = getMetrics();
        const sectionConstants = shared.getSectionConstants() || {};
        const bundleMap = {};
        const bundles = [];
        const orderIndex = {};

        orderedNames.forEach((name, index) => {
            if (typeof orderIndex[name] === 'undefined') {
                orderIndex[name] = index;
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
            bundle.minifiedEncodedChars += metrics.getSectionMinifiedEstimate(section);

            const level = sectionLevels[section.name];
            if (typeof level === 'number' && level < bundle.level) {
                bundle.level = level;
            }

            const index = orderIndex[section.name];
            if (typeof index === 'number' && index < bundle.firstOrderIndex) {
                bundle.firstOrderIndex = index;
            }

            const fallbackPriority = shared.getDefaultPriority(section.type);
            const priority = typeof section.priorityRank === 'number'
                ? section.priorityRank
                : (typeof section.basePriorityRank === 'number' ? section.basePriorityRank : fallbackPriority);
            bundle.priorityRank = Math.max(bundle.priorityRank, priority);

            const tierRank = typeof section.tierRank === 'number' ? section.tierRank : 99;
            if (tierRank < bundle.tierRank) {
                bundle.tierRank = tierRank;
            }
        };

        sections.forEach((section) => {
            const fileKey = section.file || '__NO_FILE__';
            const slotGroup = section.slotGroup || slotGroupMap[section.name];
            const key = slotGroup
                ? `slot-group::${slotGroup}`
                : (splitIntoSections ? `${fileKey}::${section.name}` : fileKey);
            addBundle(key, section);
        });

        bundles.forEach((bundle) => {
            bundle.sections.sort((a, b) => {
                const epicsBuildOptions = sectionConstants.EPICS_BUILDOPTIONS || 'EPICS_BUILDOPTIONS';
                if (a.name === epicsBuildOptions && b.name !== epicsBuildOptions) return 1;
                if (b.name === epicsBuildOptions && a.name !== epicsBuildOptions) return -1;
                return (typeof a.startLine === 'number' ? a.startLine : 0) - (typeof b.startLine === 'number' ? b.startLine : 0);
            });

            bundle.level = bundle.level === Infinity ? 0 : bundle.level;
            if (bundle.firstOrderIndex === Infinity) bundle.firstOrderIndex = bundles.length;
            if (!Number.isFinite(bundle.priorityRank)) bundle.priorityRank = shared.getDefaultPriority(bundle.type);
            if (!Number.isFinite(bundle.tierRank)) bundle.tierRank = 99;
        });

        bundles.sort((a, b) => {
            if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
            if (a.tierRank !== b.tierRank) return a.tierRank - b.tierRank;
            if (a.level !== b.level) return a.level - b.level;
            return a.firstOrderIndex - b.firstOrderIndex;
        });

        return bundles;
    }

    function compareFitScores(left, right) {
        if (!left && !right) {
            return 0;
        }
        if (!left) {
            return 1;
        }
        if (!right) {
            return -1;
        }
        if (left.remainingHardEncoded !== right.remainingHardEncoded) {
            return left.remainingHardEncoded - right.remainingHardEncoded;
        }
        if (left.softOverflow !== right.softOverflow) {
            return left.softOverflow - right.softOverflow;
        }
        return left.projectedEncoded - right.projectedEncoded;
    }

    function rebuildSlotAssignments(slots, preassignedSlots = {}) {
        const slotAssignments = { ...preassignedSlots };

        slots.forEach((slot) => {
            slot.sections.forEach((section) => {
                slotAssignments[section.name] = slot.slotNum;
            });
        });

        return slotAssignments;
    }

    function createSlot(slotNumber) {
        const metrics = getMetrics();
        const slot = metrics.createEmptySlot();
        slot.slotNum = slotNumber;
        return slot;
    }

    function getNextSlotNumber(slots, minimumSlotNumber) {
        const highestSlotNumber = slots.reduce((maxSlotNumber, slot) => Math.max(maxSlotNumber, slot.slotNum || 0), 0);
        return Math.max(minimumSlotNumber, highestSlotNumber + 1);
    }

    function tryPlaceBundleInSlot(slot, bundle, slotNumber, config, dependencyMap, slotAssignments, allowSizeOverride = false) {
        const metrics = getMetrics();
        const dependencyGraph = getDependencyGraph();
        const fitsLimits = allowSizeOverride || metrics.canBundleFitInSlot(slot, bundle, config);
        if (!fitsLimits || !dependencyGraph.canBundleRespectDependencies(slotNumber, bundle, slotAssignments, dependencyMap)) {
            return false;
        }

        metrics.addBundleToSlot(slot, bundle);
        bundle.sections.forEach((section) => {
            slotAssignments[section.name] = slotNumber;
        });
        return true;
    }

    function findBestExistingBundleSlot(slots, bundle, config, dependencyMap, slotAssignments, allowSizeOverride = false) {
        const metrics = getMetrics();
        const dependencyGraph = getDependencyGraph();
        const minimumSlotNumber = dependencyGraph.getBundleMinimumSlot(bundle, slotAssignments, dependencyMap);
        let bestCandidate = null;

        slots.forEach((slot) => {
            if (slot.slotNum < minimumSlotNumber) {
                return;
            }

            if (!allowSizeOverride && !metrics.canBundleFitInSlot(slot, bundle, config)) {
                return;
            }

            if (!dependencyGraph.canBundleRespectDependencies(slot.slotNum, bundle, slotAssignments, dependencyMap)) {
                return;
            }

            const score = allowSizeOverride
                ? { projectedEncoded: slot.encodedChars + bundle.encodedChars, softOverflow: 0, remainingHardEncoded: 0 }
                : metrics.getBundleFitScore(slot, bundle, config);

            if (!score) {
                return;
            }

            if (!bestCandidate || compareFitScores(score, bestCandidate.score) < 0 || (compareFitScores(score, bestCandidate.score) === 0 && slot.slotNum < bestCandidate.slot.slotNum)) {
                bestCandidate = { slot, score };
            }
        });

        return bestCandidate;
    }

    function placeBundleBestFit(bundle, state, options = {}) {
        const metrics = getMetrics();
        const dependencyGraph = getDependencyGraph();
        const shared = getShared();
        const maxSlotCount = shared.getSlotConstants().MAX_SLOT_COUNT || 9;
        const allowSizeOverride = !!options.allowSizeOverride;

        const existingCandidate = findBestExistingBundleSlot(
            state.slots,
            bundle,
            state.config,
            state.dependencyMap,
            state.slotAssignments,
            allowSizeOverride
        );

        if (existingCandidate && tryPlaceBundleInSlot(
            existingCandidate.slot,
            bundle,
            existingCandidate.slot.slotNum,
            state.config,
            state.dependencyMap,
            state.slotAssignments,
            allowSizeOverride
        )) {
            return true;
        }

        const minimumSlotNumber = dependencyGraph.getBundleMinimumSlot(bundle, state.slotAssignments, state.dependencyMap);
        const nextSlotNumber = getNextSlotNumber(state.slots, minimumSlotNumber);
        if (nextSlotNumber > maxSlotCount) {
            console.warn(`Warning: Exceeded maximum ${maxSlotCount} slots for ${state.type}. Some sections may not be included.`);
            state.limitHit = true;
            return false;
        }

        const newSlot = createSlot(nextSlotNumber);
        if (!allowSizeOverride && !metrics.canBundleFitInSlot(newSlot, bundle, state.config)) {
            return false;
        }

        if (!tryPlaceBundleInSlot(newSlot, bundle, nextSlotNumber, state.config, state.dependencyMap, state.slotAssignments, allowSizeOverride)) {
            return false;
        }

        state.slots.push(newSlot);
        state.slots.sort((left, right) => left.slotNum - right.slotNum);
        return true;
    }

    function labelSlots(slots) {
        const shared = getShared();
        slots.forEach((slot) => {
            slot.label = shared.getSlotLabel(slot.sections);
        });
    }

    function logSlotAllocation(slots, config, type) {
        const metrics = getMetrics();
        if (!globalScope.DEBUG_SLOT_PACKER) {
            return;
        }
        const lastSlotNumber = slots.length > 0 ? slots[slots.length - 1].slotNum : 0;
        console.log(`Dynamic packing for ${type}: ${slots.length} slots allocated (1-${lastSlotNumber})`);
        slots.forEach((slot) => {
            console.log(`  Slot ${slot.slotNum} [${slot.label}]: ${metrics.getSlotSummary(slot, type, config.maxEncoded)}`);
        });
    }

    function compactSlots(slots, config, dependencyMap, slotAssignments, preassignedSlots = {}) {
        const metrics = getMetrics();
        const dependencyGraph = getDependencyGraph();
        if (slots.length <= 1) {
            return rebuildSlotAssignments(slots, preassignedSlots);
        }

        let updatedAssignments = { ...slotAssignments };
        let movedSection = true;

        while (movedSection) {
            movedSection = false;

            slots.sort((left, right) => left.slotNum - right.slotNum);

            for (let donorIndex = slots.length - 1; donorIndex >= 0; donorIndex -= 1) {
                const donorSlot = slots[donorIndex];
                const donorSections = [...donorSlot.sections];

                donorSections.forEach((section) => {
                    const minimumSlotNumber = dependencyGraph.getSectionMinimumSlot(section, updatedAssignments, dependencyMap);
                    let bestCandidate = null;

                    for (let targetIndex = 0; targetIndex < donorIndex; targetIndex += 1) {
                        const targetSlot = slots[targetIndex];
                        if (targetSlot.slotNum < minimumSlotNumber) {
                            continue;
                        }

                        if (!metrics.canFitInSlot(targetSlot, section, config)) {
                            continue;
                        }

                        if (!dependencyGraph.canRespectDependencies(targetSlot.slotNum, section, updatedAssignments, dependencyMap)) {
                            continue;
                        }

                        const score = metrics.getSectionFitScore(targetSlot, section, config);
                        if (!score) {
                            continue;
                        }

                        if (!bestCandidate || compareFitScores(score, bestCandidate.score) < 0 || (compareFitScores(score, bestCandidate.score) === 0 && targetSlot.slotNum < bestCandidate.slot.slotNum)) {
                            bestCandidate = { slot: targetSlot, score };
                        }
                    }

                    if (!bestCandidate) {
                        return;
                    }

                    donorSlot.sections = donorSlot.sections.filter((entry) => entry !== section);
                    metrics.rebuildSlotMetrics(donorSlot);
                    metrics.addToSlot(bestCandidate.slot, section);
                    updatedAssignments[section.name] = bestCandidate.slot.slotNum;
                    movedSection = true;
                });
            }

            for (let index = slots.length - 1; index >= 0; index -= 1) {
                if (slots[index].sections.length === 0) {
                    slots.splice(index, 1);
                }
            }

            slots.sort((left, right) => left.slotNum - right.slotNum);
            slots.forEach((slot, index) => {
                slot.slotNum = index + 1;
                metrics.rebuildSlotMetrics(slot);
            });
            updatedAssignments = rebuildSlotAssignments(slots, preassignedSlots);
        }

        return updatedAssignments;
    }

    const api = {
        buildFileBundles,
        tryPlaceBundleInSlot,
        placeBundleBestFit,
        rebuildSlotAssignments,
        labelSlots,
        logSlotAllocation,
        compactSlots
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('slotPackerPlacement', api);
    }

    globalScope.SlotPackerPlacement = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
