import { createSlice } from '@reduxjs/toolkit';
import { setMetricVisibility as saveMetricVisibility, removeMetricVisibility as deleteMetricVisibility, getMetricVisibility } from '../../utils/metricVisibilityStorage';

/**
 * Metrics Redux Slice with IPC Broadcast Support
 * Based on MongoDB schema:
 * - daily_metrics: { customerId, fieldName, objectiveCount, metricId, backlogRemainingCount, objectiveUpdates }
 * - metric_tracking: { metricId, Date, CompletedCount, ObjectiveCount, BacklogCount }
 * 
 * Each reducer supports a 'broadcast' parameter:
 * - broadcast=true: Send to main process for broadcasting (don't update local state)
 * - broadcast=false: Update local state (received from broadcast)
 */
const metricsSlice = createSlice({
  name: 'metrics',
  initialState: {
    personal: {
      metrics: [], // Array of daily_metrics objects
      metricTracking: {}, // Keyed by metricId: array of metric_tracking records
      loading: false,
      error: null,
      lastFetched: null, // Timestamp of last successful fetch
    },
    teams: {}, // Object keyed by teamId: { metrics: [], metricTracking: {}, loading, error, lastFetched }
  },
  reducers: {
    // Set all metrics (used after fetching from API)
    // context: 'personal' or teamId string
    setMetrics: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        const metricsData = Array.isArray(data) ? data : [];
        
        // Initialize team state if it doesn't exist
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            metrics: [],
            metricTracking: {},
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        // Update the target state
        if (context === 'personal') {
          state.personal.metrics = metricsData;
          state.personal.loading = false;
          state.personal.error = null;
          state.personal.lastFetched = Date.now();
        } else {
          state.teams[context].metrics = metricsData;
          state.teams[context].loading = false;
          state.teams[context].error = null;
          state.teams[context].lastFetched = Date.now();
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Set metric tracking history for a specific metric
    // context: 'personal' or teamId string
    setMetricTracking: {
      reducer: (state, action) => {
        const { metricId, data, context, broadcast } = action.payload;
        const trackingData = Array.isArray(data) ? data : [];
        
        // Initialize team state if it doesn't exist
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            metrics: [],
            metricTracking: {},
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        // Update the target state
        if (context === 'personal') {
          if (!state.personal.metricTracking) {
            state.personal.metricTracking = {};
          }
          state.personal.metricTracking[metricId] = trackingData;
        } else {
          if (!state.teams[context].metricTracking) {
            state.teams[context].metricTracking = {};
          }
          state.teams[context].metricTracking[metricId] = trackingData;
        }
      },
      prepare: (metricId, data, context = 'personal', broadcast = false) => ({
        payload: { metricId, data, context, broadcast }
      })
    },
    
    // Set loading state
    // context: 'personal' or teamId string
    setLoading: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            metrics: [],
            metricTracking: {},
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        if (context === 'personal') {
          state.personal.loading = data;
          if (data) {
            state.personal.error = null;
          }
        } else {
          state.teams[context].loading = data;
          if (data) {
            state.teams[context].error = null;
          }
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Set error state
    // context: 'personal' or teamId string
    setError: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            metrics: [],
            metricTracking: {},
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        if (context === 'personal') {
          state.personal.error = data;
          state.personal.loading = false;
        } else {
          state.teams[context].error = data;
          state.teams[context].loading = false;
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Add a new metric
    // context: 'personal' or teamId string
    addMetric: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            metrics: [],
            metricTracking: {},
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        const metrics = context === 'personal' ? state.personal.metrics : state.teams[context].metrics;
        if (!Array.isArray(metrics)) {
          if (context === 'personal') {
            state.personal.metrics = [];
          } else {
            state.teams[context].metrics = [];
          }
        }
        
        const metric = data;
        const metricId = metric.metricId || metric.id || metric.metric_id;
        // Load visibility from localStorage if not provided (frontend-only property)
        const visibleInActionBar = metric.visibleInActionBar !== undefined 
          ? metric.visibleInActionBar 
          : getMetricVisibility(metricId);
        
        const normalizedMetric = {
          metricId,
          customerId: metric.customerId || metric.customer_id,
          fieldName: metric.fieldName || metric.field_name || '',
          objectiveCount: metric.objectiveCount || metric.objective_count || 0,
          backlogRemainingCount: metric.backlogRemainingCount || metric.backlog_remaining_count || 0,
          objectiveUpdates: Array.isArray(metric.objectiveUpdates) ? metric.objectiveUpdates : [],
          visibleInActionBar,
          ...metric
        };
        
        const targetMetrics = context === 'personal' ? state.personal.metrics : state.teams[context].metrics;
        const exists = targetMetrics.some(m => 
          m.metricId === normalizedMetric.metricId || 
          (m.id && m.id === normalizedMetric.metricId)
        );
        
        if (!exists) {
          targetMetrics.push(normalizedMetric);
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Update an existing metric
    // context: 'personal' or teamId string
    updateMetric: {
      reducer: (state, action) => {
        const { metricId, updates, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            metrics: [],
            metricTracking: {},
            loading: false,
            error: null,
            lastFetched: null,
          };
        }
        
        const targetMetrics = context === 'personal' ? state.personal.metrics : state.teams[context].metrics;
        const index = targetMetrics.findIndex(m => 
          m.metricId === metricId || 
          (m.id && m.id === metricId)
        );
        
        if (index !== -1) {
          targetMetrics[index] = {
            ...targetMetrics[index],
            ...updates
          };
        }
      },
      prepare: (metricId, updates, context = 'personal', broadcast = false) => ({
        payload: { metricId, updates, context, broadcast }
      })
    },
    
    // Remove a metric
    // context: 'personal' or teamId string
    removeMetric: {
      reducer: (state, action) => {
        const { metricId, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const targetMetrics = context === 'personal' ? state.personal.metrics : state.teams[context].metrics;
        const index = targetMetrics.findIndex(m => 
          m.metricId === metricId || 
          (m.id && m.id === metricId)
        );
        
        if (index !== -1) {
          targetMetrics.splice(index, 1);
        }
        
        // Also remove tracking data for this metric
        const targetTracking = context === 'personal' 
          ? state.personal.metricTracking 
          : state.teams[context].metricTracking;
        if (targetTracking && targetTracking[metricId]) {
          delete targetTracking[metricId];
        }
        
        // Remove visibility from localStorage when metric is deleted (frontend-only property)
        // localStorage is per-window, so each window removes its own copy
        if (context === 'personal') {
          deleteMetricVisibility(metricId);
        }
      },
      prepare: (metricId, context = 'personal', broadcast = false) => ({
        payload: { metricId, context, broadcast }
      })
    },
    
    // Set metric visibility in action bar
    // context: 'personal' or teamId string
    setMetricVisibility: {
      reducer: (state, action) => {
        const { metricId, visible, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const targetMetrics = context === 'personal' ? state.personal.metrics : state.teams[context].metrics;
        const index = targetMetrics.findIndex(m => 
          m.metricId === metricId || 
          (m.id && m.id === metricId)
        );
        
        if (index !== -1) {
          targetMetrics[index] = {
            ...targetMetrics[index],
            visibleInActionBar: visible
          };
          
          // Save to localStorage (frontend-only property)
          // Save for personal context - localStorage is per-window, so each window saves its own copy
          if (context === 'personal') {
            saveMetricVisibility(metricId, visible);
          }
        }
      },
      prepare: (metricId, visible, context = 'personal', broadcast = false) => ({
        payload: { metricId, visible, context, broadcast }
      })
    },
  },
});

export const {
  setMetrics,
  setMetricTracking,
  setLoading,
  setError,
  addMetric,
  updateMetric,
  removeMetric,
  setMetricVisibility,
} = metricsSlice.actions;

export default metricsSlice.reducer;

