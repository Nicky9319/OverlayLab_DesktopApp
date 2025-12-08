import { createAsyncThunk } from '@reduxjs/toolkit';
import * as leadflowService from '../../services/leadflowService';
import { 
  setMetrics, 
  setLoading, 
  setError, 
  addMetric as addMetricAction,
  updateMetric as updateMetricAction,
  removeMetric as removeMetricAction
} from '../slices/metricsSlice';

/**
 * Fetch all metrics from API and update Redux state
 */
export const fetchMetrics = createAsyncThunk(
  'metrics/fetchMetrics',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true, 'personal', true));
      const response = await leadflowService.getAllMetrics();
      
      if (response.status_code >= 200 && response.status_code < 300) {
        // Extract metrics array from response
        const metrics = response.content?.metrics || response.content || [];
        
        // Normalize metrics to match MongoDB schema
        const normalizedMetrics = metrics.map(metric => ({
          metricId: metric.metricId || metric.id || metric.metric_id,
          customerId: metric.customerId || metric.customer_id,
          fieldName: metric.fieldName || metric.field_name || '',
          objectiveCount: metric.objectiveCount || metric.objective_count || 0,
          backlogRemainingCount: metric.backlogRemainingCount || metric.backlog_remaining_count || 0,
          objectiveUpdates: Array.isArray(metric.objectiveUpdates) ? metric.objectiveUpdates : [],
          ...metric // Preserve other fields
        }));
        
        // Store in personal context - Broadcast to all windows (broadcast=true)
        dispatch(setMetrics(normalizedMetrics, 'personal', true));
        return normalizedMetrics;
      } else {
        const errorMessage = response.content?.detail || 'Failed to fetch metrics';
        dispatch(setError(errorMessage, 'personal', true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch metrics';
      dispatch(setError(errorMessage, 'personal', true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Create a new metric via API and update Redux state
 */
export const createMetric = createAsyncThunk(
  'metrics/createMetric',
  async ({ fieldName, objectiveCount }, { dispatch, rejectWithValue }) => {
    try {
      // Set backlogRemainingCount to 0 by default
      const backlogRemainingCount = 0;
      const response = await leadflowService.addMetric(fieldName, objectiveCount, backlogRemainingCount);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        // Normalize the response to match schema
        const normalizedMetric = {
          metricId: response.content?.metric?.metricId || response.content?.metricId || response.content?.id,
          customerId: response.content?.metric?.customerId || response.content?.customerId,
          fieldName: response.content?.metric?.fieldName || response.content?.fieldName || fieldName,
          objectiveCount: response.content?.metric?.objectiveCount || response.content?.objectiveCount || objectiveCount,
          backlogRemainingCount: response.content?.metric?.backlogRemainingCount || response.content?.backlogRemainingCount || backlogRemainingCount,
          objectiveUpdates: response.content?.metric?.objectiveUpdates || response.content?.objectiveUpdates || [],
          ...response.content?.metric || response.content
        };
        
        // Store in personal context - Broadcast to all windows (broadcast=true)
        dispatch(addMetricAction(normalizedMetric, 'personal', true));
        return normalizedMetric;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create metric';
        dispatch(setError(errorMessage, 'personal', true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create metric';
      dispatch(setError(errorMessage, 'personal', true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update metric objective count via API and update Redux state
 */
export const updateMetricObjective = createAsyncThunk(
  'metrics/updateMetricObjective',
  async ({ metricId, objectiveCount }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateMetricObjectiveCount(metricId, objectiveCount);
      
      if (response.status_code === 200) {
        // Update the metric in Redux state
        dispatch(updateMetricAction(metricId, { 
          objectiveCount: response.content?.objectiveCount || objectiveCount,
          backlogRemainingCount: 0 // Backlog is reset to 0 when objective is updated
        }, 'personal', true));
        return { metricId, objectiveCount: response.content?.objectiveCount || objectiveCount };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update metric';
        dispatch(setError(errorMessage, 'personal', true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update metric';
      dispatch(setError(errorMessage, 'personal', true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Delete metric via API and update Redux state
 */
export const deleteMetric = createAsyncThunk(
  'metrics/deleteMetric',
  async (metricId, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.deleteMetric(metricId);
      
      if (response.status_code === 200) {
        // Store in personal context - Broadcast to all windows (broadcast=true)
        dispatch(removeMetricAction(metricId, 'personal', true));
        return metricId;
      } else {
        const errorMessage = response.content?.detail || 'Failed to delete metric';
        dispatch(setError(errorMessage, 'personal', true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete metric';
      dispatch(setError(errorMessage, 'personal', true));
      return rejectWithValue(errorMessage);
    }
  }
);

