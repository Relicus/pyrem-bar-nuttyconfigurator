function withAssetVersion(url) {
    const resolvedUrl = new URL(url, window.location.href);
    resolvedUrl.searchParams.set('v', window.ASSET_CACHE_BUSTER || Date.now().toString());
    return resolvedUrl.toString();
}

function loadClassicScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = withAssetVersion(url);
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${url}`));
        document.body.appendChild(script);
    });
}

export async function bootstrapConfigurator() {
    await loadClassicScript('js/main.js');

    if (typeof window.initializeApp !== 'function') {
        throw new Error('initializeApp is not available after loading js/main.js');
    }

    await window.initializeApp();
}

bootstrapConfigurator().catch((error) => {
    console.error('Configurator bootstrap failed:', error);
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `<h1>Bootstrap Error</h1><p class="init-error">Could not start the configurator.</p><pre>${error.stack}</pre>`;
    }
});
