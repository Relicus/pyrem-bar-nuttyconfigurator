// Shared maxthisunit override helpers extracted from command-builder.js.

(function (globalScope) {
    const MAXTHISUNIT_OVERRIDE_INPUTS = [
        { id: 'maxthisunit-t3-builders', section: 'T3_BUILDERS' },
        { id: 'maxthisunit-unit-launchers', section: 'UNIT_LAUNCHERS' },
        { id: 'maxthisunit-epic-ragnarok', section: 'RAGNAROK' },
        { id: 'maxthisunit-epic-calamity', section: 'CALAMITY' },
        { id: 'maxthisunit-epic-tyrannus', section: 'T4_AIR' },
        { id: 'maxthisunit-epic-starfall', section: 'STARFALL' }
    ];

    function getMaxThisUnitOverrides() {
        const overrides = {};

        MAXTHISUNIT_OVERRIDE_INPUTS.forEach((config) => {
            const input = document.getElementById(config.id);
            if (!input) {
                return;
            }

            const rawValue = (input.value || '').trim();
            const effectiveValue = (input.dataset.effectiveValue || '').trim();
            const candidate = effectiveValue || rawValue;
            if (candidate === '') {
                return;
            }

            const normalized = candidate === '∞' ? '0' : candidate;
            const parsed = Number.parseInt(normalized, 10);
            if (Number.isFinite(parsed) && parsed >= 0) {
                overrides[config.section] = parsed;
            }
        });

        return overrides;
    }

    const api = {
        MAXTHISUNIT_OVERRIDE_INPUTS,
        getMaxThisUnitOverrides
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderMaxThisUnit', api);
    }

    globalScope.CommandBuilderMaxThisUnit = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
