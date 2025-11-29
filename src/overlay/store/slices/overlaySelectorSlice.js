import { createSlice } from '@reduxjs/toolkit';
import { overlayTypesConfig } from '../../config/overlayTypes';

const initialState = {
  isOpen: false,
  selectedIndex: 0, // Index in overlayTypesConfig array
};

const overlaySelectorSlice = createSlice({
  name: 'overlaySelector',
  initialState,
  reducers: {
    openSelector(state) {
      state.isOpen = true;
    },
    closeSelector(state) {
      state.isOpen = false;
    },
    selectIndex(state, action) {
      state.selectedIndex = action.payload;
      // Ensure index is within bounds
      if (state.selectedIndex < 0) {
        state.selectedIndex = overlayTypesConfig.length - 1;
      } else if (state.selectedIndex >= overlayTypesConfig.length) {
        state.selectedIndex = 0;
      }
    },
    navigateNext(state) {
      state.selectedIndex = (state.selectedIndex + 1) % overlayTypesConfig.length;
    },
    navigatePrev(state) {
      state.selectedIndex = (state.selectedIndex - 1 + overlayTypesConfig.length) % overlayTypesConfig.length;
    },
    setSelectedIndexFromOverlayType(state, action) {
      // Find index of overlay type
      const index = overlayTypesConfig.findIndex(type => type.id === action.payload);
      if (index !== -1) {
        state.selectedIndex = index;
      }
    },
  },
});

export const {
  openSelector,
  closeSelector,
  selectIndex,
  navigateNext,
  navigatePrev,
  setSelectedIndexFromOverlayType,
} = overlaySelectorSlice.actions;
export default overlaySelectorSlice.reducer;

