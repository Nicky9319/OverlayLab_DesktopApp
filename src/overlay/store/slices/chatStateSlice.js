import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [
    {
      type: "ai",
      data: {
        content: "Hello! How can I help you today?",
        additional_kwargs: {
          time_stamp: new Date(Date.now() - 60000).toISOString() // 1 minute ago
        },
        response_metadata: {},
        type: "ai",
        name: null,
        id: "initial-greeting",
        example: false
      }
    }
  ],
  isExpanded: false,
  position: { x: 0, y: 0 },
  isTyping: false
};

const chatStateSlice = createSlice({
  name: 'chatState',
  initialState,
  reducers: {
    addMessage(state, action) {
      console.log('[ChatStateSlice] addMessage', action.payload);
      state.messages.push(action.payload);
    },
    setMessages(state, action) {
      state.messages = action.payload;
    },
    clearMessages(state) {
      state.messages = [initialState.messages[0]]; // Keep the initial greeting
    },
    setIsExpanded(state, action) {
      state.isExpanded = action.payload;
    },
    setPosition(state, action) {
      state.position = action.payload;
    },
    setIsTyping(state, action) {
      state.isTyping = action.payload;
    },
    resetChatState(state) {
      return initialState;
    }
  },
});

export const {
  addMessage,
  setMessages,
  clearMessages,
  setIsExpanded,
  setPosition,
  setIsTyping,
  resetChatState,
} = chatStateSlice.actions;

export default chatStateSlice.reducer;
