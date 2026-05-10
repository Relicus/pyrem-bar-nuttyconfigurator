// Output refresh wiring extracted from event-handlers.js.

(function (globalScope) {
    function attachOutputRefreshHandlers() {
        const formContainers = Array.from(document.querySelectorAll('.custom-add-form'));
        const containers = [
            document.getElementById('options-form-columns'),
            document.getElementById('custom-options-form-columns'),
            document.getElementById('dynamic-tweaks-container'),
            document.getElementById('multipliers-container')
        ].filter(Boolean).concat(formContainers);

        const triggerUpdate = (event) => {
            if (event && event.isTrusted === false) {
                return;
            }
            if (typeof globalScope.updateOutput === 'function') {
                globalScope.updateOutput(event);
            }
            if (typeof globalScope.saveStateToStorage === 'function') {
                globalScope.saveStateToStorage();
            }
        };

        containers.forEach((container) => {
            container.addEventListener('change', triggerUpdate);
            container.addEventListener('input', (event) => {
                const target = event && event.target;
                if (target && target.type === 'range') {
                    return;
                }
                triggerUpdate(event);
            });
        });
    }

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('eventHandlersOutputRefresh', { attachOutputRefreshHandlers });
    }

    globalScope.attachOutputRefreshHandlers = attachOutputRefreshHandlers;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
