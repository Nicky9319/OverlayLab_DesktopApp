import { configureStore } from '@reduxjs/toolkit'
import visibilitySlice from './slices/visibilitySlice'
import floatingWidgetSlice from './slices/floatingWidgetSlice'
import uiVisibilityReducer from './slices/uiVisibilitySlice'
import chatStateReducer from './slices/chatStateSlice'
import webSocketReducer from './slices/websocketSlice'
import overlayTypeReducer from './slices/overlayTypeSlice'
import overlaySelectorReducer from './slices/overlaySelectorSlice'
// Use global slices for buckets and leads to ensure state synchronization across all windows
import bucketsReducer from '../../store/slices/bucketsSlice'
import leadsReducer from '../../store/slices/leadsSlice'
import teamsReducer from '../../store/slices/teamsSlice'
import metricsReducer from '../../store/slices/metricsSlice'
import ipcSyncMiddleware from '../../store/middleware/ipcSyncMiddleware'

export const store = configureStore({
  reducer: {
    visibility: visibilitySlice,
    floatingWidget: floatingWidgetSlice,
    uiVisibility: uiVisibilityReducer,
    chatState: chatStateReducer,
    webSocket: webSocketReducer,
    overlayType: overlayTypeReducer,
    overlaySelector: overlaySelectorReducer,
    buckets: bucketsReducer,
    leads: leadsReducer,
    teams: teamsReducer,
    metrics: metricsReducer,
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
      
      // Check if this action needs context (buckets, leads, or metrics actions)
      const needsContext = actionData.type.startsWith('buckets/') || actionData.type.startsWith('leads/') || actionData.type.startsWith('metrics/');
      
      // Reconstruct payload based on whether it needs context
      let payload;
      if (actionData.type.startsWith('metrics/')) {
        // Metrics actions: preserve the full payload structure (metricId, visible, context, etc.)
        payload = {
          ...actionData.payload,
          broadcast: false
        };
      } else if (needsContext) {
        // Buckets/leads actions: payload should have { data, context } structure
        if (actionData.payload && typeof actionData.payload === 'object' && 'context' in actionData.payload) {
          // Payload has context (team or personal buckets/leads)
          payload = {
            data: actionData.payload.data,
            context: actionData.payload.context,
            broadcast: false
          };
        } else {
          // Fallback: treat payload as data, context defaults to 'personal' in reducer
          payload = {
            data: actionData.payload,
            context: 'personal',
            broadcast: false
          };
        }
      } else {
        // Other actions (teams, etc.): payload is just data
        payload = {
          data: actionData.payload,
          broadcast: false
        };
      }
      
      // Dispatch action with broadcast=false to update local state
      store.dispatch({
        type: actionData.type,
        payload
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
