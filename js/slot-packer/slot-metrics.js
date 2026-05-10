// Slot sizing and validation helpers extracted from slot-packer.js.

(function (globalScope) {
    function getShared() {
        return globalScope.AppRuntime?.get('slotPackerShared') || globalScope.SlotPackerShared;
    }

    function getPayloadCodec() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('payloadCodec'))
            || globalScope.PayloadCodec
            || null;
    }

    function getHardMaxEncoded(limits) {
        const shared = getShared();
        const slotConstants = shared.getSlotConstants() || {};
        return limits.hardMaxEncoded || slotConstants.MAX_ENCODED_SIZE || limits.maxEncoded;
    }

    function getProjectedEncodedSize(encodedChars, minifiedEncodedChars, limits) {
        if (encodedChars <= limits.maxEncoded) {
            return encodedChars;
        }

        return typeof minifiedEncodedChars === 'number' ? minifiedEncodedChars : encodedChars;
    }

    function getSectionMinifiedEstimate(section) {
        if (!section) {
            return 0;
        }
        if (typeof section.minifiedEncodedEstimate === 'number') {
            return section.minifiedEncodedEstimate;
        }
        const estimate = estimateMinifiedEncoded(section.code || '');
        section.minifiedEncodedEstimate = estimate;
        return estimate;
    }

    function estimateMinifiedEncoded(code) {
        if (!code) {
            return 0;
        }

        const payloadCodec = getPayloadCodec();

        try {
            if (payloadCodec && typeof payloadCodec.getEncodedSize === 'function') {
                return payloadCodec.getEncodedSize(code, {
                    minify: true,
                    slotBody: true,
                    logStats: false,
                    logErrors: false
                });
            }
        } catch (error) {
            // Keep fallback estimators below.
        }

        let minified = code;
        if (globalScope.LuaMinifier && typeof globalScope.LuaMinifier.minify === 'function') {
            try {
                minified = globalScope.LuaMinifier.minify(code);
            } catch (error) {
                // Keep fallback compression below.
            }
        }

        minified = minified
            .replace(/--(?!\s*[A-Z_][A-Z0-9_]*(?:_START|_END)?)[^\n\r]*/g, '')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\s*([{}(),=;])\s*/g, '$1')
            .trim();

        try {
            if (typeof globalScope.encodeBase64Url === 'function') {
                return globalScope.encodeBase64Url(minified, true).length;
            }
        } catch (error) {
            // Keep fallback estimators below.
        }

        try {
            if (typeof Buffer !== 'undefined') {
                return Buffer.from(minified).toString('base64').replace(/=+$/, '').length;
            }
        } catch (error) {
            // Ignore and use final estimate.
        }

        return Math.ceil(minified.length * 4 / 3);
    }

    function canBundleFitInSlot(slot, bundle, limits) {
        const shared = getShared();
        if (shared.slotHasCommander(slot)) {
            return false;
        }
        if (shared.bundleHasCommander(bundle) && slot.sections.length > 0) {
            return false;
        }

        const newLines = slot.lines + bundle.lines;
        const newRaw = slot.rawChars + bundle.rawChars;
        const newEncoded = slot.encodedChars + bundle.encodedChars;
        const newMinifiedEncoded = slot.minifiedEncodedChars + (bundle.minifiedEncodedChars || bundle.encodedChars);

        if (newLines > limits.maxLines || newRaw > limits.maxRaw) {
            return false;
        }

        if (newEncoded <= limits.maxEncoded) {
            return true;
        }

        return newMinifiedEncoded <= getHardMaxEncoded(limits) * shared.getMinifiedSizeTolerance();
    }

    function getBundleFitScore(slot, bundle, limits) {
        if (!canBundleFitInSlot(slot, bundle, limits)) {
            return null;
        }

        const projectedEncoded = getProjectedEncodedSize(
            slot.encodedChars + bundle.encodedChars,
            slot.minifiedEncodedChars + (bundle.minifiedEncodedChars || bundle.encodedChars),
            limits
        );
        const hardMaxEncoded = getHardMaxEncoded(limits);

        return {
            projectedEncoded,
            softOverflow: Math.max(0, projectedEncoded - limits.maxEncoded),
            remainingHardEncoded: hardMaxEncoded - projectedEncoded
        };
    }

    function addBundleToSlot(slot, bundle) {
        bundle.sections.forEach((section) => {
            slot.sections.push(section);
        });
        slot.lines += bundle.lines;
        slot.rawChars += bundle.rawChars;
        slot.encodedChars += bundle.encodedChars;
        slot.minifiedEncodedChars += bundle.minifiedEncodedChars || bundle.encodedChars;
    }

    function createEmptySlot() {
        return {
            slotNum: 0,
            sections: [],
            lines: 0,
            rawChars: 0,
            encodedChars: 0,
            minifiedEncodedChars: 0,
            label: 'EMPTY'
        };
    }

    function canFitInSlot(slot, section, limits) {
        const shared = getShared();
        if (shared.slotHasCommander(slot)) {
            return false;
        }
        if (shared.isCommanderSection(section) && slot.sections.length > 0) {
            return false;
        }

        const newLines = slot.lines + section.lines;
        const newRaw = slot.rawChars + section.rawChars;
        const newEncoded = slot.encodedChars + section.encodedChars;
        const newMinifiedEncoded = slot.minifiedEncodedChars + getSectionMinifiedEstimate(section);

        if (newLines > limits.maxLines || newRaw > limits.maxRaw) {
            return false;
        }
        if (newEncoded <= limits.maxEncoded) {
            return true;
        }

        return newMinifiedEncoded <= getHardMaxEncoded(limits) * shared.getMinifiedSizeTolerance();
    }

    function getSectionFitScore(slot, section, limits) {
        if (!canFitInSlot(slot, section, limits)) {
            return null;
        }

        const projectedEncoded = getProjectedEncodedSize(
            slot.encodedChars + section.encodedChars,
            slot.minifiedEncodedChars + getSectionMinifiedEstimate(section),
            limits
        );
        const hardMaxEncoded = getHardMaxEncoded(limits);

        return {
            projectedEncoded,
            softOverflow: Math.max(0, projectedEncoded - limits.maxEncoded),
            remainingHardEncoded: hardMaxEncoded - projectedEncoded
        };
    }

    function addToSlot(slot, section) {
        slot.sections.push(section);
        slot.lines += section.lines;
        slot.rawChars += section.rawChars;
        slot.encodedChars += section.encodedChars;
        slot.minifiedEncodedChars += getSectionMinifiedEstimate(section);
    }

    function rebuildSlotMetrics(slot) {
        slot.lines = 0;
        slot.rawChars = 0;
        slot.encodedChars = 0;
        slot.minifiedEncodedChars = 0;

        slot.sections.forEach((section) => {
            slot.lines += section.lines;
            slot.rawChars += section.rawChars;
            slot.encodedChars += section.encodedChars;
            slot.minifiedEncodedChars += getSectionMinifiedEstimate(section);
        });

        return slot;
    }

    function validateSlotAfterEncoding(slot, sections, limits, encodeFunc) {
        const violations = [];
        let finalEncodedSize = 0;
        const hardMaxEncoded = getHardMaxEncoded(limits);

        if (slot.lines > limits.maxLines) violations.push(`Lines: ${slot.lines} > ${limits.maxLines}`);
        if (slot.rawChars > limits.maxRaw) violations.push(`Raw chars: ${slot.rawChars} > ${limits.maxRaw}`);
        if (slot.encodedChars > hardMaxEncoded) violations.push(`Estimated encoded chars: ${slot.encodedChars} > ${hardMaxEncoded}`);

        if (encodeFunc && sections && sections.length > 0) {
            try {
                const combinedCode = sections.map((section) => section.code).join('\n\n');
                finalEncodedSize = encodeFunc(combinedCode).length;
                if (finalEncodedSize > hardMaxEncoded) {
                    violations.push(`CRITICAL - Final encoded size: ${finalEncodedSize} > ${hardMaxEncoded} (game limit)`);
                }
            } catch (error) {
                violations.push(`Error during final encoding validation: ${error.message}`);
            }
        }

        return { valid: violations.length === 0, violations, finalEncodedSize };
    }

    function validateSlot(slot, limits) {
        const violations = [];
        const hardMaxEncoded = getHardMaxEncoded(limits);
        if (slot.lines > limits.maxLines) violations.push(`Lines: ${slot.lines} > ${limits.maxLines}`);
        if (slot.rawChars > limits.maxRaw) violations.push(`Raw chars: ${slot.rawChars} > ${limits.maxRaw}`);
        if (slot.encodedChars > hardMaxEncoded) violations.push(`Encoded chars: ${slot.encodedChars} > ${hardMaxEncoded}`);
        return { valid: violations.length === 0, violations };
    }

    function combineCodeSections(sections) {
        return sections.map((section) => section.code).join('\n\n');
    }

    function getSlotSummary(slot, slotType, maxEncodedOverride) {
        const shared = getShared();
        const slotConstants = shared.getSlotConstants() || {};
        const maxEncodedSize = typeof maxEncodedOverride === 'number' ? maxEncodedOverride : (slotConstants.MAX_ENCODED_SIZE || 13000);
        const utilization = Math.round(slot.encodedChars / maxEncodedSize * 100);
        const sectionNames = slot.sections.map((section) => section.name).join(', ');
        return `${slotType}${slot.slotNum}: ${slot.sections.length} sections (${sectionNames}) - ${slot.lines}L, ${slot.rawChars}R, ${slot.encodedChars}E (${utilization}%)`;
    }

    const api = {
        getHardMaxEncoded,
        getSectionMinifiedEstimate,
        estimateMinifiedEncoded,
        canBundleFitInSlot,
        getBundleFitScore,
        addBundleToSlot,
        createEmptySlot,
        canFitInSlot,
        getSectionFitScore,
        addToSlot,
        rebuildSlotMetrics,
        validateSlotAfterEncoding,
        validateSlot,
        combineCodeSections,
        getSlotSummary
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('slotPackerMetrics', api);
    }

    globalScope.SlotPackerMetrics = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
