const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const Logger = require('./src/main/Logger.js');
const SteamService = require('./src/main/SteamService.js');

const { spawn, exec } = require('child_process');

function getAssetsPath() {
  return Logger.getAssetsPath();
}

function logDiagnostic(message) {
  Logger.logDiagnostic(message);
}

function ensureLocalOllamaRunning() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\space', 'AppData', 'Local');
  const ollamaExePath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');

  if (fs.existsSync(ollamaExePath)) {
    try {
      const child = spawn(ollamaExePath, ['serve'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: Object.assign({}, process.env, { OLLAMA_HOST: '127.0.0.1:11434', OLLAMA_ORIGINS: '*' })
      });
      child.unref();
      Logger.logDiagnostic('[LLM Bridge] Auto-started local Ollama daemon on 127.0.0.1:11434.');
    } catch (e) {
      Logger.logDiagnostic(`[LLM Bridge] Ollama launch notice: ${e.message}`);
    }
  }
}

// Auto-start Ollama if installed
ensureLocalOllamaRunning();

logDiagnostic('=== Application Session Started ===');

const isDevMode = process.argv.includes('--dev');
logDiagnostic(`Developer Mode active: ${isDevMode}`);

let isSteamOverlayActive = false;
let edgeCheckInterval = null;
const steamService = new SteamService();

function startSteamRepaintLoop() {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.steamworksRepaintInterval) {
    mainWindow.steamworksRepaintInterval = setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.webContents.isPainting()) {
          mainWindow.webContents.invalidate();
        }
      } else {
        stopSteamRepaintLoop();
      }
    }, 1000 / 60);
    Logger.logDiagnostic('[Steam] Active overlay repaint loop started (60 FPS).');
  }
}

function stopSteamRepaintLoop() {
  if (mainWindow && mainWindow.steamworksRepaintInterval) {
    clearInterval(mainWindow.steamworksRepaintInterval);
    mainWindow.steamworksRepaintInterval = null;
    Logger.logDiagnostic('[Steam] Overlay inactive: Repaint loop deactivated to save idle CPU/GPU.');
  }
}

steamService.initialize((active) => {
  isSteamOverlayActive = active;
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (active) {
      if (edgeCheckInterval) {
        clearInterval(edgeCheckInterval);
        edgeCheckInterval = null;
      }
      startSteamRepaintLoop();
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.focus();
      mainWindow.setFullScreen(true);
      mainWindow.webContents.send('steam-overlay-active', true);
    } else {
      stopSteamRepaintLoop();
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      mainWindow.webContents.send('steam-overlay-active', false);
    }
  }
});

let steamClient = steamService.getClient();

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const winWidth = 350;
  const winHeight = 350;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    // Position near the bottom-right of the primary screen, just above the taskbar
    x: screenWidth - winWidth - 50,
    y: screenHeight - winHeight - 50,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Elevate to screen-saver z-order level so window stays on top of Snipping Tool and system overlays
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadFile('index.html');

  // Start with click-through enabled (ignoring clicks) for transparent parts (unless in dev mode).
  // forward: true ensures mouse movements are still tracked inside the window.
  mainWindow.setIgnoreMouseEvents(!isDevMode, { forward: true });

  mainWindow.on('blur', () => {
    if (!isSteamOverlayActive && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    Logger.logDiagnostic(`[Renderer Console] ${message}`);
    console.log(`[Renderer Console] ${message}`);
  });

  if (isDevMode) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    logDiagnostic('Developer mode: Detached DevTools window opened.');
  }

  mainWindow.on('closed', function () {
    stopSteamRepaintLoop();
    if (edgeCheckInterval) {
      clearInterval(edgeCheckInterval);
      edgeCheckInterval = null;
    }
    mainWindow = null;
  });
}

function getGPUPowerPreference() {
  const assetsDir = getAssetsPath();
  const settingsFile = path.join(assetsDir, 'settings');
  const settingsTxtFile = path.join(assetsDir, 'settings.txt');
  let filePath = null;
  if (fs.existsSync(settingsFile)) filePath = settingsFile;
  else if (fs.existsSync(settingsTxtFile)) filePath = settingsTxtFile;
  
  let mode = 'high-performance';
  if (filePath && fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const lines = data.split('\n');
      lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const val = parts[1].trim();
          if (key === 'gpuLowPower' && val === 'true') {
            mode = 'low-power';
          } else if (key === 'gpuOptimize' && val === 'false' && mode !== 'low-power') {
            mode = 'default';
          }
        }
      });
    } catch (e) {
      console.error('Error reading settings in main:', e);
    }
  }
  return mode;
}

// Disable GPU occlusion tracking to prevent chromium from suspending rendering
// when window overlaps with other apps
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');

// Dynamically configure Chromium hardware switches based on dual-GPU preference
const gpuPowerMode = getGPUPowerPreference();
if (gpuPowerMode === 'high-performance') {
  // Force NVIDIA Optimus & AMD Enduro driver shims at process environment level
  process.env['SHIM_MCCOMPAT'] = '0x00000001';
  process.env['__NV_PRIME_RENDER_OFFLOAD'] = '1';
  process.env['__GLX_VENDOR_LIBRARY_NAME'] = 'nvidia';

  app.commandLine.appendSwitch('force_high_performance_gpu');
  app.commandLine.appendSwitch('force-high-performance-gpu', 'true');
  app.commandLine.appendSwitch('ignore-gpu-blocklist', 'true');
  app.commandLine.appendSwitch('enable-gpu-rasterization', 'true');
  app.commandLine.appendSwitch('use-angle', 'd3d11');
} else if (gpuPowerMode === 'low-power') {
  app.commandLine.appendSwitch('prefer-low-power-gpu', 'true');
  app.commandLine.appendSwitch('use-angle', 'd3d11');
}

// Disable automatic DPI scaling to prevent window enlarging/shrinking when dragging across monitors
app.commandLine.appendSwitch('force-device-scale-factor', '1');

// Steam Overlay hooks for Electron
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (steamClient && steamClient.isInitialized) {
    steamClient.shutdown();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// IPC handler to toggle mouse click-through capability
ipcMain.on('set-ignore-mouse', (event, ignore) => {
  if (isSteamOverlayActive) return; // Prevent renderer from overriding active overlay focus
  if (mainWindow) {
    const finalIgnore = isDevMode ? false : ignore;
    mainWindow.setIgnoreMouseEvents(finalIgnore, { forward: true });

    // Active polling fallback: check if cursor is outside window boundaries when click-through is enabled
    if (finalIgnore) {
      if (!edgeCheckInterval) {
        edgeCheckInterval = setInterval(() => {
          if (!mainWindow || mainWindow.isDestroyed()) {
            clearInterval(edgeCheckInterval);
            edgeCheckInterval = null;
            return;
          }
          const { x, y } = screen.getCursorScreenPoint();
          const bounds = mainWindow.getBounds();

          const isOutside = x < bounds.x || x > bounds.x + bounds.width ||
                            y < bounds.y || y > bounds.y + bounds.height;

          if (isOutside) {
            mainWindow.setIgnoreMouseEvents(false);
            mainWindow.webContents.send('force-hover-exit');
            clearInterval(edgeCheckInterval);
            edgeCheckInterval = null;
          }
        }, 100);
      }
    } else {
      if (edgeCheckInterval) {
        clearInterval(edgeCheckInterval);
        edgeCheckInterval = null;
      }
    }
  }
});

// IPC handler to return the assets path synchronously
ipcMain.on('get-assets-path', (event) => {
  event.returnValue = getAssetsPath();
});

// IPC handler to move the window when dragging the character
ipcMain.on('move-window', (event, delta) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(Math.round(x + delta.x), Math.round(y + delta.y));
  }
});

// IPC handler to dynamically resize the window based on 3D asset dimensions
ipcMain.on('resize-window', (event, size) => {
  if (mainWindow) {
    if (size.bounds) {
      mainWindow.setBounds({
        x: Math.round(size.bounds.x),
        y: Math.round(size.bounds.y),
        width: Math.round(size.bounds.width),
        height: Math.round(size.bounds.height)
      });
      return;
    }

    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    const deltaW = Math.round(size.width - w);
    const deltaH = Math.round(size.height - h);
    
    if (size.edge) {
      // Direction-aware edge resize: only adjust position if top/left edges are pulled
      let newX = x;
      let newY = y;
      if (size.edge.includes('w')) newX = Math.round(x - deltaW);
      if (size.edge.includes('n')) newY = Math.round(y - deltaH);
      mainWindow.setBounds({
        x: newX,
        y: newY,
        width: Math.round(size.width),
        height: Math.round(size.height)
      });
    } else {
      // Default: anchor bottom-right for slider / model change
      mainWindow.setBounds({
        x: Math.round(x - deltaW),
        y: Math.round(y - deltaH),
        width: Math.round(size.width),
        height: Math.round(size.height)
      });
    }
  }
});


// IPC handler to return absolute diagnostic log contents
ipcMain.on('get-diagnostic-logs', (event) => {
  try {
    const diagnosticsLogPath = path.join(getAssetsPath(), 'diagnostics.log');
    if (fs.existsSync(diagnosticsLogPath)) {
      event.returnValue = fs.readFileSync(diagnosticsLogPath, 'utf8');
    } else {
      event.returnValue = 'No diagnostic logs found.';
    }
  } catch (e) {
    event.returnValue = `Error reading diagnostics log: ${e.message}`;
  }
});

// IPC handler to clear diagnostics log
ipcMain.on('clear-diagnostic-logs', (event) => {
  try {
    const diagnosticsLogPath = path.join(getAssetsPath(), 'diagnostics.log');
    fs.writeFileSync(diagnosticsLogPath, `[${new Date().toISOString()}] Diagnostics cleared.\n`, 'utf8');
    event.returnValue = true;
  } catch (e) {
    event.returnValue = false;
  }
});

// IPC handler to query developer mode status
ipcMain.on('is-dev-mode', (event) => {
  event.returnValue = isDevMode;
});

// IPC handler for renderer diagnostics logging
ipcMain.on('log-diagnostic', (event, message) => {
  logDiagnostic(message);
});

// IPC handler to close the application cleanly
ipcMain.on('close-app', () => {
  logDiagnostic('Close application requested via UI close button.');
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  } else {
    app.quit();
  }
});

// Developer utility: IPC handler to reset Steam user stats/achievements for testing
ipcMain.on('reset-steam-stats', (event) => {
  if (steamClient && steamClient.isInitialized && steamClient.userStats && typeof steamClient.userStats.resetAllStats === 'function') {
    try {
      steamClient.userStats.resetAllStats(true);
      if (typeof steamClient.userStats.storeStats === 'function') {
        steamClient.userStats.storeStats();
      }
      logDiagnostic('[Steam Dev Utility] Successfully triggered resetAllStats(true) on Steam Cloud.');
      event.returnValue = true;
    } catch (err) {
      logDiagnostic(`[Steam Dev Utility] Error resetting stats: ${err.message || err}`);
      event.returnValue = false;
    }
  } else {
    logDiagnostic('[Steam Dev Utility] resetAllStats not available on current steamClient.');
    event.returnValue = false;
  }
});


