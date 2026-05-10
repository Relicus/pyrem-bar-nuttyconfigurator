// Shared slot and encoding limits for the BAR configurator.

(function (globalScope) {
    const slotConstants = {
        MAX_ENCODED_SIZE: 16000,
        TARGET_MAX_ENCODED_SIZE: 14500,
        MAX_SECTION_LENGTH: 30000,
        MAX_SLOT_LINES: 700,
        MAX_SLOT_RAW_CHARS: 27000,
        MAX_SLOT_COUNT: 9,
        SLOT_LABEL_MAX_LENGTH: 12,
        MINIFIED_SIZE_TOLERANCE: 0.98,
        LOCAL_SLOT_WRITER_URL: 'http://localhost:3456/save-slots',
        RESET_PAYLOAD: '0'
    };

    if (globalScope && globalScope.AppRuntime) {
        globalScope.AppRuntime.register('slotConstants', slotConstants);
    }

    if (globalScope) {
        globalScope.ConfiguratorSlotConstants = slotConstants;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
