// Shared slot body minification helpers extracted from command-builder.js.

(function (globalScope) {
    function getPayloadCodec() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('payloadCodec'))
            || globalScope.PayloadCodec
            || null;
    }

    function compressSlotSection(section) {
        let result = '';
        let inString = false;
        let stringChar = '';
        let buffer = '';

        const flushBuffer = () => {
            if (!buffer) {
                return;
            }

            const compacted = buffer
                .replace(/\s*([{}(),=;])\s*/g, '$1')
                .replace(/\s+/g, ' ')
                .trim();

            result += compacted;
            buffer = '';
        };

        for (let index = 0; index < section.length; index += 1) {
            const character = section[index];
            const previousCharacter = index > 0 ? section[index - 1] : '';

            if ((character === '"' || character === "'") && previousCharacter !== '\\') {
                if (!inString) {
                    flushBuffer();
                    inString = true;
                    stringChar = character;
                    result += character;
                } else if (character === stringChar) {
                    inString = false;
                    stringChar = '';
                    result += character;
                } else {
                    result += character;
                }
                continue;
            }

            if (inString) {
                result += character;
                continue;
            }

            buffer += character === '\n' ? ' ' : character;
        }

        flushBuffer();
        return result.trim();
    }

    function minifySlotBody(content) {
        let contentToSave = content || '';
        const payloadCodec = getPayloadCodec();

        if (contentToSave && payloadCodec && typeof payloadCodec.minifySlotBody === 'function') {
            return payloadCodec.minifySlotBody(contentToSave, {
                logStats: false,
                logErrors: false
            });
        }

        const sections = contentToSave.split('\n\n');
        const processedSections = [];

        for (const section of sections) {
            if (!section) {
                continue;
            }

            const markerMatch = section.match(/^(--\s*[A-Z_][A-Z0-9_]*(?:_START|_END)?)\s*\n(.*)$/s);
            if (markerMatch) {
                const marker = markerMatch[1];
                const code = compressSlotSection(markerMatch[2]);
                processedSections.push(code ? `${marker}\n${code}` : marker);
                continue;
            }

            const minified = compressSlotSection(section);
            if (minified) {
                processedSections.push(minified);
            }
        }

        return processedSections.join('\n\n');
    }

    const api = {
        compressSlotSection,
        minifySlotBody
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderSlotMinifier', api);
    }

    globalScope.CommandBuilderSlotMinifier = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
