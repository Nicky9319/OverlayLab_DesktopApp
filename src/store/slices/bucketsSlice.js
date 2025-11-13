import { createSlice } from '@reduxjs/toolkit';

/**
 * Buckets Redux Slice
 * Based on MongoDB schema: { bucketId: string, bucketName: string }
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
    setBuckets: (state, action) => {
      state.buckets = action.payload;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null; // Clear error when starting to load
      }
    },
    // Set error state
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    // Update bucket name (supports both id/bucketId and name/bucketName)
    updateBucket: (state, action) => {
      const { id, bucketId, name, bucketName } = action.payload;
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
    },
    // Add a new bucket
    addBucket: (state, action) => {
      const bucket = action.payload;
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
    },
    // Delete a bucket by ID
    deleteBucket: (state, action) => {
      const bucketId = action.payload;
      state.buckets = state.buckets.filter(bucket => 
        bucket.bucketId !== bucketId && bucket.id !== bucketId
      );
    },
    // Clear all buckets
    clearBuckets: (state) => {
      state.buckets = [];
      state.error = null;
      state.lastFetched = null;
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
