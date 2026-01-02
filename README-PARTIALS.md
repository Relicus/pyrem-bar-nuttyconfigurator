# NuttyB Configurator - Modular Structure

## File Structure

```
bar-configurator/
|-- index.html              # Main HTML shell
|-- nuttyb-fork.html        # Original backup
|-- start-server.bat        # Quick start script for local server
|-- css/
|   |-- base.css            # CSS variables + global styles
|   |-- layout.css          # Shell/layout styling
|   `-- styles.css          # Component styles (imports base/layout)
|-- js/
|   `-- main.js             # All JavaScript (split into modules)
`-- partials/
    |-- config-tab.html     # Configuration tab content
    |-- custom-tab.html     # Custom tweaks tab content
    `-- links-tab.html      # Links tab content
```

## How to Run

### Option 1: Using the start script (Windows)
```bash
# Double-click start-server.bat
# Or run from command line:
start-server.bat
```

### Option 2: Manual Python server
```bash
cd bar-configurator
python -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## How to Edit

- Styles: `css/base.css`, `css/layout.css`, and `css/styles.css` (component rules)
- Tab content: `partials/config-tab.html`, `partials/custom-tab.html`, `partials/links-tab.html`
- JavaScript: `js/main.js` plus helper modules loaded from `index.html`
- Main structure: `index.html` (tab buttons and container layout)

## Benefits

1. Smaller files focused on one concern
2. Easier editing and cleaner diffs
3. CSS/HTML/JS separation for clarity
4. Partials can be reused or tested independently

## Original File

The original `nuttyb-fork.html` (1602 lines) is still available as a backup.
