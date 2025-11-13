import { createAsyncThunk } from '@reduxjs/toolkit';
import * as leadflowService from '../../services/leadflowService';
import { 
  setBuckets, 
  setLoading, 
  setError, 
  addBucket as addBucketAction,
  updateBucket as updateBucketAction,
  deleteBucket as deleteBucketAction
} from '../slices/bucketsSlice';

/**
 * Fetch all buckets from API and update Redux state
 */
export const fetchBuckets = createAsyncThunk(
  'buckets/fetchBuckets',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const buckets = await leadflowService.getAllBuckets();
      
      // Normalize buckets to match MongoDB schema (bucketId, bucketName)
      const normalizedBuckets = buckets.map(bucket => ({
        bucketId: bucket.bucketId || bucket.id || bucket.bucket_id,
        bucketName: bucket.bucketName || bucket.name || bucket.bucket_name,
        ...bucket // Preserve other fields
      }));
      
      dispatch(setBuckets(normalizedBuckets));
      return normalizedBuckets;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch buckets';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Create a new bucket via API and update Redux state
 */
export const createBucket = createAsyncThunk(
  'buckets/createBucket',
  async (bucketName, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.addNewBucket(bucketName);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        // Normalize the response to match schema
        const normalizedBucket = {
          bucketId: response.content.bucketId || response.content.id || response.content.bucket_id,
          bucketName: response.content.bucketName || response.content.name || bucketName,
          ...response.content
        };
        
        dispatch(addBucketAction(normalizedBucket));
        return normalizedBucket;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create bucket';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create bucket';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update bucket name via API and update Redux state
 */
export const updateBucketName = createAsyncThunk(
  'buckets/updateBucketName',
  async ({ bucketId, bucketName }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateBucketName(bucketId, bucketName);
      
      if (response.status_code === 200) {
        dispatch(updateBucketAction({ bucketId, bucketName }));
        return { bucketId, bucketName };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update bucket';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update bucket';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Delete bucket via API and update Redux state
 */
export const removeBucket = createAsyncThunk(
  'buckets/removeBucket',
  async (bucketId, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.deleteBucket(bucketId);
      
      if (response.status_code === 200) {
        dispatch(deleteBucketAction(bucketId));
        return bucketId;
      } else {
        const errorMessage = response.content?.detail || 'Failed to delete bucket';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete bucket';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

