'use strict';

const { ipcRenderer } = require('electron');

// Runs only in the local full-screen bar window. It exposes nothing to the page:
// it wires three fixed buttons to three fixed messages and nothing else.
const ACTIONS = new Set(['minimize', 'toggle-fullscreen', 'close']);

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-action]').forEach((el) => {
    const action = el.getAttribute('data-action');
    if (!ACTIONS.has(action)) return;
    el.addEventListener('click', () => ipcRenderer.send(`frontdesk:${action}`));
  });
});
