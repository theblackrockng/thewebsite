'use strict';

const { app, BrowserWindow, Menu, net, powerSaveBlocker, session } = require('electron');
const path = require('path');

const SITE_ORIGIN = 'https://www.blackrockrestaurantng.com';
const START_URL = `${SITE_ORIGIN}/front-desk-display`;
const OFFLINE_PAGE = path.join(__dirname, 'offline.html');
const PARTITION = 'persist:frontdesk';

const RETRY_MS = 10000;
const PROBE_TIMEOUT_MS = 8000;
const CRASH_RELOAD_MS = 1500;

// Lets the new-order chime and the signed-out alarm play with no click after a reboot.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// The page only creates its audio context from its "Enable sound" button. After a
// restart nobody is there to press it, so press it once when it appears.
const AUTO_ENABLE_SOUND = `(() => {
  if (window.__brAutoSound) return;
  window.__brAutoSound = true;
  const tryClick = () => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /^\\s*Enable sound\\s*$/i.test(b.textContent || ''));
    if (btn) btn.click();
  };
  new MutationObserver(tryClick).observe(document.documentElement, { childList: true, subtree: true });
  tryClick();
})();`;

let win = null;
let mode = 'loading'; // 'loading' | 'site' | 'offline'
let failedProbes = 0;
let powerBlockerId = null;

function isSiteUrl(url) {
  try {
    return new URL(url).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
}

function alive() {
  return win && !win.isDestroyed();
}

function loadSite() {
  if (!alive()) return;
  mode = 'loading';
  failedProbes = 0;
  win.loadURL(START_URL).catch(() => {});
}

function showOffline() {
  if (!alive() || mode === 'offline') return;
  mode = 'offline';
  win.loadFile(OFFLINE_PAGE).catch(() => {});
}

function reloadPage() {
  if (!alive()) return;
  if (mode === 'offline') loadSite();
  else win.webContents.reload();
}

async function siteReachable() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await net.fetch(`${SITE_ORIGIN}/robots.txt`, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function tick() {
  if (!alive()) return;
  const ok = await siteReachable();
  if (mode === 'offline') {
    if (ok) loadSite();
    return;
  }
  if (mode === 'site') {
    failedProbes = ok ? 0 : failedProbes + 1;
    if (failedProbes >= 2) showOffline();
  }
}

function handleKey(event, input) {
  if (input.type !== 'keyDown') return;
  const key = input.key;

  if (key === 'F11') {
    event.preventDefault();
    win.setFullScreen(!win.isFullScreen());
    return;
  }
  if (key === 'F5' || ((input.control || input.meta) && key.toLowerCase() === 'r')) {
    event.preventDefault();
    reloadPage();
    return;
  }
  if (app.isPackaged && (key === 'F12' || (input.control && input.shift && ['i', 'j', 'c'].includes(key.toLowerCase())))) {
    event.preventDefault();
  }
}

function createWindow() {
  win = new BrowserWindow({
    title: 'BLACKROCK Front Desk',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    width: 1366,
    height: 768,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
      spellcheck: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.on('page-title-updated', (event) => event.preventDefault());
  win.on('closed', () => { win = null; });

  const contents = win.webContents;
  contents.on('context-menu', (event) => event.preventDefault());
  contents.on('before-input-event', handleKey);

  contents.on('did-fail-load', (_event, code, _desc, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) showOffline();
  });

  contents.on('did-finish-load', () => {
    if (!alive()) return;
    if (isSiteUrl(contents.getURL())) {
      mode = 'site';
      failedProbes = 0;
      contents.executeJavaScript(AUTO_ENABLE_SOUND).catch(() => {});
    }
  });

  contents.on('render-process-gone', () => {
    setTimeout(reloadPage, CRASH_RELOAD_MS);
  });

  loadSite();
}

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event, url) => { if (!isSiteUrl(url)) event.preventDefault(); });
  contents.on('will-redirect', (event, url) => { if (!isSiteUrl(url)) event.preventDefault(); });
  contents.on('will-attach-webview', (event) => event.preventDefault());
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!alive()) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.on('window-all-closed', () => app.quit());

  app.on('will-quit', () => {
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) powerSaveBlocker.stop(powerBlockerId);
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    const ses = session.fromPartition(PARTITION);
    ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    ses.setPermissionCheckHandler(() => false);

    powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true });

    createWindow();
    setInterval(tick, RETRY_MS);
  });
}
