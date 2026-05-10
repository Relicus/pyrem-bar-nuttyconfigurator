// Output scheduling and coalescing extracted from main.js.

(function (globalScope) {
    let updateInProgress = false;
    let updateScheduled = false;
    let rerunRequested = false;
    let pendingPrimaryModeChange = false;
    let lastUpdateEvent = null;
    let pendingUpdateDeferreds = [];

    function scheduleOutputUpdate() {
        if (updateScheduled) {
            return;
        }
        updateScheduled = true;
        setTimeout(runScheduledOutputUpdate, 0);
    }

    async function runScheduledOutputUpdate() {
        updateScheduled = false;
        updateInProgress = true;

        const deferreds = pendingUpdateDeferreds;
        pendingUpdateDeferreds = [];
        const primaryModeSelect = document.getElementById('primary-mode-select');
        const eventToUse = pendingPrimaryModeChange && primaryModeSelect ? { target: primaryModeSelect } : lastUpdateEvent;
        pendingPrimaryModeChange = false;
        lastUpdateEvent = null;

        try {
            await globalScope.updateOutputImpl(eventToUse);
            deferreds.forEach((deferred) => deferred.resolve());
        } catch (error) {
            deferreds.forEach((deferred) => deferred.reject(error));
            console.error('updateOutput failed:', error);
        } finally {
            updateInProgress = false;
            if (rerunRequested) {
                rerunRequested = false;
                scheduleOutputUpdate();
            }
        }
    }

    function updateOutput(event) {
        if (event) {
            lastUpdateEvent = event;
            if (event.target && event.target.id === 'primary-mode-select') {
                pendingPrimaryModeChange = true;
            }
        }

        const promise = new Promise((resolve, reject) => {
            pendingUpdateDeferreds.push({ resolve, reject });
        });

        if (updateInProgress) {
            rerunRequested = true;
            return promise;
        }

        scheduleOutputUpdate();
        return promise;
    }

    const api = {
        scheduleOutputUpdate,
        runScheduledOutputUpdate,
        updateOutput
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainOutputScheduler', api);
        globalScope.AppRuntime.register('mainOutputUpdater', updateOutput);
    }

    globalScope.MainOutputScheduler = api;
    globalScope.updateOutput = updateOutput;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
