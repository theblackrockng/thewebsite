'use strict';

const { app, BrowserWindow, Menu, dialog, ipcMain, net, powerSaveBlocker, screen, session } = require('electron');
const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://www.blackrockrestaurantng.com';
const START_URL = `${SITE_ORIGIN}/front-desk-display`;
const OFFLINE_PAGE = path.join(__dirname, 'offline.html');
const BAR_PAGE = path.join(__dirname, 'bar.html');
const BAR_PRELOAD = path.join(__dirname, 'bar-preload.js');
const PARTITION = 'persist:frontdesk';

const RETRY_MS = 10000;
const PROBE_TIMEOUT_MS = 8000;
const CRASH_RELOAD_MS = 1500;
const BAR_HEIGHT = 24;
const BAR_POLL_MS = 80;

// Lets the new-order chime and the signed-out alarm play with no click after a reboot.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// The page must keep running while minimized: orders, the alert sound and the
// session refresh all depend on timers and Realtime.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

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
let bar = null;
let barShown = false;
let barTimer = null;
let mode = 'loading'; // 'loading' | 'site' | 'offline'
let failedProbes = 0;
let powerBlockerId = null;
let allowClose = false;
let confirming = false;

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

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return {};
  }
}

function saveState(fullScreen) {
  try {
    fs.writeFileSync(stateFile(), JSON.stringify({ fullScreen }));
  } catch {}
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

async function requestClose() {
  if (confirming || !alive()) return;
  confirming = true;
  hideBar(true);
  try {
    if (win.isMinimized()) win.restore();
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'BLACKROCK Front Desk',
      message: 'Closing stops new order alerts. Close anyway?',
      buttons: ['Cancel', 'Close'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (response === 1 && alive()) {
      allowClose = true;
      win.close();
    }
  } finally {
    confirming = false;
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
  if ((input.control || input.meta) && key.toLowerCase() === 'm') {
    event.preventDefault();
    win.minimize();
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

// The full-screen bar is its own small local window, so the website itself gets
// no bridge to Node or the system at all.
function createBar() {
  bar = new BrowserWindow({
    width: 800,
    height: BAR_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: BAR_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
      spellcheck: false,
    },
  });
  bar.setAlwaysOnTop(true, 'screen-saver');
  bar.setIgnoreMouseEvents(true);
  bar.loadFile(BAR_PAGE).catch(() => {});
}

function showBar() {
  if (barShown || !alive() || !bar || bar.isDestroyed()) return;
  const area = screen.getDisplayMatching(win.getBounds()).bounds;
  bar.setBounds({ x: area.x, y: area.y, width: area.width, height: BAR_HEIGHT });
  bar.showInactive();
  bar.setIgnoreMouseEvents(false);
  barShown = true;
  bar.webContents.executeJavaScript("document.body.classList.add('show')").catch(() => {});
}

function hideBar(immediate) {
  if (!barShown) return;
  barShown = false;
  if (!bar || bar.isDestroyed()) return;
  bar.setIgnoreMouseEvents(true);
  bar.webContents.executeJavaScript("document.body.classList.remove('show')").catch(() => {});
  setTimeout(() => {
    if (bar && !bar.isDestroyed() && !barShown) bar.hide();
  }, immediate ? 0 : 220);
}

function pollBar() {
  if (!alive() || !win.isFullScreen() || win.isMinimized() || !win.isFocused()) {
    hideBar(false);
    return;
  }
  const point = screen.getCursorScreenPoint();
  const b = win.getBounds();
  const withinX = point.x >= b.x && point.x < b.x + b.width;
  const limit = b.y + (barShown ? BAR_HEIGHT + 4 : 1);
  const inZone = withinX && point.y >= b.y && point.y < limit;
  if (inZone && !barShown) showBar();
  else if (!inZone && barShown) hideBar(false);
}

function fromBar(event) {
  return Boolean(
    bar && !bar.isDestroyed() &&
    event.sender === bar.webContents &&
    event.senderFrame && String(event.senderFrame.url).startsWith('file:')
  );
}

ipcMain.on('frontdesk:minimize', (event) => {
  if (!fromBar(event) || !alive()) return;
  hideBar(true);
  win.minimize();
});

ipcMain.on('frontdesk:toggle-fullscreen', (event) => {
  if (!fromBar(event) || !alive()) return;
  win.setFullScreen(!win.isFullScreen());
});

ipcMain.on('frontdesk:close', (event) => {
  if (fromBar(event)) requestClose();
});

function createWindow() {
  win = new BrowserWindow({
    title: 'BLACKROCK Front Desk',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    width: 1366,
    height: 768,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.on('page-title-updated', (event) => event.preventDefault());

  win.on('enter-full-screen', () => saveState(true));
  win.on('leave-full-screen', () => {
    saveState(false);
    hideBar(true);
  });
  win.on('minimize', () => hideBar(true));

  // Title bar X, Alt+F4 and the taskbar all arrive here. Only a confirmed
  // choice, an app quit or a Windows shutdown lets the window close.
  win.on('close', (event) => {
    if (allowClose) return;
    event.preventDefault();
    requestClose();
  });
  win.on('query-session-end', () => { allowClose = true; });
  win.on('closed', () => {
    win = null;
    if (barTimer) clearInterval(barTimer);
    if (bar && !bar.isDestroyed()) bar.destroy();
    bar = null;
  });

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

  createBar();
  barTimer = setInterval(pollBar, BAR_POLL_MS);

  win.maximize();
  win.show();
  if (readState().fullScreen === true) win.setFullScreen(true);

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

  app.on('before-quit', () => { allowClose = true; });

  app.on('will-quit', () => {
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) powerSaveBlocker.stop(powerBlockerId);
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    [session.fromPartition(PARTITION), session.defaultSession].forEach((ses) => {
      ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
      ses.setPermissionCheckHandler(() => false);
    });

    powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true });

    createWindow();
    setInterval(tick, RETRY_MS);
  });
}
