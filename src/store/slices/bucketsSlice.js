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
    personal: {
      buckets: [], // Array of { bucketId: string, bucketName: string }
      loading: false,
      error: null,
      lastFetched: null, // Timestamp of last successful fetch
    },
    teams: {}, // Object keyed by teamId: { buckets: [], loading: false, error: null, lastFetched: null }
  },
  reducers: {
    // Set all buckets (used after fetching from API)
    // context: 'personal' or teamId string
    setBuckets: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        const bucketsData = Array.isArray(data) ? data : [];
        
        // Initialize team state if it doesn't exist
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            buckets: [],
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        console.log('bucketsSlice.setBuckets: Updating state', {
          context,
          receivedCount: Array.isArray(data) ? data.length : 0,
          isArray: Array.isArray(data),
          sampleBucket: Array.isArray(data) && data.length > 0 ? data[0] : null,
          currentCount: context === 'personal' ? state.personal.buckets.length : (state.teams[context]?.buckets?.length || 0),
          broadcast
        });
        
        // Update the target state
        if (context === 'personal') {
          state.personal.buckets = bucketsData;
          state.personal.loading = false;
          state.personal.error = null;
          state.personal.lastFetched = Date.now();
        } else {
          state.teams[context].buckets = bucketsData;
          state.teams[context].loading = false;
          state.teams[context].error = null;
          state.teams[context].lastFetched = Date.now();
        }
        
        console.log('bucketsSlice.setBuckets: State updated', {
          context,
          newCount: context === 'personal' ? state.personal.buckets.length : state.teams[context].buckets.length,
          buckets: (context === 'personal' ? state.personal.buckets : state.teams[context].buckets).map(b => ({
            bucketId: b.bucketId || b.id,
            bucketName: b.bucketName || b.name,
            teamId: b.teamId || b.team_id,
            customerId: b.customerId
          }))
        });
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Set loading state
    // context: 'personal' or teamId string
    setLoading: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            buckets: [],
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        if (context === 'personal') {
          state.personal.loading = data;
          if (data) {
            state.personal.error = null;
          }
        } else {
          state.teams[context].loading = data;
          if (data) {
            state.teams[context].error = null;
          }
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Set error state
    // context: 'personal' or teamId string
    setError: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            buckets: [],
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        if (context === 'personal') {
          state.personal.error = data;
          state.personal.loading = false;
        } else {
          state.teams[context].error = data;
          state.teams[context].loading = false;
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Update bucket name (supports both id/bucketId and name/bucketName)
    // context: 'personal' or teamId string
    updateBucket: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const buckets = context === 'personal' ? state.personal.buckets : state.teams[context].buckets;
        if (!Array.isArray(buckets)) {
          return;
        }
        
        const { id, bucketId, name, bucketName } = data;
        const targetId = id || bucketId;
        const newName = name || bucketName;
        
        if (!targetId || !newName) return;
        
        const bucket = buckets.find(b => 
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
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Add a new bucket
    // context: 'personal' or teamId string
    addBucket: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            buckets: [],
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        const buckets = context === 'personal' ? state.personal.buckets : state.teams[context].buckets;
        if (!Array.isArray(buckets)) {
          if (context === 'personal') {
            state.personal.buckets = [];
          } else {
            state.teams[context].buckets = [];
          }
        }
        
        const bucket = data;
        // Normalize to ensure bucketId and bucketName exist
        const normalizedBucket = {
          bucketId: bucket.bucketId || bucket.id,
          bucketName: bucket.bucketName || bucket.name,
          ...bucket
        };
        
        const targetBuckets = context === 'personal' ? state.personal.buckets : state.teams[context].buckets;
        // Check if bucket already exists
        const exists = targetBuckets.some(b => 
          b.bucketId === normalizedBucket.bucketId || 
          (b.id && b.id === normalizedBucket.bucketId)
        );
        if (!exists) {
          targetBuckets.push(normalizedBucket);
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Delete a bucket by ID
    // context: 'personal' or teamId string
    deleteBucket: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const buckets = context === 'personal' ? state.personal.buckets : state.teams[context].buckets;
        if (!Array.isArray(buckets)) {
          return;
        }
        
        const bucketId = data;
        if (context === 'personal') {
          state.personal.buckets = buckets.filter(bucket => 
            bucket.bucketId !== bucketId && bucket.id !== bucketId
          );
        } else {
          state.teams[context].buckets = buckets.filter(bucket => 
            bucket.bucketId !== bucketId && bucket.id !== bucketId
          );
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Clear all buckets
    // context: 'personal' or teamId string
    clearBuckets: {
      reducer: (state, action) => {
        const { context, broadcast } = action.payload;
        
        if (context === 'personal') {
          state.personal.buckets = [];
          state.personal.error = null;
          state.personal.lastFetched = null;
        } else {
          if (state.teams[context]) {
            state.teams[context].buckets = [];
            state.teams[context].error = null;
            state.teams[context].lastFetched = null;
          }
        }
      },
      prepare: (context = 'personal', broadcast = false) => ({
        payload: { context, broadcast }
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