// DOM Helpers Module
// Shared DOM creation utilities for BAR Configurator.

/**
 * Create a DOM cell with command text and copy button
 * SHARED UTILITY - used in ui-renderer.js, custom-tweaks.js
 * @param {HTMLElement} cell - The table cell to populate
 * @param {string} commandText - Command text to display
 * @param {string} buttonText - Copy button text (default: 'Copy')
 */
window.createCommandCell = function(cell, commandText, buttonText = 'Copy') {
    const wrapper = document.createElement('div');
    wrapper.className = 'command-cell-wrapper';

    const textSpan = document.createElement('span');
    textSpan.className = 'command-text';
    textSpan.textContent = commandText;
    textSpan.title = commandText;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = buttonText;
    copyBtn.className = 'copy-row-button';
    copyBtn.dataset.command = commandText;

    wrapper.appendChild(textSpan);
    wrapper.appendChild(copyBtn);
    cell.appendChild(wrapper);
};
