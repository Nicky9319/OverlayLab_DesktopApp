# WebSocket Manager Implementation

This document describes the WebSocket manager implementation for the widget application.

## Architecture Overview

The WebSocket implementation follows a **singleton pattern** with **Redux integration** for state management. It provides a centralized way for all components to communicate with the WebSocket server.

## File Structure

```
src/widget/
├── services/
│   ├── WebSocketManager.js          # Singleton WebSocket service
│   └── README.md                    # This documentation
├── store/
│   └── slices/
│       └── webSocketSlice.js        # Redux slice for WebSocket state
├── hooks/
│   └── useWebSocket.js              # Custom hooks for WebSocket usage
├── Features/
│   └── webSocketManager/
│       └── WebSocketManager.jsx     # React component for WebSocket management
└── components/
    └── WebSocketExample.jsx         # Example component showing usage
```

## Core Components

### 1. WebSocketManager Service (`services/WebSocketManager.js`)

**Singleton Pattern**: Ensures only one WebSocket instance exists across the application.

**Key Features**:
- Connection management
- Event emission and listening
- Error handling
- Automatic reconnection
- Event listener management

**Usage**:
```javascript
import webSocketManager from '../services/WebSocketManager';

// Connect to server
await webSocketManager.connect('http://localhost:3001');

// Emit events
webSocketManager.emit('message', { text: 'Hello' });

// Listen for events
webSocketManager.on('response', (data) => {
  console.log('Received:', data);
});
```

### 2. Redux Slice (`store/slices/webSocketSlice.js`)

**State Management**: Manages WebSocket connection status, events, and errors in Redux store.

**State Structure**:
```javascript
{
  wsInstance: webSocketManager,    // WebSocket instance
  isConnected: false,              // Connection status
  isConnecting: false,             // Connecting status
  lastEvent: null,                 // Last received event
  eventHistory: [],                // Event history (last 100)
  error: null,                     // Connection/operation errors
  connectionUrl: 'http://localhost:3001',
  socketId: null,                  // Current socket ID
}
```

**Async Thunks**:
- `connectWebSocket(options)` - Connect to WebSocket server
- `disconnectWebSocket()` - Disconnect from server
- `emitWebSocketEvent({ event, data, callback })` - Emit events

### 3. Custom Hooks (`hooks/useWebSocket.js`)

**Easy Integration**: Provides React hooks for easy WebSocket usage in components.

**Available Hooks**:
- `useWebSocket()` - Main hook for WebSocket functionality
- `useWebSocketEvent(event, callback, deps)` - Listen for specific events
- `useWebSocketConnection(options, autoConnect)` - Automatic connection management

## Usage Examples

### Basic Component Usage

```javascript
import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const MyComponent = () => {
  const { 
    isConnected, 
    emit, 
    on, 
    off 
  } = useWebSocket();

  useEffect(() => {
    // Listen for specific events
    on('user-message', (data) => {
      console.log('User message:', data);
    });

    return () => {
      // Clean up listeners
      off('user-message');
    };
  }, [on, off]);

  const sendMessage = () => {
    if (isConnected) {
      emit('send-message', { text: 'Hello from widget!' });
    }
  };

  return (
    <div>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <button onClick={sendMessage} disabled={!isConnected}>
        Send Message
      </button>
    </div>
  );
};
```

### Using Event-Specific Hook

```javascript
import React from 'react';
import { useWebSocketEvent } from '../hooks/useWebSocket';

const NotificationComponent = () => {
  const [notifications, setNotifications] = useState([]);

  // Listen for notification events
  useWebSocketEvent('notification', (data) => {
    setNotifications(prev => [...prev, data]);
  });

  return (
    <div>
      {notifications.map((notification, index) => (
        <div key={index}>{notification.message}</div>
      ))}
    </div>
  );
};
```

### Automatic Connection Management

```javascript
import React from 'react';
import { useWebSocketConnection } from '../hooks/useWebSocket';

const AutoConnectComponent = () => {
  const { isConnected, isConnecting, error } = useWebSocketConnection({
    transports: ['websocket', 'polling'],
    timeout: 20000
  }, true); // autoConnect = true

  return (
    <div>
      {isConnecting && <p>Connecting...</p>}
      {isConnected && <p>Connected!</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
};
```

## Event Patterns

### Emitting Events
```javascript
// Simple event
emit('user-action', { action: 'click', button: 'submit' });

// Event with callback
emit('request-data', { id: 123 }, (response) => {
  console.log('Response:', response);
});

// Event with complex data
emit('update-user', {
  userId: 'user123',
  data: { name: 'John', email: 'john@example.com' }
});
```

### Listening for Events
```javascript
// Listen for specific events
on('user-updated', (userData) => {
  console.log('User updated:', userData);
});

// Listen for all events (for debugging)
on('*', (eventName, data) => {
  console.log(`Event: ${eventName}`, data);
});
```

## Configuration

### Environment Variables
```bash
# WebSocket server URL
REACT_APP_WEBSOCKET_URL=http://localhost:3001
```

### Connection Options
```javascript
const options = {
  transports: ['websocket', 'polling'],  // Transport methods
  timeout: 20000,                        // Connection timeout
  forceNew: true,                        // Force new connection
  auth: {                                // Authentication data
    token: 'user-token',
    userId: 'user123'
  }
};
```

## Error Handling

The WebSocket manager includes comprehensive error handling:

```javascript
const { error, clearError } = useWebSocket();

// Display errors
if (error) {
  console.error('WebSocket error:', error);
  // Show error message to user
}

// Clear errors
const handleRetry = () => {
  clearError();
  connect(); // Retry connection
};
```

## Best Practices

1. **Connection Management**: Let the WebSocketManager component handle the initial connection
2. **Event Cleanup**: Always clean up event listeners in useEffect cleanup
3. **Error Handling**: Always check connection status before emitting events
4. **State Updates**: Use Redux state for shared WebSocket data
5. **Performance**: Use the event-specific hooks to avoid unnecessary re-renders

## Integration with Existing Components

To integrate with existing components:

1. **Import the hook**:
```javascript
import { useWebSocket } from '../hooks/useWebSocket';
```

2. **Use the WebSocket functionality**:
```javascript
const { isConnected, emit, on, off } = useWebSocket();
```

3. **Set up event listeners**:
```javascript
useEffect(() => {
  on('my-event', handleMyEvent);
  return () => off('my-event', handleMyEvent);
}, [on, off]);
```

4. **Emit events when needed**:
```javascript
const handleAction = () => {
  if (isConnected) {
    emit('my-action', { data: 'value' });
  }
};
```

This implementation provides a robust, scalable WebSocket solution that can be easily integrated into any component in the widget application.
