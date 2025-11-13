import { createSlice } from '@reduxjs/toolkit';

const bucketsSlice = createSlice({
  name: 'buckets',
  initialState: {
    buckets: [],
    loading: false,
    error: null,
  },
  reducers: {
    setBuckets: (state, action) => {
      state.buckets = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    updateBucket: (state, action) => {
      const { id, name } = action.payload;
      const bucket = state.buckets.find(b => b.id === id);
      if (bucket) {
        bucket.name = name;
      }
    },
    addBucket: (state, action) => {
      state.buckets.push(action.payload);
    },
    deleteBucket: (state, action) => {
      state.buckets = state.buckets.filter(bucket => bucket.id !== action.payload);
    },
  },
});

export const { setBuckets, setLoading, setError, updateBucket, addBucket, deleteBucket } = bucketsSlice.actions;
export default bucketsSlice.reducer;
