// Dependency expansion for selected tweak sections.

(function (globalScope) {
    function getDependencyGraph() {
        return globalScope.AppRuntime?.get('slotPackerDependencyGraph') || globalScope.SlotPackerDependencyGraph;
    }

    function hasSection(name, mainSections, regularSections) {
        return mainSections.units.some((section) => section.name === name)
            || mainSections.defs.some((section) => section.name === name)
            || regularSections.some((section) => section.name === name);
    }

    function findSectionInCache(name, tweakFileCache) {
        for (const [filePath, sections] of Object.entries(tweakFileCache || {})) {
            const section = Array.isArray(sections) ? sections.find((entry) => entry.name === name) : null;
            if (section) {
                return { filePath, section };
            }
        }

        return null;
    }

    function appendSection(name, tweakFileCache, applyMaxThisUnitOverride, mainSections, regularSections) {
        const resolved = findSectionInCache(name, tweakFileCache);
        if (!resolved) {
            console.warn(`Dependency section ${name} not found in tweak file cache`);
            return false;
        }

        const { filePath, section } = resolved;
        const sectionData = applyMaxThisUnitOverride({
            ...section,
            file: filePath,
            type: section.type
        });

        if (filePath.includes('Units_Main.lua')) {
            mainSections.units.push(sectionData);
        } else if (filePath.includes('Defs_Main.lua')) {
            mainSections.defs.push(sectionData);
        } else {
            regularSections.push(sectionData);
        }

        console.log(`Auto-included dependency: ${name}`);
        return true;
    }

    function getDependencyService() {
        const dependencyGraph = getDependencyGraph();
        if (dependencyGraph && typeof dependencyGraph.createDependencyService === 'function') {
            return dependencyGraph.createDependencyService(globalScope.tweakDependencyTable || {});
        }

        return {
            expandDependencyNames(sectionNames) {
                return [];
            }
        };
    }

    function expandSectionDependencies(mainSections, regularSections, tweakFileCache, applyMaxThisUnitOverride) {
        const dependencyService = getDependencyService();
        const selectedNames = [
            ...mainSections.units.map((section) => section.name),
            ...mainSections.defs.map((section) => section.name),
            ...regularSections.map((section) => section.name)
        ];

        dependencyService.expandDependencyNames(selectedNames).forEach((dependencyName) => {
            if (hasSection(dependencyName, mainSections, regularSections)) {
                return;
            }

            appendSection(dependencyName, tweakFileCache, applyMaxThisUnitOverride, mainSections, regularSections);
        });
    }

    const api = {
        expandSectionDependencies
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('commandBuilderDependencyExpander', api);
    }

    globalScope.CommandBuilderDependencyExpander = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
