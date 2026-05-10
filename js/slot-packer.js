/**
 * @fileoverview Slot packer public facade for BAR configurator.
 *
 * Runtime Contract:
 * - Exposes `window.packIntoSlots` and `window.getSlotSummary` for the rest of the app.
 * - Preserves validation helpers for Node/browser compatibility.
 * - Delegates implementation details to extracted slot-packer modules registered through
 *   `window.AppRuntime`.
 */

(function (globalScope) {
    function requireApi(runtimeKey, legacyKey) {
        const runtimeApi = globalScope.AppRuntime ? globalScope.AppRuntime.get(runtimeKey) : null;
        const api = runtimeApi || globalScope[legacyKey];
        if (!api) {
            throw new Error(`Missing ${runtimeKey} API. Check script load order for extracted slot-packer modules.`);
        }
        return api;
    }

    function packIntoSlots() {
        return requireApi('slotPackerCore', 'SlotPackerCore').packIntoSlots.apply(null, arguments);
    }

    function validateSlot() {
        return requireApi('slotPackerMetrics', 'SlotPackerMetrics').validateSlot.apply(null, arguments);
    }

    function validateSlotAfterEncoding() {
        return requireApi('slotPackerMetrics', 'SlotPackerMetrics').validateSlotAfterEncoding.apply(null, arguments);
    }

    function combineCodeSections() {
        return requireApi('slotPackerMetrics', 'SlotPackerMetrics').combineCodeSections.apply(null, arguments);
    }

    function getSlotSummary() {
        return requireApi('slotPackerMetrics', 'SlotPackerMetrics').getSlotSummary.apply(null, arguments);
    }

    function buildDependencyMap() {
        return requireApi('slotPackerDependencyGraph', 'SlotPackerDependencyGraph').buildDependencyMap.apply(null, arguments);
    }

    function validateDependencyConstraints() {
        return requireApi('slotPackerDependencyGraph', 'SlotPackerDependencyGraph').validateDependencyConstraints.apply(null, arguments);
    }

    globalScope.packIntoSlots = packIntoSlots;
    globalScope.getSlotSummary = getSlotSummary;

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('slotPackerFacade', {
            packIntoSlots,
            getSlotSummary,
            validateSlot,
            validateSlotAfterEncoding,
            combineCodeSections,
            buildDependencyMap,
            validateDependencyConstraints
        });
    }

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

    if (typeof globalScope.dispatchEvent === 'function') {
        globalScope.dispatchEvent(new Event('slotPackerReady'));
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
