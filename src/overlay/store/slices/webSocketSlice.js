import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isConnected: false,
};

const webSocketSlice = createSlice({
  name: 'webSocket',
  initialState,
  reducers: {
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    }
  }
})

export const { setConnectionStatus, initializeWebSocket } = webSocketSlice.actions;

export default webSocketSlice.reducer;