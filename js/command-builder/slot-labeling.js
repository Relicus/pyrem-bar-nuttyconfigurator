// Shared slot labeling helpers extracted from command-builder.js.

(function (globalScope) {
    function getResolver() {
        return globalScope.RuntimeResolver || (globalScope.AppRuntime && globalScope.AppRuntime.get('runtimeResolver'));
    }

    function getSlotConstants() {
        const resolver = getResolver();
        return resolver ? resolver.resolveSlotConstants() : globalScope.ConfiguratorSlotConstants;
    }

    function getSectionConstants() {
        const resolver = getResolver();
        return resolver ? resolver.resolveSectionConstants() : globalScope.ConfiguratorSectionConstants;
    }

    function getSlotLabelHelper() {
        const resolver = getResolver();
        return resolver ? resolver.resolveSlotLabelUtils() : globalScope.SlotLabelUtils;
    }

    function mapSectionName(name) {
        const helper = getSlotLabelHelper();
        if (helper && typeof helper.mapSectionName === 'function') {
            return helper.mapSectionName(name);
        }

        const sectionConstants = getSectionConstants() || {};
        if (!name) {
            return null;
        }
        if (name.includes('HP_MULTIPLIER')) {
            return sectionConstants.NUTTY_TWEAKS || 'NUTTY_TWEAKS';
        }
        if (name === (sectionConstants.EPIC_ELYSIUM || 'EPIC_ELYSIUM')) {
            return sectionConstants.EPIC_ELYSIUM || 'EPIC_ELYSIUM';
        }
        return name;
    }

    function formatMultiplierForMarker(multiplier) {
        return String(multiplier || '')
            .toUpperCase()
            .replace(/[^0-9A-Z]/g, '_');
    }

    function deriveSlotLabelFromSections(sections) {
        if (!Array.isArray(sections) || sections.length === 0) {
            return 'EMPTY';
        }

        const uniqueNames = Array.from(new Set(
            sections
                .map(section => section && section.name)
                .filter(Boolean)
        ));

        if (uniqueNames.length === 0) {
            return 'EMPTY';
        }

        const mapped = uniqueNames
            .map(mapSectionName)
            .filter(Boolean);
        const uniqueLabels = Array.from(new Set(mapped));

        return uniqueLabels.join('_') || 'EMPTY';
    }

    function sanitizeSlotLabel(label) {
        const slotConstants = getSlotConstants() || {};
        const maxLength = slotConstants.SLOT_LABEL_MAX_LENGTH || 12;

        if (!label) {
            return 'EMPTY';
        }

        const normalized = label
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');

        if (!normalized) {
            return 'EMPTY';
        }

        if (normalized.length <= maxLength) {
            return normalized;
        }

        const parts = normalized.split('_').filter(Boolean);
        if (parts.length === 0) {
            return normalized.slice(0, maxLength);
        }

        let result = '';
        for (const part of parts) {
            const needsJoin = result.length > 0;
            const available = maxLength - result.length - (needsJoin ? 1 : 0);
            if (available <= 0) {
                break;
            }

            const chunk = part.slice(0, available);
            if (!chunk) {
                continue;
            }

            result += (needsJoin ? '_' : '') + chunk;
            if (result.length >= maxLength) {
                break;
            }
        }

        return result || normalized.slice(0, maxLength);
    }

    function buildSlotSummaryLine(slotType, slotNum, sections, slotLabel) {
        const normalizeMarker = (marker) => marker.replace(/_(START|END)$/, '');

        const syntheticMarkers = (Array.isArray(sections) ? sections : [])
            .filter(section => section && section.isSynthetic && section.marker)
            .map(section => normalizeMarker(section.marker));

        if (syntheticMarkers.length > 0) {
            return `--${sanitizeSlotLabel(syntheticMarkers.join('_'))}`;
        }

        const labelSource = slotLabel || deriveSlotLabelFromSections(sections);
        return `--${sanitizeSlotLabel(labelSource)}`;
    }

    const api = {
        mapSectionName,
        formatMultiplierForMarker,
        deriveSlotLabelFromSections,
        sanitizeSlotLabel,
        buildSlotSummaryLine
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderSlotLabeling', api);
    }

    globalScope.CommandBuilderSlotLabeling = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
