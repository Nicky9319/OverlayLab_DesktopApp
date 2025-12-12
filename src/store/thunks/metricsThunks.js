import { createAsyncThunk } from '@reduxjs/toolkit';
import * as leadflowService from '../../services/leadflowService';
import { 
  setMetrics, 
  setLoading, 
  setError, 
  addMetric as addMetricAction,
  updateMetric as updateMetricAction,
  removeMetric as removeMetricAction,
  setMetricTracking
} from '../slices/metricsSlice';
import { getMetricVisibility, getAllMetricVisibilities } from '../../utils/metricVisibilityStorage';

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
        
        // Load all visibilities from localStorage
        const visibilities = getAllMetricVisibilities();
        
        // Normalize metrics to match MongoDB schema
        const normalizedMetrics = metrics.map(metric => {
          const metricId = metric.metricId || metric.id || metric.metric_id;
          // Load visibility from localStorage (frontend-only property)
          const visibleInActionBar = visibilities[metricId] !== undefined 
            ? visibilities[metricId] 
            : getMetricVisibility(metricId);
          
          return {
            metricId,
            customerId: metric.customerId || metric.customer_id,
            fieldName: metric.fieldName || metric.field_name || '',
            objectiveCount: metric.objectiveCount || metric.objective_count || 0, // From daily_metrics (base)
            backlogRemainingCount: metric.backlogRemainingCount || metric.backlog_remaining_count || 0,
            objectiveUpdates: Array.isArray(metric.objectiveUpdates) ? metric.objectiveUpdates : [],
            completedCount: metric.completedCount !== undefined ? metric.completedCount : 0,
            // Fields from metric_tracking (today's record) - these will be set when getMetricInformation is called
            backlogCount: metric.backlogCount !== undefined ? metric.backlogCount : undefined,
            date: metric.date || metric.Date || undefined,
            visibleInActionBar,
            ...metric // Preserve other fields (including tracking objectiveCount if present)
          };
        });
        
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
        const metricId = response.content?.metric?.metricId || response.content?.metricId || response.content?.id;
        // Load visibility from localStorage (frontend-only property)
        const visibleInActionBar = getMetricVisibility(metricId);
        
        // Normalize the response to match schema
        const normalizedMetric = {
          metricId,
          customerId: response.content?.metric?.customerId || response.content?.customerId,
          fieldName: response.content?.metric?.fieldName || response.content?.fieldName || fieldName,
          objectiveCount: response.content?.metric?.objectiveCount || response.content?.objectiveCount || objectiveCount,
          backlogRemainingCount: response.content?.metric?.backlogRemainingCount || response.content?.backlogRemainingCount || backlogRemainingCount,
          objectiveUpdates: response.content?.metric?.objectiveUpdates || response.content?.objectiveUpdates || [],
          completedCount: response.content?.metric?.completedCount !== undefined ? response.content?.metric?.completedCount : 0,
          visibleInActionBar,
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

/**
 * Increment metric completed count via API and update Redux state
 */
export const incrementMetricCompleted = createAsyncThunk(
  'metrics/incrementMetricCompleted',
  async (metricId, { dispatch, rejectWithValue, getState }) => {
    try {
      const response = await leadflowService.incrementMetricCompletedCount(metricId);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        // Get updated metric information to sync state
        const metricInfoResponse = await leadflowService.getMetricInformation(metricId);
        
        if (metricInfoResponse.status_code >= 200 && metricInfoResponse.status_code < 300) {
          const metricInfo = metricInfoResponse.content;
          const metricData = metricInfo?.metric || metricInfo;
          
          // Extract all fields from metric_tracking record
          const completedCount = metricData?.CompletedCount ?? 0;
          const objectiveCount = metricData?.ObjectiveCount ?? 0;
          const backlogCount = metricData?.BacklogCount ?? 0;
          const date = metricData?.Date ?? null;
          
          // Update Redux state with all metric tracking fields
          dispatch(updateMetricAction(metricId, { 
            completedCount,
            objectiveCount, // Today's objective from metric_tracking
            backlogCount, // Backlog remaining from metric_tracking
            date // Date for which this information is valid
          }, 'personal', true));
          
          return { 
            metricId, 
            completedCount,
            objectiveCount,
            backlogCount,
            date,
            metricInfo 
          };
        }
        
        // Fallback: try to get from response (increment/decrement returns { message, metric: { CompletedCount, ... } })
        const completedCount = response.content?.metric?.CompletedCount ?? response.content?.CompletedCount ?? 0;
        dispatch(updateMetricAction(metricId, { 
          completedCount 
        }, 'personal', true));
        return { metricId, completedCount };
      } else {
        const errorMessage = response.content?.detail || 'Failed to increment metric';
        dispatch(setError(errorMessage, 'personal', true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to increment metric';
      dispatch(setError(errorMessage, 'personal', true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Decrement metric completed count via API and update Redux state
 */
export const decrementMetricCompleted = createAsyncThunk(
  'metrics/decrementMetricCompleted',
  async (metricId, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.decrementMetricCompletedCount(metricId);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        // Get updated metric information to sync state
        const metricInfoResponse = await leadflowService.getMetricInformation(metricId);
        
        if (metricInfoResponse.status_code >= 200 && metricInfoResponse.status_code < 300) {
          const metricInfo = metricInfoResponse.content;
          const metricData = metricInfo?.metric || metricInfo;
          
          // Extract all fields from metric_tracking record
          const completedCount = metricData?.CompletedCount ?? 0;
          const objectiveCount = metricData?.ObjectiveCount ?? 0;
          const backlogCount = metricData?.BacklogCount ?? 0;
          const date = metricData?.Date ?? null;
          
          // Update Redux state with all metric tracking fields
          dispatch(updateMetricAction(metricId, { 
            completedCount,
            objectiveCount, // Today's objective from metric_tracking
            backlogCount, // Backlog remaining from metric_tracking
            date // Date for which this information is valid
          }, 'personal', true));
          
          return { 
            metricId, 
            completedCount,
            objectiveCount,
            backlogCount,
            date,
            metricInfo 
          };
        }
        
        // Fallback: try to get from response (increment/decrement returns { message, metric: { CompletedCount, ... } })
        const completedCount = response.content?.metric?.CompletedCount ?? response.content?.CompletedCount ?? 0;
        dispatch(updateMetricAction(metricId, { 
          completedCount 
        }, 'personal', true));
        return { metricId, completedCount };
      } else {
        const errorMessage = response.content?.detail || 'Failed to decrement metric';
        dispatch(setError(errorMessage, 'personal', true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to decrement metric';
      dispatch(setError(errorMessage, 'personal', true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Fetch metric history via API
 */
export const fetchMetricHistory = createAsyncThunk(
  'metrics/fetchMetricHistory',
  async (metricId, { rejectWithValue }) => {
    try {
      const response = await leadflowService.getMetricHistory(metricId);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const history = response.content?.history || [];
        return { metricId, history };
      } else {
        const errorMessage = response.content?.detail || 'Failed to fetch metric history';
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch metric history';
      return rejectWithValue(errorMessage);
    }
  }
);

