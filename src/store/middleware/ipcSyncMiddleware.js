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
  'leads/setLeads',
  'leads/addLead',
  'leads/updateLeadStatus',
  'leads/updateLeadNotes', 
  'leads/updateLead',
  'leads/deleteLead',
  'leads/moveLeadToBucket',
  'leads/clearLeads',
  'leads/removeLeadsByBucketId'
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
        window.electronAPI.broadcastReduxAction({
          type: action.type,
          payload: action.payload.data,
          timestamp: Date.now(),
          sourceWindow: window.location.href
        });
      } else {
        logger.warn('electronAPI.broadcastReduxAction not available');
      }

      // Don't update local state when broadcasting
      return;
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
