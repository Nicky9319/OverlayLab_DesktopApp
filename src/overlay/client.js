import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { 
  setWebSocketInstance
} from '../../store/slices/websocketSlice';
import webSocketManager from '../../services/webSocketManager';

const WebSocketManager = () => {
  const dispatch = useDispatch();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      console.log('🔧 WebSocket Manager component initialized');
      
      // Set the WebSocket instance in Redux
      dispatch(setWebSocketInstance(webSocketManager));

      // Mark as initialized
      isInitialized.current = true;

      console.log('✅ WebSocket Manager component ready');

      // Cleanup on unmount
      return () => {
        console.log('🧹 WebSocket Manager component unmounting');
      };
    }
  }, [dispatch]);

  // This component doesn't render anything visible
  return null;
};

export default WebSocketManager;