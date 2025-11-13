import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notificationCount: 0,
  currentState: 'Online', // Default state
  position: { x: 1200, y: 20 }, // Default position
};

const floatingWidgetSlice = createSlice({
  name: 'floatingWidget',
  initialState,
  reducers: {
    setNotificationCount: (state, action) => {
      state.notificationCount = action.payload;
    },
    incrementNotificationCount: (state) => {
      state.notificationCount += 1;
    },
    clearNotificationCount: (state) => {
      state.notificationCount = 0;
    },
    setCurrentState: (state, action) => {
      state.currentState = action.payload;
    },
    setPosition: (state, action) => {
      state.position = action.payload;
    },
  },
});

export const {
  setNotificationCount,
  incrementNotificationCount,
  clearNotificationCount,
  setCurrentState,
  setPosition,
} = floatingWidgetSlice.actions;

export default floatingWidgetSlice.reducer;
