import { configureStore } from '@reduxjs/toolkit';
import bucketsReducer from './slices/bucketsSlice';
import leadsReducer from './slices/leadsSlice';
import teamsReducer from './slices/teamsSlice';
import vaultsReducer from './slices/vaultsSlice';
import metricsReducer from './slices/metricsSlice';
import ipcSyncMiddleware from './middleware/ipcSyncMiddleware';

export const store = configureStore({
  reducer: {
    buckets: bucketsReducer,
    leads: leadsReducer,
    teams: teamsReducer,
    vaults: vaultsReducer,
    metrics: metricsReducer,
    // Add other reducers as needed
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Add any actions that contain non-serializable data
          'persist/PERSIST', 
          'persist/REHYDRATE'
        ],
        ignoredPaths: [
          // Add any paths that contain non-serializable data
        ],
      },
    }).concat(ipcSyncMiddleware),
});

// Set up IPC listener for broadcasted Redux actions
if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.onReduxActionBroadcast) {
  window.electronAPI.onReduxActionBroadcast((actionData) => {
    try {
      console.log('Received broadcasted Redux action:', actionData.type);
      
      // Check if this action needs context (buckets, leads, or metrics actions)
      const needsContext = actionData.type.startsWith('buckets/') || 
                          actionData.type.startsWith('leads/') || 
                          actionData.type.startsWith('metrics/');
      
      // Reconstruct payload based on whether it needs context
      let payload;
      if (needsContext) {
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
  
  console.log('IPC Redux sync listener initialized for main store');
}

/*
// If using TypeScript, move these to a .ts file:
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
*/

export default store;