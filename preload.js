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
      
      // Redux IPC Sync APIs
      broadcastReduxAction: (actionData) => ipcRenderer.invoke('broadcast-redux-action', actionData),
      onReduxActionBroadcast: (callback) => ipcRenderer.on('redux-action-broadcast', (event, data) => callback(data)),
      removeReduxBroadcastListener: () => ipcRenderer.removeAllListeners('redux-action-broadcast'),
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
    
    // Redux IPC Sync APIs
    broadcastReduxAction: (actionData) => ipcRenderer.invoke('broadcast-redux-action', actionData),
    onReduxActionBroadcast: (callback) => ipcRenderer.on('redux-action-broadcast', (event, data) => callback(data)),
    removeReduxBroadcastListener: () => ipcRenderer.removeAllListeners('redux-action-broadcast'),
  }
}