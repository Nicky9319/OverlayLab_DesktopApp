import { createSlice } from '@reduxjs/toolkit';

// Load actionBarCollapsed from localStorage on initialization
const getInitialActionBarCollapsed = () => {
  try {
    const saved = localStorage.getItem('actionBarCollapsed');
    return saved === 'true';
  } catch (error) {
    console.error('Error reading actionBarCollapsed from localStorage:', error);
    return false;
  }
};

const initialState = {
  floatingWidgetVisible: true,
  actionBarVisible: true,
  actionBarCollapsed: getInitialActionBarCollapsed(), // State to track if action bar is collapsed
  chatInterfaceVisible: false,
  allWidgetsVisible: true, // New state to control all widgets visibility
  messageCount: 0, // New state for message count notification
};

const uiVisibilitySlice = createSlice({
  name: 'uiVisibility',
  initialState,
  reducers: {
    setFloatingWidgetVisible(state, action) {
      state.floatingWidgetVisible = action.payload;
    },
    setActionBarVisible(state, action) {
      state.actionBarVisible = action.payload;
    },
    setActionBarCollapsed(state, action) {
      state.actionBarCollapsed = action.payload;
      // Save to localStorage whenever state changes
      try {
        localStorage.setItem('actionBarCollapsed', action.payload.toString());
      } catch (error) {
        console.error('Error saving actionBarCollapsed to localStorage:', error);
      }
    },
    setChatInterfaceVisible(state, action) {
      state.chatInterfaceVisible = action.payload;
    },
    // New actions for controlling all widgets
    showAllWidgets(state) {
      state.allWidgetsVisible = true;
      state.floatingWidgetVisible = true;
      state.actionBarVisible = true;
      state.chatInterfaceVisible = true;
    },
    hideAllWidgets(state) {
      state.allWidgetsVisible = false;
      state.floatingWidgetVisible = false;
      state.actionBarVisible = false;
      state.chatInterfaceVisible = false;
    },
    toggleAllWidgets(state) {
      state.allWidgetsVisible = !state.allWidgetsVisible;
      state.floatingWidgetVisible = state.allWidgetsVisible;
      state.actionBarVisible = state.allWidgetsVisible;
      state.chatInterfaceVisible = state.allWidgetsVisible;
    },
    setAllWidgetsVisible(state, action) {
      state.allWidgetsVisible = action.payload;
      state.floatingWidgetVisible = action.payload;
      state.actionBarVisible = action.payload;
      state.chatInterfaceVisible = action.payload;
    },
    setMessageCount(state, action) {
      state.messageCount = action.payload;
    },
    incrementMessageCount(state) {
      state.messageCount += 1;
    },
    clearMessageCount(state) {
      state.messageCount = 0;
    },
  },
});

export const {
  setFloatingWidgetVisible,
  setActionBarVisible,
  setActionBarCollapsed,
  setChatInterfaceVisible,
  showAllWidgets,
  hideAllWidgets,
  toggleAllWidgets,
  setAllWidgetsVisible,
  setMessageCount,
  incrementMessageCount,
  clearMessageCount,
} = uiVisibilitySlice.actions;

export default uiVisibilitySlice.reducer;
