# BAR Configurator - Modular JavaScript

## Overview
The application logic is split into specialized modules for maintainability and separation of concerns. `main.js` orchestrates the initialization and data flow.

## File Structure

```
js/
├── main.js               - Application entry point and orchestrator
├── config-loader.js      - Loads JSON configurations (dynamic tweaks, modes, etc.)
├── multiplier-handler.js - Generates HP and resource multiplier commands
├── ui-generator.js       - Creates dynamic form elements from JSON config
├── ui-renderer.js        - Renders the main options UI
├── command-builder.js    - Assembles final lobby commands
├── slot-scanner.js       - Scans available tweak files
├── slot-packer.js        - Implements First-Fit Decreasing algorithm for slots
├── event-handlers.js     - Manages DOM event listeners
├── output-manager.js     - Handles text output and copy-to-clipboard
├── utils.js              - Shared utility functions
├── custom-tweaks.js      - Manages user-defined custom tweaks
├── metadata.js           - Loads metadata for tweaks
└── helpers/
    ├── defaults.js       - Default value management
    ├── priority-utils.js - Shared priority rules
    └── slot-utils.js     - Shared slot label mapping
```

## HTML Integration

Modules are loaded in `index.html` via standard `<script>` tags. Order matters for dependencies (helpers first, then core modules, then `main.js`).

## Key Responsibilities

### Initialization
1. `main.js` loads configuration via `config-loader.js`.
2. `ui-generator.js` builds the form.
3. `event-handlers.js` attaches listeners.

### Command Generation
1. `multiplier-handler.js` generates multiplier commands.
2. `command-builder.js` combines multipliers, static tweaks, and dynamic slots.
3. `slot-packer.js` allocates tweaks into 13KB slots efficiently.

### Custom Tweaks
`custom-tweaks.js` handles user input, base64 encoding/decoding, and local storage persistence.

## Testing
- Run `npm run server` to start the local dev server.
- Use the "Rebuild" button in the UI to force a refresh of the output.
- Check browser console for module loading errors.
