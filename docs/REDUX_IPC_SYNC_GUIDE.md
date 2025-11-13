# Redux IPC Synchronization Guide

## Overview

This guide explains how to work with the Redux IPC synchronization system in OverlayLab. This system ensures that all Electron windows (main, widget, overlay) maintain synchronized Redux state through inter-process communication (IPC).

## Architecture

```
Window 1 (Main) ──┐
                  ├── IPC ──→ Main Process ──→ IPC Broadcast ──┐
Window 2 (Widget) ┘                                            ├──→ All Windows
                                                               │
Window 3 (Overlay) ────────────────────────────────────────────┘
```

## Core Components

### 1. IPC Sync Middleware (`src/store/middleware/ipcSyncMiddleware.js`)
- Intercepts Redux actions with `broadcast=true`
- Sends them to main process for broadcasting
- Filters actions using `BROADCASTABLE_ACTIONS` array

### 2. Redux Slices with Broadcast Support
- All reducers use the `prepare` pattern
- Support `broadcast` parameter in payload
- Only update state when `broadcast=false`

### 3. Thunks with Broadcasting
- Make API calls
- Dispatch actions with `broadcast=true`
- Return data for local handling

### 4. Store Configuration
- Includes IPC sync middleware
- Sets up broadcast listeners
- Handles incoming IPC messages

## How to Add a New Slice with IPC Sync

### Step 1: Create the Slice

```javascript
// src/store/slices/newFeatureSlice.js
import { createSlice } from '@reduxjs/toolkit';

const newFeatureSlice = createSlice({
  name: 'newFeature',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    // ✅ CORRECT: Use prepare pattern for broadcast support
    setItems: {
      reducer: (state, action) => {
        // Only update state if not broadcasting
        if (!action.payload.broadcast) {
          state.items = action.payload.data;
          state.loading = false;
          state.error = null;
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    addItem: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          const item = action.payload.data;
          // Check if item already exists
          const exists = state.items.some(i => i.id === item.id);
          if (!exists) {
            state.items.push(item);
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    updateItem: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          const { id, ...updates } = action.payload.data;
          const itemIndex = state.items.findIndex(i => i.id === id);
          if (itemIndex !== -1) {
            state.items[itemIndex] = { ...state.items[itemIndex], ...updates };
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    deleteItem: {
      reducer: (state, action) => {
        if (!action.payload.broadcast) {
          const itemId = action.payload.data;
          state.items = state.items.filter(item => item.id !== itemId);
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
  },
});

export const { setItems, addItem, updateItem, deleteItem } = newFeatureSlice.actions;
export default newFeatureSlice.reducer;
```

### Step 2: Add to Broadcastable Actions

```javascript
// src/store/middleware/ipcSyncMiddleware.js
const BROADCASTABLE_ACTIONS = [
  // Existing actions...
  'buckets/setBuckets',
  'leads/setLeads',
  
  // ✅ ADD YOUR NEW ACTIONS HERE
  'newFeature/setItems',
  'newFeature/addItem',
  'newFeature/updateItem',
  'newFeature/deleteItem',
];
```

### Step 3: Create Thunks

```javascript
// src/store/thunks/newFeatureThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import * as newFeatureService from '../../services/newFeatureService';
import { setItems, addItem, updateItem, deleteItem } from '../slices/newFeatureSlice';

export const fetchItems = createAsyncThunk(
  'newFeature/fetchItems',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const items = await newFeatureService.getAllItems();
      
      // ✅ BROADCAST to all windows (broadcast=true)
      dispatch(setItems(items, true));
      return items;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createItem = createAsyncThunk(
  'newFeature/createItem',
  async (itemData, { dispatch, rejectWithValue }) => {
    try {
      const response = await newFeatureService.createItem(itemData);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        // ✅ BROADCAST to all windows (broadcast=true)
        dispatch(addItem(response.content, true));
        return response.content;
      } else {
        return rejectWithValue(response.content?.detail || 'Failed to create item');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateItemData = createAsyncThunk(
  'newFeature/updateItem',
  async ({ id, updates }, { dispatch, rejectWithValue }) => {
    try {
      const response = await newFeatureService.updateItem(id, updates);
      
      if (response.status_code === 200) {
        // ✅ BROADCAST to all windows (broadcast=true)
        dispatch(updateItem({ id, ...updates }, true));
        return { id, ...updates };
      } else {
        return rejectWithValue(response.content?.detail || 'Failed to update item');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeItem = createAsyncThunk(
  'newFeature/deleteItem',
  async (itemId, { dispatch, rejectWithValue }) => {
    try {
      const response = await newFeatureService.deleteItem(itemId);
      
      if (response.status_code === 200) {
        // ✅ BROADCAST to all windows (broadcast=true)
        dispatch(deleteItem(itemId, true));
        return itemId;
      } else {
        return rejectWithValue(response.content?.detail || 'Failed to delete item');
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### Step 4: Add to Store Configuration

```javascript
// src/store/store.js
import newFeatureReducer from './slices/newFeatureSlice';

export const store = configureStore({
  reducer: {
    buckets: bucketsReducer,
    leads: leadsReducer,
    newFeature: newFeatureReducer, // ✅ ADD HERE
  },
  // ... rest of config
});
```

```javascript
// src/overlay/store/store.js (if needed in overlay)
import newFeatureReducer from '../../store/slices/newFeatureSlice';

export const store = configureStore({
  reducer: {
    // ... existing reducers
    newFeature: newFeatureReducer, // ✅ ADD HERE
  },
  // ... rest of config
});
```

### Step 5: Use in Components

```javascript
// Component usage
import { useDispatch, useSelector } from 'react-redux';
import { fetchItems, createItem, updateItemData, removeItem } from '../store/thunks/newFeatureThunks';

const MyComponent = () => {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.newFeature);

  useEffect(() => {
    // ✅ Fetch data on mount
    dispatch(fetchItems());
  }, [dispatch]);

  const handleCreateItem = async (itemData) => {
    const result = await dispatch(createItem(itemData));
    if (createItem.fulfilled.match(result)) {
      console.log('Item created successfully');
    }
  };

  const handleUpdateItem = async (id, updates) => {
    const result = await dispatch(updateItemData({ id, updates }));
    if (updateItemData.fulfilled.match(result)) {
      console.log('Item updated successfully');
    }
  };

  const handleDeleteItem = async (id) => {
    const result = await dispatch(removeItem(id));
    if (removeItem.fulfilled.match(result)) {
      console.log('Item deleted successfully');
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {items.map(item => (
        <div key={item.id}>
          {/* Render item */}
          <button onClick={() => handleUpdateItem(item.id, { name: 'New Name' })}>
            Update
          </button>
          <button onClick={() => handleDeleteItem(item.id)}>
            Delete
          </button>
        </div>
      ))}
      <button onClick={() => handleCreateItem({ name: 'New Item' })}>
        Create Item
      </button>
    </div>
  );
};
```

## Important Rules

### ✅ DO

1. **Always use the prepare pattern** for reducers that need broadcasting
2. **Check `!action.payload.broadcast`** before updating state
3. **Add action types to `BROADCASTABLE_ACTIONS`** array
4. **Use `broadcast=true`** in thunks after successful API calls
5. **Use `broadcast=false`** when receiving IPC broadcasts
6. **Handle both success and error cases** in thunks
7. **Use consistent naming** for action types (`feature/actionName`)

### ❌ DON'T

1. **Don't use simple reducers** for broadcastable actions
2. **Don't forget to add actions to middleware filter**
3. **Don't broadcast loading/error states** (keep them local)
4. **Don't broadcast UI-only state** (like modal open/close)
5. **Don't modify the broadcast payload** in middleware
6. **Don't broadcast actions that contain functions** or non-serializable data

## Debugging

### Check if Broadcasting Works

1. **Open multiple windows** (main + widget/overlay)
2. **Open DevTools** in both windows
3. **Perform an action** in one window
4. **Check console logs** for:
   - "Broadcasting Redux action" (sender)
   - "Received broadcasted Redux action" (receiver)
5. **Verify state** is identical in both windows

### Common Issues

1. **Action not broadcasting**: Check if added to `BROADCASTABLE_ACTIONS`
2. **State not updating**: Check `!action.payload.broadcast` condition
3. **Infinite loops**: Ensure sender window is excluded from broadcast
4. **Missing data**: Verify thunk dispatches with `broadcast=true`

## Performance Considerations

1. **Only broadcast essential actions** (data changes, not UI state)
2. **Avoid broadcasting high-frequency actions** (like mouse movements)
3. **Use debouncing** for rapid successive actions if needed
4. **Keep payloads small** to minimize IPC overhead

## Testing

```javascript
// Test that actions work with broadcast parameter
describe('newFeatureSlice', () => {
  it('should not update state when broadcast=true', () => {
    const initialState = { items: [] };
    const action = setItems([{ id: 1 }], true); // broadcast=true
    const newState = newFeatureReducer(initialState, action);
    expect(newState.items).toEqual([]); // Should remain unchanged
  });

  it('should update state when broadcast=false', () => {
    const initialState = { items: [] };
    const action = setItems([{ id: 1 }], false); // broadcast=false
    const newState = newFeatureReducer(initialState, action);
    expect(newState.items).toEqual([{ id: 1 }]); // Should be updated
  });
});
```

## Summary

The IPC sync system ensures all windows stay synchronized by:

1. **Intercepting** actions with `broadcast=true`
2. **Sending** them to main process via IPC
3. **Broadcasting** to all other windows
4. **Updating** local state with `broadcast=false`

This creates a seamless multi-window experience where all windows share the same Redux state in real-time.
