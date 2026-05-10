/**
 * @fileoverview Command Builder public facade for BAR Configurator.
 *
 * Runtime Contract:
 * - Exposes `window.generateCommandsImpl`, `window.generateDynamicSlotCommandsImpl`,
 *   and `window.splitCommandsIntoSectionsImpl`.
 * - Delegates all implementation details to the extracted modules registered through
 *   `window.AppRuntime`.
 * - Preserves browser and CommonJS compatibility while keeping the public surface stable.
 */

(function (globalScope) {
    function getRuntimeApi(runtimeKey, legacyKey) {
        if (globalScope.AppRuntime) {
            const resolved = globalScope.AppRuntime.get(runtimeKey);
            if (resolved) {
                return resolved;
            }
        }

        return globalScope[legacyKey] || null;
    }

    function ensureApi(api, label) {
        if (!api) {
            throw new Error(`Missing ${label} API. Check script load order for extracted command-builder modules.`);
        }
        return api;
    }

    function generateCommandsImpl() {
        const core = ensureApi(getRuntimeApi('commandBuilderCore', 'CommandBuilderCore'), 'commandBuilderCore');
        return core.generateCommandsImpl.apply(null, arguments);
    }

    function generateDynamicSlotCommandsImpl() {
        const dynamicSlots = ensureApi(getRuntimeApi('commandBuilderDynamicSlots', 'CommandBuilderDynamicSlots'), 'commandBuilderDynamicSlots');
        return dynamicSlots.generateDynamicSlotCommands.apply(null, arguments);
    }

    function splitCommandsIntoSectionsImpl() {
        const core = ensureApi(getRuntimeApi('commandBuilderCore', 'CommandBuilderCore'), 'commandBuilderCore');
        return core.splitCommandsIntoSections.apply(null, arguments);
    }

    globalScope.generateCommandsImpl = generateCommandsImpl;
    globalScope.generateDynamicSlotCommandsImpl = generateDynamicSlotCommandsImpl;
    globalScope.splitCommandsIntoSectionsImpl = splitCommandsIntoSectionsImpl;

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderFacade', {
            generateCommandsImpl,
            generateDynamicSlotCommandsImpl,
            splitCommandsIntoSectionsImpl
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            generateCommands: generateCommandsImpl,
            generateDynamicSlotCommands: generateDynamicSlotCommandsImpl,
            splitCommandsIntoSections: splitCommandsIntoSectionsImpl
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
