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
      content = await resp.json();
    } catch (err) {
      // Non-JSON response
      const textContent = await resp.text();
      logger.warn(`Non-JSON response from ${url}`, { status: resp.status, text: textContent.substring(0, 200) });
      content = { detail: textContent };
    }

    logger.debug(`Response from ${url}:`, { status: resp.status, contentKeys: Object.keys(content || {}) });
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

/**
 * Add lead by uploading an image file
 * @param {File} imageFile - Image file to upload
 * @param {string|null} bucketId - Optional bucket ID to assign the lead to
 * @returns {Promise<Object>} Response with status_code and content
 */
const addLead = async (imageFile, bucketId = null) => {
  console.log('🔄 leadflowService.addLead called with:', {
    fileName: imageFile?.name,
    fileSize: imageFile?.size,
    fileType: imageFile?.type,
    bucketId: bucketId
  });
  logger.info('addLead called', { 
    fileName: imageFile?.name, 
    fileSize: imageFile?.size, 
    fileType: imageFile?.type, 
    bucketId 
  });

  if (!imageFile) {
    console.error('❌ leadflowService.addLead: No image file provided');
    logger.error('addLead: No image file provided');
    return { status_code: 400, content: { detail: 'Image file is required' } };
  }

  try {
    // Validate file before creating FormData
    if (!imageFile || imageFile.size === 0) {
      console.error('❌ leadflowService.addLead: Image file is empty or invalid', {
        hasFile: !!imageFile,
        fileSize: imageFile?.size || 0,
        fileName: imageFile?.name || 'unknown'
      });
      logger.error('addLead: Image file is empty or invalid', {
        hasFile: !!imageFile,
        fileSize: imageFile?.size || 0
      });
      return { status_code: 400, content: { detail: 'Image file is empty or invalid' } };
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', imageFile);
    
    // Verify file was added to FormData
    console.log('📋 FormData created with file:', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    });
    
    // Add bucket_id if provided
    if (bucketId) {
      formData.append('bucket_id', bucketId);
      console.log('✅ leadflowService.addLead: Added bucket_id to FormData:', bucketId);
      logger.debug('addLead: Added bucket_id to FormData', { bucketId });
    }

    const url = `${BASE_URL}/api/leadflow-service/leads/add-lead`;
    console.log('📤 leadflowService.addLead: Making request to:', url);
    console.log('📦 Request payload:', {
      hasFormData: !!formData,
      fileSize: imageFile.size,
      fileName: imageFile.name,
      bucketId: bucketId || 'none'
    });
    logger.debug('addLead: Making POST request', { url, fileSize: imageFile.size });
    
    // Get Clerk token for authentication
    const token = await getClerkToken();
    
    // Build headers - don't set Content-Type for FormData (browser will set it with boundary)
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      logger.debug('addLead: Including Authorization header in request');
    } else {
      logger.warn('addLead: No Clerk token available for request');
    }
    
    const fetchOptions = {
      method: 'POST',
      headers,
      body: formData,
      mode: 'cors',
      credentials: 'omit',
      // Don't set Content-Type header - let browser set it with boundary for FormData
    };

    console.log('⏳ leadflowService.addLead: Sending request with file size:', imageFile.size, 'bytes...');
    logger.debug('addLead: Sending request...');
    const resp = await fetch(url, fetchOptions);
    console.log('📥 leadflowService.addLead: Response received - Status:', resp.status, 'OK:', resp.ok);
    logger.debug('addLead: Response received', { status: resp.status, ok: resp.ok });
    
    let content;
    try {
      content = await resp.json();
      console.log('✅ leadflowService.addLead: JSON response parsed:', content);
      logger.debug('addLead: JSON response parsed', content);
    } catch (err) {
      // Non-JSON response
      console.log('⚠️ leadflowService.addLead: Non-JSON response, getting text...');
      logger.warn('addLead: Non-JSON response, getting text');
      const textContent = await resp.text();
      console.log('📄 leadflowService.addLead: Text response:', textContent);
      logger.debug('addLead: Text response', { textContent });
      content = { detail: textContent };
    }

    const result = { status_code: resp.status, content };
    console.log('🔙 leadflowService.addLead: Returning result:', result);
    logger.info('addLead: Completed', { status: resp.status, success: resp.status === 200 });
    return result;
  } catch (error) {
    console.error('💥 leadflowService.addLead: Network error:', error);
    console.error('💥 leadflowService.addLead: Error stack:', error.stack);
    logger.error('addLead: Network error', { error: error.message, stack: error.stack });
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
 * Update lead notes
 * @param {string} leadId - ID of the lead to update
 * @param {string} notes - New notes for the lead
 * @returns {Promise<Object>} Response with status_code and content
 */
const updateLeadNotes = async (leadId, notes) => {
  logger.info('updateLeadNotes called', { leadId, notes });
  
  if (!leadId) {
    return { status_code: 400, content: { detail: 'lead_id is required' } };
  }

  const resp = await request('/api/leadflow-service/leads/update-lead-notes', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: leadId, notes: notes || '' }),
  });

  logger.info('updateLeadNotes: Completed', { status: resp.status_code });
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
  updateLeadNotes, 
  addLead, 
  deleteLead, 
  moveLeadToBucket 
};

