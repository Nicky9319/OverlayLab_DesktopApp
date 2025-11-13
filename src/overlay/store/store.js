import { configureStore } from '@reduxjs/toolkit'
import visibilitySlice from './slices/visibilitySlice'
import floatingWidgetSlice from './slices/floatingWidgetSlice'
import uiVisibilityReducer from './slices/uiVisibilitySlice'
import chatStateReducer from './slices/chatStateSlice'
import webSocketReducer from './slices/websocketSlice'
import bucketsReducer from './slices/bucketsSlice'
import leadsReducer from '../../store/slices/leadsSlice'
import ipcSyncMiddleware from '../../store/middleware/ipcSyncMiddleware'

export const store = configureStore({
  reducer: {
    visibility: visibilitySlice,
    floatingWidget: floatingWidgetSlice,
    uiVisibility: uiVisibilityReducer,
    chatState: chatStateReducer,
    webSocket: webSocketReducer,
    buckets: bucketsReducer,
    leads: leadsReducer,
    // Add your other reducers here as you create them
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'webSocket/setLastEvent', // Events might contain non-serializable data
          'webSocket/setWebSocketInstance', // WebSocket instance is non-serializable
        ],
        ignoredPaths: [
          'webSocket.lastEvent.data', // Event data might contain non-serializable values
          'webSocket.wsInstance', // WebSocket instance is non-serializable
        ],
      },
    }).concat(ipcSyncMiddleware),
})

// Set up IPC listener for broadcasted Redux actions
if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onReduxActionBroadcast) {
  window.electronAPI.onReduxActionBroadcast((actionData) => {
    try {
      console.log('Received broadcasted Redux action:', actionData.type);
      
      // Dispatch action with broadcast=false to update local state
      store.dispatch({
        type: actionData.type,
        payload: { 
          data: actionData.payload, 
          broadcast: false // This will update the local state
        }
      });
    } catch (error) {
      console.error('Error processing broadcasted Redux action:', error);
    }
  });
  
  console.log('IPC Redux sync listener initialized for overlay store');
}

/* 
// If using TypeScript, move these to a .ts file:
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
*/
