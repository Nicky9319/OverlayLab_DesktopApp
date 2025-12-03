import { createSlice } from '@reduxjs/toolkit';

/**
 * Vaults Redux Slice with IPC Broadcast Support
 * Based on MongoDB schema:
 * - vaults: { vaultId, vaultName, customerId, teamId }
 * - vaultItems: { itemId, text, Images, customerId, teamId }
 * - vaultImages: { imageId, imageBlobPath, itemId }
 * 
 * Each reducer supports a 'broadcast' parameter:
 * - broadcast=true: Send to main process for broadcasting (don't update local state)
 * - broadcast=false: Update local state (received from broadcast)
 */
const vaultsSlice = createSlice({
  name: 'vaults',
  initialState: {
    vaults: [], // Array of { vaultId, vaultName, customerId, teamId }
    vaultItems: [], // Array of { itemId, text, Images, customerId, teamId }
    vaultImages: [], // Array of { imageId, imageBlobPath, itemId }
    loading: false,
    error: null,
    lastFetched: null,
    selectedVaultId: null,
  },
  reducers: {
    // Set all vaults
    setVaults: {
      reducer: (state, action) => {
        state.vaults = Array.isArray(action.payload.data) ? action.payload.data : [];
        state.loading = false;
        state.error = null;
        state.lastFetched = Date.now();
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set all vault items
    setVaultItems: {
      reducer: (state, action) => {
        state.vaultItems = Array.isArray(action.payload.data) ? action.payload.data : [];
        state.loading = false;
        state.error = null;
        state.lastFetched = Date.now();
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set all vault images
    setVaultImages: {
      reducer: (state, action) => {
        state.vaultImages = Array.isArray(action.payload.data) ? action.payload.data : [];
        state.loading = false;
        state.error = null;
        state.lastFetched = Date.now();
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set loading state
    setLoading: {
      reducer: (state, action) => {
        state.loading = action.payload.data;
        if (action.payload.data) {
          state.error = null;
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set error state
    setError: {
      reducer: (state, action) => {
        state.error = action.payload.data;
        state.loading = false;
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set selected vault ID
    setSelectedVaultId: {
      reducer: (state, action) => {
        state.selectedVaultId = action.payload.data;
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Add a new vault
    addVault: {
      reducer: (state, action) => {
        if (!Array.isArray(state.vaults)) {
          state.vaults = [];
        }
        
        const vault = action.payload.data;
        const normalizedVault = {
          vaultId: vault.vaultId || vault.id || vault.vault_id,
          vaultName: vault.vaultName || vault.vault_name || vault.name || '',
          customerId: vault.customerId || vault.customer_id || null,
          teamId: vault.teamId || vault.team_id || null,
          ...vault
        };
        
        const exists = state.vaults.some(v => 
          v.vaultId === normalizedVault.vaultId || 
          (v.id && v.id === normalizedVault.vaultId)
        );
        
        if (!exists) {
          state.vaults.push(normalizedVault);
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update vault information
    updateVault: {
      reducer: (state, action) => {
        if (!Array.isArray(state.vaults)) {
          state.vaults = [];
          return;
        }
        
        const updatedVault = action.payload.data;
        const vaultIndex = state.vaults.findIndex(v => 
          v.vaultId === updatedVault.vaultId || 
          v.id === updatedVault.vaultId ||
          v.vaultId === updatedVault.id ||
          v.id === updatedVault.id
        );
        
        if (vaultIndex !== -1) {
          state.vaults[vaultIndex] = {
            ...state.vaults[vaultIndex],
            ...updatedVault
          };
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Delete a vault by ID
    deleteVault: {
      reducer: (state, action) => {
        if (!Array.isArray(state.vaults)) {
          state.vaults = [];
          return;
        }
        
        const vaultId = action.payload.data;
        state.vaults = state.vaults.filter(vault => 
          vault.vaultId !== vaultId && vault.id !== vaultId
        );
        
        // Also remove all items and images associated with this vault
        state.vaultItems = state.vaultItems.filter(item => {
          // Items don't have vaultId directly, but we might need to filter by vault context
          return true; // Keep items for now, filter can be added if needed
        });
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Add a new vault item
    addVaultItem: {
      reducer: (state, action) => {
        if (!Array.isArray(state.vaultItems)) {
          state.vaultItems = [];
        }
        
        const item = action.payload.data;
        const normalizedItem = {
          itemId: item.itemId || item.id || item.item_id,
          vaultId: item.vaultId || item.vault_id || null,
          text: item.text || null,
          Images: Array.isArray(item.Images) ? item.Images : (Array.isArray(item.images) ? item.images : []),
          customerId: item.customerId || item.customer_id || null,
          teamId: item.teamId || item.team_id || null,
          ...item
        };
        
        const exists = state.vaultItems.some(i => 
          i.itemId === normalizedItem.itemId || 
          (i.id && i.id === normalizedItem.itemId)
        );
        
        if (!exists) {
          state.vaultItems.push(normalizedItem);
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update vault item
    updateVaultItem: {
      reducer: (state, action) => {
        if (!Array.isArray(state.vaultItems)) {
          state.vaultItems = [];
          return;
        }
        
        const updatedItem = action.payload.data;
        const itemIndex = state.vaultItems.findIndex(i => 
          i.itemId === updatedItem.itemId || 
          i.id === updatedItem.itemId ||
          i.itemId === updatedItem.id ||
          i.id === updatedItem.id
        );
        
        if (itemIndex !== -1) {
          state.vaultItems[itemIndex] = {
            ...state.vaultItems[itemIndex],
            ...updatedItem
          };
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Delete a vault item by ID
    deleteVaultItem: {
      reducer: (state, action) => {
        if (!Array.isArray(state.vaultItems)) {
          state.vaultItems = [];
          return;
        }
        
        const itemId = action.payload.data;
        state.vaultItems = state.vaultItems.filter(item => 
          item.itemId !== itemId && item.id !== itemId
        );
        
        // Also remove all images associated with this item
        state.vaultImages = state.vaultImages.filter(image => 
          image.itemId !== itemId && image.item_id !== itemId
        );
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Add a new vault image
    addVaultImage: {
      reducer: (state, action) => {
        if (!Array.isArray(state.vaultImages)) {
          state.vaultImages = [];
        }
        
        const image = action.payload.data;
        const normalizedImage = {
          imageId: image.imageId || image.id || image.image_id,
          imageBlobPath: image.imageBlobPath || image.image_blob_path || '',
          itemId: image.itemId || image.item_id || '',
          ...image
        };
        
        const exists = state.vaultImages.some(i => 
          i.imageId === normalizedImage.imageId || 
          (i.id && i.id === normalizedImage.imageId)
        );
        
        if (!exists) {
          state.vaultImages.push(normalizedImage);
          
          // Update the item's Images array if it exists
          const item = state.vaultItems.find(i => 
            i.itemId === normalizedImage.itemId || i.id === normalizedImage.itemId
          );
          if (item) {
            if (!Array.isArray(item.Images)) {
              item.Images = [];
            }
            if (!item.Images.includes(normalizedImage.imageId)) {
              item.Images.push(normalizedImage.imageId);
            }
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update vault image
    updateVaultImage: {
      reducer: (state, action) => {
        if (!Array.isArray(state.vaultImages)) {
          state.vaultImages = [];
          return;
        }
        
        const updatedImage = action.payload.data;
        const imageIndex = state.vaultImages.findIndex(i => 
          i.imageId === updatedImage.imageId || 
          i.id === updatedImage.imageId ||
          i.imageId === updatedImage.id ||
          i.id === updatedImage.id
        );
        
        if (imageIndex !== -1) {
          state.vaultImages[imageIndex] = {
            ...state.vaultImages[imageIndex],
            ...updatedImage
          };
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Clear all vaults
    clearVaults: {
      reducer: (state, action) => {
        state.vaults = [];
        state.vaultItems = [];
        state.vaultImages = [];
        state.error = null;
        state.lastFetched = null;
      },
      prepare: (data = null, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
  },
});

export const { 
  setVaults,
  setVaultItems,
  setVaultImages,
  setLoading,
  setError,
  setSelectedVaultId,
  addVault,
  updateVault,
  deleteVault,
  addVaultItem,
  updateVaultItem,
  deleteVaultItem,
  addVaultImage,
  updateVaultImage,
  clearVaults
} = vaultsSlice.actions;

export default vaultsSlice.reducer;

