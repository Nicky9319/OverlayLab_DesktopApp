import { configureStore } from '@reduxjs/toolkit';
import bucketsReducer from './slices/bucketsSlice';
import leadsReducer from './slices/leadsSlice';
import teamsReducer from './slices/teamsSlice';
import vaultsReducer from './slices/vaultsSlice';
import ipcSyncMiddleware from './middleware/ipcSyncMiddleware';

export const store = configureStore({
  reducer: {
    buckets: bucketsReducer,
    leads: leadsReducer,
    teams: teamsReducer,
    vaults: vaultsReducer,
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
  
  console.log('IPC Redux sync listener initialized for main store');
}

/*
// If using TypeScript, move these to a .ts file:
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
*/

export default store;