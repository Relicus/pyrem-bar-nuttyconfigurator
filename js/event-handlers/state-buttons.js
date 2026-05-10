// State-button wiring extracted from event-handlers.js.

(function (globalScope) {
    function attachTabButtonHandlers() {
        document.querySelectorAll('.tab-button').forEach((button) => {
            button.addEventListener('click', globalScope.switchTabImpl);
        });
    }

    function attachStateButtonsHandler() {
        const defaultsButton = document.getElementById('defaults-button');
        if (defaultsButton) {
            defaultsButton.addEventListener('click', () => {
                if (typeof globalScope.resetAllToDefaults === 'function') {
                    globalScope.resetAllToDefaults();
                }
            });
        }

        const clearButton = document.getElementById('clear-button');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (typeof globalScope.clearAllSelections === 'function') {
                    globalScope.clearAllSelections();
                }
            });
        }

        const rebuildButton = document.getElementById('rebuild-button');
        if (rebuildButton) {
            rebuildButton.addEventListener('click', async () => {
                if (typeof globalScope.rebuildApp === 'function') {
                    await globalScope.rebuildApp();
                } else {
                    console.warn('Rebuild function is not available yet.');
                }
            });
        }
    }

    const api = {
        attachTabButtonHandlers,
        attachStateButtonsHandler
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('eventHandlersStateButtons', api);
    }

    globalScope.attachTabButtonHandlers = attachTabButtonHandlers;
    globalScope.attachStateButtonsHandler = attachStateButtonsHandler;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
