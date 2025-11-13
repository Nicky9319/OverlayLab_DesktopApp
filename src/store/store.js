import { configureStore } from '@reduxjs/toolkit';
import bucketsReducer from './slices/bucketsSlice';
import leadsReducer from './slices/leadsSlice';

export const store = configureStore({
  reducer: {
    buckets: bucketsReducer,
    leads: leadsReducer,
    // Add other reducers as needed
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Add any actions that contain non-serializable data
        ],
        ignoredPaths: [
          // Add any paths that contain non-serializable data
        ],
      },
    }),
});

/*
// If using TypeScript, move these to a .ts file:
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
*/