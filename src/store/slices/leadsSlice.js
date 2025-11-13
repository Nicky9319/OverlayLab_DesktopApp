import { createSlice } from '@reduxjs/toolkit';

const leadsSlice = createSlice({
  name: 'leads',
  initialState: {
    leads: [],
    loading: false,
    error: null,
  },
  reducers: {
    // Add reducers as needed
  },
});

export default leadsSlice.reducer;
