// Tweak file grouping helpers extracted from ui-generator.js.

(function (globalScope) {
    function getSectionConstants() {
        if (globalScope.AppRuntime) {
            const runtimeRegistry = globalScope.AppRuntime.get('sectionConstants');
            if (runtimeRegistry) {
                return runtimeRegistry;
            }
        }

        if (globalScope.ConfiguratorSectionConstants) {
            return globalScope.ConfiguratorSectionConstants;
        }

        if (typeof require === 'function') {
            try {
                return require('../constants/sections');
            } catch (error) {
                return {};
            }
        }

        return {};
    }

    function groupTweakFilesByDisplayName(tweakFileCache) {
        const groupedByDisplayName = {};
        const sectionConstants = getSectionConstants();

        Object.entries(tweakFileCache).forEach(([filePath, sections]) => {
            const fileName = filePath.split('/').pop().replace('.lua', '');
            if (typeof sectionConstants.shouldExcludeFromUiGrouping === 'function'
                && sectionConstants.shouldExcludeFromUiGrouping(filePath)) {
                return;
            }

            const originalRawDisplayName = fileName
                .replace(/^(Defs_|Units_)/, '')
                .replace(/_/g, ' ')
                .replace(/ - /g, ' - ');
            const displayName = typeof sectionConstants.getTweakDisplayGroupName === 'function'
                ? sectionConstants.getTweakDisplayGroupName({ filePath, fileName, rawDisplayName: originalRawDisplayName }, originalRawDisplayName)
                : originalRawDisplayName;

            groupedByDisplayName[displayName] = groupedByDisplayName[displayName] || [];
            groupedByDisplayName[displayName].push({
                filePath,
                fileName,
                rawDisplayName: displayName,
                originalDisplayName: originalRawDisplayName,
                sections
            });
        });

        return groupedByDisplayName;
    }

    function sortGroupedEntries(groupedByDisplayName) {
        const getGroupPriority = (name) => {
            const lower = name.toLowerCase();
            if (lower === 'main') return 0;
            if (lower === 'evolving commanders') return 1;
            return 2;
        };

        return Object.entries(groupedByDisplayName).sort(([aName], [bName]) => {
            const priorityA = getGroupPriority(aName);
            const priorityB = getGroupPriority(bName);
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return aName.localeCompare(bName);
        });
    }

    function isDedicatedWaveSection(sectionName) {
        const sectionConstants = getSectionConstants();
        if (typeof sectionConstants.isDedicatedWaveSection === 'function') {
            return sectionConstants.isDedicatedWaveSection(sectionName);
        }

        const prefixes = sectionConstants.DEDICATED_RAPTOR_WAVE_PREFIXES || [];
        return prefixes.some((prefix) => typeof sectionName === 'string' && sectionName.startsWith(prefix));
    }

    const api = {
        groupTweakFilesByDisplayName,
        sortGroupedEntries,
        isDedicatedWaveSection
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('uiGeneratorGrouping', api);
    }

    globalScope.UiGeneratorGrouping = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
