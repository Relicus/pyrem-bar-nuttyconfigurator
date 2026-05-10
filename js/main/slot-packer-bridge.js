// Slot packer readiness bridge extracted from main.js.

(function (globalScope) {
    let slotPackerReadyPromise = null;

    function ensureSlotPackerHelpersReady() {
        if (typeof globalScope.packIntoSlots === 'function' && typeof globalScope.getSlotSummary === 'function') {
            return Promise.resolve();
        }

        if (!slotPackerReadyPromise) {
            slotPackerReadyPromise = new Promise((resolve) => {
                let pollInterval = null;

                const maybeResolve = () => {
                    if (typeof globalScope.packIntoSlots === 'function' && typeof globalScope.getSlotSummary === 'function') {
                        if (pollInterval) clearInterval(pollInterval);
                        globalScope.removeEventListener('slotPackerReady', onSlotPackerReady);
                        resolve();
                        return true;
                    }
                    return false;
                };

                const onSlotPackerReady = () => {
                    maybeResolve();
                };

                if (!maybeResolve()) {
                    globalScope.addEventListener('slotPackerReady', onSlotPackerReady, { once: true });
                    pollInterval = setInterval(() => {
                        if (maybeResolve()) {
                            clearInterval(pollInterval);
                        }
                    }, 50);
                }
            });
        }

        return slotPackerReadyPromise;
    }

    async function generateDynamicSlotCommands() {
        await ensureSlotPackerHelpersReady();
        const tweakFileCache = globalScope.AppRuntime?.getState('tweakFileCache', null);
        return globalScope.generateDynamicSlotCommandsImpl(tweakFileCache, globalScope.packIntoSlots, globalScope.getSlotSummary);
    }

    async function generateSlotBasedCommands() {
        try {
            return await generateDynamicSlotCommands();
        } catch (error) {
            console.error('Dynamic slot generation failed', error);
            return { commands: [], usedSlots: { tweakdefs: new Set(), tweakunits: new Set() }, slotDetails: [] };
        }
    }

    const api = {
        ensureSlotPackerHelpersReady,
        generateDynamicSlotCommands,
        generateSlotBasedCommands
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainSlotPackerBridge', api);
    }
    globalScope.MainSlotPackerBridge = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
