// MaxThisUnit code transformation helpers extracted from command-builder.js.

(function (globalScope) {
    function getMaxThisUnitApi() {
        return (globalScope.AppRuntime && globalScope.AppRuntime.get('commandBuilderMaxThisUnit'))
            || globalScope.CommandBuilderMaxThisUnit;
    }

    function calculateEncodedSize(code) {
        const payloadCodec = (globalScope.AppRuntime && globalScope.AppRuntime.get('payloadCodec'))
            || globalScope.PayloadCodec
            || null;

        try {
            if (payloadCodec && typeof payloadCodec.getEncodedSize === 'function') {
                return payloadCodec.getEncodedSize(code, {
                    minify: true,
                    logStats: false,
                    logErrors: false
                });
            }

            return globalScope.encodeBase64Url(code).length;
        } catch (error) {
            console.error('Error calculating encoded size:', error);
            return Math.ceil(code.length * 1.4);
        }
    }

    function applyEpicMaxOverride(code, sectionName, numericValue) {
        const epicUnitMap = {
            RAGNAROK: 'epic_ragnarok',
            CALAMITY: 'epic_calamity',
            STARFALL: 'epic_starfall'
        };
        const unitId = epicUnitMap[sectionName] || 'epic_calamity';
        const valueString = String(numericValue);
        const valueLine = `maxthisunit=${valueString},`;

        let replaced = false;
        const updated = code.replace(/maxthisunit\s*=\s*\d+,?/i, (match) => {
            if (replaced) {
                return match;
            }
            replaced = true;
            return valueLine;
        });

        if (replaced) {
            return updated;
        }

        const insertIntoUnitTable = (input) => {
            const insertAfterLine = (pattern) => {
                if (!pattern.test(input)) {
                    return null;
                }

                return input.replace(pattern, (match, line, indent = '') => `${line}${indent}${valueLine}\n`);
            };

            const descriptionPattern = /(\bdescription\s*=\s*.*?,\s*\r?\n)([ \t]*)/i;
            const namePattern = /(\bname\s*=\s*.*?,\s*\r?\n)([ \t]*)/i;

            let next = insertAfterLine(descriptionPattern);
            if (next) {
                return next;
            }

            next = insertAfterLine(namePattern);
            if (next) {
                return next;
            }

            const tableStartPattern = new RegExp(`(a\\.${unitId}\\s*=\\s*b\\([^\\{]*\\{\\s*\\r?\\n)([ \\t]*)`, 'i');
            if (tableStartPattern.test(input)) {
                return input.replace(tableStartPattern, (match, start, indent = '  ') => `${start}${indent}${valueLine}\n`);
            }

            return null;
        };

        const injected = insertIntoUnitTable(code);
        if (injected) {
            return injected;
        }

        const ensureRegex = new RegExp(`(ensureBuildOptions\\([^\\)]*'${unitId}'\\))`, 'i');
        if (ensureRegex.test(code)) {
            return code.replace(ensureRegex, `$1\n a.${unitId}.maxthisunit=${valueString}`);
        }

        const endRegex = new RegExp(`(\\nend\\s*\\n--\\s*${sectionName}_END)`, 'i');
        if (endRegex.test(code)) {
            return code.replace(endRegex, `\n a.${unitId}.maxthisunit=${valueString}$1`);
        }

        return `${code}\n a.${unitId}.maxthisunit=${valueString}`;
    }

    function appendMaxSuffix(text, limit) {
        const base = (text || '')
            .replace(/\s*(?:x\d+\s*Max|-?\s*Max\s*\d+)\s*$/i, '')
            .replace(/\s+$/g, '');

        if (!Number.isFinite(limit) || limit <= 0) {
            return base;
        }

        return `${base} x${limit} Max`;
    }

    function updateTextFieldWithMax(code, fieldName, limit) {
        if (!code || !fieldName) {
            return code;
        }

        const regex = new RegExp(`(${fieldName}\\s*=\\s*)(\\[\\[(.*?)\\]\\]|(['"\`])((?:[^\\\\]|\\\\.|\\n)*?)\\4)`, 'gis');
        return code.replace(regex, (match, prefix, fullValue, multiContent, quote, quotedContent) => {
            const content = typeof multiContent === 'string' ? multiContent : quotedContent;
            const updated = appendMaxSuffix(content, limit);
            if (typeof multiContent === 'string') {
                return `${prefix}[[${updated}]]`;
            }
            const resolvedQuote = quote || '"';
            return `${prefix}${resolvedQuote}${updated}${resolvedQuote}`;
        });
    }

    function injectAideMaxOverrides(code, numericValue) {
        const updateBlock = (input, callPattern) => {
            const replaceRegex = new RegExp(`(${callPattern}[\\s\\S]*?maxthisunit\\s*=\\s*)\\d+`, 'g');
            if (numericValue === null) {
                return input.replace(replaceRegex, (match) => match.replace(/maxthisunit\s*=\s*\d+/i, ''));
            }
            return input.replace(replaceRegex, `$1${numericValue}`);
        };

        const updateAideText = (input, callPattern) => {
            const blockRegex = new RegExp(`(${callPattern}[\\s\\S]*?\\}\\))`, 'i');
            return input.replace(blockRegex, (block) => {
                let updatedBlock = updateTextFieldWithMax(block, 'i18n_en_tooltip', numericValue);
                updatedBlock = updateTextFieldWithMax(updatedBlock, 'description', numericValue);
                return updatedBlock;
            });
        };

        let updated = code;
        updated = updateBlock(updated, "h\\(m\\.\\.'decom\\',j,\\s*\\{");
        updated = updateBlock(updated, "h\\('armfify',j,\\s*\\{");
        updated = updateAideText(updated, "h\\(m\\.\\.'decom\\',j,\\s*\\{");
        updated = updateAideText(updated, "h\\('armfify',j,\\s*\\{");

        if (numericValue === null) {
            updated = updated
                .replace(/,\s*,/g, ',')
                .replace(/,\s*}/g, '}')
                .replace(/(\r?\n)\s*(\r?\n)+/g, '$1');
        }

        return updated;
    }

    function applyMaxThisUnitOverride(sectionObject, overrides = null) {
        if (!sectionObject || !sectionObject.code || !sectionObject.name) {
            return sectionObject;
        }

        const resolvedOverrides = overrides || (getMaxThisUnitApi() && getMaxThisUnitApi().getMaxThisUnitOverrides
            ? getMaxThisUnitApi().getMaxThisUnitOverrides()
            : {});

        const overrideValue = resolvedOverrides[sectionObject.name];
        if (!Number.isFinite(overrideValue)) {
            return sectionObject;
        }

        const numericValue = Math.max(0, Math.floor(overrideValue));
        const appliedValue = numericValue === 0 ? 9999 : numericValue;
        let updatedCode = sectionObject.code;

        if (sectionObject.name === 'T3_BUILDERS') {
            updatedCode = injectAideMaxOverrides(updatedCode, appliedValue);
        } else if (sectionObject.name === 'UNIT_LAUNCHERS' || sectionObject.name === 'T4_AIR') {
            const pattern = /maxthisunit\s*=\s*\d+,?/gi;
            if (!pattern.test(updatedCode)) {
                return sectionObject;
            }

            updatedCode = updatedCode.replace(pattern, `maxthisunit=${appliedValue},`);
        } else if (sectionObject.name === 'RAGNAROK' || sectionObject.name === 'CALAMITY' || sectionObject.name === 'STARFALL') {
            updatedCode = applyEpicMaxOverride(updatedCode, sectionObject.name, appliedValue);
        } else {
            return sectionObject;
        }

        if (sectionObject.name !== 'T3_BUILDERS') {
            updatedCode = updateTextFieldWithMax(updatedCode, 'i18n_en_tooltip', appliedValue);
            updatedCode = updateTextFieldWithMax(updatedCode, 'description', appliedValue);
        }

        if (updatedCode === sectionObject.code) {
            return sectionObject;
        }

        return {
            ...sectionObject,
            code: updatedCode,
            lines: updatedCode.split('\n').length,
            rawChars: updatedCode.length,
            encodedChars: calculateEncodedSize(updatedCode)
        };
    }

    const api = {
        calculateEncodedSize,
        applyEpicMaxOverride,
        appendMaxSuffix,
        updateTextFieldWithMax,
        injectAideMaxOverrides,
        applyMaxThisUnitOverride
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderMaxThisUnitTransformers', api);
    }

    globalScope.CommandBuilderMaxThisUnitTransformers = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
