# BAR Configurator - Modular Structure

## Overview
main.js has been refactored to use modular JavaScript files for better maintainability.

## File Structure

```
js/
├── config-loader.js      (~78 lines)  - Configuration file loading
├── multiplier-handler.js (~95 lines)  - HP and game multiplier logic
├── ui-generator.js       (~78 lines)  - Dynamic checkbox UI generation
├── command-builder.js    (~204 lines) - Command generation and splitting
├── slot-scanner.js       (existing)   - Tweak file scanning
├── slot-packer.js        (existing)   - Slot packing algorithm
└── main.js               (~1752 lines) - Main application logic
```

## HTML Integration

To use the modular files, add these script tags to `index.html` **BEFORE** the main.js script:

```html
<!-- Load modular JavaScript files (must be before main.js) -->
<script src="js/config-loader.js"></script>
<script src="js/multiplier-handler.js"></script>
<script src="js/ui-generator.js"></script>
<script src="js/command-builder.js"></script>
<script src="js/slot-scanner.js"></script>
<script src="js/slot-packer.js"></script>

<!-- Main application logic (loads last) -->
<script src="js/main.js"></script>
```

## Module Functions

### config-loader.js
- `parseModesFile(filePath)` - Parse modes.txt into game configurations
- `loadLinksContent()` - Load and render links.md content

### multiplier-handler.js
- `getMultiplierCommands(multipliersConfig, getMultiplierValues)` - Generate game multiplier commands
- `generateLuaTweak(type, multiplierValue, templates)` - Generate Lua HP multiplier code

### ui-generator.js
- `generateDynamicCheckboxUI(tweakFileCache, updateOutputCallback)` - Generate dynamic checkboxes from scanned files

### command-builder.js
- `generateDynamicSlotCommands(tweakFileCache, packIntoSlots, getSlotSummary)` - Pack selected files into slots
- `splitCommandsIntoSections(commands, lobbyName, maxSectionLength)` - Split commands into sections

## Backward Compatibility

All wrapper functions in main.js include fallback implementations, so the application will work even if:
- Module files are not loaded
- Browser doesn't support the module pattern
- Files are loaded in the wrong order

## Benefits

1. **Modularity**: Related functions are grouped together
2. **Maintainability**: Easier to find and modify specific features
3. **Reusability**: Functions can be tested independently
4. **Clarity**: Clear separation of concerns
5. **Size**: main.js reduced from 1771 to ~1752 lines

## Testing

Test the application to ensure:
1. Multiplier sliders work correctly
2. Dynamic checkboxes appear for tweak files
3. Command generation produces correct order
4. Slot packing functions properly
5. No console errors appear

## Migration Notes

- Original functions remain in main.js as fallbacks
- New modules export `*Impl` versions for browser use
- Wrapper functions check for module availability before delegating
- No changes needed to existing application logic
