import { createSlice } from '@reduxjs/toolkit';

/**
 * Buckets Redux Slice with IPC Broadcast Support
 * Based on MongoDB schema: { bucketId: string, bucketName: string }
 * 
 * Each reducer supports a 'broadcast' parameter:
 * - broadcast=true: Send to main process for broadcasting (don't update local state)
 * - broadcast=false: Update local state (received from broadcast)
 */
const bucketsSlice = createSlice({
  name: 'buckets',
  initialState: {
    buckets: [], // Array of { bucketId: string, bucketName: string }
    loading: false,
    error: null,
    lastFetched: null, // Timestamp of last successful fetch
  },
  reducers: {
    // Set all buckets (used after fetching from API)
    setBuckets: {
      reducer: (state, action) => {
        // Only update state if not broadcasting
        if (!action.payload.broadcast) {
          state.buckets = action.payload.data;
          state.loading = false;
          state.error = null;
          state.lastFetched = Date.now();
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set loading state
    setLoading: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          state.loading = action.payload.data;
          if (action.payload.data) {
            state.error = null; // Clear error when starting to load
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set error state
    setError: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          state.error = action.payload.data;
          state.loading = false;
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update bucket name (supports both id/bucketId and name/bucketName)
    updateBucket: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          const { id, bucketId, name, bucketName } = action.payload.data;
          const targetId = id || bucketId;
          const newName = name || bucketName;
          
          if (!targetId || !newName) return;
          
          const bucket = state.buckets.find(b => 
            b.bucketId === targetId || b.id === targetId
          );
          if (bucket) {
            bucket.bucketName = newName;
            // Also update 'name' if it exists for backward compatibility
            if (bucket.name !== undefined) {
              bucket.name = newName;
            }
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Add a new bucket
    addBucket: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          const bucket = action.payload.data;
          // Normalize to ensure bucketId and bucketName exist
          const normalizedBucket = {
            bucketId: bucket.bucketId || bucket.id,
            bucketName: bucket.bucketName || bucket.name,
            ...bucket
          };
          // Check if bucket already exists
          const exists = state.buckets.some(b => 
            b.bucketId === normalizedBucket.bucketId || 
            (b.id && b.id === normalizedBucket.bucketId)
          );
          if (!exists) {
            state.buckets.push(normalizedBucket);
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Delete a bucket by ID
    deleteBucket: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          const bucketId = action.payload.data;
          state.buckets = state.buckets.filter(bucket => 
            bucket.bucketId !== bucketId && bucket.id !== bucketId
          );
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Clear all buckets
    clearBuckets: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          state.buckets = [];
          state.error = null;
          state.lastFetched = null;
        }
      },
      prepare: (data = null, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
  },
});

export const { 
  setBuckets, 
  setLoading, 
  setError, 
  updateBucket, 
  addBucket, 
  deleteBucket,
  clearBuckets 
} = bucketsSlice.actions;

export default bucketsSlice.reducer;