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
 * Create a new bucket for a team via API and update Redux state
 * @param {Object} params - { teamId: string, bucketName: string }
 */
export const createTeamBucket = createAsyncThunk(
  'teamBuckets/createTeamBucket',
  async ({ teamId, bucketName }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true, teamId, true));
      const response = await leadflowService.addTeamBucket(teamId, bucketName);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedBucket = {
          bucketId: response.content.bucketId || response.content.id || response.content.bucket_id,
          bucketName: response.content.bucketName || response.content.bucket_name || response.content.name || bucketName,
          teamId: response.content.teamId || response.content.team_id || teamId,
          customerId: null,
          ...response.content
        };
        
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(addBucketAction(normalizedBucket, teamId, true));
        return normalizedBucket;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create team bucket';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create team bucket';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false, teamId, true));
    }
  }
);

/**
 * Fetch all buckets for a team from API and update Redux state
 * @param {string} teamId - ID of the team
 */
export const fetchTeamBuckets = createAsyncThunk(
  'teamBuckets/fetchTeamBuckets',
  async (teamId, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true, teamId, true));
      // Clear buckets first to avoid showing stale data
      dispatch(setBuckets([], teamId, true));
      
      const buckets = await leadflowService.getAllTeamBuckets(teamId);
      
      console.log('fetchTeamBuckets: Received buckets from service', { 
        teamId, 
        bucketsCount: Array.isArray(buckets) ? buckets.length : 0,
        isArray: Array.isArray(buckets),
        sample: Array.isArray(buckets) && buckets.length > 0 ? buckets[0] : null
      });
      
      // Handle case where buckets is not an array (error response)
      if (!Array.isArray(buckets)) {
        console.error('fetchTeamBuckets: buckets is not an array', { buckets, teamId });
        dispatch(setBuckets([], teamId, true));
        const errorMessage = 'Failed to fetch team buckets: Invalid response format';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
      
      // Service already normalizes buckets, but ensure teamId is set on all
      const normalizedBuckets = buckets.map(bucket => {
        // Spread original properties first, then override with normalized values
        const normalized = {
          ...bucket, // Include all original properties first
          bucketId: bucket.bucketId || bucket.id || bucket.bucket_id || bucket._id,
          bucketName: bucket.bucketName || bucket.name || bucket.bucket_name || '',
          teamId: bucket.teamId || bucket.team_id || teamId, // Ensure teamId is always set
          customerId: null, // Team buckets should not have customerId (override if present)
          // Also ensure id and name fields exist for backward compatibility
          id: bucket.bucketId || bucket.id || bucket.bucket_id || bucket._id,
          name: bucket.bucketName || bucket.name || bucket.bucket_name || ''
        };
        return normalized;
      });
      
      console.log('fetchTeamBuckets: Normalized buckets', { 
        teamId,
        count: normalizedBuckets.length,
        sample: normalizedBuckets[0] || null,
        allBuckets: normalizedBuckets
      });
      
      // Store in team context - Broadcast to all windows (broadcast=true)
      dispatch(setBuckets(normalizedBuckets, teamId, true));
      
      console.log('fetchTeamBuckets: Dispatched setBuckets', { 
        teamId,
        count: normalizedBuckets.length
      });
      
      return normalizedBuckets;
    } catch (error) {
      // Clear buckets on error to avoid showing stale data
      dispatch(setBuckets([], teamId, true));
      const errorMessage = error.message || 'Failed to fetch team buckets';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false, teamId, true));
    }
  }
);

/**
 * Update bucket name for a team via API and update Redux state
 * @param {Object} params - { teamId: string, bucketId: string, bucketName: string }
 */
export const updateTeamBucketName = createAsyncThunk(
  'teamBuckets/updateTeamBucketName',
  async ({ teamId, bucketId, bucketName }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateTeamBucketName(teamId, bucketId, bucketName);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const updatedBucket = {
          bucketId,
          teamId,
          bucketName,
          customerId: null
        };
        
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(updateBucketAction(updatedBucket, teamId, true));
        return { teamId, bucketId, bucketName };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update team bucket name';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update team bucket name';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Delete a team bucket via API and update Redux state
 * @param {Object} params - { teamId: string, bucketId: string }
 */
export const removeTeamBucket = createAsyncThunk(
  'teamBuckets/removeTeamBucket',
  async ({ teamId, bucketId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.deleteTeamBucket(teamId, bucketId);
      
      if (response.status_code === 200) {
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(deleteBucketAction(bucketId, teamId, true));
        return { teamId, bucketId };
      } else {
        const errorMessage = response.content?.detail || 'Failed to delete team bucket';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete team bucket';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

