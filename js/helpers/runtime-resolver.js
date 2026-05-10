// Shared runtime resolution helpers for classic-script BAR configurator modules.

(function (globalScope) {
    function tryRequire(path) {
        if (typeof require !== 'function') {
            return null;
        }

        try {
            return require(path);
        } catch (error) {
            return null;
        }
    }

    function fromRuntime(key) {
        if (globalScope && globalScope.AppRuntime) {
            return globalScope.AppRuntime.get(key);
        }
        return null;
    }

    function resolveValue(runtimeKey, legacyKey, requirePath) {
        const runtimeValue = fromRuntime(runtimeKey);
        if (runtimeValue) {
            return runtimeValue;
        }

        if (globalScope && typeof globalScope[legacyKey] !== 'undefined') {
            return globalScope[legacyKey];
        }

        return requirePath ? tryRequire(requirePath) : null;
    }

    const api = {
        resolveSlotLabelUtils() {
            return resolveValue('slotLabelUtils', 'SlotLabelUtils', './helpers/slot-utils');
        },

        resolvePriorityUtils() {
            return resolveValue('priorityUtils', 'PriorityUtils', './helpers/priority-utils');
        },

        resolveDefaultUtils() {
            return resolveValue('defaultUtils', 'ConfigDefaults', './helpers/defaults');
        },

        resolveStorageConstants() {
            return resolveValue('storageConstants', 'ConfiguratorStorageConstants');
        },

        resolveSlotConstants() {
            return resolveValue('slotConstants', 'ConfiguratorSlotConstants');
        },

        resolveSectionConstants() {
            return resolveValue('sectionConstants', 'ConfiguratorSectionConstants');
        }
    };

    if (globalScope && globalScope.AppRuntime) {
        globalScope.AppRuntime.register('runtimeResolver', api);
    }

    if (globalScope) {
        globalScope.RuntimeResolver = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
