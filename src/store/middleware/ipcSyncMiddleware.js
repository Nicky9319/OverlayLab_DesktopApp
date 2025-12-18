/**
 * IPC Sync Middleware for Redux
 * 
 * Handles broadcasting Redux actions across multiple renderer processes
 * via the main process to maintain state synchronization
 */

import { createLogger } from '../../utils/rendererLogger';

const logger = createLogger('IPCSyncMiddleware');

/**
 * Actions that should be broadcasted to all windows
 * Add action types here that need cross-window synchronization
 */
const BROADCASTABLE_ACTIONS = [
  'buckets/setBuckets',
  'buckets/addBucket', 
  'buckets/updateBucket',
  'buckets/deleteBucket',
  'buckets/clearBuckets',
  'buckets/setLoading',
  'buckets/setError',
  'leads/setLeads',
  'leads/addLead',
  'leads/updateLeadStatus',
  'leads/updateLeadContext', 
  'leads/updateLead',
  'leads/deleteLead',
  'leads/moveLeadToBucket',
  'leads/clearLeads',
  'leads/removeLeadsByBucketId',
  'leads/setLoading',
  'leads/setError',
  'leads/setSelectedBucketId',
  'teams/setTeams',
  'teams/addTeam',
  'teams/updateTeam',
  'teams/deleteTeam',
  'teams/setLoading',
  'teams/setError',
  'teams/setSelectedTeamId',
  'teams/setViewMode',
  'metrics/setMetrics',
  'metrics/setMetricVisibility',
  'metrics/addMetric',
  'metrics/updateMetric',
  'metrics/removeMetric',
  'metrics/setLoading',
  'metrics/setError'
];

/**
 * IPC Sync Middleware
 * Intercepts Redux actions and handles broadcasting logic
 */
const ipcSyncMiddleware = (store) => (next) => (action) => {
  try {
    // Check if action has broadcast flag and is broadcastable
    if (action.payload?.broadcast && BROADCASTABLE_ACTIONS.includes(action.type)) {
      logger.info('Broadcasting Redux action:', {
        type: action.type,
        hasData: !!action.payload.data,
        windowId: window.location.href
      });

      // Send to main process for broadcasting
      if (window.electronAPI && window.electronAPI.broadcastReduxAction) {
        // For bucket and lead actions, we need to preserve the context parameter
      // Check if this action type needs context (buckets, leads, or metrics actions)
      const needsContext = action.type.startsWith('buckets/') || action.type.startsWith('leads/') || action.type.startsWith('metrics/');
        
        // Prepare the payload to broadcast
        // Bucket/lead actions always have context (defaults to 'personal'), so include it
        // Metrics actions have { metricId, visible, context } structure
        // Other actions (teams, etc.) just send data
        let broadcastPayload;
        if (action.type.startsWith('metrics/')) {
          // Metrics actions: preserve the full payload structure (metricId, visible, context, etc.)
          // Remove the broadcast flag as it's not needed in the broadcast
          const { broadcast, ...rest } = action.payload;
          broadcastPayload = rest;
        } else if (needsContext) {
          broadcastPayload = { data: action.payload.data, context: action.payload.context || 'personal' };
        } else {
          broadcastPayload = action.payload.data;
        }
        
        window.electronAPI.broadcastReduxAction({
          type: action.type,
          payload: broadcastPayload,
          timestamp: Date.now(),
          sourceWindow: window.location.href
        });
      } else {
        logger.warn('electronAPI.broadcastReduxAction not available');
      }

      // Still update local state when broadcasting (the sender window needs the update too)
      // The middleware will broadcast, but we also need to process the action locally
      return next(action);
    }

    // Check if this is a received broadcast (broadcast=false)
    if (action.payload?.broadcast === false && BROADCASTABLE_ACTIONS.includes(action.type)) {
      logger.info('Received broadcasted Redux action:', {
        type: action.type,
        hasData: !!action.payload.data
      });
    }

    // Normal action processing
    return next(action);
  } catch (error) {
    logger.error('Error in IPC sync middleware:', error);
    // Continue with normal processing on error
    return next(action);
  }
};

export default ipcSyncMiddleware;
