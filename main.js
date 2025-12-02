// Imports and modules !!! ---------------------------------------------------------------------------------------------------

import { app, shell, BrowserWindow, ipcMain, globalShortcut, contextBridge, Tray, Menu, Notification, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from './resources/icon.png?asset'

const {spawn, exec} = require('child_process');
const fs = require('fs');
const http = require('http');

const path = require('path');
const { extname } = require('path');

const {autoUpdater, AppUpdater} = require('electron-differential-updater');
const log = require('electron-log');

const {os} = require('os');
const {url} = require('inspector');

// Import our custom logger
const logger = require('./logger');

// DB functions removed for now

import dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';


// Imports and modules END !!! ---------------------------------------------------------------------------------------------------


// Redux IPC Broadcasting System !!! ---------------------------------------------------------------------------------------------------

/**
 * Handle Redux action broadcasting across all renderer processes
 * This enables state synchronization between multiple windows
 */
ipcMain.handle('broadcast-redux-action', (event, actionData) => {
  try {
    logger.info('Broadcasting Redux action across all windows:', {
      type: actionData.type,
      timestamp: actionData.timestamp,
      sourceWindow: actionData.sourceWindow,
      hasPayload: !!actionData.payload
    });

    // Get all windows (main, widget, setup, etc.)
    const allWindows = BrowserWindow.getAllWindows();
    let broadcastCount = 0;

    allWindows.forEach((window) => {
      // Skip destroyed windows
      if (window.isDestroyed()) {
        return;
      }

      // Skip the sender window to avoid circular broadcasts
      if (window.webContents === event.sender) {
        return;
      }

      try {
        // Send the action to this window
        window.webContents.send('redux-action-broadcast', {
          type: actionData.type,
          payload: actionData.payload,
          timestamp: actionData.timestamp,
          sourceWindow: actionData.sourceWindow
        });
        broadcastCount++;
      } catch (error) {
        logger.error('Failed to broadcast to window:', error);
      }
    });

    logger.info(`Redux action broadcasted to ${broadcastCount} windows`);
    return { success: true, broadcastCount };
  } catch (error) {
    logger.error('Error in Redux action broadcasting:', error);
    return { success: false, error: error.message };
  }
});

// Redux IPC Broadcasting System END !!! ---------------------------------------------------------------------------------------------------




// Variables and constants !!! ---------------------------------------------------------------------------------------------------

let mainWindow, store, widgetWindow, tray, authWindow;
let authToken = null; // Store the authentication token
let isRestartingAuth = false; // Flag to track if we're restarting the auth flow
let ipAddress = process.env.SERVER_IP_ADDRESS || '';
let widgetUndetectabilityEnabled = true; // Enable undetectability for widget by default
let isRecorded = false; // Control whether overlay window can be recorded (will be loaded from store)
let lastScreenshotTime = 0; // Cooldown tracking for global shortcut
let lastValidationRequestTime = 0; // Cooldown tracking for screenshot validation requests
let screenshotProcessActive = false; // Track if screenshot process is currently active

// Create a filtered logger that excludes blockmap errors with raw binary data
const createFilteredLogger = () => {
  const originalError = log.error;
  const filteredLogger = {
    ...log,
    error: (...args) => {
      // Convert all arguments to string to check for blockmap errors
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message + (arg.stack ? '\n' + arg.stack : '');
        }
        return String(arg);
      }).join(' ');
      
      // Check if this is a blockmap error with raw binary data
      // The indicator is "raw data:" followed by binary/unreadable content
      if (message.includes('raw data:') || 
          (message.includes('Cannot download differentially') && message.includes('blockmap')) ||
          (message.includes('Cannot parse blockmap') && message.includes('incorrect header check'))) {
        // Only log a simplified message without the raw binary data
        originalError('[AutoUpdater] Cannot download differentially, fallback to full download: blockmap parsing error');
        return; // Don't log the full error with binary data
      }
      // For all other errors, log normally
      originalError(...args);
    }
  };
  return filteredLogger;
};

// Configure auto-updater logging and behavior with filtered logger
autoUpdater.logger = createFilteredLogger();
autoUpdater.autoDownload = false; // User must opt-in to download
autoUpdater.autoInstallOnAppQuit = true;

// Platform detection
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isDev = process.env.NODE_ENV === 'development';

// Variables and constants END !!! ---------------------------------------------------------------------------------------------------


// HTTP Server for Window Loading !!! ---------------------------------------------------------------------------------------------------

let server = null;

// MIME type mapping
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function createServer() {
  // If server already exists, resolve immediately
  if (server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const rendererPath = join(__dirname, '../renderer');

    server = http.createServer((req, res) => {
      let filePath = rendererPath;
      // Remove query string and hash from URL for file path resolution
      const urlPath = (req.url || '/').split('?')[0].split('#')[0];
      const url = urlPath;

      // Handle root path
      if (url === '/' || url === '/index.html') {
        filePath = join(rendererPath, 'index.html');
      } else {
        // Handle other paths (assets, etc.)
        // Remove leading slash for path joining
        const cleanPath = url.startsWith('/') ? url.slice(1) : url;
        filePath = join(rendererPath, cleanPath);
      }

      // Security: prevent directory traversal
      if (!filePath.startsWith(rendererPath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      // Check if the requested URL is an asset file (has a file extension)
      const urlExt = extname(url).toLowerCase();
      const isAssetFile = urlExt !== '' && urlExt !== '.html';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            // If it's an asset file (JS, CSS, images, etc.) and doesn't exist, return 404
            if (isAssetFile) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not found');
              return;
            }
            // For SPA routing: if it's a route (no extension or .html), serve index.html
            // This allows React Router to handle client-side routing
            const indexPath = join(rendererPath, 'index.html');
            fs.readFile(indexPath, (indexErr, indexData) => {
              if (indexErr) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found');
                return;
              }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(indexData);
            });
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server error');
          }
          return;
        }

        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
      });
    });

    server.listen(19029, '127.0.0.1', () => {
      logger.info('HTTP server running on http://127.0.0.1:19029');
      resolve();
    });

    server.on('error', (err) => {
      logger.error('HTTP server error:', err);
      reject(err);
    });
  });
}

// HTTP Server for Window Loading END !!! ---------------------------------------------------------------------------------------------------


// IPC On Section !!! ------------------------------------------------------------------------------------------------------

ipcMain.on('change-window', (event, arg) => {
  logger.info("Changing The Application Window", { window: arg });
  window_name = "html/" + arg;
  // window_name = arg;
  mainWindow.loadFile(window_name);
})

// IPC On Section END !!! ---------------------------------------------------------------------------------------------------





// Window Creation Functions !!! ------------------------------------------------------------------------------------------------------

// Note: setup window flow removed. App will open main renderer and create widget directly.

// Undetectable Widget Window Class !!! ---------------------------------------------------------------------------------------------------

class UndetectableWidgetWindow {
  window;
  undetectabilityEnabled;
  devToolsOpen;

  constructor(options = {}) {
    this.undetectabilityEnabled = options.undetectabilityEnabled || true;
    this.isRecorded = options.isRecorded !== undefined ? options.isRecorded : false;
    this.devToolsOpen = false;
    
    // Create widget window with undetectability features
    this.window = new BrowserWindow({
      width: 1920,
      height: 1080,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true, // Always hide from taskbar/Alt+Tab
      resizable: false,
      transparent: true,
      focusable: false,
      hasShadow: false,
      show: false, // Don't show initially
      fullscreen: true,
      type: isWindows ? "toolbar" : "panel", // Windows: toolbar type hides from Alt+Tab
      roundedCorners: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      hiddenInMissionControl: true, // macOS: hide from Mission Control
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        sandbox: false,
        contextIsolation: true,
        devTools: true,
        nodeIntegration: false,
      }
    });

    // Set content protection based on isRecorded
    // If isRecorded is false, prevent recording (setContentProtection(true))
    // If isRecorded is true, allow recording (setContentProtection(false))
    this.window.setContentProtection(!this.isRecorded);

    // Additional undetectability measures
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setResizable(false);

    // Platform-specific settings
    if (isWindows) {
      this.window.setAlwaysOnTop(true, "screen-saver", 1);
      this.window.webContents.setBackgroundThrottling(false);
    }

    // Set initial mouse event ignoring - start with click-through enabled
    console.log('setIgnoreMouseEvents toggled: true');
    this.setIgnoreMouseEvents(true, { forward: true });

    // Platform-specific additional hiding measures
    if (isWindows) {
      // Windows-specific: Set as system window to avoid Alt+Tab
      this.window.setAppDetails({
        appId: 'overlaylab.widget.overlay',
        appIconPath: '',
        appIconIndex: 0,
        relaunchCommand: '',
        relaunchDisplayName: ''
      });
    }

    // Event handlers
    this.setupEventHandlers();

    // Ensure window is hidden from taskbar/Alt+Tab
    this.window.setSkipTaskbar(true);
    
    // Additional Windows-specific hiding
    if (isWindows) {
      // Force the window to not appear in task switcher
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
  }

  setupEventHandlers() {
    // Track DevTools open state
    this.window.webContents.on('devtools-opened', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.devToolsOpen = true;
        console.log('setIgnoreMouseEvents toggled: false');
        this.window.setIgnoreMouseEvents(false);
        logger.debug('DevTools opened: Widget window is now interactive');
      }
    });

    this.window.webContents.on('devtools-closed', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.devToolsOpen = false;
        console.log('setIgnoreMouseEvents toggled: true');
        this.window.setIgnoreMouseEvents(true, { forward: true });
        logger.debug('DevTools closed: Widget window is now click-through');
      }
    });

    // Widget window event handlers
    this.window.on('ready-to-show', () => {
      logger.debug('Widget window ready to show');
      if (this.window && !this.window.isDestroyed()) {
        // Ensure skipTaskbar is set
        this.window.setSkipTaskbar(true);
        this.window.hide();
        if (!this.devToolsOpen) {
          console.log('setIgnoreMouseEvents toggled: true');
          this.window.setIgnoreMouseEvents(true, { forward: true });
        }
        this.window.setAlwaysOnTop(true, 'screen-saver');
      }
    });

    this.window.on('show', () => {
      logger.debug('Widget window shown, ensuring click-through');
      if (this.window && !this.window.isDestroyed()) {
        if (!this.devToolsOpen) {
          console.log('setIgnoreMouseEvents toggled: true');
          this.window.setIgnoreMouseEvents(true, { forward: true });
        }
        this.window.setAlwaysOnTop(true, 'screen-saver');
        // Force focus and bring to front
        setTimeout(() => {
          if (this.window && !this.window.isDestroyed()) {
            this.window.focus();
            this.window.setAlwaysOnTop(false); // Reset
            this.window.setAlwaysOnTop(true, 'screen-saver'); // Re-apply
          }
        }, 50);
      }
    });

    this.window.on('focus', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.setAlwaysOnTop(true, 'screen-saver');
      }
    });

    this.window.on('closed', () => {
      logger.info('Widget window closed');
    });

    // Listen for mouse events to enable/disable click-through dynamically
    this.window.webContents.on('dom-ready', () => {
      try {
        this.window.webContents.executeJavaScript(`
        // Track click-through state
        window.isClickThroughEnabled = false;
        
        // Function to enable click-through
        window.enableClickThrough = () => {
          window.isClickThroughEnabled = true;
          // console.log('Click-through enabled via renderer');
        };
        
        // Function to disable click-through
        window.disableClickThrough = () => {
          window.isClickThroughEnabled = false;
          // console.log('Click-through disabled via renderer');
        };
        
        // Function to toggle click-through
        window.toggleClickThrough = () => {
          window.isClickThroughEnabled = !window.isClickThroughEnabled;
          // console.log('Click-through toggled:', window.isClickThroughEnabled);
        };
        
        // Expose functions globally
        window.widgetClickThrough = {
          enable: window.enableClickThrough,
          disable: window.disableClickThrough,
          toggle: window.toggleClickThrough,
          isEnabled: () => window.isClickThroughEnabled
        };
        
        // console.log('Widget click-through functions initialized');
        `);
      } catch (error) {
        console.error('Error setting up widget click-through functions:', error);
      }
    });
  }

  setIgnoreMouseEvents(ignore, options = {}) {
    console.log(`setIgnoreMouseEvents toggled: ${ignore}`);
    logger.debug(`Setting ignore mouse events: ${ignore}`, { options });
    
    // When ignore is true, we want click-through (forward events to underlying apps)
    // When ignore is false, we want interaction with our window
    this.window.setIgnoreMouseEvents(ignore, { 
      forward: options.forward || true,
      ignore: ignore 
    });
    
    // Additional settings for better click-through behavior
    if (ignore) {
      // When click-through is enabled, ensure window doesn't steal focus
      this.window.setFocusable(false);
      this.window.setFocusable(true);
    }
  }

  setContentProtection(enabled) {
    this.window.setContentProtection(enabled);
  }

  toggleUndetectability() {
    this.undetectabilityEnabled = !this.undetectabilityEnabled;
    this.setContentProtection(this.undetectabilityEnabled);
    // Keep skipTaskbar always true to hide from Alt+Tab
    this.window.setSkipTaskbar(true);
    
    // Ensure window stays fullscreen when toggling undetectability
    if (this.window.isFullScreen()) {
      this.window.setFullScreen(true);
    }
    
    return this.undetectabilityEnabled;
  }

  show() {
    // Ensure skipTaskbar is set before showing
    this.window.setSkipTaskbar(true);
    
    // Windows-specific: Additional measures to stay hidden from Alt+Tab
    if (isWindows) {
      this.window.setAlwaysOnTop(true, "screen-saver", 1);
    }
    
    this.window.show();
  }

  hide() {
    this.window.hide();
  }

  focus() {
    this.window.focus();
  }

  close() {
    this.window.close();
  }

  minimize() {
    this.window.minimize();
  }

  maximize() {
    this.window.maximize();
  }

  isDestroyed() {
    return this.window.isDestroyed();
  }

  isVisible() {
    return this.window.isVisible();
  }

  isMaximized() {
    return this.window.isMaximized();
  }

  reload() {
    this.window.reload();
  }

  toggleDevTools() {
    if (this.window.webContents.isDevToolsOpened()) {
      this.window.webContents.closeDevTools();
    } else {
      this.window.webContents.openDevTools({ mode: 'detach' });
    }
  }

  sendToWebContents(channel, data) {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }
}

// Undetectable Widget Window Class END !!! ---------------------------------------------------------------------------------------------------

// Auth Window Creation Function !!! ---------------------------------------------------------------------------------------------------

let authCompletePromise = null;
let authCompleteResolver = null;

function createAuthWindow() {
  return new Promise((resolve, reject) => {
    // If auth window already exists, focus it
    if (authWindow && !authWindow.isDestroyed()) {
      logger.info('Auth window already exists, focusing it');
      authWindow.focus();
      // Return existing promise if available
      if (authCompletePromise) {
        authCompletePromise.then(resolve).catch(reject);
      } else {
        resolve({ success: false, message: 'Auth window exists but no promise available' });
      }
      return;
    }

    // Create promise for auth completion
    authCompletePromise = new Promise((innerResolve) => {
      authCompleteResolver = innerResolve;
    });
    
    // Chain the promise resolution
    authCompletePromise.then(resolve).catch(reject);

    logger.info('Creating auth window');

    // Create auth window
    authWindow = new BrowserWindow({
      width: 500,
      height: 700,
      show: false,
      frame: false,
      autoHideMenuBar: true,
      icon: icon,
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        sandbox: false,
        contextIsolation: true,
        devTools: true,
      },
      modal: true,
      resizable: false,
    });

    authWindow.on('ready-to-show', () => {
      authWindow.show();
      authWindow.focus();
    });

    // Load auth window
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      const baseUrl = process.env['ELECTRON_RENDERER_URL'];
      const authUrl = baseUrl.endsWith('/') ? baseUrl + '?windowName=auth-window' : baseUrl + '/?windowName=auth-window';
      logger.debug('Loading auth window from URL', { url: authUrl });
      authWindow.loadURL(authUrl);
    } else {
      // Ensure HTTP server is created, then load via HTTP
      createServer().then(() => {
        const authUrl = 'http://127.0.0.1:19029/?windowName=auth-window';
        logger.debug('Loading auth window from HTTP server', { url: authUrl });
        authWindow.loadURL(authUrl);
      }).catch((error) => {
        logger.error('Failed to create server for auth window', error);
        reject(error);
      });
    }

    // Handle window close - if closed before auth, reject
    authWindow.on('closed', () => {
      if (authCompleteResolver) {
        logger.warn('Auth window closed before authentication completed');
        authWindow = null;
        authCompleteResolver = null;
      }
    });
  });
}

// Function to restart authentication flow
async function restartAuthFlow() {
  logger.info('Restarting authentication flow - destroying windows and reopening auth window');
  
  // Set flag to prevent app from quitting
  isRestartingAuth = true;
  
  // Clear stored token
  authToken = null;
  
  // Clear auth resolver if it exists
  authCompleteResolver = null;
  authCompletePromise = null;
  
  // Create auth window FIRST to prevent app from quitting when other windows close
  logger.info('Creating new auth window after sign out');
  
  // Start creating the auth window - the BrowserWindow object is created synchronously
  // so it will exist immediately, preventing app quit
  const authWindowPromise = createAuthWindow();
  
  // Wait a moment for the window to be created (BrowserWindow is created synchronously,
  // but we wait a bit to ensure it's ready)
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Now destroy other windows - auth window already exists
  // Destroy widget window
  if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed()) {
    try {
      logger.info('Destroying widget window for auth restart');
      widgetWindow.window.destroy();
      widgetWindow = null;
    } catch (error) {
      logger.error('Error destroying widget window during auth restart', error);
    }
  }
  
  // Destroy main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      logger.info('Destroying main window for auth restart');
      mainWindow.destroy();
      mainWindow = null;
    } catch (error) {
      logger.error('Error destroying main window during auth restart', error);
    }
  }
  
  // Handle auth completion in the background
  authWindowPromise
    .then((authResult) => {
      // Clear the flag after auth completes
      isRestartingAuth = false;
      
      if (authResult && authResult.success) {
        logger.info('Re-authentication successful, creating main and widget windows');
        createMainAndWidgetWindows();
      } else {
        logger.error('Re-authentication failed or was cancelled');
        isRestartingAuth = false;
        app.quit();
      }
    })
    .catch((error) => {
      logger.error('Error in auth window promise', error);
      isRestartingAuth = false;
      app.quit();
    });
  
  // Note: We don't await the authWindowPromise here - the window is already created
  // and will prevent app quit. The promise resolves when auth completes.
}

// IPC handler for sign out
ipcMain.handle('auth:signOut', async () => {
  logger.info('Sign out requested');
  await restartAuthFlow();
  return { success: true };
});

// IPC handler for auth completion
ipcMain.on('auth-complete', async (event, tokenOrData) => {
  // Handle both direct token string and object with token property
  let token = null;
  
  if (typeof tokenOrData === 'string') {
    // Direct token string
    token = tokenOrData;
  } else if (tokenOrData && typeof tokenOrData === 'object') {
    // Handle different payload structures:
    // - { token: "..." }
    // - { payload: { token: "..." } }
    token = tokenOrData.token || (tokenOrData.payload && tokenOrData.payload.token);
  }
  
  logger.info('Auth complete received, token:', token ? 'present' : 'missing');
  logger.debug('Token data structure:', { 
    type: typeof tokenOrData, 
    isString: typeof tokenOrData === 'string',
    hasToken: !!(tokenOrData && tokenOrData.token),
    hasPayload: !!(tokenOrData && tokenOrData.payload)
  });
  
  if (!token) {
    logger.error('Auth complete received but no token found in payload', { tokenOrData });
    return;
  }
  
  // Store the token globally for use in API calls
  authToken = token;
  logger.info('Authentication token stored successfully');
  
  if (authCompleteResolver) {
    // Resolve the auth promise with success
    logger.info('Resolving auth promise and closing auth window');
    authCompleteResolver({ token, success: true });
    authCompleteResolver = null;
    
    // Close auth window after a brief delay to ensure message is processed
    setTimeout(() => {
      if (authWindow && !authWindow.isDestroyed()) {
        logger.info('Closing auth window after successful authentication');
        authWindow.close();
        authWindow = null;
      }
    }, 200);
  } else {
    logger.warn('Auth complete received but no resolver available - auth window may have been closed');
  }
});

// Auth Window Creation Function END !!! ---------------------------------------------------------------------------------------------------

async function createWidgetWindow() {
  // Check if widget window already exists and is not destroyed
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    logger.info('Widget window already exists, focusing it');
    try {
      widgetWindow.focus();
    } catch (error) {
      logger.error('Error focusing widget window', error);
    }
    return;
  }

  // Create widget window using the undetectable window class
  widgetWindow = new UndetectableWidgetWindow({
    undetectabilityEnabled: widgetUndetectabilityEnabled,
    isRecorded: isRecorded
  });

  logger.info('Widget window created', { undetectabilityEnabled: widgetUndetectabilityEnabled });

  // Load the widget window with proper React support
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const baseUrl = process.env['ELECTRON_RENDERER_URL'];
    const widgetUrl = baseUrl.endsWith('/') ? baseUrl + '?windowName=overlay-window' : baseUrl + '/?windowName=overlay-window';
    logger.debug('Loading widget from URL', { url: widgetUrl });
    widgetWindow.window.loadURL(widgetUrl).catch((error) => {
      logger.error('Failed to load widget URL', error);
    });
  } else {
    // Ensure HTTP server is created, then load via HTTP
    await createServer();
    const widgetUrl = 'http://127.0.0.1:19029/?windowName=overlay-window';
    logger.debug('Loading widget from HTTP server', { url: widgetUrl });
    widgetWindow.window.loadURL(widgetUrl).catch((error) => {
      logger.error('Failed to load widget from HTTP server', error);
    });

    widgetWindow.window.setMenuBarVisibility(false);
    widgetWindow.window.setPosition(0, 0);
    widgetWindow.window.setSize(1200, 800);
  }
  
  // Show the widget window by default when application starts
  if (widgetWindow && widgetWindow.window) {
    widgetWindow.window.once('ready-to-show', () => {
      logger.info('Widget window ready to show, showing by default');
      try {
        widgetWindow.show();
        // Set up proper overlay behavior
        setTimeout(() => {
          if (widgetWindow && !widgetWindow.isDestroyed()) {
            console.log('setIgnoreMouseEvents toggled: true');
            widgetWindow.setIgnoreMouseEvents(true, { forward: true });
            widgetWindow.window.setAlwaysOnTop(true);
            logger.debug('Widget window shown and configured for overlay mode');
            
            // Send saved overlay type to widget window
            if (store) {
              const savedOverlayType = store.get('selectedOverlayType', 'leadflow');
              logger.info('Sending saved overlay type to widget window', { savedOverlayType });
              widgetWindow.window.webContents.send('eventFromMain', {
                eventName: 'overlay:setOverlayType',
                payload: savedOverlayType
              });
            }
          }
        }, 500);
      } catch (error) {
        logger.error('Error showing widget window on startup:', error);
      }
    });
  }
}

// Function to safely recreate widget window
function recreateWidgetWindow() {
  try {
    logger.info('Recreating widget window');
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.close();
    }
    setTimeout(() => {
      createWidgetWindow();
    }, 100);
  } catch (error) {
    logger.error('Error recreating widget window', error);
  }
}

// Function to create main and widget windows
async function createMainAndWidgetWindows() {
  logger.info('Creating main and widget windows');
  
  // Creating Main Window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false, // Remove default titlebar
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      devTools: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates only after main window is ready and shown
    // This ensures updates are checked in the main window, not the auth window
    // Only check for updates in production builds (packaged apps)
    const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DISABLE_UPDATER === '1';
    if ((app.isPackaged || isDev) && autoUpdater) {
      logger.info('[AutoUpdater] Main window ready, checking for updates...');
      autoUpdater.checkForUpdates().catch((e) => {
        logger.warn('[AutoUpdater] Failed to check for updates:', e);
      });
    } else {
      logger.debug('[AutoUpdater] Skipping update check - not in production build or dev mode');
    }
  });

  // Loading HTML and Configuring the Main Window
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const baseUrl = process.env['ELECTRON_RENDERER_URL'];
    const mainUrl = baseUrl.endsWith('/') ? baseUrl + '?windowName=main-window' : baseUrl + '/?windowName=main-window';
    logger.debug('Loading main window from URL', { url: mainUrl });
    mainWindow.loadURL(mainUrl);
  } else {
    // Start HTTP server and load via HTTP to ensure window.location.protocol is 'http:'
    await createServer();
    const mainUrl = 'http://127.0.0.1:19029/?windowName=main-window';
    logger.debug('Loading main window from HTTP server', { url: mainUrl });
    mainWindow.loadURL(mainUrl);
  }

  mainWindow.setMenuBarVisibility(false);

  // Handle main window close event - hide instead of quit
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      logger.info('Main window closed, hiding instead of quitting');
      
      // Close widget window when main window is closed
      if (widgetWindow && !widgetWindow.isDestroyed()) {
        try {
          logger.info('Closing widget window due to main window close');
          widgetWindow.close();
        } catch (error) {
          logger.error('Error closing widget window when main window closed:', error);
        }
      }
      
      mainWindow.hide();
    }
  });

  // Create widget window
  createWidgetWindow();

  // Create tray
  createTray();

  // Register Protocol with the Windows
  if (process.platform === 'win32') {
    const urlArg = process.argv.find(arg => arg.startsWith('overlaylab://'));
    if (urlArg) {
      logger.info('Protocol URL found in arguments', { url: urlArg });
      mainWindow.webContents.once('did-finish-load', () => {
        handleWebEventTrigger(urlArg)
      });
    }
  }
}

// Window Creation Functions END !!! ------------------------------------------------------------------------------------------------------

// IPC Handle Section !!! ------------------------------------------------------------------------------------------------------

// Screenshot capture and save handler
const { nativeImage, desktopCapturer, screen } = require('electron');

// Global shortcut screenshot function with cooldown
async function handleGlobalScreenshot() {
  const now = Date.now();
  const cooldownTime = 1000; // 1 second cooldown
  
  if (now - lastScreenshotTime < cooldownTime) {
    console.log('Screenshot on cooldown, ignoring request');
    return;
  }
  
  lastScreenshotTime = now;
  
  // Mark screenshot process as active
  screenshotProcessActive = true;
  console.log('Screenshot process started - marking as active');
  
  try {
    // Send processing notification to widget window if it exists
    if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed() && widgetWindow.window.webContents) {
      try {
        console.log('Sending screenshot-processing event to widget window');
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'screenshot-processing',
          payload: { status: 'processing', timestamp: now }
        });
        console.log('Screenshot-processing event sent successfully');
      } catch (sendError) {
        console.warn('Failed to send processing notification to widget:', sendError);
      }
    } else {
      console.warn('Widget window not available for processing notification:', {
        exists: !!widgetWindow,
        hasWindow: widgetWindow ? !!widgetWindow.window : 'N/A',
        windowDestroyed: widgetWindow && widgetWindow.window ? widgetWindow.window.isDestroyed() : 'N/A',
        hasWebContents: widgetWindow && widgetWindow.window ? !!widgetWindow.window.webContents : 'N/A'
      });
    }
    
    const result = await captureScreenshot();
    
    // Send success notification with image data to widget window if it exists
    if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed() && widgetWindow.window.webContents) {
      try {
        const hasImageData = !!result.imageData;
        const imageSize = result.imageData ? result.imageData.length : 0;
        
        console.log(`[Screenshot] Sending screenshot-taken event to widget - Has image data: ${hasImageData}, Size: ${result.base64SizeKB} KB`);
        logger.info('Sending screenshot to overlay window', { 
          hasImageData, 
          imageSizeKB: result.base64SizeKB
        });
        
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'screenshot-taken',
          payload: { 
            success: true, 
            timestamp: now,
            imageData: result.imageData,
            resolution: result.resolution,
            imageSizeKB: result.imageSizeKB
          }
        });
        console.log('[Screenshot] screenshot-taken event sent successfully');
        
        // Send detailed image processing event
        console.log('[Screenshot] Sending screenshot-image-captured event for detailed processing');
        logger.debug('Sending detailed screenshot event', {
          hasImageData,
          resolution: result.resolution
        });
        
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'screenshot-image-captured',
          payload: {
            imageBlob: {
              size: result.imageData ? result.imageData.length : 0,
              type: 'image/png',
              timestamp: now,
              base64Length: result.imageData ? result.imageData.replace('data:image/png;base64,', '').length : 0
            },
            imageDataUrl: result.imageData,
            resolution: result.resolution,
            captureMethod: 'global-shortcut',
            imageSizeKB: result.imageSizeKB,
            base64SizeKB: result.base64SizeKB
          }
        });
        console.log('[Screenshot] screenshot-image-captured event sent successfully');
        logger.info('Screenshot events sent to overlay successfully');
      } catch (sendError) {
        console.error('[Screenshot] ❌ Failed to send screenshot to widget:', sendError);
        logger.error('Failed to send screenshot to overlay', { 
          error: sendError.message, 
          stack: sendError.stack,
          imageSizeKB: result.base64SizeKB
        });
      }
    } else {
      console.warn('Widget window not available for success notification:', {
        exists: !!widgetWindow,
        hasWindow: widgetWindow ? !!widgetWindow.window : 'N/A',
        windowDestroyed: widgetWindow && widgetWindow.window ? widgetWindow.window.isDestroyed() : 'N/A',
        hasWebContents: widgetWindow && widgetWindow.window ? !!widgetWindow.window.webContents : 'N/A'
      });
    }
    
    console.log('Global shortcut screenshot captured successfully:', result);
    return result;
  } catch (error) {
    console.error('Global shortcut screenshot failed:', error);
    
    // Send error notification to widget window if it exists
    if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed() && widgetWindow.window.webContents) {
      try {
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'screenshot-error',
          payload: { success: false, error: error.message }
        });
      } catch (sendError) {
        console.warn('Failed to send error notification to widget:', sendError);
      }
    }
    
    return null;
  } finally {
    // Mark screenshot process as inactive
    screenshotProcessActive = false;
    console.log('Screenshot process completed - marking as inactive');
  }
}

// Extracted screenshot capture logic for reuse
async function captureScreenshot() {
  try {
    console.log('[Screenshot] captureScreenshot function called.');
    
    // Get the primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;
    console.log(`[Screenshot] Primary display size: ${width}x${height}`);
    
    // Get all available sources (screens) with full resolution thumbnails
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: { width: width, height: height }
    });
    if (!sources.length) {
      throw new Error('No screens found');
    }
    
    // Use the first screen (primary screen)
    const source = sources[0];
    console.log(`[Screenshot] Using screen source: ${source.name}`);
    
    // Get the full resolution thumbnail (screenshot) from the source
    const image = source.thumbnail;
    const actualSize = image.getSize();
    console.log(`[Screenshot] Captured image size: ${actualSize.width}x${actualSize.height}`);
    const buffer = image.toPNG();
    
    // Convert buffer to base64 for sending to overlay window
    const base64Image = buffer.toString('base64');
    const imageDataUrl = `data:image/png;base64,${base64Image}`;
    
    // Log image data size for debugging production issues
    const imageSizeKB = (buffer.length / 1024).toFixed(2);
    const base64SizeKB = (imageDataUrl.length / 1024).toFixed(2);
    console.log(`[Screenshot] Image sizes - Original: ${imageSizeKB} KB, Base64: ${base64SizeKB} KB`);
    logger.info(`Screenshot captured - Original: ${imageSizeKB} KB, Base64: ${base64SizeKB} KB, Resolution: ${actualSize.width}x${actualSize.height}`);
    
    // For very large images (>50MB base64), we might need to implement chunking in the future
    // For now, we'll try to send all images directly since we're not saving to disk
    const maxSafeSize = 50 * 1024 * 1024; // 50MB threshold for warning
    if (imageDataUrl.length > maxSafeSize) {
      logger.warn(`Screenshot base64 size (${base64SizeKB} KB) is very large. May cause IPC performance issues.`);
      console.warn(`[Screenshot] ⚠️ Large image (${base64SizeKB} KB). Monitor for performance issues.`);
    }
    
    return { 
      success: true, 
      resolution: actualSize,
      imageData: imageDataUrl,
      imageSizeKB: parseFloat(imageSizeKB),
      base64SizeKB: parseFloat(base64SizeKB)
    };
  } catch (err) {
    console.error('[Screenshot] Failed to capture or save screenshot:', err);
    logger.error('Screenshot capture failed', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
}

ipcMain.handle('capture-and-save-screenshot', async (event) => {
  console.log('[Screenshot] capture-and-save-screenshot IPC handler called.');
  const now = Date.now();
  
  // Mark screenshot process as active
  screenshotProcessActive = true;
  console.log('Screenshot process started - marking as active');
  
  try {
    // Send processing notification to widget window if it exists (same as global shortcut)
    if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed() && widgetWindow.window.webContents) {
      try {
        console.log('Sending screenshot-processing event to widget window');
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'screenshot-processing',
          payload: { status: 'processing', timestamp: now }
        });
        console.log('Screenshot-processing event sent successfully');
      } catch (sendError) {
        console.warn('Failed to send processing notification to widget:', sendError);
      }
    }
    
    const result = await captureScreenshot();
    
    // Send success notification with image data to widget window (same as global shortcut)
    if (result.success && widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed() && widgetWindow.window.webContents) {
      try {
        console.log('Sending screenshot-taken event with image data to widget window');
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'screenshot-taken',
          payload: { 
            success: true, 
            timestamp: now,
            imageData: result.imageData,
            resolution: result.resolution,
            filePath: result.filePath
          }
        });
        console.log('Screenshot-taken event with image data sent successfully');
        
        // Send detailed image processing event
        console.log('Sending screenshot-image-captured event for detailed processing');
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'screenshot-image-captured',
          payload: {
            imageBlob: {
              size: result.imageData ? result.imageData.length : 0,
              type: 'image/png',
              timestamp: now,
              base64Length: result.imageData ? result.imageData.replace('data:image/png;base64,', '').length : 0
            },
            imageDataUrl: result.imageData,
            resolution: result.resolution,
            filePath: result.filePath,
            captureMethod: 'button-click'
          }
        });
        console.log('Screenshot-image-captured event sent for detailed processing');
      } catch (sendError) {
        console.warn('Failed to send success notification to widget:', sendError);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Screenshot failed:', error);
    
    // Send error notification to widget window if it exists (same as global shortcut)
    if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed() && widgetWindow.window.webContents) {
      try {
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'screenshot-error',
          payload: { success: false, error: error.message }
        });
      } catch (sendError) {
        console.warn('Failed to send error notification to widget:', sendError);
      }
    }
    
    return { success: false, error: error.message };
  } finally {
    // Mark screenshot process as inactive
    screenshotProcessActive = false;
    console.log('Screenshot process completed - marking as inactive');
  }
});

// New IPC handler for validating screenshot requests (for global shortcut)
ipcMain.handle('validate-and-capture-screenshot', async (event) => {
  console.log('[Screenshot] validate-and-capture-screenshot IPC handler called from global shortcut.');
  
  // Send validation request to widget window first
  if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed() && widgetWindow.window.webContents) {
    try {
      console.log('Sending screenshot validation request to widget window');
      widgetWindow.window.webContents.send('eventFromMain', {
        eventName: 'validate-screenshot-request',
        payload: { source: 'global-shortcut', timestamp: Date.now() }
      });
      return { success: true, message: 'Validation request sent to overlay' };
    } catch (sendError) {
      console.warn('Failed to send validation request to widget:', sendError);
      return { success: false, error: 'Failed to communicate with overlay window' };
    }
  } else {
    console.warn('Widget window not available for validation');
    return { success: false, error: 'Overlay window not available' };
  }
});

// IPC handler for when overlay confirms screenshot should proceed
ipcMain.handle('proceed-with-screenshot', async (event, source) => {
  console.log(`[Screenshot] proceed-with-screenshot called from ${source}`);
  return await handleGlobalScreenshot();
});

// IPC handler to check if screenshot process is active
ipcMain.handle('get-screenshot-process-status', async (event) => {
  return { active: screenshotProcessActive };
});



ipcMain.handle('get-ip-address', async (event) => {
});


ipcMain.handle('store-data', (event, key, value) => {
  storeStoreData(key, value);
});

ipcMain.handle('store-has', (event, key) => {
  return storeHas(key);
});

ipcMain.handle('get-data', (event, key) => {
  return storeGetData(key);
});

ipcMain.handle('delete-data', (event, key) => {
  storeDeleteData(key);
});

// Settings IPC Handlers
ipcMain.handle('settings:getOverlayRecordable', (event) => {
  return isRecorded;
});

ipcMain.handle('settings:setOverlayRecordable', (event, value) => {
  isRecorded = value;
  storeStoreData('isRecorded', value);
  logger.info('Updated isRecorded setting', { isRecorded: value });
  return { success: true };
});

// Overlay selector IPC handlers
ipcMain.handle('overlay:openSelector', (event) => {
  logger.debug('Overlay selector open requested');
  if (widgetWindow && widgetWindow.window && !widgetWindow.isDestroyed()) {
    // Ensure window is visible
    if (!widgetWindow.isVisible()) {
      widgetWindow.show();
    }
    // Focus the window to make it active
    widgetWindow.focus();
    widgetWindow.window.webContents.send('overlay:openSelector');
    return { success: true };
  }
  return { success: false, error: 'Widget window not available' };
});

ipcMain.handle('overlay:saveOverlayType', (event, overlayType) => {
  logger.info('Saving overlay type', { overlayType });
  if (store) {
    store.set('selectedOverlayType', overlayType);
    logger.info('Overlay type saved to store', { overlayType });
    return { success: true };
  }
  return { success: false, error: 'Store not available' };
});

ipcMain.handle('overlay:getOverlayType', (event) => {
  if (store) {
    const overlayType = store.get('selectedOverlayType', 'leadflow');
    logger.debug('Retrieved overlay type from store', { overlayType });
    return { success: true, overlayType };
  }
  return { success: false, overlayType: 'leadflow' };
});

ipcMain.handle('settings:restartApp', () => {
  logger.info('[Settings] Restart requested by user - closing all windows');
  
  // Schedule the restart FIRST before closing windows
  app.relaunch();
  
  // Set quitting flag to allow windows to close
  app.isQuiting = true;
  
  // Close widget/overlay window first
  if (widgetWindow) {
    try {
      if (!widgetWindow.isDestroyed()) {
        logger.info('[Settings] Closing widget/overlay window');
        widgetWindow.window.destroy(); // Use destroy for immediate cleanup
      }
      widgetWindow = null;
    } catch (error) {
      logger.error('[Settings] Error closing widget window:', error);
    }
  }
  
  // Close main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      logger.info('[Settings] Closing main window');
      mainWindow.destroy(); // Use destroy for immediate cleanup
    } catch (error) {
      logger.error('[Settings] Error closing main window:', error);
    }
  }
  
  // Clean up tray if it exists
  if (tray) {
    try {
      logger.info('[Settings] Destroying tray');
      tray.destroy();
      tray = null;
    } catch (error) {
      logger.error('[Settings] Error destroying tray:', error);
    }
  }
  
  // Small delay to ensure windows are fully closed before quitting
  setTimeout(() => {
    logger.info('[Settings] All windows closed, quitting application (restart scheduled)');
    app.quit();
  }, 100);
});


ipcMain.handle('show-dialog', async (event, dialogType, dialogTitle, dialogMessage) => {
  await dialog.showMessageBox({
    type: dialogType,
    title: dialogTitle,
    message: dialogMessage
  })

  return;
});



ipcMain.handle('start-agent', (event, agentId) => {

})

ipcMain.handle('stop-agent', (event, agentId) =>{

})



// DB IPC handlers removed temporarily

// Custom titlebar handlers
ipcMain.handle('window:close', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Renderer process logging
ipcMain.handle('renderer-log', async (event, level, component, message, data = null) => {
  const logMessage = `[RENDERER:${component}] ${message}`;
  
  switch (level) {
    case 'info':
      logger.info(logMessage, data || '');
      break;
    case 'debug':
      logger.debug(logMessage, data || '');
      break;
    case 'warn':
      logger.warn(logMessage, data || '');
      break;
    case 'error':
      logger.error(logMessage, data || '');
      break;
    default:
      logger.info(logMessage, data || '');
  }
  
  return { success: true };
});

// Open external URLs
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    logger.error('Failed to open external URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('window:quit', () => {
  logger.info('IPC window:quit called - forcing application exit');
  
  // Set quitting flag to prevent window close event from hiding the window
  app.isQuiting = true;
  
  // Clean up auth window first if it exists
  if (authWindow) {
    try {
      if (!authWindow.isDestroyed()) {
        logger.info('Destroying auth window from IPC quit');
        authWindow.destroy();
      }
      authWindow = null;
    } catch (error) {
      logger.error('Error destroying auth window during IPC quit:', error);
    }
  }
  
  // Clean up widget window
  if (widgetWindow) {
    try {
      if (!widgetWindow.isDestroyed()) {
        logger.info('Destroying widget window from IPC quit');
        widgetWindow.window.destroy(); // Use destroy for immediate cleanup
      }
      widgetWindow = null;
    } catch (error) {
      logger.error('Error destroying widget window during IPC quit:', error);
    }
  }
  
  // Close main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.destroy();
    } catch (error) {
      logger.error('Error destroying main window during IPC quit:', error);
    }
  }
  
  // Clean up tray
  if (tray) {
    try {
      tray.destroy();
      tray = null;
    } catch (error) {
      logger.error('Error destroying tray during IPC quit:', error);
    }
  }
  
  // Unregister all shortcuts
  try {
    globalShortcut.unregisterAll();
  } catch (error) {
    logger.error('Error unregistering shortcuts during IPC quit:', error);
  }
  
  // Force exit the app
  logger.info('Forcing application exit from IPC');
  app.exit(0);
});

ipcMain.handle('window:minimize', () => {
  // If auth window exists and is not destroyed, minimize it
  if (authWindow && !authWindow.isDestroyed()) {
    logger.debug('Minimizing auth window');
    authWindow.minimize();
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    logger.debug('Minimizing main window');
    mainWindow.minimize();
  } else {
    logger.warn('No window available to minimize');
  }
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

// Widget window handlers
ipcMain.handle('widget:close', () => {
  try {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      logger.info('Closing widget window');
      widgetWindow.close();
      return true;
    } else {
      logger.warn('Widget window is not available or already destroyed');
      return false;
    }
  } catch (error) {
    logger.error('Error closing widget window', error);
    return false;
  }
});

ipcMain.handle('widget:minimize', () => {
  try {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.minimize();
      return true;
    } else {
      console.log('Widget window is not available or already destroyed');
      return false;
    }
  } catch (error) {
    console.error('Error minimizing widget window:', error);
    return false;
  }
});

ipcMain.handle('widget:maximize', () => {
  try {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      if (widgetWindow.isMaximized()) {
        widgetWindow.unmaximize();
      } else {
        widgetWindow.maximize();
      }
      return true;
    } else {
      console.log('Widget window is not available or already destroyed');
      return false;
    }
  } catch (error) {
    console.error('Error maximizing widget window:', error);
    return false;
  }
});

ipcMain.handle('widget:show', () => {
  try {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      logger.info('Showing widget window');
      widgetWindow.show();
      return true;
    } else {
      logger.info('Widget window is not available or already destroyed, creating new one');
      createWidgetWindow();
      return true;
    }
  } catch (error) {
    logger.error('Error showing widget window', error);
    return false;
  }
});

ipcMain.handle('widget:hide', () => {
  try {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.hide();
      return true;
    } else {
      console.log('Widget window is not available or already destroyed');
      return false;
    }
  } catch (error) {
    console.error('Error hiding widget window:', error);
    return false;
  }
});

ipcMain.handle('widget:setIgnoreMouseEvents', async (event, ignore, options) => {
  try {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      // Handle the options parameter safely
      if (ignore) {
        // When enabling click-through, use forward: true
        console.log('setIgnoreMouseEvents toggled: true');
        widgetWindow.setIgnoreMouseEvents(true, { forward: true });
      } else {
        // When disabling click-through, just pass false
        console.log('setIgnoreMouseEvents toggled: false');
        widgetWindow.setIgnoreMouseEvents(false);
      }
      return true;
    } else {
      console.log('Widget window is not available or already destroyed');
      return false;
    }
  } catch (error) {
    console.error('Error setting ignore mouse events:', error);
    return false;
  }
});

// Setup flow removed; app opens main renderer directly

// Finalizing agent handler
ipcMain.handle('finalizing-agent', async () => {
  logger.info('Finalizing agent event triggered');
  try {
    const result = await FinalizeAgent();
    return result;
  } catch (error) {
    logger.error('Error in finalizing agent', { error: error.message });
    return false;
  }
});

// Widget undetectability handlers
ipcMain.handle('widget:toggleUndetectability', () => {
  if (widgetWindow) {
    const newState = widgetWindow.toggleUndetectability();
    widgetUndetectabilityEnabled = newState;
    return newState;
  }
  return false;
});

ipcMain.handle('widget:setContentProtection', (event, enabled) => {
  if (widgetWindow) {
    widgetWindow.setContentProtection(enabled);
    return true;
  }
  return false;
});

ipcMain.handle('widget:getUndetectabilityState', () => {
  return widgetUndetectabilityEnabled;
});

// Click-through control handlers for main window
ipcMain.handle('window:setClickThrough', (event, clickThrough) => {
  if (mainWindow) {
    console.log(`setIgnoreMouseEvents toggled: ${clickThrough}`);
    mainWindow.setIgnoreMouseEvents(clickThrough, { forward: true });
  }
});

ipcMain.handle('window:enableInteraction', () => {
  if (mainWindow) {
    console.log('setIgnoreMouseEvents toggled: false');
    mainWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.handle('window:disableInteraction', () => {
  if (mainWindow) {
    console.log('setIgnoreMouseEvents toggled: true');
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});

// Update download handler
ipcMain.handle('update:download', async () => {
  logger.info('[AutoUpdater] Download requested by user');
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    logger.error('[AutoUpdater] Error downloading update:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// Update restart handler
ipcMain.handle('update:restart', () => {
  logger.info('[AutoUpdater] Restart requested by user - closing all windows');
  
  // Set quitting flag to allow windows to close
  app.isQuiting = true;
  
  // Close widget/overlay window first
  if (widgetWindow) {
    try {
      if (!widgetWindow.isDestroyed()) {
        logger.info('[AutoUpdater] Closing widget/overlay window');
        widgetWindow.window.destroy(); // Use destroy for immediate cleanup
      }
      widgetWindow = null;
    } catch (error) {
      logger.error('[AutoUpdater] Error closing widget window:', error);
    }
  }
  
  // Close main window
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      logger.info('[AutoUpdater] Closing main window');
      mainWindow.destroy(); // Use destroy for immediate cleanup
    } catch (error) {
      logger.error('[AutoUpdater] Error closing main window:', error);
    }
  }
  
  // Clean up tray if it exists
  if (tray) {
    try {
      logger.info('[AutoUpdater] Destroying tray');
      tray.destroy();
      tray = null;
    } catch (error) {
      logger.error('[AutoUpdater] Error destroying tray:', error);
    }
  }
  
  // Small delay to ensure windows are fully closed before quitting
  setTimeout(() => {
    logger.info('[AutoUpdater] All windows closed, restarting for update');
    autoUpdater.quitAndInstall();
  }, 100);
});

// Get app version handler
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getResourcePath', (event, relativePath) => {
  const path = require('path');
  return path.join(__dirname, '..', 'resources', relativePath).replace(/\\/g, '/');
});

// WSL Setup APIs
ipcMain.handle('installWSL', async () => {
  try {
    await ConfigSetupWslBeforeRestart();
    return { success: true };
  } catch (error) {
    console.error('Error installing WSL:', error);
    throw error;
  }
});

// Check if WSL is installed
ipcMain.handle('checkWSL', async () => {
  try {
    const status = await GetWslSTATUS();
    const statusOutput = status.toString().replace(/\x00/g, '').trim();
    
    // Check if WSL is properly installed (no error messages)
    const enableVMPStatement = `Please enable the "Virtual Machine Platform" optional component and ensure virtualization is enabled in the BIOS.`;
    const commandToEnableStatement = `Enable "Virtual Machine Platform" by running: wsl.exe --install --no-distribution For information please visit https://aka.ms/enablevirtualization`;
    
    if (statusOutput.includes(enableVMPStatement) || statusOutput.includes(commandToEnableStatement)) {
      return false; // WSL needs installation
    }
    
    // Check if status contains error indicators
    if (statusOutput.toLowerCase().includes('error') || statusOutput.toLowerCase().includes('not found')) {
      return false;
    }
    
    return true; // WSL is installed
  } catch (error) {
    console.error('Error checking WSL:', error);
    return false;
  }
});

// Global flag to prevent concurrent WSL configuration
let wslConfigurationInProgress = false;

ipcMain.handle('checkWslConfigDone', async () => {
  if (wslConfigurationInProgress) {
    logger.warn('WSL configuration already in progress, returning');
    return false;
  }
  
  wslConfigurationInProgress = true;
  try {
    logger.info('Starting WSL configuration process');
    const result = await checkAndConfigureWslDistro('Ubuntu-22.04');
    logger.info('WSL configuration process completed', { result });
    return result;
  } catch (error) {
    logger.error('Error checking/configuring WSL distro', error);
    return false;
  } finally {
    wslConfigurationInProgress = false;
  }
});

ipcMain.handle('restartSystem', async () => {
  try {
    logger.info('Restarting system');
    exec('shutdown /r /t 0');
    return { success: true };
  } catch (error) {
    logger.error('Error restarting system', error);
    throw error;
  }
});

// Generic IPC Communication Pipeline between Main and Widget Windows !!! ---------------------------------------------------------------------------------------------------

/**
 * Helper function to ensure widget window exists and is ready
 * @returns {boolean} True if widget window is ready, false otherwise
 */
function ensureWidgetWindowExists() {
  if (!widgetWindow) {
    logger.info('Widget window does not exist, creating it...');
    try {
      createWidgetWindow();
      // Give it a moment to initialize
      setTimeout(() => {
        logger.info('Widget window creation initiated');
      }, 100);
      return false;
    } catch (error) {
      logger.error('Error creating widget window:', error);
      return false;
    }
  }
  
  if (widgetWindow.isDestroyed()) {
    logger.info('Widget window is destroyed, recreating it...');
    try {
      recreateWidgetWindow();
      // Give it a moment to initialize
      setTimeout(() => {
        logger.info('Widget window recreation initiated');
      }, 100);
      return false;
    } catch (error) {
      logger.error('Error recreating widget window:', error);
      return false;
    }
  }
  
  return true;
}

/**
 * Generic handler to send events from main window to widget window
 * @param {string} eventName - The event name to send
 * @param {any} payload - The data payload to send with the event
 */
ipcMain.handle('sendToWidget', async (event, eventName, payload) => {
  try {
    logger.info('Sending event to widget window', { eventName, payload });
    
    // Send the event directly to widget window
    if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed()) {
      widgetWindow.window.webContents.send('eventFromMain', { eventName, payload });
      logger.info('Event sent to widget window successfully');
      return { success: true };
    } else {
      logger.warn('Widget window not available, event not sent');
      return { success: false, error: 'Widget window not available' };
    }
  } catch (error) {
    logger.error('Error sending event to widget window', error);
    return { success: false, error: error.message };
  }
});

/**
 * Generic handler to send events from widget window to main window
 * @param {string} eventName - The event name to send
 * @param {any} payload - The data payload to send with the event
 */
ipcMain.handle('sendToMain', async (event, eventName, payload) => {
  try {
    logger.info('Sending event to main window', { eventName, payload });
    
    // Special handling for auth-complete - forward to auth handler
    if (eventName === 'auth-complete') {
      logger.info('Auth-complete event received via sendToMain, forwarding to auth handler');
      logger.debug('Auth payload structure:', { payload, hasToken: !!(payload && payload.token) });
      // Pass the payload object to the auth-complete handler - it will extract the token
      // The payload structure is { token: "..." }
      ipcMain.emit('auth-complete', event, payload);
      return { success: true };
    }
    
    // Just send the event directly to main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('eventFromWidget', { eventName, payload });
      logger.info('Event sent to main window successfully');
      return { success: true };
    } else {
      // Only warn if it's not during auth flow (when main window shouldn't exist yet)
      if (eventName !== 'auth-complete' && !authWindow) {
        logger.warn('Main window not available, event not sent');
      }
      return { success: false, error: 'Main window not available' };
    }
  } catch (error) {
    logger.error('Error sending event to main window', error);
    return { success: false, error: error.message };
  }
});

/**
 * Get the current status of both windows for debugging
 */
ipcMain.handle('getWindowStatus', async () => {
  try {
    const status = {
      mainWindow: {
        exists: !!mainWindow,
        destroyed: mainWindow ? mainWindow.isDestroyed() : true,
        visible: mainWindow ? !mainWindow.isHidden() : false
      },
      widgetWindow: {
        exists: !!widgetWindow,
        destroyed: widgetWindow ? widgetWindow.isDestroyed() : true,
        visible: widgetWindow ? !widgetWindow.isHidden() : false
      }
    };
    
    logger.info('Window status requested', status);
    return status;
  } catch (error) {
    logger.error('Error getting window status', error);
    return { error: error.message };
  }
});

// Generic IPC Communication Pipeline END !!! ---------------------------------------------------------------------------------------------------

// IPC Handle Section END !!! ---------------------------------------------------------------------------------------------------







// Auto Update Section !!! -------------------------------------------------------------------------------------

// Helper function to show native desktop notifications
function showUpdateAvailableNotification(version) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'OverlayLab Update Available',
      body: `Version ${version} is available. Click to download and install.`,
      icon: icon,
      urgency: 'normal'
    });
    
    notification.on('click', () => {
      // User can download via IPC handler
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    
    notification.show();
    logger.info('[AutoUpdater] Notification shown: Update available', { version });
  }
}

function showUpdateDownloadedNotification(version) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'OverlayLab Update Ready',
      body: `Update ${version} has been downloaded. The app needs to be restarted for the update to work. Click to restart now.`,
      icon: icon,
      urgency: 'normal'
    });
    
    notification.on('click', () => {
      // Restart the app
      logger.info('[AutoUpdater] Restart requested from notification');
      app.isQuiting = true;
      autoUpdater.quitAndInstall();
    });
    
    notification.show();
    logger.info('[AutoUpdater] Notification shown: Update downloaded', { version });
  }
}

function showUpdateErrorNotification(errorMessage) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'OverlayLab Update Error',
      body: `Failed to check for updates: ${errorMessage}`,
      icon: icon,
      urgency: 'normal'
    });
    
    notification.show();
    logger.info('[AutoUpdater] Notification shown: Update error', { error: errorMessage });
  }
}

// Helper function to send update events to renderer (for potential future use)
function sendUpdateEvent(channel, data = {}) {
  if (mainWindow && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
    logger.info(`[AutoUpdater] Sending event to renderer: ${channel}`, data);
    mainWindow.webContents.send(channel, data);
  } else {
    logger.warn(`[AutoUpdater] Cannot send event ${channel} - mainWindow not ready`);
  }
}

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  logger.info('[AutoUpdater] Checking for update...');
  sendUpdateEvent('update:checking');
});

autoUpdater.on('update-available', (info) => {
  logger.info('[AutoUpdater] Update available:', info.version);
  logger.info('[AutoUpdater] Release notes:', info.releaseNotes);
  sendUpdateEvent('update:available', {
    version: info.version,
    releaseNotes: info.releaseNotes
  });
  // Show native notification
  showUpdateAvailableNotification(info.version);
});

autoUpdater.on('update-not-available', (info) => {
  logger.info('[AutoUpdater] Update not available. Current version is up to date.');
  sendUpdateEvent('update:not-available', {
    version: info?.version || app.getVersion()
  });
});

autoUpdater.on('error', (err) => {
  const errorMessage = err.message || String(err);
  const errorString = errorMessage.toString();
  
  // Ignore non-critical errors (dev-app-update.yml is optional and only needed for local dev/testing)
  if (errorString.includes('dev-app-update.yml') && errorString.includes('ENOENT')) {
    logger.warn('[AutoUpdater] Ignoring non-critical error (dev-app-update.yml not found - this is optional):', errorMessage);
    return; // Don't show error notification for this non-critical issue
  }
  
  logger.error('[AutoUpdater] Error:', errorMessage);
  sendUpdateEvent('update:error', {
    message: errorMessage
  });
  // Show error notification only for critical errors
  showUpdateErrorNotification(errorMessage);
});

autoUpdater.on('download-progress', (progress) => {
  const logMessage = `[AutoUpdater] Download progress: ${progress.percent.toFixed(2)}% (${(progress.transferred / 1024 / 1024).toFixed(2)}MB / ${(progress.total / 1024 / 1024).toFixed(2)}MB) at ${(progress.bytesPerSecond / 1024 / 1024).toFixed(2)}MB/s`;
  logger.info(logMessage);
  sendUpdateEvent('update:progress', {
    percent: progress.percent,
    transferred: progress.transferred,
    total: progress.total,
    bytesPerSecond: progress.bytesPerSecond
  });
});

autoUpdater.on('update-downloaded', (info) => {
  logger.info('[AutoUpdater] Update downloaded successfully:', info.version);
  logger.info('[AutoUpdater] Update will be installed on next app restart.');
  sendUpdateEvent('update:downloaded', {
    version: info.version,
    releaseNotes: info.releaseNotes
  });
  // Show native notification
  showUpdateDownloadedNotification(info.version);
});

// Auto Updater Section END !!! ----------------------------------------------------------------------------------






// Electron - Store Utility Section !!! -------------------------------------------------------------------------------------

function storeStoreData(key, value) {
  store.set(key, value);
}

function storeHas(key) {
  return store.has(key);
}

function storeGetData(key) {
  return store.get(key);
}

function storeDeleteData(key) {
  store.delete(key);
}

// Electron Store Utility Section END !!! ----------------------------------------------------------------------------------






// Utility Functions Section !!! -------------------------------------------------------------------------------------

async function spawnPowerShellCommand(command , needOutput = false){
  return new Promise((resolve, reject) => {
      const process = spawn('powershell.exe', [command]);

      let stdout = '';
      process.stdout.on('data', (data) => {
          stdout += data.toString();
      });

      let stderr = '';
      process.stderr.on('data', (data) => {
          stderr += data.toString();
      });

      process.on('close', (code) => {
        if(code === 0){
          if (needOutput) resolve(stdout);
          else resolve();
        }
        else{
          resolve()
        }
        // else{
        //   reject(new Error(`Command failed with code ${code}: ${stderr}`));
        // }
      });
  });
}

async function executeCMDCommand(command, needOutput = false) {
  return new Promise((resolve, reject) => {
    logger.debug('Executing CMD command', { command });
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error('CMD command execution error', { command, error: error.message });
        reject(error);
      } else {
        if (stdout) logger.debug('CMD command stdout', { command, stdout });
        if (stderr) logger.debug('CMD command stderr', { command, stderr });

        if (needOutput) resolve(stdout);
        else resolve();
      }
    });
  });
}

async function loadStore() {
  const Store = (await import('electron-store')).default;
  const store = new Store();
  return store;
}

async function waitForDockerPing() {
  return new Promise(async (resolve, reject) => {
    // const pingInterval = setInterval(async () => {
    //   try {
    //     await docker.ping();
    //     console.log("Engine is Running !!!");
    //     resolve();
    //     clearInterval(pingInterval);
    //   } catch (error) {
    //     console.log("Docker Engine Not Ready Yet");
    //   }
    // }, 5000);


  });
}

// Utility Functions Section END !!! --------------------------------------------------------------------------------

// Tray Functions Section !!! -------------------------------------------------------------------------------------

function createTray() {
  // Create tray icon with proper sizing for better clarity
  // Use nativeImage to resize the icon appropriately for the system tray
  const trayIcon = nativeImage.createFromPath(icon);
  
  // Resize icon to appropriate size for system tray
  // Use larger sizes for better clarity, especially on high-DPI displays
  let systemTraySize;
  if (process.platform === 'darwin') {
    // macOS uses 22px for standard displays, but supports @2x for retina
    systemTraySize = 22;
  } else if (process.platform === 'win32') {
    // Windows works best with 16px or 32px, use 32px for better clarity
    systemTraySize = 32;
  } else {
    // Linux typically uses 22px
    systemTraySize = 22;
  }
  
  // Resize the icon for better clarity in the tray
  const resizedIcon = trayIcon.resize({ 
    width: systemTraySize, 
    height: systemTraySize
  });
  
  // On macOS, you can use template images for better appearance
  if (process.platform === 'darwin') {
    resizedIcon.setTemplateImage(true);
  }
  
  tray = new Tray(resizedIcon);
  
  // Create tray menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show OverlayLab',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide OverlayLab',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        logger.info('Tray quit button clicked - forcing application exit');
        
        // Set quitting flag to prevent window close event from hiding the window
        app.isQuiting = true;
        
        // Forcefully close widget window first
        if (widgetWindow) {
          try {
            if (!widgetWindow.isDestroyed()) {
              logger.info('Forcefully closing widget window from tray quit');
              widgetWindow.window.destroy(); // Use destroy instead of close for immediate cleanup
            }
            widgetWindow = null;
          } catch (error) {
            logger.error('Error destroying widget window during tray quit:', error);
          }
        }
        
        // Close main window
        if (mainWindow && !mainWindow.isDestroyed()) {
          try {
            mainWindow.destroy();
          } catch (error) {
            logger.error('Error destroying main window during tray quit:', error);
          }
        }
        
        // Clean up tray
        if (tray) {
          try {
            tray.destroy();
            tray = null;
          } catch (error) {
            logger.error('Error destroying tray during quit:', error);
          }
        }
        
        // Unregister all shortcuts
        try {
          globalShortcut.unregisterAll();
        } catch (error) {
          logger.error('Error unregistering shortcuts during quit:', error);
        }
        
        // Force exit the application
        logger.info('Forcing application exit');
        app.exit(0);
      }
    }
  ]);
  
  // Set tray tooltip to "OverlayLabs"
  tray.setToolTip('OverlayLabs');
  
  // Set tray menu
  tray.setContextMenu(contextMenu);
  
  // Handle tray icon click to show window (don't hide if already visible)
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        // Window is already visible, just focus it
        mainWindow.focus();
      } else {
        // Window is hidden, show it and focus
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Tray Functions Section END !!! ----------------------------------------------------------------------------------



// Docker Related Functions Section !!! ----------------------------------------------------------------------------------

async function makeNetworkBridge(bridge_name){
  let network;
  try {
    network = await docker.getNetwork(bridge_name).inspect();
  } catch (e) {
    // If the network doesn't exist, create it
    network = await docker.createNetwork({
      Name: 'donna',
      Driver: 'bridge'
    });
  } 
}

async function makeVolume(volume_name){
  let volume;
  try {
    volume = await docker.getVolume(volume_name).inspect();
  } catch (e) {
    volume = await docker.createVolume({
      Name: volume_name
    });
  }
}

async function startContainer(container_object){
  try {
    // First, try to start the container directly
    await container_object.start();
    console.log('Container started successfully');
  } catch (err) {
    // Handle the specific case where container is already running
    if (err.statusCode === 304 || err.message.includes('already started')) {
      console.log('Container is already running (caught from start attempt)');
      return;
    }
    
    // For other errors, check if it's a different issue
    console.error('Failed to start container:', err);
    throw err;
  }
}

/**
   * Get or create a Docker container by name and options.
   * @param {object} params - Parameters for container creation and lookup.
   * @param {string} params.name - The name of the container.
   * @param {string} params.image - The image to use for the container.
   * @param {object} [params.createOptions] - Additional options for container creation (Env, ExposedPorts, HostConfig, etc).
   * @returns {Promise<object>} - The Dockerode container instance.
   */
async function getOrCreateContainer({ name, image, createOptions = {} }) {
  let container;
  try {
    // Try to get the container by name
    const containers = await docker.listContainers({ all: true, filters: { name: [name] } });
    if (containers.length > 0) {
      // Container exists, get its instance
      container = docker.getContainer(containers[0].Id);
      console.log(`Found existing container with ID: ${containers[0].Id}`);
    } else {
      // Container does not exist, create it
      const options = {
        Image: image,
        name: name,
        ...createOptions
      };
      container = await docker.createContainer(options);
      console.log(`Created new container with ID: ${container.id}`);
    }
    return container;
  } catch (err) {
    console.error("Error getting or creating container:", err);
    throw err;
  }
}

async function pullImage(docker, imageName) {
  const stream = await docker.pull(imageName);
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, output) => {
        if (err) return reject(err);
        resolve(output);
      },
      event => {
        // This callback runs for every progress message
        if (event.status && event.id) {
          console.log(`${event.status} (${event.id})`);
        } else if (event.status) {
          console.log(event.status);
        }
      }
    );
  });
}

// Docker Related Functions Section END !!! ----------------------------------------------------------------------------------



// Finalizing Agent Section !!! ----------------------------------------------------------------------------------



async function FinalizeAgent(){
  // Check if Docker is available
  try {
    // Try to connect to Docker using default socket first, fallback to TCP
    try {
      docker = new Docker(); // Use default socket connection
      // Test the connection
      await docker.ping();
      console.log('Docker connection successful via socket');
    } catch (e) {
      console.log('Socket connection failed, trying TCP...');
      docker = new Docker({ host: '127.0.0.1', port: 2375 });
      await docker.ping();
      console.log('Docker connection successful via TCP');
    }
  } catch (error) {
    console.error('Docker connection failed:', error.message);
    throw new Error('Docker is not running or not accessible. Please install Docker Desktop and ensure it is running.');
  }

  await pullImage(docker, "redis:7-alpine");
  await pullImage(docker, "postgres:15");
  await pullImage(docker, "chrislusf/seaweedfs:latest");
  await pullImage(docker, "qdrant/qdrant:v1.7.0");



  
  
  // Ensure the custom bridge network "donna" exists before creating the container
  await makeNetworkBridge('donna');


  // Create required volumes
  await makeVolume('postgres_data');
  await makeVolume('seaweedfs_data');
  await makeVolume('qdrant_storage');

  // Create or get the postgres container
  const redisContainer = await getOrCreateContainer({
    name: "redis-test",
    image: "redis:7-alpine",
    createOptions: {
      Tty: true,
      Env: ["MY_ENV=hello_world"],
      ExposedPorts: {
        "80/tcp": {}
      },
      HostConfig: {
        Binds: [
          "nginx_data:/usr/share/nginx/html"
        ],
        NetworkMode: "donna"
      }
    }
  });

  const postgresContainer = await getOrCreateContainer({
    name: "postgres-test",
    image: "postgres:15",
    createOptions: {
      Tty: true,
      Env: [
        "POSTGRES_DB=donna",
        "POSTGRES_USER=donna",
        "POSTGRES_PASSWORD=harvey"
      ],
      ExposedPorts: {
        "5432/tcp": {}
      },
      HostConfig: {
        Binds: [
          "postgres_data:/var/lib/postgresql/data"
        ],
        NetworkMode: "donna",
        PortBindings: {
          "5432/tcp": [{ HostPort: "5432" }]
        },
        RestartPolicy: {
          Name: "unless-stopped"
        }
      }
    }
  });

  // Create or get the seaweedfs container
  const seaweedfsContainer = await getOrCreateContainer({
    name: "seaweedfs-test",
    image: "chrislusf/seaweedfs:latest",
    createOptions: {
      Tty: true,
      Cmd: [
        "server",
        "-dir=/data",
        "-ip=seaweedfs",
        "-master.port=9333",
        "-volume.port=8080",
        "-filer.port=8888"
      ],
      ExposedPorts: {
        "9333/tcp": {},
        "8080/tcp": {},
        "8888/tcp": {}
      },
      HostConfig: {
        Binds: [
          "seaweedfs_data:/data"
        ],
        NetworkMode: "donna",
        PortBindings: {
          "9333/tcp": [{ HostPort: "9333" }],
          "8080/tcp": [{ HostPort: "8080" }],
          "8888/tcp": [{ HostPort: "8888" }]
        },
        RestartPolicy: {
          Name: "unless-stopped"
        }
      }
    }
  });

  // Create or get the qdrant container
  const qdrantContainer = await getOrCreateContainer({
    name: "qdrant",
    image: "qdrant/qdrant:v1.7.0",
    createOptions: {
      Tty: true,
      ExposedPorts: {
        "6333/tcp": {},
        "6334/tcp": {}
      },
      HostConfig: {
        Binds: [
          "qdrant_storage:/qdrant/storage"
        ],
        NetworkMode: "donna",
        PortBindings: {
          "6333/tcp": [{ HostPort: "6333" }],
          "6334/tcp": [{ HostPort: "6334" }]
        }
      }
    }
  });

  // Start the containers if not already running
  await startContainer(redisContainer);
  await startContainer(postgresContainer);
  await startContainer(seaweedfsContainer);
  await startContainer(qdrantContainer);

  
  return true
}

// Finalizing Agent Section END !!! ----------------------------------------------------------------------------------










// Config WSL Section !!! ------------------------------------------------------------------------------------------------------------------------------




/** Returns the Current State Of Wsl Helping to Decide What Step of Configuration is Wsl Currently present at */
/** 3 States [RestartSystem, InstallDistro,  ConfigureDistro, Good] */
function GetWslState(){
  return new Promise(async (resolve, reject) => {
    needsSystemRestart = await CheckWslNeedsRestart();
    if(needsSystemRestart){
        resolve("RestartSystem");
        return;
    }

    distroInstalled = await checkDistroPresent('Ubuntu');
    if(!distroInstalled){
        resolve("InstallDistro");
        return;
    }

    wslConfigCompleted = await checkWslConfigDone('Ubuntu');
    if(!wslConfigCompleted){
        resolve("ConfigureDistro");
        return;
    }

    resolve("Good");
    return;
  });
}

/** Gets The Current Wsl Status */
function GetWslSTATUS(){
  return new Promise((resolve, reject) => {
      spawnPowerShellCommand('wsl.exe --status' , true).then((output) => {
          resolve(output);
      });
  });
}

/** Checks If Wsl needs Restart Because of the current Wsl Status */
function CheckWslNeedsRestart(){
  return new Promise((resolve, reject) => {
      GetWslSTATUS().then(async (status) => {
          statusOutput = status.toString().replace(/\x00/g, '').trim();

          EnableVMPComponentStatement = `Please enable the "Virtual Machine Platform" optional component and ensure virtualization is enabled in the BIOS.`;
          CommandToEnableComponentStatement = `Enable "Virtual Machine Platform" by running: wsl.exe --install --no-distribution For information please visit https://aka.ms/enablevirtualization`

          if(statusOutput.includes(EnableVMPComponentStatement) || statusOutput.includes(CommandToEnableComponentStatement)){
              resolve(true);
              return;
          }

          resolve(false);
          return;
      });
  });
}

/** Checks if a specific Distro is present Inside Wsl or not */
function checkDistroPresent(distroName){

  return new Promise((resolve, reject) => {
      exec('wsl --list --quiet', (error, stdout, stderr) => {

          if (error) {
              console.error(`Error checking for distros: ${error.message}`);
              resolve(false);
              return;
          }

          if (stderr) {
              console.error(`Standard error: ${stderr}`);
              resolve(false);
              return;
          }

          if (stdout) {
              const output = stdout.toString().replace(/\x00/g, '').trim();
              if(output.split('\n').map(line => line.replace(/\r$/, '')).includes(distroName)) {
                  console.log("Distro Found");
                  resolve(true);
                  return;
              }
              else{
                  resolve(false);
                  return;
              }         
          } 

          if (stdout == '') {
              resolve(false);
              return;
          }
      });

  })
}

// !!!! Need to be Updated
/** Check if All the Configurations Needed to Run Containers Inside a Distro Is Completed or Not, Return -> Boolean */
function checkWslConfigDone(distroName){
  return new Promise(async (resolve, reject) => {
      try {
          // First check if distro exists
          const distroExists = await checkDistroPresent(distroName);
          if (!distroExists) {
              console.log('Distro does not exist');
              resolve(false);
              return;
          }

          // Check if Docker is installed
          const dockerInstalled = await checkDockerInstalled(distroName);
          if (!dockerInstalled) {
              console.log('Docker is not installed');
              resolve(false);
              return;
          }

          // Check if Docker service is running
          const dockerRunning = await checkDockerServiceRunning(distroName);
          if (!dockerRunning) {
              console.log('Docker service is not running');
              resolve(false);
              return;
          }

          // Check if Docker is configured to listen on TCP port 2375
          const dockerConfigured = await checkDockerTCPConfig(distroName);
          if (!dockerConfigured) {
              console.log('Docker TCP configuration is not set up');
              resolve(false);
              return;
          }

          console.log('All WSL configurations are complete');
          resolve(true);
      } catch (error) {
          console.error('Error checking WSL config:', error);
          resolve(false);
      }
  });
}

/** Check if Docker is installed in the distro */
function checkDockerInstalled(distroName) {
  return new Promise((resolve, reject) => {
      const command = `wsl -d ${distroName} --exec bash -c "which docker"`;
      exec(command, (error, stdout, stderr) => {
          if (error || stderr) {
              console.log('Docker is not installed');
              resolve(false);
              return;
          }
          if (stdout && stdout.trim()) {
              console.log('Docker is installed');
              resolve(true);
              return;
          }
          resolve(false);
      });
  });
}

/** Check if Docker service is running in the distro */
function checkDockerServiceRunning(distroName) {
  return new Promise((resolve, reject) => {
      const command = `wsl -d ${distroName} --exec bash -c "systemctl is-active --quiet docker"`;
      exec(command, (error, stdout, stderr) => {
          if (error) {
              console.log('Docker service is not running');
              resolve(false);
              return;
          }
          console.log('Docker service is running');
          resolve(true);
      });
  });
}

/** Check if Docker is configured to listen on TCP port 2375 */
function checkDockerTCPConfig(distroName) {
  return new Promise((resolve, reject) => {
    // First check if the systemd configuration file exists and has correct content
    const configCheck = `wsl -d ${distroName} --exec bash -c "test -f /etc/systemd/system/docker.service.d/setup.conf && grep -q 'tcp://127.0.0.1:2375' /etc/systemd/system/docker.service.d/setup.conf"`;
    exec(configCheck, (configError, configStdout, configStderr) => {
      if (configError) {
        console.log('Docker TCP configuration file not found or has incorrect content');
        resolve(false);
        return;
      }
      
      // Then test the actual connection using curl
      const curlCheck = `wsl -d ${distroName} --exec bash -c "curl -s http://127.0.0.1:2375/version"`;
      exec(curlCheck, (curlError, curlStdout, curlStderr) => {
        if (curlError || !curlStdout || !curlStdout.trim()) {
          console.log('Docker TCP configuration file exists but connection test failed');
          resolve(false);
          return;
        }
        
        // Check if the response contains Docker version info
        if (curlStdout.includes('Version') || curlStdout.includes('ApiVersion')) {
          console.log('Docker TCP configuration is set up and responding correctly');
          resolve(true);
        } else {
          console.log('Docker TCP configuration file exists but response is not valid Docker API');
          resolve(false);
        }
      });
    });
  });
}

/** Check if user exists in the distro */
function checkUserExists(distroName, username) {
  return new Promise((resolve, reject) => {
    const command = `wsl -d ${distroName} --exec bash -c "id -u ${username}"`;
    exec(command, (error, stdout, stderr) => {
      if (error || stderr) {
        console.log(`User ${username} does not exist in distro`);
        resolve(false);
        return;
      }
      console.log(`User ${username} exists in distro`);
      resolve(true);
    });
  });
}

/** Complete distro configuration - checks everything and configures if needed */
async function ConfigDistro(distroName) {
  console.log('Starting complete distro configuration check and setup...');
  
  try {
    // 1. Check if distro exists
    const distroExists = await checkDistroPresent(distroName);
    if (!distroExists) {
      console.log('Distro does not exist, installing...');
      await InstallWslDistroandConfigUser('donna', 'harvey', distroName);
      console.log('Distro installation completed');
    } else {
      console.log('Distro exists, checking configuration...');
    }

    // 2. Check if Docker is installed and configured
    const dockerInstalled = await checkDockerInstalled(distroName);
    const dockerRunning = await checkDockerServiceRunning(distroName);
    const dockerConfigured = await checkDockerTCPConfig(distroName);
    
    if (!dockerInstalled || !dockerRunning || !dockerConfigured) {
      console.log('Docker setup incomplete, running setup script...');
      await runSetupScript(distroName);
      console.log('Setup script completed');
    } else {
      console.log('Docker is already properly configured');
    }

    console.log('All distro configurations are complete!');
    return true;
    
  } catch (error) {
    console.error('Error in ConfigDistro:', error);
    return false;
  }
}

/** Intelligent WSL distro check and configuration - only performs missing steps */
async function checkAndConfigureWslDistro(distroName) {
  console.log('Starting intelligent WSL distro check and configuration...');
  
  try {
    // 1. Check if distro exists
    const distroExists = await checkDistroPresent(distroName);
    if (!distroExists) {
      console.log('Distro does not exist, installing from scratch...');
      await InstallWslDistroandConfigUser('donna', 'harvey', distroName);
      console.log('Distro installation completed');
      return true;
    }
    
    console.log('Distro exists, checking user and Docker configuration step by step...');
    
    // 2. Check if required user exists
    const userExists = await checkUserExists(distroName, 'donna');
    if (!userExists) {
      console.log('Required user does not exist, creating user...');
      // Note: This would need a separate function to create just the user
      // For now, we'll run the full setup script which includes user creation
      console.log('Running setup script to create user and configure Docker...');
      try {
        await runSetupScript(distroName);
        console.log('Setup script completed successfully');
        return true;
      } catch (error) {
        console.error('Setup script failed for user creation:', error);
        return false;
      }
    }
    
    console.log('User exists, checking Docker configuration...');
    
    // 3. Check Docker installation
    const dockerInstalled = await checkDockerInstalled(distroName);
    if (!dockerInstalled) {
      console.log('Docker not installed, installing Docker...');
      await installDockerInDistro(distroName);
      console.log('Docker installation completed');
    } else {
      console.log('Docker is already installed');
    }
    
    // 4. Check Docker service status
    const dockerRunning = await checkDockerServiceRunning(distroName);
    if (!dockerRunning) {
      console.log('Docker service not running, starting Docker service...');
      await startDockerService(distroName);
      console.log('Docker service started');
    } else {
      console.log('Docker service is already running');
    }
    
    // 5. Check Docker TCP configuration
    const dockerConfigured = await checkDockerTCPConfig(distroName);
    if (!dockerConfigured) {
      console.log('Docker TCP configuration missing, configuring Docker...');
      await configureDockerTCP(distroName);
      console.log('Docker TCP configuration completed');
    } else {
      console.log('Docker TCP configuration is already set up');
    }
    
    // 6. Final verification
    const finalDockerInstalled = await checkDockerInstalled(distroName);
    const finalDockerRunning = await checkDockerServiceRunning(distroName);
    const finalDockerConfigured = await checkDockerTCPConfig(distroName);
    
    if (finalDockerInstalled && finalDockerRunning && finalDockerConfigured) {
      console.log('All WSL and Docker configurations are complete!');
      return true;
    } else {
      console.log('Some configurations are still incomplete, running full setup script as fallback...');
      try {
        await runSetupScript(distroName);
        console.log('Full setup script completed successfully');
        
        // Final validation after fallback script
        const postScriptDockerInstalled = await checkDockerInstalled(distroName);
        const postScriptDockerRunning = await checkDockerServiceRunning(distroName);
        const postScriptDockerConfigured = await checkDockerTCPConfig(distroName);
        
        if (postScriptDockerInstalled && postScriptDockerRunning && postScriptDockerConfigured) {
          console.log('Fallback setup script validation successful');
          return true;
        } else {
          console.error('Fallback setup script validation failed');
          console.error(`Docker installed: ${postScriptDockerInstalled}, running: ${postScriptDockerRunning}, configured: ${postScriptDockerConfigured}`);
          return false;
        }
      } catch (error) {
        console.error('Fallback setup script failed:', error);
        return false;
      }
    }
    
  } catch (error) {
    console.error('Error in checkAndConfigureWslDistro:', error);
    return false;
  }
}

/** Install Docker in the distro */
function installDockerInDistro(distroName) {
  return new Promise((resolve, reject) => {
    const commands = [
      'apt update',
      'apt install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release',
      'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg',
      'echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
      'apt update',
      'apt install -y docker-ce docker-ce-cli containerd.io'
    ];

    let currentCommand = 0;
    
    function executeNextCommand() {
      if (currentCommand >= commands.length) {
        resolve();
        return;
      }
      
      const command = commands[currentCommand];
      console.log(`Executing: ${command}`);
      
      exec(`wsl -d ${distroName} --exec bash -c "${command}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${command}`, error);
          // Continue with next command even if this one fails
        }
        currentCommand++;
        executeNextCommand();
      });
    }
    
    executeNextCommand();
  });
}

/** Start Docker service in the distro */
function startDockerService(distroName) {
  return new Promise((resolve, reject) => {
    const commands = [
      'systemctl enable docker',
      'systemctl start docker',
      'systemctl status docker'
    ];

    let currentCommand = 0;
    
    function executeNextCommand() {
      if (currentCommand >= commands.length) {
        resolve();
        return;
      }
      
      const command = commands[currentCommand];
      console.log(`Executing: ${command}`);
      
      exec(`wsl -d ${distroName} --exec bash -c "${command}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${command}`, error);
          // Continue with next command even if this one fails
        }
        currentCommand++;
        executeNextCommand();
      });
    }
    
    executeNextCommand();
  });
}

/** Run the setup script in the distro */
function runSetupScript(distroName) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Copying setup script to distro...');
      
      // 1. Create setup directory as donna user
      await executeWslCommand('mkdir -p ~/wslSetupScript', distroName, 'donna');
      
      // 2. Copy setup script from host to distro
      const copyCommand = `cp ./setup.sh ~/wslSetupScript/dockerSetup.sh`;
      await executeWslCommand(copyCommand, distroName, 'donna');
      
      // 3. Make script executable
      await executeWslCommand('chmod +x ~/wslSetupScript/dockerSetup.sh', distroName, 'donna');
      
      // 4. Execute the setup script with sudo privileges as donna user
      console.log('Executing setup script with sudo as donna user...');
      await executeWslCommand('echo harvey | sudo -S ~/wslSetupScript/dockerSetup.sh', distroName, 'donna');
      
      // 5. Validate that the setup was successful
      console.log('Validating setup completion...');
      const dockerInstalled = await checkDockerInstalled(distroName);
      const dockerRunning = await checkDockerServiceRunning(distroName);
      const dockerConfigured = await checkDockerTCPConfig(distroName);
      
      if (dockerInstalled && dockerRunning && dockerConfigured) {
        console.log('Setup script executed and validated successfully');
        resolve(true);
      } else {
        console.error('Setup script completed but validation failed');
        console.error(`Docker installed: ${dockerInstalled}, running: ${dockerRunning}, configured: ${dockerConfigured}`);
        reject(new Error('Setup script validation failed'));
      }
      
    } catch (error) {
      console.error('Error running setup script:', error);
      reject(error);
    }
  });
}

/** Configure Docker to listen on TCP port 2375 */
function configureDockerTCP(distroName) {
  return new Promise((resolve, reject) => {
    const commands = [
      'mkdir -p /etc/systemd/system/docker.service.d',
      'tee /etc/systemd/system/docker.service.d/setup.conf > /dev/null <<EOL\n[Service]\nExecStart=\nExecStart=/usr/bin/dockerd -H fd:// -H tcp://127.0.0.1:2375\nEOL',
      'systemctl daemon-reexec',
      'systemctl daemon-reload',
      'systemctl restart docker'
    ];

    let currentCommand = 0;
    
    function executeNextCommand() {
      if (currentCommand >= commands.length) {
        resolve();
        return;
      }
      
      const command = commands[currentCommand];
      console.log(`Executing: ${command}`);
      
      exec(`wsl -d ${distroName} --exec bash -c "${command}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${command}`, error);
          // Continue with next command even if this one fails
        }
        currentCommand++;
        executeNextCommand();
      });
    }
    
    executeNextCommand();
  });
}

/** Handled the Actions to take based on the Wsl State */
function handleWslStateActions(state){
  console.log("Current Wsl State : " , state);
  if(state == "RestartSystem"){
      console.log("Need to Restart System");
      ConfigSetupWslBeforeRestart().then(() => {
          console.log("Pre-requisites Done");
          mainWindow.webContents.send('navigate-to-component' , '/LoginPage/RestartWidget');
      });
  }
  else if(state == "ConfigureDistro" || state == "InstallDistro"){
      console.log("Need to Install or Configure Distro");
      mainWindow.webContents.send('navigate-to-component' , '/LoginPage/ConfigLoadingWidget');
  }
  else{
    storeStoreData('isWslSetupDone' , true);
    mainWindow.webContents.send('navigate-to-component' , '/MainPage');
  }
}

/** Completes the Configuration for Wsl Before Restart */
function ConfigSetupWslBeforeRestart(){
  return new Promise(async (resolve, reject) => {
      console.log("Starting Pre-requisites")

      const VMPComponentActivateCommand = "dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart"
      try {await spawnPowerShellCommand(VMPComponentActivateCommand);} catch(error) {}
      console.log("VMP Activated")

      const WslInstallCommand = `wsl.exe --install --no-distribution`;
      await spawnPowerShellCommand(WslInstallCommand);
      console.log("Wsl No Distro Installed")

      const KernelUpdateCommand = `wsl.exe --update`;
      await spawnPowerShellCommand(KernelUpdateCommand);
      resolve();
  });
}

/** Configures the Complete Wsl Distro to run Containers By a specific User*/
async function ConfigWslFromScratch(username, password , distroName){
  console.log("configuring Wsl from Scratch")
  try {await MakeWslSetupDirectory(username , distroName);} catch(error){}
  console.log("Directory Work Done")
  await CopyShScriptToWsl(username , distroName);
  await ExecuteWslConfigShScript(username , password , distroName);
}

/** Installing the Complete Wsl Distro from Scratch and Configuring the Envrionment for that Distro */
function InstallWslDistroandConfigUser(username , password , distroName){
  return new Promise((resolve, reject) => {
    // console.log("Starting Wsl Installation and Config")
    const controller = new AbortController();
    const signal = controller.signal;

    InstallDistroWSL(signal , distroName);

    const EventDistroInstalled = new Promise(async (resolve, reject) => {
        while(true){
            // console.log("Checking for Distro Installation");
            const isPresent = await checkDistroPresent(distroName);
            console.log(isPresent);

            if(isPresent){
                console.log("Distro Found");
                setTimeout(() => {
                  controller.abort();
                  resolve();
                }, 10000);
                break;
            }
            
            await new Promise((resolve , reject) => {
                setTimeout(() => {
                    resolve();
                }, 5000);
            });

        }
    });

    EventDistroInstalled
    .then(() =>{
        console.log("Distro Installed Can Move forward to User Adding");
        AddNewUserInDistro(username , password , distroName , true)
        .then(async () => {
            console.log("User Added");

            await ConfigWslFromScratch(username , password , distroName);

            resolve();
        });
    });


  });

}


// !!!! Need to be Updated
/** Install a Distro In Wsl */  // 
function InstallDistroWSL(signal , distroName){
  return new Promise((resolve, reject) => {
      console.log(`Installing the Desired Distro: ${distroName}`);
      const InstallDistroProcess = spawn('wsl', ['--install', '-d', distroName]);

      InstallDistroProcess.on('close', () => {
          console.log(`Process of Installing the Desired Distro has Completed`);
          resolve();
          return;
      });


      signal.addEventListener('abort', () => {
          console.log("Abort Signal Received");
          InstallDistroProcess.kill('SIGKILL');
          resolve();
          return;
      });

  });
}

/** Setting Up a new User Inside a Distro alongiside with its password */
function AddNewUserInDistro(username , password , distroName , sudoAccess){
  return new Promise(async (resolve, reject) => {
      await AddUserToDistro(username , distroName , sudoAccess);
      await ChangeUserPasswordInDistro(username , password , distroName);
      resolve();
  });
}

/** Adds a User To Distro Without Setting Password */
function AddUserToDistro(username , distroName , sudoAccess){
  return new Promise((resolve, reject) => {

      let AddUserCommand = `wsl -d ${distroName} --exec bash -c "useradd -m -s /bin/bash ${username}"`;
      if(sudoAccess)
          AddUserCommand = `wsl -d ${distroName} --exec bash -c "useradd -m -s /bin/bash -G sudo ${username}"`;


      console.log(AddUserCommand)
      const AddUserProcess = spawn('powershell.exe', [AddUserCommand]);

      AddUserProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
      });

      AddUserProcess.on('close', () => {
          resolve();
      });

      AddUserProcess.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
      });

  });
}

/** Changes the password for a specific User in a specific Distro */
function ChangeUserPasswordInDistro(username , password , distroName){
  return new Promise((resolve, reject) => {
      const ChangePasswordCommand = `echo ${username}:${password} | chpasswd`;
      console.log(ChangePasswordCommand)

      const ChangePasswordProcess = spawn('wsl', ['-d', distroName, '--exec', 'bash', '-c', ChangePasswordCommand]);

      ChangePasswordProcess.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
      });

      ChangePasswordProcess.on('close', () => {
          console.log("Password Changed");
          resolve();
      });
  });
}

// !!!! Need to be Updated
/** Set-ups Directory For a Particular User Inside particular Distro Used To Store Sh Scripts Needed to Setup Environment */
function MakeWslSetupDirectory(username ,  distroName){
  return new Promise((resolve, reject) => {
    commandToExecute = "mkdir ~/wslSetupScript"
    logger.info('Main Js: Making Directory for Storing Wsl Setup Script')
    executeWslCommand(commandToExecute , distroName , username).then(() => {
        logger.info('Main Js: Directory Made for Storing Wsl Setup Script')
        resolve();
    });
  })
}

// !!!! Need to be Updated
/** Copying Sh Script From Host machine OS to Wsl for a particular user inside a particular Distro*/
function CopyShScriptToWsl(username , distroName){
  return new Promise(async (resolve, reject) => {
    try {
      const makingDirectoryCommand = `mkdir -p ~/wslSetupScript`
      console.log("Making Directory for Storing Wsl Setup Script")
      await executeWslCommand(makingDirectoryCommand , distroName , username);
      console.log("Directory Made for Storing Wsl Setup Script")

      const commandToExecute = `cp ./setup.sh ~/wslSetupScript/dockerSetup.sh`
      console.log('Main Js: Copying Sh Script to Wsl')
      await executeWslCommand(commandToExecute , distroName , username);
      console.log('Main Js: Sh Script Copied to Wsl')
      resolve();
    } catch (error) {
      console.error('Error copying script to WSL:', error);
      reject(error);
    }
  })
}

// !!!! Need to be Updated
/** Executing the Sh Files Inside a Distro for a particular User */
function ExecuteWslConfigShScript(username , password , distroName){
  return new Promise((resolve, reject) => {
    console.log("Running the Script to Configure WSL Distro")
    const commandToExecute = `cd /home/${username}/wslSetupScript  && echo ${password} | sudo -S bash setup.sh`
    console.log(password);
    // executeWslCommand(commandToExecute , distroName , username).then(() => {
    //     console.log("Script Executed !!!")
    //     resolve();
    // });
    console.log('Main Js: Executing the Sh Script to Configure WSL Distro')
    const ExecuteCMD = `wsl -d ${distroName} -u ${username} --exec bash -c "cd /home/${username}/wslSetupScript  && echo ${password} | sudo -S bash dockerSetup.sh"`
    spawnPowerShellCommand(ExecuteCMD).then(() => {
        console.log('Main Js: Script Executed and configuration Completed')
        resolve();
    });
  })
}


/** Executes a Command Inside a particular WSL Distro with a particular user */
function executeWslCommand(command , distroName , username = "root" , needOutput = false){
  return new Promise((resolve, reject) => {
      const ExecuteCMD = `wsl -d ${distroName} -u ${username} --exec bash -c "${command}"`
      const process = spawn('powershell.exe', [ExecuteCMD]);

      let stdout = '';
      process.stdout.on('data', (data) => {
          stdout += data.toString();
      });

      let stderr = '';
      process.stderr.on('data', (data) => {
        // console.log("Error : " , data.toString());
          stderr += data.toString();
      });

      process.on('close', (code) => {
        if(code === 0){
          if (needOutput) resolve(stdout);
          else resolve();
        }
        else{
          console.log("Error Exist In this Command");
          console.log("Error details:", stderr);
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
  });
}






// Config WSL Section END !!! ----------------------------------------------------------------------------------------------------------------





// App Event Trigger Section !!! --------------------------------------------------------------------------------



async function handleEvent(eventInfo) {
  logger.info("Event triggered", { eventType: eventInfo["EVENT"], agentId: eventInfo["AGENT_ID"] });

  if (eventInfo["EVENT"] == "INSTALL_AGENT") {
    logger.info("Installing agent", { agentId: eventInfo["AGENT_ID"], agentVersion: eventInfo["AGENT_VERSION"] });
    mainWindow.webContents.send('install-agent', agentId = eventInfo["AGENT_ID"], agentVersion = eventInfo["AGENT_VERSION"])
  }
  else if (eventInfo["EVENT"] == "UI_AUTOMATE") {
    logger.info("UI automation event", { data: eventInfo["DATA"] });
    uiAutomateHandler(eventInfo["DATA"]);
  }

}

async function handleWebEventTrigger(url) {
  logger.info("Web event triggered", { url });
  let eventInfo = url.replace(/^overlaylab:\/\//i, '');

  if (eventInfo.endsWith('/')) {
    eventInfo = eventInfo.slice(0, -1);
  }

  try {
    const decoded = decodeURIComponent(eventInfo);
    const parsed = JSON.parse(decoded);
    logger.info('Received OverlayLab event', parsed);
    await handleEvent(parsed);
  } catch (e) {
    logger.error('Failed to parse OverlayLab event', { eventInfo, error: e.message });
  }

}


// App Event Trigger Section END !!! ---------------------------------------------------------------------------




// App Section !!! -------------------------------------------------------------------------------------

app.on('second-instance', (event, argv) => {
  const urlArg = argv.find(arg => arg.startsWith('overlaylab://'));
  if (urlArg) {
    logger.info('Second instance with protocol', { url: urlArg });
    if (mainWindow) {
      handleWebEventTrigger(urlArg);
    }
  }
});

app.whenReady().then(async () => {

  // Initialize quitting flag
  app.isQuiting = false;

  // Fix CORS issues with duplicate headers by intercepting responses
  const defaultSession = session.defaultSession;
  
  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Fix duplicate Access-Control-Allow-Origin headers
    if (details.responseHeaders && details.responseHeaders['access-control-allow-origin']) {
      const origins = details.responseHeaders['access-control-allow-origin'];
      if (Array.isArray(origins) && origins.length > 1) {
        // Keep only the first value
        details.responseHeaders['access-control-allow-origin'] = [origins[0]];
        logger.debug('Fixed duplicate Access-Control-Allow-Origin header', { 
          original: origins, 
          fixed: origins[0] 
        });
      }
    }
    
    // Also fix other duplicate CORS headers
    const corsHeaders = [
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials'
    ];
    
    corsHeaders.forEach(header => {
      if (details.responseHeaders && details.responseHeaders[header]) {
        const values = details.responseHeaders[header];
        if (Array.isArray(values) && values.length > 1) {
          details.responseHeaders[header] = [values[0]];
        }
      }
    });
    
    callback({ responseHeaders: details.responseHeaders });
  });
  

  // Single Instance Check 
  const AppLock = app.requestSingleInstanceLock();
  if (!AppLock) {app.exit(0);}

  // Global Shortcuts
  globalShortcut.register('CommandOrControl+R', () => {
    logger.debug('Ctrl+R is disabled');
  });

  globalShortcut.register('F5', () => {
    logger.debug('F5 is disabled');
  });

  // Widget toggle shortcut (Ctrl + `)
  globalShortcut.register('CommandOrControl+`', () => {
    logger.debug('Widget toggle shortcut pressed');
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      if (widgetWindow.isVisible()) {
        widgetWindow.hide();
        logger.debug('Widget hidden');
      } else {
        widgetWindow.show();
        setTimeout(() => {
          if (widgetWindow && !widgetWindow.isDestroyed()) {
            console.log('setIgnoreMouseEvents toggled: true');
            widgetWindow.setIgnoreMouseEvents(true, { forward: true });
            widgetWindow.window.setAlwaysOnTop(false); // Reset first
            widgetWindow.window.setAlwaysOnTop(true, 'screen-saver'); // Re-apply
            widgetWindow.focus(); // Ensure focus
          }
        }, 100);
        logger.debug('Widget shown');
      }
    } else {
      // If widget window doesn't exist, create it
      logger.debug('Widget window does not exist, creating new one');
      createWidgetWindow();
    }
  });

  // Overlay selector shortcut (Ctrl + Q)
  globalShortcut.register('CommandOrControl+Q', () => {
    logger.debug('Overlay selector shortcut Ctrl+Q pressed');
    if (widgetWindow && widgetWindow.window && !widgetWindow.isDestroyed()) {
      // Ensure window is visible
      if (!widgetWindow.isVisible()) {
        widgetWindow.show();
      }
      // Focus the window to make it active
      widgetWindow.focus();
      // Send IPC event to overlay window to open selector
      widgetWindow.window.webContents.send('overlay:openSelector');
      logger.debug('Sent openSelector event to overlay window');
    }
  });

  // Screenshot shortcut (Ctrl + 1)
  globalShortcut.register('CommandOrControl+1', () => {
    logger.debug('Screenshot shortcut Ctrl+1 pressed');
    
    const now = Date.now();
    const cooldownTime = 1500; // 1.5 seconds cooldown
    
    // Check if screenshot process is currently active
    if (screenshotProcessActive) {
      console.log('Screenshot process already active, showing dialog');
      logger.debug('Screenshot process is active, cannot start new screenshot');
      
      // Show dialog to user
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          alert('Screenshot is already in progress. Please wait for it to complete before taking another screenshot.');
        `).catch(err => console.warn('Failed to show screenshot active dialog:', err));
      }
      return;
    }
    
    // Check cooldown period
    if (now - lastValidationRequestTime < cooldownTime) {
      console.log('Screenshot validation request on cooldown, showing dialog');
      logger.debug(`Screenshot validation cooldown active. Time remaining: ${cooldownTime - (now - lastValidationRequestTime)}ms`);
      
      // Show dialog to user about cooldown
      if (mainWindow && !mainWindow.isDestroyed()) {
        const remainingTime = Math.ceil((cooldownTime - (now - lastValidationRequestTime)) / 1000);
        mainWindow.webContents.executeJavaScript(`
          alert('Please wait ${remainingTime} more second(s) before taking another screenshot.');
        `).catch(err => console.warn('Failed to show cooldown dialog:', err));
      }
      return;
    }
    
    // Update last validation request time
    lastValidationRequestTime = now;
    
    // Send validation request to overlay window instead of directly taking screenshot
    if (widgetWindow && widgetWindow.window && !widgetWindow.window.isDestroyed() && widgetWindow.window.webContents) {
      try {
        console.log('Sending screenshot validation request to widget window from global shortcut');
        widgetWindow.window.webContents.send('eventFromMain', {
          eventName: 'validate-screenshot-request',
          payload: { source: 'global-shortcut', timestamp: now }
        });
      } catch (sendError) {
        console.warn('Failed to send validation request to widget from global shortcut:', sendError);
      }
    } else {
      console.warn('Widget window not available for global shortcut validation');
    }
  });

  // Initialize DB - removed for now

  // Load Store
  logger.info('Loading application store');
  store = await loadStore();
  logger.info('Application store loaded');

  // Load isRecorded setting from store
  const storedIsRecorded = store.get('isRecorded', false);
  isRecorded = storedIsRecorded;
  logger.info('Loaded isRecorded setting from store', { isRecorded });

  // Create main and widget windows directly (ensure windows exist before updater events)
  logger.info('Creating initial main and widget windows');
  // Start with authentication flow
  createAuthWindow()
    .then((authResult) => {
      if (authResult && authResult.success) {
        logger.info('Authentication successful, creating main and widget windows');
        createMainAndWidgetWindows();
      } else {
        logger.error('Authentication failed or was cancelled');
        app.quit();
      }
    })
    .catch((error) => {
      logger.error('Error during authentication flow', error);
      app.quit();
    });

  // Configure auto-updater feed URL (GitHub releases)
  // Configure and run auto-updater only in production (packaged app).
  // Skip in development or when the app isn't packaged to avoid HTTP errors
  // (e.g., no macOS release present) and unhandled promise rejections.
  // NOTE: Update checks will be triggered after main window is created, not here
  // to ensure they only run in the main window, not the auth window
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DISABLE_UPDATER === '1';
  if (app.isPackaged || !isDev) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Nicky9319',
      repo: 'OverlayLab_DesktopApp',
      private: false,
    });

    // Configure updater to handle blockmap issues gracefully
    // The updater will automatically fall back to full downloads if blockmap parsing fails
    autoUpdater.allowDowngrade = false;
    autoUpdater.allowPrerelease = false;

    // Don't check for updates here - wait until main window is created
    // This ensures updates are only checked in the main window, not the auth window
    logger.info('[AutoUpdater] Auto-updater configured. Will check for updates after main window is created.');
  } else {
    logger.info('[AutoUpdater] Skipping auto-updater configuration - not in production build or dev mode');
  }

  // Register Protocol with the Windows
  // Note: Protocol handling will be set up after main window is created
  if (!app.isDefaultProtocolClient('overlaylab')) {
    app.setAsDefaultProtocolClient('overlaylab');
    logger.info('Registered overlaylab:// protocol handler');
  } else {
    logger.info('overlaylab:// protocol handler already registered');
  }

});

app.on('will-quit' , async (event) => {
  // Don't prevent quit if we're already in quitting state
  // Also don't prevent quit if we're restarting auth (auth window will be created)
  if (!app.isQuiting && !isRestartingAuth) {
    event.preventDefault();
    logger.info("Application quitting, cleaning up resources");

    // Set quitting flag
    app.isQuiting = true;

    // Clean up widget window first
    if (widgetWindow) {
      try {
        if (!widgetWindow.isDestroyed()) {
          logger.debug('Destroying widget window during quit');
          widgetWindow.window.destroy(); // Use destroy for immediate cleanup
        }
        widgetWindow = null;
      } catch (error) {
        logger.error('Error destroying widget window during quit', error);
      }
    }

    // Clean up main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.destroy();
      } catch (error) {
        logger.error('Error destroying main window during quit', error);
      }
    }

    // Clean up tray
    if (tray) {
      try {
        logger.debug('Destroying tray');
        tray.destroy();
        tray = null;
      } catch (error) {
        logger.error('Error destroying tray during quit', error);
      }
    }

    // setupWindow removed; no cleanup required

    // Clean up HTTP server
    if (server) {
      try {
        logger.debug('Closing HTTP server');
        server.close(() => {
          logger.info('HTTP server closed');
        });
        server = null;
      } catch (error) {
        logger.error('Error closing HTTP server during quit', error);
      }
    }

    logger.debug('Unregistering all global shortcuts');
    try {
      globalShortcut.unregisterAll();
    } catch (error) {
      logger.error('Error unregistering shortcuts during quit', error);
    }
    
    // Force exit after cleanup
    setTimeout(() => {
      logger.info('Forcing application exit after cleanup');
      app.exit(0);
    }, 100);
  }
});


// App Section END !!! --------------------------------------------------------------------------------









// function createWindow() {
//   initDb()
//   .then(() => { 
//     console.log('Database initialized successfully');
//     addAgentInfo({ id: 1, name: 'Agent 1', env: {} })

//   });
  
//   // Create the browser window.
//   const mainWindow = new BrowserWindow({
//     width: 1440,
//     height: 1024,
//     show: false,
//     autoHideMenuBar: true,
//     ...(process.platform === 'linux' ? { icon } : {}),
//     webPreferences: {
//       preload: join(__dirname, '../preload/preload.js'),
//       sandbox: false
//     }
//   })

//   mainWindow.on('ready-to-show', () => {
//     mainWindow.show()
//   })

//   mainWindow.webContents.setWindowOpenHandler((details) => {
//     shell.openExternal(details.url)
//     return { action: 'deny' }
//   })

//   // HMR for renderer base on electron-vite cli.
//   // Load the remote URL for development or the local html file for production.
//   if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
//     mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
//   } else {
//     mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
//   }
// }

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

// app.whenReady().then(() => {
//   // Set app user model id for windows
//   electronApp.setAppUserModelId('com.electron')

//   // Default open or close DevTools by F12 in development
//   // and ignore CommandOrControl + R in production.
//   // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils


//   // app.on('browser-window-created', (_, window) => {
//   //   optimizer.watchWindowShortcuts(window)
//   // })

//   // IPC test
//   ipcMain.on('ping', () => console.log('pong'))

//   createWindow()

//   app.on('activate', function () {
//     // On macOS it's common to re-create a window in the app when the
//     // dock icon is clicked and there are no other windows open.
//     if (BrowserWindow.getAllWindows().length === 0) createWindow()
//   })
// })

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit()
//   }
// })

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
