// Slot queueing, encoding, and local temp-writer helpers for command generation.

(function (globalScope) {
    let pendingSlotFiles = [];

    function getSlotConstants() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('slotConstants'))
            || globalScope.ConfiguratorSlotConstants
            || {};
    }

    function getSectionConstants() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('sectionConstants'))
            || globalScope.ConfiguratorSectionConstants
            || {};
    }

    function getSlotLabeling() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderSlotLabeling'))
            || globalScope.CommandBuilderSlotLabeling;
    }

    function getSlotMinifier() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderSlotMinifier'))
            || globalScope.CommandBuilderSlotMinifier;
    }

    function getPayloadCodec() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('payloadCodec'))
            || globalScope.PayloadCodec
            || null;
    }

    function getSectionOrdering() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderSectionOrdering'))
            || globalScope.CommandBuilderSectionOrdering;
    }

    function isLocalSlotWriterAvailable() {
        if (!globalScope.location || !globalScope.location.hostname) {
            return false;
        }

        const host = globalScope.location.hostname;
        if (host !== 'localhost' && host !== '127.0.0.1') {
            return false;
        }

        try {
            const urlParams = new URLSearchParams(globalScope.location.search || '');
            const urlPreference = urlParams.get('writeSlots');
            const storedPreference = globalScope.localStorage?.getItem('nuttyb-enable-slot-writer');

            if (urlPreference === '0' || storedPreference === '0') {
                return false;
            }

            if (urlPreference === '1' || storedPreference === '1') {
                return true;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    function saveTempSlotFile(slotName, content, options = {}) {
        const slotMinifier = getSlotMinifier();
        const { summaryLine = null, preMinified = false } = options;
        const rawLength = content ? content.length : 0;

        let contentToSave = preMinified
            ? (content || '')
            : (slotMinifier && typeof slotMinifier.minifySlotBody === 'function'
                ? slotMinifier.minifySlotBody(content || '')
                : (content || ''));

        if (summaryLine) {
            const summary = summaryLine.trim();
            if (summary) {
                contentToSave = contentToSave ? `${summary}\n${contentToSave}` : summary;
            }
        }

        pendingSlotFiles.push({
            name: slotName,
            content: contentToSave
        });

        console.log(`Queued ${slotName} for saving (${contentToSave.length} chars from ${rawLength} raw chars)`);
        return contentToSave;
    }

    function clearTempSlotFiles() {
        pendingSlotFiles = [];
        console.log('Cleared pending slot files queue');
    }

    function encodeBase64Url(text) {
        const payloadCodec = getPayloadCodec();
        if (payloadCodec && typeof payloadCodec.encodeUtf8Base64Url === 'function') {
            return payloadCodec.encodeUtf8Base64Url(text || '');
        }

        if (typeof globalScope.encodeBase64Url === 'function') {
            return globalScope.encodeBase64Url(text || '', true);
        }

        throw new Error('No base64url encoder available in this runtime.');
    }

    function annotateCustomPayload(base64Payload, slotNumber) {
        const payload = (base64Payload || '').trim();
        if (!payload) {
            return payload;
        }

        if (typeof globalScope.decodeBase64Url !== 'function') {
            return payload;
        }

        const slotLabel = String(slotNumber || 0).padStart(2, '0');
        const prefixComment = `-- CUSTOM_${slotLabel} slot ${slotNumber || 0}`;

        try {
            const decoded = globalScope.decodeBase64Url(payload);
            if (!decoded || decoded === 'Error decoding data') {
                console.warn('Could not decode custom tweak payload, skipping annotation');
                return payload;
            }

            const lines = decoded.split(/\r?\n/);
            if (lines.length === 0) {
                lines.push(prefixComment);
            } else if (/^--\s*CUSTOM_/i.test(lines[0])) {
                lines[0] = prefixComment;
            } else {
                lines.unshift(prefixComment);
            }

            return encodeBase64Url(lines.join('\n'));
        } catch (error) {
            console.warn('Failed to annotate custom tweak payload, using original base64:', error);
            return payload;
        }
    }

    function encodeAndValidateSlot(slotType, slotNum, sections, commands, usedSlots, options = {}) {
        const slotConstants = getSlotConstants();
        const sectionConstants = getSectionConstants();
        const slotLabeling = getSlotLabeling();
        const sectionOrdering = getSectionOrdering();

        try {
            const orderedSections = sectionOrdering && typeof sectionOrdering.orderSectionsForSlotExecution === 'function'
                ? sectionOrdering.orderSectionsForSlotExecution(sections)
                : sections;

            const combinedCode = orderedSections.map(section => section.code).join('\n\n');
            const rawCombinedLength = combinedCode.length;
            const slotName = slotNum === 0 ? slotType : `${slotType}${slotNum}`;
            const summaryLine = slotLabeling && typeof slotLabeling.buildSlotSummaryLine === 'function'
                ? slotLabeling.buildSlotSummaryLine(slotType, slotNum, orderedSections, options.slotLabel)
                : null;
            const finalContent = saveTempSlotFile(slotName, combinedCode, { summaryLine });

            const base64url = encodeBase64Url(finalContent);
            const actualEncodedSize = base64url.length;
            const hardLimit = slotConstants.MAX_ENCODED_SIZE || 13000;
            const targetLimit = slotConstants.TARGET_MAX_ENCODED_SIZE || 12000;
            const utilizationPct = Math.round(actualEncodedSize / hardLimit * 100);
            const isArmadaCommander = sections.length === 1
                && sections[0].name === (sectionConstants.ARMADA_COMMANDER || 'ARMADA_COMMANDER');
            const isMainRootSlot = slotNum === 0
                && sections.length === 1
                && (sections[0].name === 'MAIN_UNITS' || sections[0].name === 'MAIN_DEFS');

            if (!isArmadaCommander && actualEncodedSize > hardLimit) {
                const errorMessage = `SLOT SIZE ERROR: ${slotName} exceeds ${hardLimit} limit (${actualEncodedSize}/${hardLimit}). Split sections further.`;
                console.error(errorMessage);
                console.error(`   Sections: ${sections.map(section => section.name).join(', ')}`);
                throw new Error(errorMessage);
            }

            if (actualEncodedSize > targetLimit && isMainRootSlot) {
                console.log(`- ${slotName}: ${actualEncodedSize}/${hardLimit} chars (${utilizationPct}%) - main root slot near hard limit.`);
            } else if (actualEncodedSize > targetLimit) {
                console.warn(`- ${slotName}: ${actualEncodedSize}/${hardLimit} chars (${utilizationPct}%) - approaching limit, consider splitting.`);
            } else {
                console.log(`- ${slotName}: ${sections.length} sections - Final: ${actualEncodedSize}/${hardLimit} chars (${utilizationPct}%)`);
            }

            const command = slotNum === 0
                ? `!bset ${slotType} ${base64url}`
                : `!bset ${slotType}${slotNum} ${base64url}`;

            commands.push(command);
            usedSlots[slotType].add(slotNum);

            const sectionNames = orderedSections.map(section => section.name || 'UNKNOWN');
            const sectionFiles = Array.from(new Set(orderedSections.map(section => section.file || 'unknown')));

            return {
                slotType,
                slotNum,
                slotName,
                slotLabel: (summaryLine || '').replace(/^--/, '') || 'EMPTY',
                summaryLine,
                sectionCount: sections.length,
                sectionNames,
                sectionFiles,
                rawSectionChars: rawCombinedLength,
                minifiedLength: finalContent.length,
                encodedSize: actualEncodedSize,
                utilizationPct,
                command
            };
        } catch (error) {
            const slotName = slotNum === 0 ? slotType : `${slotType}${slotNum}`;
            console.error(`Error encoding ${slotName}:`, error);
            return null;
        }
    }

    async function writeTempSlotFilesToDisk() {
        const slotConstants = getSlotConstants();

        if (pendingSlotFiles.length === 0) {
            console.log('No pending slot files to write');
            return;
        }

        if (!isLocalSlotWriterAvailable()) {
            console.log('Skipping temp slot writer (explicitly disabled). Remove ?writeSlots=0 or clear localStorage flag to re-enable local slot file writes.');
            return;
        }

        try {
            const response = await fetch(slotConstants.LOCAL_SLOT_WRITER_URL || 'http://localhost:3456/save-slots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clearFirst: true,
                    slots: pendingSlotFiles
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }

            const result = await response.json();
            console.log(result.message);
            pendingSlotFiles = [];
        } catch (error) {
            console.warn('Could not write temp slot files to disk. Make sure temp-slot-writer.js is running.');
            console.warn('Run: node bar-configurator/temp-slot-writer.js');
            console.warn(`Error: ${error.message}`);
            console.log('Files that would have been written:');
            pendingSlotFiles.forEach((file) => {
                console.log(`  - ${file.name}.lua (${file.content.length} chars)`);
            });
        }
    }

    const api = {
        isLocalSlotWriterAvailable,
        saveTempSlotFile,
        clearTempSlotFiles,
        annotateCustomPayload,
        encodeAndValidateSlot,
        writeTempSlotFilesToDisk
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderSlotIo', api);
    }

    globalScope.CommandBuilderSlotIo = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
