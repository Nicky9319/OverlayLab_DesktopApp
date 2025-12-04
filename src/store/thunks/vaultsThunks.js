import { createAsyncThunk } from '@reduxjs/toolkit';
import * as clipVaultService from '../../services/clipVaultService';
import { 
  setLoading, 
  setError, 
  addVault as addVaultAction,
  addVaultItem as addVaultItemAction,
  addVaultImage as addVaultImageAction
} from '../slices/vaultsSlice';

/**
 * Create a vault class via API and update Redux state
 * @param {Object} params - { vaultName: string, customerId: string|null, teamId: string|null }
 */
export const createVaultClass = createAsyncThunk(
  'vaults/createVaultClass',
  async ({ vaultName, customerId = null, teamId = null }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.addVaultClass(vaultName, customerId, teamId);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedVault = {
          vaultId: response.content.vaultId || response.content.id || response.content.vault_id,
          vaultName: response.content.vaultName || response.content.vault_name || response.content.name || vaultName,
          customerId: response.content.customerId || response.content.customer_id || customerId || null,
          teamId: response.content.teamId || response.content.team_id || teamId || null,
          ...response.content
        };
        
        dispatch(addVaultAction(normalizedVault, true));
        return normalizedVault;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create vault class';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create vault class';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Create a vault item via API and update Redux state
 * @param {Object} params - { vaultId, customerId, teamId, text, imagePaths }
 */
export const createVaultItem = createAsyncThunk(
  'vaults/createVaultItem',
  async ({ vaultId, customerId = null, teamId = null, text = null, imagePaths = [] }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.addVaultItem(vaultId, customerId, teamId, text, imagePaths);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedItem = {
          itemId: response.content.itemId || response.content.id || response.content.item_id,
          vaultId: vaultId,
          text: response.content.text || text || null,
          Images: Array.isArray(response.content.Images) ? response.content.Images : (Array.isArray(response.content.images) ? response.content.images : imagePaths),
          customerId: response.content.customerId || response.content.customer_id || customerId || null,
          teamId: response.content.teamId || response.content.team_id || teamId || null,
          ...response.content
        };
        
        dispatch(addVaultItemAction(normalizedItem, true));
        return normalizedItem;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create vault item';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create vault item';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Add image to vault via API and update Redux state
 * @param {Object} params - { itemId: string, imageBlobPath: string }
 */
export const addImageToVault = createAsyncThunk(
  'vaults/addImageToVault',
  async ({ itemId, imageBlobPath }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.addVaultImage(itemId, imageBlobPath);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedImage = {
          imageId: response.content.imageId || response.content.id || response.content.image_id,
          imageBlobPath: response.content.imageBlobPath || response.content.image_blob_path || imageBlobPath,
          itemId: response.content.itemId || response.content.item_id || itemId,
          ...response.content
        };
        
        dispatch(addVaultImageAction(normalizedImage, true));
        return normalizedImage;
      } else {
        const errorMessage = response.content?.detail || 'Failed to add image to vault';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to add image to vault';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Fetch image by ID via API and update Redux state
 * @param {string} imageId - ID of the image
 */
export const fetchImageById = createAsyncThunk(
  'vaults/fetchImageById',
  async (imageId, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.getImageById(imageId);
      
      if (response.status_code === 200) {
        const normalizedImage = {
          imageId: response.content.imageId || response.content.id || response.content.image_id || imageId,
          imageBlobPath: response.content.imageBlobPath || response.content.image_blob_path || '',
          itemId: response.content.itemId || response.content.item_id || '',
          ...response.content
        };
        
        dispatch(addVaultImageAction(normalizedImage, true));
        return normalizedImage;
      } else {
        const errorMessage = response.content?.detail || 'Failed to fetch image';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch image';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Fetch image by blob path via API and update Redux state
 * @param {string} imageBlobPath - Blob path of the image
 */
export const fetchImageByBlobPath = createAsyncThunk(
  'vaults/fetchImageByBlobPath',
  async (imageBlobPath, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.getImageByBlobPath(imageBlobPath);
      
      if (response.status_code === 200) {
        const normalizedImage = {
          imageId: response.content.imageId || response.content.id || response.content.image_id || '',
          imageBlobPath: response.content.imageBlobPath || response.content.image_blob_path || imageBlobPath,
          itemId: response.content.itemId || response.content.item_id || '',
          ...response.content
        };
        
        dispatch(addVaultImageAction(normalizedImage, true));
        return normalizedImage;
      } else {
        const errorMessage = response.content?.detail || 'Failed to fetch image';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch image';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Get signed URL for uploading image to vault
 * @param {string} blobFilePath - Blob file path for the upload
 */
export const getUploadSignedUrl = createAsyncThunk(
  'vaults/getUploadSignedUrl',
  async (blobFilePath, { dispatch, rejectWithValue }) => {
    try {
      const response = await clipVaultService.getSignedUploadUrl(blobFilePath);
      
      if (response.status_code === 200) {
        return response.content;
      } else {
        const errorMessage = response.content?.detail || 'Failed to get signed upload URL';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to get signed upload URL';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

