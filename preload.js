import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
const path = require('path')

// DB functions removed for now



if (process.contextIsolated) {
  try{
    contextBridge.exposeInMainWorld('electron', electronAPI)

    // DB API removed from preload for now

    contextBridge.exposeInMainWorld('electronAPI', {
      closeApp: () => ipcRenderer.invoke('window:close'),
      quitApp: () => ipcRenderer.invoke('window:quit'),
      minimizeApp: () => ipcRenderer.invoke('window:minimize'),
      maximizeApp: () => ipcRenderer.invoke('window:maximize'),
      signOut: () => ipcRenderer.invoke('auth:signOut'),
      enableInteraction: () => ipcRenderer.invoke('window:enableInteraction'),
      disableInteraction: () => ipcRenderer.invoke('window:disableInteraction'),
      setIgnoreMouseEvents: (ignore) => ipcRenderer.invoke('widget:setIgnoreMouseEvents', ignore),
      setupContinue: () => ipcRenderer.invoke('setup:continue'),
      finalizingAgent: () => ipcRenderer.invoke('finalizing-agent'),
      // Logging API
      logToMain: (level, component, message, data) => ipcRenderer.invoke('renderer-log', level, component, message, data),
      // WSL Setup APIs
      checkWSL: () => ipcRenderer.invoke('checkWSL'),
      installWSL: () => ipcRenderer.invoke('installWSL'),
      checkWslConfigDone: () => ipcRenderer.invoke('checkWslConfigDone'),
      configureWslDistro: () => ipcRenderer.invoke('configureWslDistro'),
      restartSystem: () => ipcRenderer.invoke('restartSystem'),
      // MQTT Event Listeners
      onDonnaMobileConnectRequest: (callback) => ipcRenderer.on('donna-mobile-connect-request', callback),
      onDonnaMobileDisconnect: (callback) => ipcRenderer.on('donna-mobile-disconnect', callback),
      removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
      // Generic IPC Communication Pipeline
      sendToWidget: (eventName, payload) => ipcRenderer.invoke('sendToWidget', eventName, payload),
      sendToMain: (eventName, payload) => ipcRenderer.invoke('sendToMain', eventName, payload),
      getWindowStatus: () => ipcRenderer.invoke('getWindowStatus'),
      onEventFromWidget: (callback) => ipcRenderer.on('eventFromWidget', callback),
      onEventFromMain: (callback) => ipcRenderer.on('eventFromMain', callback),

      // Screenshot functionality
      captureAndSaveScreenshot: () => ipcRenderer.invoke('capture-and-save-screenshot'),
      validateAndCaptureScreenshot: () => ipcRenderer.invoke('validate-and-capture-screenshot'),
      proceedWithScreenshot: (source) => ipcRenderer.invoke('proceed-with-screenshot', source),
      getScreenshotProcessStatus: () => ipcRenderer.invoke('get-screenshot-process-status'),
      // Open external URLs
      openExternal: (url) => ipcRenderer.invoke('open-external', url),
      
      // Update API
      onUpdateChecking: (callback) => ipcRenderer.on('update:checking', callback),
      onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (event, data) => callback(data)),
      onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', (event, data) => callback(data)),
      onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (event, data) => callback(data)),
      onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (event, data) => callback(data)),
      onUpdateError: (callback) => ipcRenderer.on('update:error', (event, data) => callback(data)),
      downloadUpdate: () => ipcRenderer.invoke('update:download'),
      restartAndInstall: () => ipcRenderer.invoke('update:restart'),
      getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
      getResourcePath: (relativePath) => ipcRenderer.invoke('app:getResourcePath', relativePath),
      removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update:checking')
        ipcRenderer.removeAllListeners('update:available')
        ipcRenderer.removeAllListeners('update:not-available')
        ipcRenderer.removeAllListeners('update:progress')
        ipcRenderer.removeAllListeners('update:downloaded')
        ipcRenderer.removeAllListeners('update:error')
      },
      
      // Redux IPC Sync APIs
      broadcastReduxAction: (actionData) => ipcRenderer.invoke('broadcast-redux-action', actionData),
      onReduxActionBroadcast: (callback) => ipcRenderer.on('redux-action-broadcast', (event, data) => callback(data)),
      removeReduxBroadcastListener: () => ipcRenderer.removeAllListeners('redux-action-broadcast'),
      
      // Settings API
      getOverlayRecordable: () => ipcRenderer.invoke('settings:getOverlayRecordable'),
      setOverlayRecordable: (value) => ipcRenderer.invoke('settings:setOverlayRecordable', value),
      restartApp: () => ipcRenderer.invoke('settings:restartApp'),
      // Overlay selector API
      openOverlaySelector: () => ipcRenderer.invoke('overlay:openSelector'),
      saveOverlayType: (overlayType) => ipcRenderer.invoke('overlay:saveOverlayType', overlayType),
      getOverlayType: () => ipcRenderer.invoke('overlay:getOverlayType'),
      onOpenSelector: (callback) => ipcRenderer.on('overlay:openSelector', callback),
    });

    contextBridge.exposeInMainWorld('widgetAPI', {
      closeWidget: () => ipcRenderer.invoke('widget:close'),
      minimizeWidget: () => ipcRenderer.invoke('widget:minimize'),
      maximizeWidget: () => ipcRenderer.invoke('widget:maximize'),
      showWidget: () => ipcRenderer.invoke('widget:show'),
      hideWidget: () => ipcRenderer.invoke('widget:hide'),
      recreateWidget: () => ipcRenderer.invoke('widget:recreate'),
      enableClickThrough: () => ipcRenderer.invoke('widget:setIgnoreMouseEvents', true, { forward: true }),
      disableClickThrough: () => ipcRenderer.invoke('widget:setIgnoreMouseEvents', false),
      // Undetectability controls
      toggleUndetectability: () => ipcRenderer.invoke('widget:toggleUndetectability'),
      setContentProtection: (enabled) => ipcRenderer.invoke('widget:setContentProtection', enabled),
      getUndetectabilityState: () => ipcRenderer.invoke('widget:getUndetectabilityState'),
      // MQTT Event Listeners
      onDonnaMobileConnectRequest: (callback) => ipcRenderer.on('donna-mobile-connect-request', callback),
      onDonnaMobileDisconnect: (callback) => ipcRenderer.on('donna-mobile-disconnect', callback),
      removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
      // Generic IPC Communication Pipeline
      sendToWidget: (eventName, payload) => ipcRenderer.invoke('sendToWidget', eventName, payload),
      sendToMain: (eventName, payload) => ipcRenderer.invoke('sendToMain', eventName, payload),
      getWindowStatus: () => ipcRenderer.invoke('getWindowStatus'),
      onEventFromWidget: (callback) => ipcRenderer.on('eventFromWidget', callback),
      onEventFromMain: (callback) => ipcRenderer.on('eventFromMain', callback),

      // Screenshot functionality
      captureAndSaveScreenshot: () => ipcRenderer.invoke('capture-and-save-screenshot'),
      validateAndCaptureScreenshot: () => ipcRenderer.invoke('validate-and-capture-screenshot'),
      proceedWithScreenshot: (source) => ipcRenderer.invoke('proceed-with-screenshot', source),
      getScreenshotProcessStatus: () => ipcRenderer.invoke('get-screenshot-process-status'),
      
      // Update API
      downloadUpdate: () => ipcRenderer.invoke('update:download'),
      restartAndInstall: () => ipcRenderer.invoke('update:restart'),
      getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
      // Overlay selector API
      openOverlaySelector: () => ipcRenderer.invoke('overlay:openSelector'),
      saveOverlayType: (overlayType) => ipcRenderer.invoke('overlay:saveOverlayType', overlayType),
      getOverlayType: () => ipcRenderer.invoke('overlay:getOverlayType'),
      onOpenSelector: (callback) => ipcRenderer.on('overlay:openSelector', callback),
    });

  }
  catch (error) {
    console.error(error)
  }
}
else{
  window.electron = electronAPI
  // DB API removed from preload for now
  window.electronAPI = {
    closeApp: () => ipcRenderer.invoke('window:close'),
    quitApp: () => ipcRenderer.invoke('window:quit'),
    minimizeApp: () => ipcRenderer.invoke('window:minimize'),
    maximizeApp: () => ipcRenderer.invoke('window:maximize'),
    enableInteraction: () => ipcRenderer.invoke('window:enableInteraction'),
    disableInteraction: () => ipcRenderer.invoke('window:disableInteraction'),
    setIgnoreMouseEvents: (ignore) => ipcRenderer.invoke('widget:setIgnoreMouseEvents', ignore),
    setupContinue: () => ipcRenderer.invoke('setup:continue'),
    finalizingAgent: () => ipcRenderer.invoke('finalizing-agent'),
    // Logging API
    logToMain: (level, component, message, data) => ipcRenderer.invoke('renderer-log', level, component, message, data),
    // WSL Setup APIs
    checkWSL: () => ipcRenderer.invoke('checkWSL'),
    installWSL: () => ipcRenderer.invoke('installWSL'),
    checkWslConfigDone: () => ipcRenderer.invoke('checkWslConfigDone'),
    configureWslDistro: () => ipcRenderer.invoke('configureWslDistro'),
    restartSystem: () => ipcRenderer.invoke('restartSystem'),
    // MQTT Event Listeners
    onDonnaMobileConnectRequest: (callback) => ipcRenderer.on('donna-mobile-connect-request', callback),
    onDonnaMobileDisconnect: (callback) => ipcRenderer.on('donna-mobile-disconnect', callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    // Generic IPC Communication Pipeline
    sendToWidget: (eventName, payload) => ipcRenderer.invoke('sendToWidget', eventName, payload),
    sendToMain: (eventName, payload) => ipcRenderer.invoke('sendToMain', eventName, payload),
    getWindowStatus: () => ipcRenderer.invoke('getWindowStatus'),
    onEventFromWidget: (callback) => ipcRenderer.on('eventFromWidget', callback),
    onEventFromMain: (callback) => ipcRenderer.on('eventFromMain', callback),

    // Screenshot functionality
    captureAndSaveScreenshot: () => ipcRenderer.invoke('capture-and-save-screenshot'),
    
    // Update API
    onUpdateChecking: (callback) => ipcRenderer.on('update:checking', callback),
    onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (event, data) => callback(data)),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', (event, data) => callback(data)),
    onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (event, data) => callback(data)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (event, data) => callback(data)),
    onUpdateError: (callback) => ipcRenderer.on('update:error', (event, data) => callback(data)),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    restartAndInstall: () => ipcRenderer.invoke('update:restart'),
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    removeUpdateListeners: () => {
      ipcRenderer.removeAllListeners('update:checking')
      ipcRenderer.removeAllListeners('update:available')
      ipcRenderer.removeAllListeners('update:not-available')
      ipcRenderer.removeAllListeners('update:progress')
      ipcRenderer.removeAllListeners('update:downloaded')
      ipcRenderer.removeAllListeners('update:error')
    },
  }
  window.widgetAPI = {
    closeWidget: () => ipcRenderer.invoke('widget:close'),
    minimizeWidget: () => ipcRenderer.invoke('widget:minimize'),
    maximizeWidget: () => ipcRenderer.invoke('widget:maximize'),
    showWidget: () => ipcRenderer.invoke('widget:show'),
    hideWidget: () => ipcRenderer.invoke('widget:hide'),
    recreateWidget: () => ipcRenderer.invoke('widget:recreate'),
    enableClickThrough: () => ipcRenderer.invoke('widget:setIgnoreMouseEvents', true, { forward: true }),
    disableClickThrough: () => ipcRenderer.invoke('widget:setIgnoreMouseEvents', false),
    // Undetectability controls
    toggleUndetectability: () => ipcRenderer.invoke('widget:toggleUndetectability'),
    setContentProtection: (enabled) => ipcRenderer.invoke('widget:setContentProtection', enabled),
    getUndetectabilityState: () => ipcRenderer.invoke('widget:getUndetectabilityState'),
    // MQTT Event Listeners
    onDonnaMobileConnectRequest: (callback) => ipcRenderer.on('donna-mobile-connect-request', callback),
    onDonnaMobileDisconnect: (callback) => ipcRenderer.on('donna-mobile-disconnect', callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    // Generic IPC Communication Pipeline
    sendToWidget: (eventName, payload) => ipcRenderer.invoke('sendToWidget', eventName, payload),
    sendToMain: (eventName, payload) => ipcRenderer.invoke('sendToMain', eventName, payload),
    getWindowStatus: () => ipcRenderer.invoke('getWindowStatus'),
    onEventFromWidget: (callback) => ipcRenderer.on('eventFromWidget', callback),
    onEventFromMain: (callback) => ipcRenderer.on('eventFromMain', callback),

    // Screenshot functionality
    captureAndSaveScreenshot: () => ipcRenderer.invoke('capture-and-save-screenshot'),
    validateAndCaptureScreenshot: () => ipcRenderer.invoke('validate-and-capture-screenshot'),
    proceedWithScreenshot: (source) => ipcRenderer.invoke('proceed-with-screenshot', source),
    getScreenshotProcessStatus: () => ipcRenderer.invoke('get-screenshot-process-status'),
    
      // Update API
      onUpdateChecking: (callback) => ipcRenderer.on('update:checking', callback),
      onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (event, data) => callback(data)),
      onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', (event, data) => callback(data)),
      onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (event, data) => callback(data)),
      onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (event, data) => callback(data)),
      onUpdateError: (callback) => ipcRenderer.on('update:error', (event, data) => callback(data)),
      downloadUpdate: () => ipcRenderer.invoke('update:download'),
      restartAndInstall: () => ipcRenderer.invoke('update:restart'),
      getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
      removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update:checking')
        ipcRenderer.removeAllListeners('update:available')
        ipcRenderer.removeAllListeners('update:not-available')
        ipcRenderer.removeAllListeners('update:progress')
        ipcRenderer.removeAllListeners('update:downloaded')
        ipcRenderer.removeAllListeners('update:error')
      },
      
      // Redux IPC Sync APIs
    broadcastReduxAction: (actionData) => ipcRenderer.invoke('broadcast-redux-action', actionData),
    onReduxActionBroadcast: (callback) => ipcRenderer.on('redux-action-broadcast', (event, data) => callback(data)),
    removeReduxBroadcastListener: () => ipcRenderer.removeAllListeners('redux-action-broadcast'),
    
    // Settings API
    getOverlayRecordable: () => ipcRenderer.invoke('settings:getOverlayRecordable'),
    setOverlayRecordable: (value) => ipcRenderer.invoke('settings:setOverlayRecordable', value),
    restartApp: () => ipcRenderer.invoke('settings:restartApp'),
    // Overlay selector API
    openOverlaySelector: () => ipcRenderer.invoke('overlay:openSelector'),
    saveOverlayType: (overlayType) => ipcRenderer.invoke('overlay:saveOverlayType', overlayType),
    getOverlayType: () => ipcRenderer.invoke('overlay:getOverlayType'),
    onOpenSelector: (callback) => ipcRenderer.on('overlay:openSelector', callback),
  }
}