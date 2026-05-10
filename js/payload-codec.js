// Payload Codec Module
// Shared payload codec helpers for Lua minify + UTF-8 base64url encoding.

window.PayloadCodec = (function(globalScope) {
    function getLuaMinifier() {
        return globalScope.LuaMinifier && typeof globalScope.LuaMinifier.minify === 'function'
            ? globalScope.LuaMinifier
            : null;
    }

    function logMinifyStats(luaMinifier, originalText, minifiedText) {
        if (!luaMinifier || typeof luaMinifier.getStats !== 'function') {
            return;
        }

        const stats = luaMinifier.getStats(originalText, minifiedText);
        console.log(`LuaMinifier: ${stats.originalSize} chars -> ${stats.minifiedSize} chars (${stats.reduction}% reduction, saved ${stats.saved} bytes)`);
    }

    function minifyLua(text, options = {}) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        const luaMinifier = getLuaMinifier();
        if (!luaMinifier) {
            return text;
        }

        const logStats = options.logStats === true;
        const logErrors = options.logErrors !== false;

        try {
            const minified = luaMinifier.minify(text);
            if (logStats) {
                logMinifyStats(luaMinifier, text, minified);
            }
            return minified;
        } catch (error) {
            if (logErrors) {
                console.warn('Minification failed, using original text:', error.message);
            }
            return text;
        }
    }

    function encodeUtf8Base64Url(text) {
        try {
            const utf8Bytes = new TextEncoder().encode(text);
            const latin1String = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
            return btoa(latin1String)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        } catch (error) {
            console.error('Encoding error:', error);
            return btoa(text)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
        }
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

    function minifySlotBody(content, options = {}) {
        let contentToSave = content || '';

        if (contentToSave && options.skipLuaMinify !== true) {
            contentToSave = minifyLua(contentToSave, options);
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

    function encodePayload(text, options = {}) {
        const shouldMinify = options.minify !== false;
        const codecOptions = {
            logStats: options.logStats === true,
            logErrors: options.logErrors !== false
        };
        const textToEncode = options.slotBody === true
            ? minifySlotBody(text, {
                ...codecOptions,
                skipLuaMinify: !shouldMinify
            })
            : (shouldMinify
                ? minifyLua(text, codecOptions)
                : text);

        return encodeUtf8Base64Url(textToEncode);
    }

    function getEncodedSize(text, options = {}) {
        return encodePayload(text, options).length;
    }

    const api = {
        minifyLua,
        compressSlotSection,
        minifySlotBody,
        encodeUtf8Base64Url,
        encodePayload,
        getEncodedSize
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('payloadCodec', api);
    }

    return api;
})(window);

/**
 * Encode text to Base64URL format with UTF-8 support
 * SHARED UTILITY - used in command-builder.js, multiplier-handler.js, slot-scanner.js
 * @param {string} text - Text to encode
 * @param {boolean} skipMinify - Skip minification (for non-Lua content)
 * @returns {string} Base64URL-encoded string
 */
window.encodeBase64Url = function(text, skipMinify = false) {
    return window.PayloadCodec.encodePayload(text, {
        minify: !skipMinify,
        logStats: !skipMinify,
        logErrors: true
    });
};

/**
 * Decode base64url encoded string
 * @param {string} base64Url - Base64URL encoded string
 * @returns {string} Decoded string
 */
window.decodeBase64UrlImpl = function(base64Url) {
    if (!base64Url) return '';
    try {
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padding = base64.length % 4;
        if (padding) base64 += '===='.slice(padding);
        const decodedData = atob(base64);
        return new TextDecoder('utf-8').decode(Uint8Array.from(decodedData, c => c.charCodeAt(0)));
    } catch (e) {
        console.error(`Base64URL decoding failed for: ${base64Url}`, e);
        return 'Error decoding data';
    }
};
