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
 * Create a vault class for a team via API and update Redux state
 * @param {Object} params - { teamId: string, vaultName: string }
 */
export const createTeamVaultClass = createAsyncThunk(
  'teamVaults/createTeamVaultClass',
  async ({ teamId, vaultName }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.addTeamVaultClass(teamId, vaultName);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedVault = {
          vaultId: response.content.vaultId || response.content.id || response.content.vault_id,
          vaultName: response.content.vaultName || response.content.vault_name || response.content.name || vaultName,
          teamId: response.content.teamId || response.content.team_id || teamId,
          customerId: null,
          ...response.content
        };
        
        dispatch(addVaultAction(normalizedVault, true));
        return normalizedVault;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create team vault class';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create team vault class';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Create a vault item for a team via API and update Redux state
 * @param {Object} params - { teamId: string, vaultId: string, text: string|null, imagePaths: Array<string> }
 */
export const createTeamVaultItem = createAsyncThunk(
  'teamVaults/createTeamVaultItem',
  async ({ teamId, vaultId, text = null, imagePaths = [] }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.addTeamVaultItem(teamId, vaultId, text, imagePaths);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedItem = {
          itemId: response.content.itemId || response.content.id || response.content.item_id,
          vaultId: vaultId,
          text: response.content.text || text || null,
          Images: Array.isArray(response.content.Images) ? response.content.Images : (Array.isArray(response.content.images) ? response.content.images : imagePaths),
          teamId: response.content.teamId || response.content.team_id || teamId,
          customerId: null,
          ...response.content
        };
        
        dispatch(addVaultItemAction(normalizedItem, true));
        return normalizedItem;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create team vault item';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create team vault item';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Add image to team vault via API and update Redux state
 * @param {Object} params - { teamId: string, itemId: string, imageBlobPath: string }
 */
export const addImageToTeamVault = createAsyncThunk(
  'teamVaults/addImageToTeamVault',
  async ({ teamId, itemId, imageBlobPath }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.addTeamVaultImage(teamId, itemId, imageBlobPath);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedImage = {
          imageId: response.content?.imageId || response.content?.id || response.content?.image_id || '',
          imageBlobPath: response.content?.imageBlobPath || response.content?.image_blob_path || imageBlobPath,
          itemId: response.content?.itemId || response.content?.item_id || itemId,
          ...response.content
        };
        
        dispatch(addVaultImageAction(normalizedImage, true));
        return normalizedImage;
      } else {
        const errorMessage = response.content?.detail || 'Failed to add image to team vault';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to add image to team vault';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Fetch image by ID for team vault via API and update Redux state
 * @param {Object} params - { teamId: string, imageId: string }
 */
export const fetchTeamImageById = createAsyncThunk(
  'teamVaults/fetchTeamImageById',
  async ({ teamId, imageId }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.getTeamImageById(teamId, imageId);
      
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
        const errorMessage = response.content?.detail || 'Failed to fetch team image';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch team image';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Fetch image by blob path for team vault via API and update Redux state
 * @param {Object} params - { teamId: string, imageBlobPath: string }
 */
export const fetchTeamImageByBlobPath = createAsyncThunk(
  'teamVaults/fetchTeamImageByBlobPath',
  async ({ teamId, imageBlobPath }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await clipVaultService.getTeamImageByBlobPath(teamId, imageBlobPath);
      
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
        const errorMessage = response.content?.detail || 'Failed to fetch team image';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch team image';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Get signed URL for uploading image to team vault
 * @param {Object} params - { teamId: string, blobFilePath: string }
 */
export const getTeamUploadSignedUrl = createAsyncThunk(
  'teamVaults/getTeamUploadSignedUrl',
  async ({ teamId, blobFilePath }, { dispatch, rejectWithValue }) => {
    try {
      const response = await clipVaultService.getTeamSignedUploadUrl(teamId, blobFilePath);
      
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

