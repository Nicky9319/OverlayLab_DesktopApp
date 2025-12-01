import { createSlice } from '@reduxjs/toolkit';
import { getDefaultOverlayType } from '../../config/overlayTypes';

const initialState = {
  currentOverlayType: getDefaultOverlayType(),
};

const overlayTypeSlice = createSlice({
  name: 'overlayType',
  initialState,
  reducers: {
    setOverlayType(state, action) {
      state.currentOverlayType = action.payload;
    },
  },
});

export const { setOverlayType } = overlayTypeSlice.actions;
export default overlayTypeSlice.reducer;



