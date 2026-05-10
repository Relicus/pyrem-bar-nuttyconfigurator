// Library readiness and banner state extracted from main.js.

(function (globalScope) {
    const STATUS_VARIANTS = ['info', 'success', 'error'];

    function getBanner() {
        return document.getElementById('library-status');
    }

    function setLibraryStatus(message, variant = 'info') {
        const banner = getBanner();
        if (!banner) {
            return;
        }
        banner.textContent = message || '';
        banner.classList.add('library-status');
        STATUS_VARIANTS.forEach((statusVariant) => banner.classList.remove(statusVariant));
        if (variant) {
            banner.classList.add(variant);
        }
        banner.hidden = !message;
    }

    function isLibraryReady() {
        return typeof globalScope.LuaMinifier !== 'undefined' && typeof globalScope.scanAllTweakFiles === 'function';
    }

    async function waitForLibraries(timeoutMs = 10000) {
        if (isLibraryReady()) {
            setLibraryStatus('', 'info');
            return;
        }

        setLibraryStatus('Loading Lua minifier...', 'info');

        await new Promise((resolve, reject) => {
            const start = performance.now();
            let rafId = null;
            let timeoutId = null;

            const cleanup = () => {
                if (rafId !== null) cancelAnimationFrame(rafId);
                if (timeoutId !== null) clearTimeout(timeoutId);
            };

            const onReady = () => {
                cleanup();
                setLibraryStatus('', 'info');
                resolve();
            };

            const onFail = (reason) => {
                cleanup();
                setLibraryStatus('Failed to load Lua minifier. Use Rebuild to retry.', 'error');
                reject(reason instanceof Error ? reason : new Error(reason));
            };

            const checkReady = () => {
                if (isLibraryReady()) {
                    onReady();
                    return;
                }
                if (performance.now() - start > timeoutMs) {
                    onFail(new Error('Lua minifier load timed out.'));
                    return;
                }
                rafId = requestAnimationFrame(checkReady);
            };

            timeoutId = setTimeout(() => onFail(new Error('Lua minifier load timed out.')), timeoutMs);
            const script = document.querySelector('script[src*="lua-minifier.js"]');
            if (script) {
                script.addEventListener('load', () => isLibraryReady() && onReady(), { once: true });
                script.addEventListener('error', () => onFail(new Error('Lua minifier failed to load.')), { once: true });
            }
            rafId = requestAnimationFrame(checkReady);
        });
    }

    const api = { setLibraryStatus, isLibraryReady, waitForLibraries };
    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('mainLibraryStatus', api);
    }
    globalScope.MainLibraryStatus = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
