// Imports and modules !!! ---------------------------------------------------------------------------------------------------

import { app, shell, BrowserWindow, ipcMain, globalShortcut, contextBridge, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from './resources/icon.png?asset'

const {spawn, exec} = require('child_process');
const fs = require('fs');

const path = require('path');

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

let mainWindow, store, widgetWindow, tray;
let ipAddress = process.env.SERVER_IP_ADDRESS || '';
let widgetUndetectabilityEnabled = true; // Enable undetectability for widget by default
let lastScreenshotTime = 0; // Cooldown tracking for global shortcut
let lastValidationRequestTime = 0; // Cooldown tracking for screenshot validation requests
let screenshotProcessActive = false; // Track if screenshot process is currently active

// Configure auto-updater logging
autoUpdater.logger = log;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Platform detection
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isDev = process.env.NODE_ENV === 'development';

// Variables and constants END !!! ---------------------------------------------------------------------------------------------------





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

    // Set content protection if undetectability is enabled
    if (this.undetectabilityEnabled) {
      this.window.setContentProtection(true);
    }

    // Additional undetectability measures
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setResizable(false);

    // Platform-specific settings
    if (isWindows) {
      this.window.setAlwaysOnTop(true, "screen-saver", 1);
      this.window.webContents.setBackgroundThrottling(false);
    }

    // Set initial mouse event ignoring - start with click-through enabled
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
        this.window.setIgnoreMouseEvents(false);
        logger.debug('DevTools opened: Widget window is now interactive');
      }
    });

    this.window.webContents.on('devtools-closed', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.devToolsOpen = false;
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
          this.window.setIgnoreMouseEvents(true, { forward: true });
        }
        this.window.setAlwaysOnTop(true, 'screen-saver');
      }
    });

    this.window.on('show', () => {
      logger.debug('Widget window shown, ensuring click-through');
      if (this.window && !this.window.isDestroyed()) {
        if (!this.devToolsOpen) {
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

function createWidgetWindow() {
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
    undetectabilityEnabled: widgetUndetectabilityEnabled
  });

  logger.info('Widget window created', { undetectabilityEnabled: widgetUndetectabilityEnabled });

  // Load the widget window with proper React support
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const baseUrl = process.env['ELECTRON_RENDERER_URL'];
    const widgetUrl = baseUrl.endsWith('/') ? baseUrl + '?widget=true' : baseUrl + '/?widget=true';
    logger.debug('Loading widget from URL', { url: widgetUrl });
    widgetWindow.window.loadURL(widgetUrl).catch((error) => {
      logger.error('Failed to load widget URL', error);
    });
  } else {
    const widgetPath = join(__dirname, '../renderer/index.html');
    logger.debug('Loading widget from file', { path: widgetPath });
    widgetWindow.window.loadFile(widgetPath, { query: { widget: 'true' } }).catch((error) => {
      logger.error('Failed to load widget file', error);
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
            widgetWindow.setIgnoreMouseEvents(true, { forward: true });
            widgetWindow.window.setAlwaysOnTop(true);
            logger.debug('Widget window shown and configured for overlay mode');
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
function createMainAndWidgetWindows() {
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
  });

  // Loading HTML and Configuring the Main Window
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    logger.debug('Loading main window from URL', { url: process.env['ELECTRON_RENDERER_URL'] });
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    const mainPath = join(__dirname, '../renderer/index.html');
    logger.debug('Loading main window from file', { path: mainPath });
    mainWindow.loadFile(mainPath);
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
    const urlArg = process.argv.find(arg => arg.startsWith('agentbed://'));
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
  
  // Clean up widget window first
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
  if (mainWindow) {
    mainWindow.minimize();
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
        widgetWindow.setIgnoreMouseEvents(true, { forward: true });
      } else {
        // When disabling click-through, just pass false
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
    mainWindow.setIgnoreMouseEvents(clickThrough, { forward: true });
  }
});

ipcMain.handle('window:enableInteraction', () => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.handle('window:disableInteraction', () => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }
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
    
    // Just send the event directly to main window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('eventFromWidget', { eventName, payload });
      logger.info('Event sent to main window successfully');
      return { success: true };
    } else {
      logger.warn('Main window not available, event not sent');
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

autoUpdater.on('checking-for-update', () => {
  logger.info("Checking for Update");
});

autoUpdater.on('update-available', (info) => {
  // autoUpdater.downloadUpdate();
  logger.info('Update available', info);
});

autoUpdater.on('update-not-available', (info) => {
  logger.info('Update not available', info);
});

autoUpdater.on('error', (err) => {
  logger.error('Error in auto-updater', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  logger.info('Update download progress', {
    bytesPerSecond: progressObj.bytesPerSecond,
    percent: progressObj.percent,
    transferred: progressObj.transferred,
    total: progressObj.total
  });
});

autoUpdater.on('update-downloaded', (info) => {
  logger.info('Update downloaded', info);
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
  // Create tray icon
  tray = new Tray(icon);
  
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
  
  // Set tray tooltip
  tray.setToolTip('OverlayLab Desktop App');
  
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
  let eventInfo = url.replace(/^agentbed:\/\//i, '');

  if (eventInfo.endsWith('/')) {
    eventInfo = eventInfo.slice(0, -1);
  }

  try {
    const decoded = decodeURIComponent(eventInfo);
    const parsed = JSON.parse(decoded);
    logger.info('Received AgentBed event', parsed);
    await handleEvent(parsed);
  } catch (e) {
    logger.error('Failed to parse AgentBed event', { eventInfo, error: e.message });
  }

}


// App Event Trigger Section END !!! ---------------------------------------------------------------------------




// App Section !!! -------------------------------------------------------------------------------------

app.on('second-instance', (event, argv) => {
  const urlArg = argv.find(arg => arg.startsWith('agentbed://'));
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

  // Auto Updater
    // autoUpdater.setFeedURL({
    //   provider: 'github',
    //   owner: 'Nicky9319',
    //   repo: 'UserApplication_UpdateRepo',
    //   private: false,
    // });  

    // autoUpdater.checkForUpdates();
  

  // Create main and widget windows directly
  logger.info('Creating initial main and widget windows');
  createMainAndWidgetWindows();

  // Register Protocol with the Windows
  // Note: Protocol handling will be set up after main window is created

});

app.on('will-quit' , async (event) => {
  // Don't prevent quit if we're already in quitting state
  if (!app.isQuiting) {
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
