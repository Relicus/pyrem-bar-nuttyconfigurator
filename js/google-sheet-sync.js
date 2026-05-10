// google-sheet-sync.js
// Handles optional exporting of slot metadata to a Google Sheet via Apps Script

(function () {
    const root = (typeof window !== 'undefined' ? window : globalThis);

    const DEFAULT_CONFIG = {
        enabled: false,
        autoSync: false,
        webAppUrl: '',
        sheetId: '',
        sheetName: 'SlotLog',
        includeSlotCommands: false,
        preventDuplicateUploads: true
    };

    let sheetConfig = { ...DEFAULT_CONFIG };

    // Lean stub: disable sheet sync entirely to avoid fetches/404s.
    async function loadConfig() {
        sheetConfig = { ...DEFAULT_CONFIG };
        root.googleSheetSyncConfig = sheetConfig;
        return sheetConfig;
    }

    function getConfig() {
        return sheetConfig;
    }

    function shouldAutoSync() {
        return false;
    }

    async function recordSlots() {
        // No-op; sheet sync removed.
        return { success: false, skipped: 'disabled' };
    }

    root.GoogleSheetSync = {
        loadConfig,
        getConfig,
        recordSlots,
        shouldAutoSync
    };
})();
