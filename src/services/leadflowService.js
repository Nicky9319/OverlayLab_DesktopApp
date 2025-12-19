// LeadFlow Service - Unified API client for all LeadFlow API calls
// Base URL resolved from centralized API config
import { LEADFLOW_API_URL } from '../config/api';

const BASE_URL = LEADFLOW_API_URL;

// Import renderer logger
import { createLogger } from '../utils/rendererLogger';
const logger = createLogger('LeadFlowService');

// Import token provider
import { getClerkToken } from '../utils/clerkTokenProvider';

// Small helper to perform fetch and return a consistent shape:
// { status_code: number, content: any }
const request = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  
  // Get Clerk token for authentication
  const token = await getClerkToken();
  
  // Build headers
  const headers = { 'Content-Type': 'application/json' };
  
  // Add Authorization header if token is available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    logger.debug('Including Authorization header in request');
  } else {
    logger.warn('No Clerk token available for request');
  }
  
  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      ...headers,
      ...(options.headers || {}),
      // Ensure Authorization is always included if we have a token
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    // Add CORS mode for cross-origin requests
    mode: 'cors',
    credentials: 'omit', // Don't send cookies for CORS
    ...options,
    // Override headers last to ensure Authorization is always included
    headers: {
      ...headers,
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  try {
    logger.debug(`Making ${fetchOptions.method} request to: ${url}`, { 
      hasToken: !!token,
      headers: Object.keys(fetchOptions.headers)
    });
    
    const resp = await fetch(url, fetchOptions);
    
    // Check if response is ok
    if (!resp.ok) {
      logger.warn(`Request to ${url} returned non-ok status: ${resp.status} ${resp.statusText}`);
    }
    
    let content;
    try {
      const text = await resp.text();
      // Try to parse as JSON
      try {
        content = JSON.parse(text);
      } catch (parseErr) {
        // Not valid JSON, use text
        content = { detail: text };
      }
    } catch (err) {
      // Error reading response
      logger.warn(`Error reading response from ${url}`, { status: resp.status, error: err.message });
      content = { detail: 'Error reading response' };
    }

    // Log response details for debugging
    const isArray = Array.isArray(content);
    const isObject = content && typeof content === 'object' && !isArray;
    logger.debug(`Response from ${url}:`, { 
      status: resp.status, 
      isArray,
      isObject,
      contentKeys: isObject ? Object.keys(content) : null,
      contentLength: isArray ? content.length : null
    });
    return { status_code: resp.status, content };
  } catch (error) {
    // Handle CORS and network errors
    if (error.message && error.message.includes('CORS')) {
      logger.error(`CORS error while calling ${url}`, { error: error.message });
      return { status_code: 403, content: { detail: 'CORS error: ' + error.message } };
    }
    
    console.error('Network error while calling', url, error);
    logger.error(`Network error while calling ${url}`, { error: error.message, stack: error.stack });
    // Keep a consistent return shape for network errors
    return { status_code: 503, content: { detail: String(error) } };
  }
};

// ============================================================================
// BUCKETS API
// ============================================================================

// Helper to normalize bucket object fields to { id, name }
const normalizeBuckets = (arr) => {
  return arr.map((b) => {
    if (!b || typeof b !== 'object') return null;
    const rawId = b.id || b.bucketId || b.bucket_id || b._id;
    const id = rawId != null ? String(rawId) : null;
    const name = b.name || b.bucketName || b.bucket_name || '';
    // Preserve other fields if needed
    return { id, name, ...b };
  }).filter(Boolean);
};

/**
 * Get all buckets
 * @returns {Promise<Array>} Array of normalized bucket objects
 */
const getAllBuckets = async () => {
  logger.info('getAllBuckets called');
  const resp = await request('/api/leadflow-service/buckets/get-all-buckets', { method: 'GET' });

  if (!resp || resp.status_code !== 200) {
    console.error('Failed to fetch buckets or non-200 response:', resp);
    logger.error('getAllBuckets: Failed to fetch buckets', { status: resp?.status_code, content: resp?.content });
    return [];
  }

  const content = resp.content;

  // Normalize common response shapes to an array of buckets
  if (Array.isArray(content)) return normalizeBuckets(content);
  if (content && Array.isArray(content.buckets)) return normalizeBuckets(content.buckets);
  if (content && Array.isArray(content.content)) return normalizeBuckets(content.content);
  if (content && Array.isArray(content.data)) return normalizeBuckets(content.data);

  console.warn('Unexpected buckets response shape, returning empty list:', content);
  logger.warn('getAllBuckets: Unexpected response shape', { content });
  return [];
};

/**
 * Add a new bucket
 * @param {string} bucketName - Name of the bucket to create
 * @returns {Promise<Object>} Response with status_code and normalized content
 */
const addNewBucket = async (bucketName) => {
  logger.info('addNewBucket called', { bucketName });
  
  if (!bucketName) {
    return { status_code: 400, content: { detail: 'bucket_name is required' } };
  }

  const resp = await request('/api/leadflow-service/buckets/add-bucket', {
    method: 'POST',
    body: JSON.stringify({ bucket_name: bucketName }),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  // Unwrap nested shapes like { content: { bucket: {...} } }
  const candidate = content.bucket || content.content || content.data || content;

  // If candidate is an array, take first
  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  // Normalize into { id, name }
  const id = content.bucketId || content.bucket_id || content.id || content._id;
  const name = content.bucketName || content.bucket_name || content.name || bucketName;

  const normalized = { id, name, ...content };

  logger.info('addNewBucket: Completed', { status: resp.status_code, bucketId: id });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Update bucket name
 * @param {string} bucketId - ID of the bucket to update
 * @param {string} bucketName - New name for the bucket
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateBucketName = async (bucketId, bucketName) => {
  logger.info('updateBucketName called', { bucketId, bucketName });
  
  if (!bucketId || !bucketName) {
    return { status_code: 400, content: { detail: 'bucket_id and bucket_name are required' } };
  }

  const resp = await request('/api/leadflow-service/buckets/update-bucket-name', {
    method: 'PUT',
    body: JSON.stringify({ bucket_id: bucketId, bucket_name: bucketName }),
  });

  logger.info('updateBucketName: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Delete a bucket
 * @param {string} bucketId - ID of the bucket to delete
 * @returns {Promise<Object>} Response with status_code and content
 */
const deleteBucket = async (bucketId) => {
  logger.info('deleteBucket called', { bucketId });
  
  if (!bucketId) {
    return { status_code: 400, content: { detail: 'bucket_id is required' } };
  }

  // DELETE with query param as the backend expects params
  const path = `/api/leadflow-service/buckets/delete-bucket?bucket_id=${encodeURIComponent(bucketId)}`;
  const resp = await request(path, { method: 'DELETE' });

  logger.info('deleteBucket: Completed', { status: resp.status_code });
  return resp;
};

// ============================================================================
// LEADS API
// ============================================================================

// Helper to normalize lead object fields
const normalizeLeads = (arr) => {
  return arr.map((lead) => {
    if (!lead || typeof lead !== 'object') return null;
    
    // Normalize lead fields
    const leadId = lead.leadId || lead.lead_id || lead.id || lead._id;
    const url = lead.url || '';
    const username = lead.username || lead.user_name || '';
    const platform = lead.platform || '';
    const status = lead.status || 'new';
    const notes = lead.notes || '';
    
    return {
      leadId: leadId ? String(leadId) : null,
      url,
      username,
      platform,
      status,
      notes,
      ...lead // Preserve other fields if needed
    };
  }).filter(Boolean);
};

/**
 * Get all leads, optionally filtered by bucket_id
 * @param {string|null} bucketId - Optional bucket ID to filter leads
 * @returns {Promise<Array>} Array of normalized lead objects
 */
const getAllLeads = async (bucketId = null) => {
  logger.info('getAllLeads called', { bucketId });
  
  const params = new URLSearchParams();
  if (bucketId) {
    params.append('bucket_id', bucketId);
  }
  
  const path = `/api/leadflow-service/leads/get-all-leads${params.toString() ? '?' + params.toString() : ''}`;
  logger.debug('getAllLeads: Making request', { path });
  const resp = await request(path, { method: 'GET' });

  if (!resp || resp.status_code !== 200) {
    console.error('Failed to fetch leads or non-200 response:', resp);
    logger.error('getAllLeads: Failed to fetch leads', { status: resp?.status_code, content: resp?.content });
    return [];
  }

  const content = resp.content;

  // Normalize common response shapes to an array of leads
  if (Array.isArray(content)) {
    logger.debug('getAllLeads: Response is array', { count: content.length });
    return normalizeLeads(content);
  }
  if (content && Array.isArray(content.leads)) {
    logger.debug('getAllLeads: Response has leads array', { count: content.leads.length });
    return normalizeLeads(content.leads);
  }
  if (content && Array.isArray(content.content)) {
    logger.debug('getAllLeads: Response has content array', { count: content.content.length });
    return normalizeLeads(content.content);
  }
  if (content && Array.isArray(content.data)) {
    logger.debug('getAllLeads: Response has data array', { count: content.data.length });
    return normalizeLeads(content.data);
  }

  console.warn('Unexpected leads response shape, returning empty list:', content);
  logger.warn('getAllLeads: Unexpected response shape', { content });
  return [];
};

// ============================================================================
// COLLECTIVE SESSION FUNCTIONS (New Two-Step Lead Processing Flow)
// ============================================================================

/**
 * Add an image to the collective session for later processing
 * @param {File} imageFile - Image file to upload
 * @returns {Promise<Object>} Response with status_code and content
 */
const addImageToCollectiveSession = async (imageFile) => {
  console.log('🔄 leadflowService.addImageToCollectiveSession called with:', {
    fileName: imageFile?.name,
    fileSize: imageFile?.size,
    fileType: imageFile?.type
  });
  logger.info('addImageToCollectiveSession called', { 
    fileName: imageFile?.name, 
    fileSize: imageFile?.size, 
    fileType: imageFile?.type
  });

  if (!imageFile) {
    console.error('❌ leadflowService.addImageToCollectiveSession: No image file provided');
    logger.error('addImageToCollectiveSession: No image file provided');
    return { status_code: 400, content: { detail: 'Image file is required' } };
  }

  try {
    // Validate file before creating FormData
    if (!imageFile || imageFile.size === 0) {
      console.error('❌ leadflowService.addImageToCollectiveSession: Image file is empty or invalid');
      logger.error('addImageToCollectiveSession: Image file is empty or invalid');
      return { status_code: 400, content: { detail: 'Image file is empty or invalid' } };
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', imageFile);
    
    console.log('📋 FormData created with file:', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    });

    const url = `${BASE_URL}/api/leadflow-service/collective-sessions/add-image`;
    console.log('📤 leadflowService.addImageToCollectiveSession: Making request to:', url);
    logger.debug('addImageToCollectiveSession: Making POST request', { url, fileSize: imageFile.size });
    
    // Get Clerk token for authentication
    const token = await getClerkToken();
    
    // Build headers - don't set Content-Type for FormData (browser will set it with boundary)
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      logger.debug('addImageToCollectiveSession: Including Authorization header in request');
    } else {
      logger.warn('addImageToCollectiveSession: No Clerk token available for request');
    }
    
    const fetchOptions = {
      method: 'POST',
      headers,
      body: formData,
      mode: 'cors',
      credentials: 'omit',
    };

    console.log('⏳ leadflowService.addImageToCollectiveSession: Sending request...');
    logger.debug('addImageToCollectiveSession: Sending request...');
    const resp = await fetch(url, fetchOptions);
    console.log('📥 leadflowService.addImageToCollectiveSession: Response received - Status:', resp.status);
    logger.debug('addImageToCollectiveSession: Response received', { status: resp.status, ok: resp.ok });
    
    let content;
    try {
      content = await resp.json();
      console.log('✅ leadflowService.addImageToCollectiveSession: JSON response parsed:', content);
      logger.debug('addImageToCollectiveSession: JSON response parsed', content);
    } catch (err) {
      const textContent = await resp.text();
      console.log('⚠️ leadflowService.addImageToCollectiveSession: Non-JSON response:', textContent);
      logger.warn('addImageToCollectiveSession: Non-JSON response');
      content = { detail: textContent };
    }

    const result = { status_code: resp.status, content };
    console.log('🔙 leadflowService.addImageToCollectiveSession: Returning result:', result);
    logger.info('addImageToCollectiveSession: Completed', { status: resp.status, success: resp.status === 200 });
    return result;
  } catch (error) {
    console.error('💥 leadflowService.addImageToCollectiveSession: Network error:', error);
    logger.error('addImageToCollectiveSession: Network error', { error: error.message });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

/**
 * Process all images in the collective session with the specified bucket
 * @param {string} bucketId - Bucket ID to assign extracted leads to
 * @returns {Promise<Object>} Response with status_code and content
 */
const processCollectiveSession = async (bucketId) => {
  console.log('🔄 leadflowService.processCollectiveSession called with bucketId:', bucketId);
  logger.info('processCollectiveSession called', { bucketId });

  if (!bucketId) {
    console.error('❌ leadflowService.processCollectiveSession: No bucketId provided');
    logger.error('processCollectiveSession: No bucketId provided');
    return { status_code: 400, content: { detail: 'bucket_id is required' } };
  }

  try {
    const url = `${BASE_URL}/api/leadflow-service/collective-sessions/process`;
    console.log('📤 leadflowService.processCollectiveSession: Making request to:', url);
    logger.debug('processCollectiveSession: Making POST request', { url, bucketId });
    
    // Get Clerk token for authentication
    const token = await getClerkToken();
    
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      logger.debug('processCollectiveSession: Including Authorization header in request');
    } else {
      logger.warn('processCollectiveSession: No Clerk token available for request');
    }
    
    const fetchOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify({ bucket_id: bucketId }),
      mode: 'cors',
      credentials: 'omit',
    };

    console.log('⏳ leadflowService.processCollectiveSession: Sending request...');
    logger.debug('processCollectiveSession: Sending request...');
    const resp = await fetch(url, fetchOptions);
    console.log('📥 leadflowService.processCollectiveSession: Response received - Status:', resp.status);
    logger.debug('processCollectiveSession: Response received', { status: resp.status, ok: resp.ok });
    
    let content;
    try {
      content = await resp.json();
      console.log('✅ leadflowService.processCollectiveSession: JSON response parsed:', content);
      logger.debug('processCollectiveSession: JSON response parsed', content);
    } catch (err) {
      const textContent = await resp.text();
      console.log('⚠️ leadflowService.processCollectiveSession: Non-JSON response:', textContent);
      logger.warn('processCollectiveSession: Non-JSON response');
      content = { detail: textContent };
    }

    const result = { status_code: resp.status, content };
    console.log('🔙 leadflowService.processCollectiveSession: Returning result:', result);
    logger.info('processCollectiveSession: Completed', { status: resp.status, success: resp.status === 200 });
    return result;
  } catch (error) {
    console.error('💥 leadflowService.processCollectiveSession: Network error:', error);
    logger.error('processCollectiveSession: Network error', { error: error.message });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

/**
 * Delete the collective session (cleanup)
 * @returns {Promise<Object>} Response with status_code and content
 */
const deleteCollectiveSession = async () => {
  console.log('🔄 leadflowService.deleteCollectiveSession called');
  logger.info('deleteCollectiveSession called');

  try {
    const url = `${BASE_URL}/api/leadflow-service/collective-sessions/delete`;
    console.log('📤 leadflowService.deleteCollectiveSession: Making request to:', url);
    logger.debug('deleteCollectiveSession: Making DELETE request', { url });
    
    // Get Clerk token for authentication
    const token = await getClerkToken();
    
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const fetchOptions = {
      method: 'DELETE',
      headers,
      mode: 'cors',
      credentials: 'omit',
    };

    const resp = await fetch(url, fetchOptions);
    console.log('📥 leadflowService.deleteCollectiveSession: Response received - Status:', resp.status);
    
    let content;
    try {
      content = await resp.json();
    } catch (err) {
      const textContent = await resp.text();
      content = { detail: textContent };
    }

    const result = { status_code: resp.status, content };
    logger.info('deleteCollectiveSession: Completed', { status: resp.status });
    return result;
  } catch (error) {
    console.error('💥 leadflowService.deleteCollectiveSession: Network error:', error);
    logger.error('deleteCollectiveSession: Network error', { error: error.message });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

/**
 * @deprecated Use addImageToCollectiveSession + processCollectiveSession instead
 * Add lead by uploading an image file (OLD API - NO LONGER WORKS)
 */
const addLead = async (imageFile, bucketId = null) => {
  console.warn('⚠️ addLead is DEPRECATED. Use addImageToCollectiveSession + processCollectiveSession instead.');
  logger.warn('addLead is DEPRECATED. Use the new collective session flow.');
  
  // Redirect to new flow for backwards compatibility
  if (!imageFile) {
    return { status_code: 400, content: { detail: 'Image file is required' } };
  }
  
  // Step 1: Add image to session
  const addResult = await addImageToCollectiveSession(imageFile);
  if (addResult.status_code !== 200) {
    return addResult;
  }
  
  // Step 2: Process the session
  return await processCollectiveSession(bucketId);
};

/**
 * Add team lead by uploading an image file (screenshot)
 * @param {File} imageFile - Image file to upload
 * @param {string} teamId - ID of the team
 * @param {string} bucketId - Optional bucket ID to assign the lead to
 * @returns {Promise<Object>} Response with status_code and content
 */
const addTeamLeadFromImage = async (imageFile, teamId, bucketId = null) => {
  logger.info('addTeamLeadFromImage called', { 
    fileName: imageFile?.name, 
    fileSize: imageFile?.size, 
    fileType: imageFile?.type, 
    teamId,
    bucketId 
  });

  if (!imageFile) {
    logger.error('addTeamLeadFromImage: No image file provided');
    return { status_code: 400, content: { detail: 'Image file is required' } };
  }

  if (!teamId) {
    logger.error('addTeamLeadFromImage: teamId is required');
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }

  try {
    if (!imageFile || imageFile.size === 0) {
      logger.error('addTeamLeadFromImage: Image file is empty or invalid');
      return { status_code: 400, content: { detail: 'Image file is empty or invalid' } };
    }
    
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('teamId', teamId);
    
    if (bucketId) {
      formData.append('bucketId', bucketId);
      logger.debug('addTeamLeadFromImage: Added bucketId to FormData', { bucketId });
    }

    const url = `${BASE_URL}/api/leadflow-service/teams/leads/add-lead`;
    logger.debug('addTeamLeadFromImage: Making POST request', { url, fileSize: imageFile.size });
    
    const token = await getClerkToken();
    
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      logger.debug('addTeamLeadFromImage: Including Authorization header in request');
    } else {
      logger.warn('addTeamLeadFromImage: No Clerk token available for request');
    }
    
    const fetchOptions = {
      method: 'POST',
      headers,
      body: formData,
      mode: 'cors',
      credentials: 'omit',
    };

    logger.debug('addTeamLeadFromImage: Sending request...');
    const resp = await fetch(url, fetchOptions);
    logger.debug('addTeamLeadFromImage: Response received', { status: resp.status, ok: resp.ok });
    
    let content;
    try {
      content = await resp.json();
      logger.debug('addTeamLeadFromImage: JSON response parsed', content);
    } catch (err) {
      const textContent = await resp.text();
      logger.warn('addTeamLeadFromImage: Non-JSON response, getting text');
      logger.debug('addTeamLeadFromImage: Text response', { textContent });
      content = { detail: textContent };
    }

    const result = { status_code: resp.status, content };
    logger.info('addTeamLeadFromImage: Completed', { status: resp.status, success: resp.status === 202 });
    return result;
  } catch (error) {
    logger.error('addTeamLeadFromImage: Network error', { error: error.message, stack: error.stack });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

/**
 * Update lead status
 * @param {string} leadId - ID of the lead to update
 * @param {string} status - New status for the lead
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateLeadStatus = async (leadId, status) => {
  logger.info('updateLeadStatus called', { leadId, status });
  
  if (!leadId || !status) {
    return { status_code: 400, content: { detail: 'lead_id and status are required' } };
  }

  const resp = await request('/api/leadflow-service/leads/update-lead-status', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: leadId, status }),
  });

  logger.info('updateLeadStatus: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Update lead context
 * @param {string} leadId - ID of the lead to update
 * @param {string} context - New context for the lead
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateLeadContext = async (leadId, context) => {
  logger.info('updateLeadContext called', { leadId, context });
  
  if (!leadId) {
    return { status_code: 400, content: { detail: 'lead_id is required' } };
  }

  const resp = await request('/api/leadflow-service/leads/update-lead-context', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: leadId, context: context || '' }),
  });

  logger.info('updateLeadContext: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Update lead platform status
 * @param {string} leadId - ID of the lead to update
 * @param {string} platform - Platform name (linkedin, insta, x, email, pinterest, artstation, youtube)
 * @param {string} status - New status for the platform
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateLeadPlatformStatus = async (leadId, platform, status) => {
  logger.info('updateLeadPlatformStatus called', { leadId, platform, status });
  
  if (!leadId || !platform || !status) {
    return { status_code: 400, content: { detail: 'lead_id, platform, and status are required' } };
  }

  const resp = await request('/api/leadflow-service/leads/update-lead-platform-status', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: leadId, platform, status }),
  });

  logger.info('updateLeadPlatformStatus: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Update lead platform reached out status
 * @param {string} leadId - ID of the lead to update
 * @param {string} platform - Platform name (linkedin, insta, x, email, pinterest, artstation, youtube)
 * @param {boolean} reachedOut - Whether the lead has been reached out to on this platform
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateLeadPlatformReachedOut = async (leadId, platform, reachedOut) => {
  logger.info('updateLeadPlatformReachedOut called', { leadId, platform, reachedOut });
  
  if (!leadId || !platform || reachedOut === undefined || reachedOut === null) {
    return { status_code: 400, content: { detail: 'lead_id, platform, and reached_out are required' } };
  }

  const resp = await request('/api/leadflow-service/leads/update-lead-platform-reached-out', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: leadId, platform, reached_out: reachedOut }),
  });

  logger.info('updateLeadPlatformReachedOut: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Update lead checkpoint
 * @param {string} leadId - ID of the lead to update
 * @param {boolean} checkpoint - Checkpoint value (true/false)
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateLeadCheckpoint = async (leadId, checkpoint) => {
  logger.info('updateLeadCheckpoint called', { leadId, checkpoint });
  
  if (!leadId) {
    return { status_code: 400, content: { detail: 'lead_id is required' } };
  }
  if (checkpoint === undefined || checkpoint === null) {
    return { status_code: 400, content: { detail: 'checkpoint is required' } };
  }

  const resp = await request('/api/leadflow-service/leads/update-lead-checkpoint', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: leadId, checkpoint: Boolean(checkpoint) }),
  });

  logger.info('updateLeadCheckpoint: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Delete lead
 * @param {string} leadId - ID of the lead to delete
 * @param {string|null} bucketId - Optional bucket ID (for context)
 * @returns {Promise<Object>} Response with status_code and content
 */
const deleteLead = async (leadId, bucketId = null) => {
  console.log('🔄 leadflowService.deleteLead called with:', {
    leadId: leadId,
    bucketId: bucketId
  });
  logger.info('deleteLead called', { leadId, bucketId });

  if (!leadId) {
    console.error('❌ leadflowService.deleteLead: No leadId provided');
    logger.error('deleteLead: No leadId provided');
    return { status_code: 400, content: { detail: 'lead_id is required' } };
  }

  try {
    console.log('📤 leadflowService.deleteLead: Attempting JSON body approach...');
    logger.debug('deleteLead: Attempting JSON body approach');
    
    // Try with JSON body first (as your backend supports both)
    const body = { lead_id: leadId };
    if (bucketId) {
      body.bucket_id = bucketId;
    }

    console.log('📤 leadflowService.deleteLead: Making request with body:', body);
    logger.debug('deleteLead: Making DELETE request with body', body);

    let resp = await request('/api/leadflow-service/leads/delete-lead', {
      method: 'DELETE',
      body: JSON.stringify(body),
    });

    console.log('📥 leadflowService.deleteLead: JSON body response:', resp);
    logger.debug('deleteLead: JSON body response received', { status: resp.status_code, content: resp.content });

    // If JSON body approach fails with 404, try query parameters
    if (resp.status_code === 404) {
      console.log('⚠️ leadflowService.deleteLead: JSON body failed with 404, trying query params...');
      logger.warn('deleteLead: JSON body approach failed with 404, trying query params');
      
      const params = new URLSearchParams();
      params.append('lead_id', leadId);
      if (bucketId) {
        params.append('bucket_id', bucketId);
      }

      const path = `/api/leadflow-service/leads/delete-lead?${params.toString()}`;
      console.log('📤 leadflowService.deleteLead: Making request with query params to:', path);
      logger.debug('deleteLead: Making DELETE request with query params', { path });
      
      resp = await request(path, { method: 'DELETE' });
      console.log('📥 leadflowService.deleteLead: Query params response:', resp);
      logger.debug('deleteLead: Query params response received', { status: resp.status_code, content: resp.content });
    }

    logger.info('deleteLead: Completed', { status: resp.status_code, success: resp.status_code === 200 });
    return resp;
  } catch (error) {
    console.error('💥 leadflowService.deleteLead: Error:', error);
    logger.error('deleteLead: Exception caught', { error: error.message, stack: error.stack });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

/**
 * Move lead to different bucket
 * @param {string} leadId - ID of the lead to move
 * @param {string} targetBucketId - ID of the target bucket
 * @param {string|null} sourceBucketId - Optional source bucket ID (for context)
 * @returns {Promise<Object>} Response with status_code and content
 */
const moveLeadToBucket = async (leadId, targetBucketId, sourceBucketId = null) => {
  console.log('🔄 leadflowService.moveLeadToBucket called with:', {
    leadId: leadId,
    targetBucketId: targetBucketId,
    sourceBucketId: sourceBucketId
  });
  logger.info('moveLeadToBucket called', { leadId, targetBucketId, sourceBucketId });

  if (!leadId || !targetBucketId) {
    console.error('❌ leadflowService.moveLeadToBucket: leadId and targetBucketId are required');
    logger.error('moveLeadToBucket: leadId and targetBucketId are required');
    return { status_code: 400, content: { detail: 'lead_id and new_bucket_id are required' } };
  }

  try {
    const body = { 
      lead_id: leadId, 
      new_bucket_id: targetBucketId 
    };

    console.log('📤 leadflowService.moveLeadToBucket: Making request with body:', body);
    logger.debug('moveLeadToBucket: Making PUT request', body);

    const resp = await request('/api/leadflow-service/leads/change-lead-bucket', {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    console.log('📥 leadflowService.moveLeadToBucket: Response received:', resp);
    logger.info('moveLeadToBucket: Completed', { status: resp.status_code, success: resp.status_code === 200 });
    
    return resp;
  } catch (error) {
    console.error('💥 leadflowService.moveLeadToBucket: Error:', error);
    logger.error('moveLeadToBucket: Exception caught', { error: error.message, stack: error.stack });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

// ============================================================================
// TEAM MANAGEMENT APIs
// ============================================================================

/**
 * Add a new team
 * @param {string} teamName - Name of the team
 * @param {string} application - Application name (Airtype, ClipVault, Leadflow)
 * @returns {Promise<Object>} Response with status_code and team object
 */
const addTeam = async (teamName, application) => {
  logger.info('addTeam called', { teamName, application });
  
  if (!teamName) {
    return { status_code: 400, content: { detail: 'teamName is required' } };
  }
  
  if (!application) {
    return { status_code: 400, content: { detail: 'application is required' } };
  }

  const resp = await request('/api/leadflow-service/teams/add-team', {
    method: 'POST',
    body: JSON.stringify({ teamName, application }),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.team || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    teamId: content.teamId || content.team_id || content.id,
    teamName: content.teamName || content.team_name || content.name || teamName,
    application: content.application || application,
    members: content.members || [],
    ...content
  };

  logger.info('addTeam: Completed', { status: resp.status_code, teamId: normalized.teamId });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Add a member to a team
 * @param {string} teamId - ID of the team
 * @param {string} customerEmail - Email of the customer to add
 * @param {string} role - Role of the member (admin, user)
 * @returns {Promise<Object>} Response with status_code and success message
 */
const addTeamMember = async (teamId, customerEmail, role) => {
  logger.info('addTeamMember called', { teamId, customerEmail, role });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!customerEmail) {
    return { status_code: 400, content: { detail: 'customerEmail is required' } };
  }
  
  if (!role) {
    return { status_code: 400, content: { detail: 'role is required' } };
  }

  const resp = await request('/api/leadflow-service/teams/add-member', {
    method: 'POST',
    body: JSON.stringify({ teamId, customerEmail, role }),
  });

  logger.info('addTeamMember: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Get all teams for the authenticated customer
 * @returns {Promise<Array>} Array of team objects
 */
const getAllTeams = async () => {
  logger.info('getAllTeams called');
  
  const resp = await request('/api/leadflow-service/teams/get-all-teams', {
    method: 'GET',
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) {
    return { status_code: resp?.status_code || 500, content: resp?.content || { detail: 'Failed to fetch teams' } };
  }

  let content = resp.content || {};
  let teams = Array.isArray(content) ? content : (Array.isArray(content.teams) ? content.teams : (Array.isArray(content.data) ? content.data : []));

  const normalized = teams.map(team => ({
    teamId: team.teamId || team.team_id || team.id,
    teamName: team.teamName || team.team_name || team.name || '',
    application: team.application || '',
    members: Array.isArray(team.members) ? team.members : [],
    ...team
  }));

  logger.info('getAllTeams: Completed', { status: resp.status_code, count: normalized.length });
  return normalized;
};

/**
 * Update team name
 * @param {string} teamId - ID of the team
 * @param {string} teamName - New name for the team
 * @returns {Promise<Object>} Response with status_code and updated team object
 */
const updateTeamName = async (teamId, teamName) => {
  logger.info('updateTeamName called', { teamId, teamName });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!teamName) {
    return { status_code: 400, content: { detail: 'teamName is required' } };
  }

  const resp = await request('/api/leadflow-service/teams/update-team-name', {
    method: 'PUT',
    body: JSON.stringify({ teamId, teamName }),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.team || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    teamId: content.teamId || content.team_id || content.id || teamId,
    teamName: content.teamName || content.team_name || content.name || teamName,
    application: content.application || '',
    members: Array.isArray(content.members) ? content.members : [],
    ...content
  };

  logger.info('updateTeamName: Completed', { status: resp.status_code, teamId: normalized.teamId });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Get all members of a team
 * @param {string} teamId - ID of the team
 * @returns {Promise<Object>} Response with status_code and content (array of members)
 */
const getTeamMembers = async (teamId) => {
  logger.info('getTeamMembers called', { teamId });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }

  const resp = await request(`/api/leadflow-service/teams/get-team-members?teamId=${encodeURIComponent(teamId)}`, {
    method: 'GET',
  });

  // Normalize response
  let normalized = [];
  if (resp.status_code === 200 && resp.content) {
    if (Array.isArray(resp.content)) {
      normalized = resp.content.map(member => ({
        customerId: member.customerId || member.customer_id || member.customerIds,
        email: member.email || '',
        role: member.role || 'user'
      }));
    } else if (resp.content.members && Array.isArray(resp.content.members)) {
      normalized = resp.content.members.map(member => ({
        customerId: member.customerId || member.customer_id || member.customerIds,
        email: member.email || '',
        role: member.role || 'user'
      }));
    }
  }

  logger.info('getTeamMembers: Completed', { status: resp.status_code, count: normalized.length });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Update a team member's role
 * @param {string} teamId - ID of the team
 * @param {string} memberCustomerId - Customer ID of the member to update
 * @param {string} newRole - New role (admin or user)
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateTeamMemberRole = async (teamId, memberCustomerId, newRole) => {
  logger.info('updateTeamMemberRole called', { teamId, memberCustomerId, newRole });
  
  if (!teamId || !memberCustomerId || !newRole) {
    return { status_code: 400, content: { detail: 'teamId, memberCustomerId, and newRole are required' } };
  }

  if (newRole !== 'admin' && newRole !== 'user') {
    return { status_code: 400, content: { detail: 'newRole must be either "admin" or "user"' } };
  }

  const resp = await request('/api/leadflow-service/teams/update-member-role', {
    method: 'PUT',
    body: JSON.stringify({
      teamId,
      customerId: memberCustomerId,
      newRole
    }),
  });

  // Normalize response
  let normalized = null;
  if (resp.status_code === 200 && resp.content) {
    normalized = {
      teamId: resp.content.teamId || resp.content.team_id || teamId,
      customerId: resp.content.customerId || resp.content.customer_id || memberCustomerId,
      newRole: resp.content.newRole || resp.content.new_role || newRole,
      message: resp.content.message || 'Member role updated successfully'
    };
  }

  logger.info('updateTeamMemberRole: Completed', { status: resp.status_code, teamId: normalized?.teamId });
  return { status_code: resp.status_code, content: normalized || resp.content };
};

// ============================================================================
// TEAM LEAD MANAGEMENT APIs
// ============================================================================

// Helper to normalize lead object fields
const normalizeTeamLeads = (arr) => {
  return arr.map((lead) => {
    if (!lead || typeof lead !== 'object') return null;
    
    const leadId = lead.leadId || lead.lead_id || lead.id || lead._id;
    const url = lead.url || '';
    const username = lead.username || lead.user_name || '';
    const platform = lead.platform || '';
    const status = lead.status || 'Cold Message';
    const notes = lead.notes || '';
    const teamId = lead.teamId || lead.team_id || '';
    
    return {
      leadId: leadId ? String(leadId) : null,
      url,
      username,
      platform,
      status,
      notes,
      teamId: teamId ? String(teamId) : null,
      ...lead
    };
  }).filter(Boolean);
};

/**
 * Get all leads for a team
 * @param {string} teamId - ID of the team
 * @param {string|null} bucketId - Optional bucket ID to filter leads
 * @returns {Promise<Array>} Array of normalized lead objects
 */
const getTeamLeads = async (teamId, bucketId = null) => {
  logger.info('getTeamLeads called', { teamId, bucketId });
  
  if (!teamId) {
    logger.error('getTeamLeads: teamId is required');
    return [];
  }
  
  const params = new URLSearchParams();
  params.append('teamId', teamId);
  if (bucketId) {
    params.append('bucketId', bucketId);
  }
  
  const path = `/api/leadflow-service/teams/leads/get-all-leads?${params.toString()}`;
  logger.debug('getTeamLeads: Making request', { path });
  const resp = await request(path, { method: 'GET' });

  if (!resp || resp.status_code !== 200) {
    console.error('Failed to fetch team leads or non-200 response:', resp);
    logger.error('getTeamLeads: Failed to fetch team leads', { status: resp?.status_code, content: resp?.content });
    return [];
  }

  const content = resp.content;

  if (Array.isArray(content)) {
    logger.debug('getTeamLeads: Response is array', { count: content.length });
    return normalizeTeamLeads(content);
  }
  if (content && Array.isArray(content.leads)) {
    logger.debug('getTeamLeads: Response has leads array', { count: content.leads.length });
    return normalizeTeamLeads(content.leads);
  }
  if (content && Array.isArray(content.content)) {
    logger.debug('getTeamLeads: Response has content array', { count: content.content.length });
    return normalizeTeamLeads(content.content);
  }
  if (content && Array.isArray(content.data)) {
    logger.debug('getTeamLeads: Response has data array', { count: content.data.length });
    return normalizeTeamLeads(content.data);
  }

  console.warn('Unexpected team leads response shape, returning empty list:', content);
  logger.warn('getTeamLeads: Unexpected response shape', { content });
  return [];
};

/**
 * Add a lead for a team
 * @param {string} teamId - ID of the team
 * @param {string} url - URL of the lead
 * @param {string} username - Username/handle
 * @param {string} platform - Platform name
 * @param {string} status - Lead status
 * @param {string} bucketId - Bucket ID
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Response with status_code and normalized lead object
 */
const addTeamLead = async (teamId, url, username, platform, status, bucketId, notes = '') => {
  logger.info('addTeamLead called', { teamId, url, username, platform, status, bucketId, notes });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!url) {
    return { status_code: 400, content: { detail: 'url is required' } };
  }
  
  if (!bucketId) {
    return { status_code: 400, content: { detail: 'bucketId is required' } };
  }

  const body = {
    teamId,
    url,
    username: username || '',
    platform: platform || '',
    status: status || 'Cold Message',
    bucketId,
    notes: notes || ''
  };

  const resp = await request('/api/leadflow-service/teams/leads/add-lead', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.lead || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    leadId: content.leadId || content.lead_id || content.id,
    url: content.url || url,
    username: content.username || username || '',
    platform: content.platform || platform || '',
    status: content.status || status || 'Cold Message',
    bucketId: content.bucketId || content.bucket_id || bucketId,
    teamId: content.teamId || content.team_id || teamId,
    notes: content.notes || notes || null,
    createdAt: content.createdAt || new Date().toISOString(),
    ...content
  };

  logger.info('addTeamLead: Completed', { status: resp.status_code, leadId: normalized.leadId });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Delete a lead for a team
 * @param {string} teamId - ID of the team
 * @param {string} leadId - ID of the lead to delete
 * @returns {Promise<Object>} Response with status_code and content
 */
const deleteTeamLead = async (teamId, leadId) => {
  logger.info('deleteTeamLead called', { teamId, leadId });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!leadId) {
    return { status_code: 400, content: { detail: 'leadId is required' } };
  }

  const body = { teamId, leadId };

  const resp = await request('/api/leadflow-service/teams/leads/delete-lead', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });

  logger.info('deleteTeamLead: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Update lead information for a team
 * @param {string} teamId - ID of the team
 * @param {string} leadId - ID of the lead to update
 * @param {Object} updates - Update object with fields: status, notes, url, username, platform
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateTeamLead = async (teamId, leadId, updates) => {
  logger.info('updateTeamLead called', { teamId, leadId, updates });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!leadId) {
    return { status_code: 400, content: { detail: 'leadId is required' } };
  }
  
  if (!updates || typeof updates !== 'object') {
    return { status_code: 400, content: { detail: 'updates object is required' } };
  }

  const body = {
    teamId,
    leadId,
    ...updates
  };

  const resp = await request('/api/leadflow-service/teams/leads/update-lead', {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  logger.info('updateTeamLead: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Update team lead status
 * @param {string} teamId - ID of the team
 * @param {string} leadId - ID of the lead to update
 * @param {string} status - New status for the lead
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateTeamLeadStatus = async (teamId, leadId, status) => {
  logger.info('updateTeamLeadStatus called', { teamId, leadId, status });
  
  if (!teamId || !leadId || !status) {
    return { status_code: 400, content: { detail: 'teamId, leadId, and status are required' } };
  }

  const body = {
    teamId,
    leadId,
    status
  };

  const resp = await request('/api/leadflow-service/teams/leads/update-lead-status', {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  logger.info('updateTeamLeadStatus: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Update team lead notes
 * @param {string} teamId - ID of the team
 * @param {string} leadId - ID of the lead to update
 * @param {string} notes - New notes for the lead
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateTeamLeadNotes = async (teamId, leadId, notes) => {
  logger.info('updateTeamLeadNotes called', { teamId, leadId, notes });
  
  if (!teamId || !leadId) {
    return { status_code: 400, content: { detail: 'teamId and leadId are required' } };
  }

  const body = {
    teamId,
    leadId,
    notes: notes || ''
  };

  const resp = await request('/api/leadflow-service/teams/leads/update-lead-notes', {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  logger.info('updateTeamLeadNotes: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Update team lead checkpoint
 * @param {string} teamId - ID of the team
 * @param {string} leadId - ID of the lead to update
 * @param {boolean} checkpoint - Checkpoint value (true/false)
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateTeamLeadCheckpoint = async (teamId, leadId, checkpoint) => {
  logger.info('updateTeamLeadCheckpoint called', { teamId, leadId, checkpoint });
  
  if (!teamId || !leadId) {
    return { status_code: 400, content: { detail: 'teamId and leadId are required' } };
  }
  if (checkpoint === undefined || checkpoint === null) {
    return { status_code: 400, content: { detail: 'checkpoint is required' } };
  }

  const body = {
    teamId,
    leadId,
    checkpoint: Boolean(checkpoint)
  };

  const resp = await request('/api/leadflow-service/teams/leads/update-lead-checkpoint', {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  logger.info('updateTeamLeadCheckpoint: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Move team lead to different bucket
 * @param {string} teamId - ID of the team
 * @param {string} leadId - ID of the lead to move
 * @param {string} newBucketId - ID of the target bucket
 * @returns {Promise<Object>} Response with status_code and content
 */
const moveTeamLeadToBucket = async (teamId, leadId, newBucketId) => {
  logger.info('moveTeamLeadToBucket called', { teamId, leadId, newBucketId });
  
  if (!teamId || !leadId || !newBucketId) {
    return { status_code: 400, content: { detail: 'teamId, leadId, and newBucketId are required' } };
  }

  const body = {
    teamId,
    leadId,
    newBucketId
  };

  const resp = await request('/api/leadflow-service/teams/leads/change-lead-bucket', {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  logger.info('moveTeamLeadToBucket: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Add a bucket for a team
 * @param {string} teamId - ID of the team
 * @param {string} bucketName - Name of the bucket
 * @returns {Promise<Object>} Response with status_code and normalized bucket object
 */
const addTeamBucket = async (teamId, bucketName) => {
  logger.info('addTeamBucket called', { teamId, bucketName });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!bucketName) {
    return { status_code: 400, content: { detail: 'bucketName is required' } };
  }

  const resp = await request('/api/leadflow-service/teams/buckets/add-bucket', {
    method: 'POST',
    body: JSON.stringify({ teamId, bucketName }),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.bucket || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    bucketId: content.bucketId || content.bucket_id || content.id,
    bucketName: content.bucketName || content.bucket_name || content.name || bucketName,
    teamId: content.teamId || content.team_id || teamId,
    customerId: null,
    ...content
  };

  logger.info('addTeamBucket: Completed', { status: resp.status_code, bucketId: normalized.bucketId });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Get all buckets for a team
 * @param {string} teamId - ID of the team
 * @returns {Promise<Array>} Array of bucket objects
 */
const getAllTeamBuckets = async (teamId) => {
  logger.info('getAllTeamBuckets called', { teamId });
  
  if (!teamId) {
    throw new Error('teamId is required');
  }

  const resp = await request(`/api/leadflow-service/teams/buckets/get-all-buckets?teamId=${encodeURIComponent(teamId)}`, {
    method: 'GET',
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) {
    const errorMessage = resp?.content?.detail || resp?.content?.message || `Failed to fetch team buckets: ${resp?.status_code || 'Unknown error'}`;
    logger.error('getAllTeamBuckets: Error response', { status: resp?.status_code, error: errorMessage });
    throw new Error(errorMessage);
  }

  let content = resp.content;
  
  logger.info('getAllTeamBuckets: Raw response', { 
    status_code: resp.status_code,
    contentType: typeof content,
    isArray: Array.isArray(content),
    contentKeys: content && typeof content === 'object' && !Array.isArray(content) ? Object.keys(content) : null,
    contentLength: Array.isArray(content) ? content.length : null,
    contentSample: Array.isArray(content) && content.length > 0 ? content[0] : (typeof content === 'object' ? content : null)
  });
  
  // MongoDB service returns the array directly when using JSONResponse(content=buckets)
  // LeadFlow service forwards it, so content should be the array
  let buckets = [];
  if (Array.isArray(content)) {
    // Direct array response
    buckets = content;
    logger.info('getAllTeamBuckets: Content is array', { count: buckets.length, sample: buckets[0] || null });
  } else if (content && typeof content === 'object') {
    // Check if it's wrapped in an object
    if (Array.isArray(content.buckets)) {
      buckets = content.buckets;
      logger.info('getAllTeamBuckets: Content has buckets array', { count: buckets.length });
    } else if (Array.isArray(content.data)) {
      buckets = content.data;
      logger.info('getAllTeamBuckets: Content has data array', { count: buckets.length });
    } else if (Array.isArray(content.content)) {
      buckets = content.content;
      logger.info('getAllTeamBuckets: Content has content array', { count: buckets.length });
    } else {
      // If content is not an array and not wrapped, log warning
      logger.warn('getAllTeamBuckets: Unexpected response format - not an array', { 
        contentType: typeof content,
        contentKeys: Object.keys(content || {}),
        content: content
      });
      buckets = [];
    }
  } else {
    // If content is not an array or object, return empty array
    logger.warn('getAllTeamBuckets: Unexpected response format - not array or object', { 
      contentType: typeof content,
      content: content
    });
    buckets = [];
  }

  const normalized = buckets.map(bucket => {
    const normalizedBucket = {
      bucketId: bucket.bucketId || bucket.bucket_id || bucket.id,
      bucketName: bucket.bucketName || bucket.bucket_name || bucket.name || '',
      teamId: bucket.teamId || bucket.team_id || teamId, // Always set teamId from parameter or bucket
      customerId: null, // Team buckets should not have customerId
      ...bucket // Spread other properties
    };
    return normalizedBucket;
  });

  logger.info('getAllTeamBuckets: Completed', { 
    status: resp.status_code, 
    count: normalized.length,
    sampleBucket: normalized[0] || null
  });
  return normalized;
};

/**
 * Update bucket name for a team
 * @param {string} teamId - ID of the team
 * @param {string} bucketId - ID of the bucket
 * @param {string} bucketName - New name for the bucket
 * @returns {Promise<Object>} Response with status_code and updated bucket object
 */
const updateTeamBucketName = async (teamId, bucketId, bucketName) => {
  logger.info('updateTeamBucketName called', { teamId, bucketId, bucketName });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!bucketId) {
    return { status_code: 400, content: { detail: 'bucketId is required' } };
  }
  
  if (!bucketName) {
    return { status_code: 400, content: { detail: 'bucketName is required' } };
  }

  const resp = await request('/api/leadflow-service/teams/buckets/update-bucket-name', {
    method: 'PUT',
    body: JSON.stringify({ teamId, bucketId, bucketName }),
  });

  logger.info('updateTeamBucketName: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Delete a bucket for a team
 * @param {string} teamId - ID of the team
 * @param {string} bucketId - ID of the bucket to delete
 * @returns {Promise<Object>} Response with status_code
 */
const deleteTeamBucket = async (teamId, bucketId) => {
  logger.info('deleteTeamBucket called', { teamId, bucketId });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!bucketId) {
    return { status_code: 400, content: { detail: 'bucketId is required' } };
  }

  const resp = await request(`/api/leadflow-service/teams/buckets/delete-bucket?teamId=${encodeURIComponent(teamId)}&bucketId=${encodeURIComponent(bucketId)}`, {
    method: 'DELETE',
  });

  logger.info('deleteTeamBucket: Completed', { status: resp.status_code });
  return resp;
};

// ============================================================================
// METRICS API
// ============================================================================

/**
 * Add a new metric
 * @param {string} fieldName - Name of the metric field
 * @param {number} objectiveCount - Objective count value
 * @param {number} backlogRemainingCount - Backlog remaining count
 * @param {string} [metricId] - Optional metric ID (will be generated if not provided)
 * @returns {Promise<Object>} Response with status_code and content
 */
const addMetric = async (fieldName, objectiveCount, backlogRemainingCount, metricId = null) => {
  logger.info('addMetric called', { fieldName, objectiveCount, backlogRemainingCount, metricId });
  const body = {
    fieldName,
    objectiveCount,
    backlogRemainingCount
  };
  if (metricId) {
    body.metricId = metricId;
  }
  return await request('/api/leadflow-service/metrics/add-metric', {
    method: 'POST',
    body: JSON.stringify(body)
  });
};

/**
 * Delete a metric
 * @param {string} metricId - Metric ID to delete
 * @returns {Promise<Object>} Response with status_code and content
 */
const deleteMetric = async (metricId) => {
  logger.info('deleteMetric called', { metricId });
  return await request('/api/leadflow-service/metrics/delete-metric', {
    method: 'DELETE',
    body: JSON.stringify({ metricId })
  });
};

/**
 * Update metric name
 * @param {string} metricId - Metric ID
 * @param {string} fieldName - New field name
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateMetricName = async (metricId, fieldName) => {
  logger.info('updateMetricName called', { metricId, fieldName });
  return await request('/api/leadflow-service/metrics/update-metric-name', {
    method: 'PUT',
    body: JSON.stringify({ metricId, fieldName })
  });
};

/**
 * Get latest metric information
 * @param {string} metricId - Metric ID
 * @returns {Promise<Object>} Response with status_code and content
 */
const getMetricInformation = async (metricId) => {
  logger.info('getMetricInformation called', { metricId });
  return await request(`/api/leadflow-service/metrics/get-metric-information?metricId=${metricId}`, {
    method: 'GET'
  });
};

/**
 * Increment metric completed count
 * @param {string} metricId - Metric ID
 * @returns {Promise<Object>} Response with status_code and content
 */
const incrementMetricCompletedCount = async (metricId) => {
  logger.info('incrementMetricCompletedCount called', { metricId });
  return await request('/api/leadflow-service/metrics/increment-metric-completed-count', {
    method: 'POST',
    body: JSON.stringify({ metricId })
  });
};

/**
 * Decrement metric completed count
 * @param {string} metricId - Metric ID
 * @returns {Promise<Object>} Response with status_code and content
 */
const decrementMetricCompletedCount = async (metricId) => {
  logger.info('decrementMetricCompletedCount called', { metricId });
  return await request('/api/leadflow-service/metrics/decrement-metric-completed-count', {
    method: 'POST',
    body: JSON.stringify({ metricId })
  });
};

/**
 * Get metric history
 * @param {string} metricId - Metric ID
 * @returns {Promise<Object>} Response with status_code and content
 */
const getMetricHistory = async (metricId) => {
  logger.info('getMetricHistory called', { metricId });
  return await request(`/api/leadflow-service/metrics/get-metric-history?metricId=${metricId}`, {
    method: 'GET'
  });
};

/**
 * Update metric objective count
 * @param {string} metricId - Metric ID
 * @param {number} objectiveCount - New objective count value
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateMetricObjectiveCount = async (metricId, objectiveCount) => {
  logger.info('updateMetricObjectiveCount called', { metricId, objectiveCount });
  return await request('/api/leadflow-service/metrics/update-metric-objective-count', {
    method: 'PUT',
    body: JSON.stringify({ metricId, objectiveCount })
  });
};

/**
 * Get all metrics for the current customer
 * @returns {Promise<Object>} Response with status_code and content containing metrics array
 */
const getAllMetrics = async () => {
  logger.info('getAllMetrics called');
  return await request('/api/leadflow-service/metrics/get-all-metrics', {
    method: 'GET'
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

// Buckets exports
export { 
  getAllBuckets, 
  addNewBucket, 
  updateBucketName, 
  deleteBucket 
};

// Leads exports
export { 
  getAllLeads, 
  updateLeadStatus, 
  updateLeadContext, 
  updateLeadCheckpoint,
  updateLeadPlatformStatus,
  updateLeadPlatformReachedOut,
  addLead,  // Deprecated - use collective session functions
  deleteLead, 
  moveLeadToBucket 
};

// Collective Session exports (New two-step lead processing flow)
export {
  addImageToCollectiveSession,
  processCollectiveSession,
  deleteCollectiveSession
};

// Team Management exports
export {
  addTeam,
  addTeamMember,
  getAllTeams,
  updateTeamName,
  getTeamMembers,
  updateTeamMemberRole
};

// Team Lead Management exports
export {
  getTeamLeads,
  addTeamLead,
  addTeamLeadFromImage,
  deleteTeamLead,
  updateTeamLead,
  updateTeamLeadStatus,
  updateTeamLeadNotes,
  updateTeamLeadCheckpoint,
  moveTeamLeadToBucket
};



// Team Bucket Management exports
export {
  addTeamBucket,
  getAllTeamBuckets,
  updateTeamBucketName,
  deleteTeamBucket
};

// Metrics exports
export {
  addMetric,
  deleteMetric,
  updateMetricName,
  getMetricInformation,
  incrementMetricCompletedCount,
  decrementMetricCompletedCount,
  getMetricHistory,
  updateMetricObjectiveCount,
  getAllMetrics
};

