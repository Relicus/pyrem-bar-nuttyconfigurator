// Central runtime registry for the BAR configurator.
// Provides one stable namespace for shared modules, state, and compatibility bridges.

(function (globalScope) {
    if (!globalScope) {
        return;
    }

    const existing = globalScope.AppRuntime;
    if (existing && typeof existing.register === 'function' && typeof existing.get === 'function') {
        return;
    }

    const registry = Object.create(null);
    const state = Object.create(null);

    function hasOwn(store, key) {
        return Object.prototype.hasOwnProperty.call(store, key);
    }

    const api = {
        register(name, value, options = {}) {
            registry[name] = value;

            if (options.legacyKey) {
                globalScope[options.legacyKey] = value;
            }

            return value;
        },

        get(name, fallback = null) {
            if (hasOwn(registry, name)) {
                return registry[name];
            }

            if (typeof globalScope[name] !== 'undefined') {
                return globalScope[name];
            }

            return fallback;
        },

        has(name) {
            return hasOwn(registry, name) || typeof globalScope[name] !== 'undefined';
        },

        ensure(name) {
            if (!hasOwn(registry, name)) {
                registry[name] = {};
            }
            return registry[name];
        },

        setState(name, value, options = {}) {
            state[name] = value;

            if (options.legacyKey) {
                globalScope[options.legacyKey] = value;
            }

            return value;
        },

        getState(name, fallback = null) {
            return hasOwn(state, name) ? state[name] : fallback;
        },

        clearState(name, options = {}) {
            delete state[name];

            if (options.legacyKey && hasOwn(globalScope, options.legacyKey)) {
                delete globalScope[options.legacyKey];
            }
        },

        expose(name, value) {
            globalScope[name] = value;
            return value;
        },

        getRegistrySnapshot() {
            return { ...registry };
        },

        getStateSnapshot() {
            return { ...state };
        }
    };

    globalScope.AppRuntime = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
