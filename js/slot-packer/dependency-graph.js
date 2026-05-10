// Dependency graph helpers extracted from slot-packer.js.

(function (globalScope) {
    const SPECIAL_DEPENDENCY_RULES = Object.freeze({
        T3_BUILDERS: ['MAIN_DEFS']
    });

    function normalizeDependencies(sectionName, dependencies) {
        if (!Array.isArray(dependencies) || dependencies.length === 0) {
            return [];
        }

        const mergedDependencies = [
            ...(SPECIAL_DEPENDENCY_RULES[sectionName] || []),
            ...dependencies
        ];

        return Array.from(new Set(mergedDependencies.filter((dependency) => typeof dependency === 'string' && dependency)));
    }

    function markerToSectionName(markers) {
        if (!markers || typeof markers.start !== 'string') {
            return null;
        }

        const match = markers.start.match(/--\s*(\w+)_START/);
        return match && match[1] ? match[1] : null;
    }

    function normalizeDependencyMap(rawDependencyMap) {
        const dependencyMap = {};

        if (!rawDependencyMap || typeof rawDependencyMap !== 'object') {
            return dependencyMap;
        }

        Object.entries(rawDependencyMap).forEach(([sectionName, dependencies]) => {
            if (typeof sectionName !== 'string' || !sectionName) {
                return;
            }

            const normalizedDependencies = normalizeDependencies(sectionName, dependencies);
            if (normalizedDependencies.length > 0) {
                dependencyMap[sectionName] = normalizedDependencies;
            }
        });

        return dependencyMap;
    }

    function buildDependencyMapFromTweaks(allTweaks) {
        const dependencyMap = {};

        if (!allTweaks || !allTweaks.dynamic_tweaks) {
            return dependencyMap;
        }

        const addDependencies = (sectionName, dependencies) => {
            const normalizedDependencies = normalizeDependencies(sectionName, dependencies);
            if (!sectionName || normalizedDependencies.length === 0) {
                return;
            }

            dependencyMap[sectionName] = normalizedDependencies;
        };

        Object.entries(allTweaks.dynamic_tweaks).forEach(([name, tweak]) => {
            if (!tweak) {
                return;
            }

            const dependencies = Array.isArray(tweak.dependencies) ? tweak.dependencies : [];
            addDependencies(name, dependencies);

            const options = Array.isArray(tweak.options) ? tweak.options : [];
            const dropdownOptions = Array.isArray(tweak.dropdown_options) ? tweak.dropdown_options : [];
            options.concat(dropdownOptions).forEach((option) => {
                const sectionName = markerToSectionName(option?.markers);
                if (sectionName) {
                    addDependencies(sectionName, dependencies);
                }
            });
        });

        return dependencyMap;
    }

    function buildDependencyMap(allTweaks) {
        if (allTweaks && allTweaks.dependencyMap && typeof allTweaks.dependencyMap === 'object') {
            return normalizeDependencyMap(allTweaks.dependencyMap);
        }

        if (allTweaks && allTweaks.deps && typeof allTweaks.deps === 'object') {
            return normalizeDependencyMap(allTweaks.deps);
        }

        return buildDependencyMapFromTweaks(allTweaks);
    }

    function createDependencyService(allTweaks) {
        const dependencyMap = buildDependencyMap(allTweaks);

        function getDependencies(sectionName) {
            return dependencyMap[sectionName] || [];
        }

        function expandDependencyNames(initialNames) {
            const discovered = new Set(Array.isArray(initialNames) ? initialNames.filter(Boolean) : []);
            const queue = Array.from(discovered);
            const expansionOrder = [];

            while (queue.length > 0) {
                const sectionName = queue.shift();
                getDependencies(sectionName).forEach((dependencyName) => {
                    if (discovered.has(dependencyName)) {
                        return;
                    }

                    discovered.add(dependencyName);
                    expansionOrder.push(dependencyName);
                    queue.push(dependencyName);
                });
            }

            return expansionOrder;
        }

        function computeLevels(sections) {
            const levels = {};
            const indegree = {};
            const graph = {};
            const sectionNames = new Set(sections.map((section) => section.name));

            sectionNames.forEach((name) => {
                indegree[name] = indegree[name] || 0;
                graph[name] = graph[name] || [];
            });

            Object.entries(dependencyMap).forEach(([name, dependencies]) => {
                graph[name] = graph[name] || [];
                dependencies.forEach((dependency) => {
                    graph[dependency] = graph[dependency] || [];
                    indegree[name] = (indegree[name] || 0) + 1;
                    graph[dependency].push(name);
                    if (typeof indegree[dependency] === 'undefined') {
                        indegree[dependency] = 0;
                    }
                });
            });

            const queue = Object.keys(graph).filter((node) => indegree[node] === 0).sort();
            queue.forEach((node) => {
                levels[node] = 0;
            });

            const ordered = [];
            while (queue.length > 0) {
                const node = queue.shift();
                ordered.push(node);

                (graph[node] || []).forEach((neighbor) => {
                    indegree[neighbor] -= 1;
                    const candidateLevel = (levels[node] || 0) + 1;
                    if (candidateLevel > (levels[neighbor] || 0)) {
                        levels[neighbor] = candidateLevel;
                    }
                    if (indegree[neighbor] === 0) {
                        queue.push(neighbor);
                    }
                });
            }

            Object.entries(indegree).forEach(([node, degree]) => {
                if (degree > 0) {
                    console.warn(`Circular dependency detected involving ${node}`);
                    if (typeof levels[node] === 'undefined') {
                        levels[node] = 0;
                    }
                    ordered.push(node);
                }
            });

            sectionNames.forEach((name) => {
                if (typeof levels[name] === 'undefined') {
                    levels[name] = 0;
                }
            });

            return {
                levels,
                orderedSections: ordered.filter((name) => sectionNames.has(name))
            };
        }

        return {
            dependencyMap,
            getDependencies,
            expandDependencyNames,
            computeLevels
        };
    }

    function buildSlotGroupMap(allTweaks) {
        const slotGroups = allTweaks?.slotGroups || allTweaks?.slot_groups;
        const slotGroupMap = {};

        if (!slotGroups || typeof slotGroups !== 'object') {
            return slotGroupMap;
        }

        Object.entries(slotGroups).forEach(([groupName, sectionNames]) => {
            if (!groupName || !Array.isArray(sectionNames)) {
                return;
            }

            sectionNames.forEach((sectionName) => {
                if (typeof sectionName === 'string' && sectionName) {
                    slotGroupMap[sectionName] = groupName;
                }
            });
        });

        return slotGroupMap;
    }

    function computeTopologicalLevels(sections, dependencyMap) {
        return createDependencyService({ dependencyMap }).computeLevels(sections);
    }

    function buildDependencyData(sections, allTweaks) {
        const dependencyService = createDependencyService(allTweaks);
        const slotGroupMap = buildSlotGroupMap(allTweaks);
        const { levels, orderedSections } = dependencyService.computeLevels(sections);
        return {
            dependencyMap: dependencyService.dependencyMap,
            dependencyService,
            slotGroupMap,
            sectionLevels: levels,
            orderedSections
        };
    }

    function getSectionMinimumSlot(section, slotAssignments, dependencyMap) {
        const dependencies = dependencyMap[section.name] || [];
        let minimumSlot = 1;

        dependencies.forEach((dependency) => {
            const dependencySlot = slotAssignments[dependency];
            if (typeof dependencySlot === 'number' && dependencySlot > minimumSlot) {
                minimumSlot = dependencySlot;
            }
        });

        return minimumSlot;
    }

    function getBundleMinimumSlot(bundle, slotAssignments, dependencyMap) {
        let minimumSlot = 1;

        bundle.sections.forEach((section) => {
            const sectionMinimumSlot = getSectionMinimumSlot(section, slotAssignments, dependencyMap);
            if (sectionMinimumSlot > minimumSlot) {
                minimumSlot = sectionMinimumSlot;
            }
        });

        return minimumSlot;
    }

    function canBundleRespectDependencies(targetSlotNumber, bundle, slotAssignments, dependencyMap) {
        return getBundleMinimumSlot(bundle, slotAssignments, dependencyMap) <= targetSlotNumber;
    }

    function canRespectDependencies(targetSlotNumber, section, slotAssignments, dependencyMap) {
        return getSectionMinimumSlot(section, slotAssignments, dependencyMap) <= targetSlotNumber;
    }

    function validateDependencyConstraints(slots, slotAssignments, dependencyMap) {
        let violations = 0;

        Object.entries(dependencyMap).forEach(([section, dependencies]) => {
            const sectionSlot = slotAssignments[section];
            if (typeof sectionSlot === 'undefined') {
                return;
            }

            dependencies.forEach((dependency) => {
                const dependencySlot = slotAssignments[dependency];
                if (typeof dependencySlot === 'undefined') {
                    console.warn(`Dependency warning: ${section} depends on ${dependency}, but ${dependency} is not included`);
                    violations += 1;
                } else if (dependencySlot > sectionSlot) {
                    console.error(`Dependency violation: ${section} (slot ${sectionSlot}) depends on ${dependency} (slot ${dependencySlot})`);
                    violations += 1;
                }
            });
        });

        if (violations > 0) {
            console.warn(`Total dependency violations: ${violations}`);
        }
    }

    const api = {
        buildDependencyMap,
        createDependencyService,
        buildSlotGroupMap,
        computeTopologicalLevels,
        buildDependencyData,
        getSectionMinimumSlot,
        getBundleMinimumSlot,
        canBundleRespectDependencies,
        canRespectDependencies,
        validateDependencyConstraints
    };

    if (globalScope.AppRuntime) {
        globalScope.AppRuntime.register('slotPackerDependencyGraph', api);
    }

    globalScope.SlotPackerDependencyGraph = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined));
