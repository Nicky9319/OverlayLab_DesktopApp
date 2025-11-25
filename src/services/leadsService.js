// const ipAddress = "http://127.0.0.1:8000";
const ipAddress = "http://206.189.128.242:8000";

// Import renderer logger
import { createLogger } from '../utils/rendererLogger';
const logger = createLogger('LeadsService');

// Small helper to perform fetch and return a consistent shape:
// { status_code: number, content: any }
const request = async (path, options = {}) => {
  const url = `${ipAddress}${path}`;
  const fetchOptions = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    logger.debug(`Making ${options.method || 'GET'} request to: ${url}`);
    const resp = await fetch(url, fetchOptions);
    let content;
    try {
      content = await resp.json();
    } catch (err) {
      // Non-JSON response
      content = { detail: await resp.text() };
    }

    logger.debug(`Response from ${url}:`, { status: resp.status, content });
    return { status_code: resp.status, content };
  } catch (error) {
    console.error('Network error while calling', url, error);
    logger.error(`Network error while calling ${url}`, { error: error.message, stack: error.stack });
    // Keep a consistent return shape for network errors
    return { status_code: 503, content: { detail: String(error) } };
  }
};

// Get all leads, optionally filtered by bucket_id
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

// Update lead status
const updateLeadStatus = async (leadId, status) => {
  if (!leadId || !status) {
    return { status_code: 400, content: { detail: 'lead_id and status are required' } };
  }

  const resp = await request('/api/leadflow-service/leads/update-lead-status', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: leadId, status }),
  });

  return resp;
};

// Update lead notes
const updateLeadNotes = async (leadId, notes) => {
  if (!leadId) {
    return { status_code: 400, content: { detail: 'lead_id is required' } };
  }

  const resp = await request('/api/leadflow-service/leads/update-lead-notes', {
    method: 'PUT',
    body: JSON.stringify({ lead_id: leadId, notes: notes || '' }),
  });

  return resp;
};

// Add lead by uploading an image file
const addLead = async (imageFile, bucketId = null) => {
  console.log('🔄 leadsService.addLead called with:', {
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
    console.error('❌ leadsService.addLead: No image file provided');
    logger.error('addLead: No image file provided');
    return { status_code: 400, content: { detail: 'Image file is required' } };
  }

  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', imageFile);
    
    // Add bucket_id if provided
    if (bucketId) {
      formData.append('bucket_id', bucketId);
      console.log('✅ leadsService.addLead: Added bucket_id to FormData:', bucketId);
      logger.debug('addLead: Added bucket_id to FormData', { bucketId });
    }

    const url = `${ipAddress}/api/leadflow-service/leads/add-lead`;
    console.log('📤 leadsService.addLead: Making request to:', url);
    logger.debug('addLead: Making POST request', { url });
    
    const fetchOptions = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for FormData
    };

    console.log('⏳ leadsService.addLead: Sending request...');
    logger.debug('addLead: Sending request...');
    const resp = await fetch(url, fetchOptions);
    console.log('📥 leadsService.addLead: Response received - Status:', resp.status, 'OK:', resp.ok);
    logger.debug('addLead: Response received', { status: resp.status, ok: resp.ok });
    
    let content;
    try {
      content = await resp.json();
      console.log('✅ leadsService.addLead: JSON response parsed:', content);
      logger.debug('addLead: JSON response parsed', content);
    } catch (err) {
      // Non-JSON response
      console.log('⚠️ leadsService.addLead: Non-JSON response, getting text...');
      logger.warn('addLead: Non-JSON response, getting text');
      const textContent = await resp.text();
      console.log('📄 leadsService.addLead: Text response:', textContent);
      logger.debug('addLead: Text response', { textContent });
      content = { detail: textContent };
    }

    const result = { status_code: resp.status, content };
    console.log('🔙 leadsService.addLead: Returning result:', result);
    logger.info('addLead: Completed', { status: resp.status, success: resp.status === 200 });
    return result;
  } catch (error) {
    console.error('💥 leadsService.addLead: Network error:', error);
    console.error('💥 leadsService.addLead: Error stack:', error.stack);
    logger.error('addLead: Network error', { error: error.message, stack: error.stack });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

// Delete lead
const deleteLead = async (leadId, bucketId = null) => {
  console.log('🔄 leadsService.deleteLead called with:', {
    leadId: leadId,
    bucketId: bucketId
  });
  logger.info('deleteLead called', { leadId, bucketId });

  if (!leadId) {
    console.error('❌ leadsService.deleteLead: No leadId provided');
    logger.error('deleteLead: No leadId provided');
    return { status_code: 400, content: { detail: 'lead_id is required' } };
  }

  try {
    console.log('📤 leadsService.deleteLead: Attempting JSON body approach...');
    logger.debug('deleteLead: Attempting JSON body approach');
    
    // Try with JSON body first (as your backend supports both)
    const body = { lead_id: leadId };
    if (bucketId) {
      body.bucket_id = bucketId;
    }

    console.log('📤 leadsService.deleteLead: Making request with body:', body);
    logger.debug('deleteLead: Making DELETE request with body', body);

    let resp = await request('/api/leadflow-service/leads/delete-lead', {
      method: 'DELETE',
      body: JSON.stringify(body),
    });

    console.log('📥 leadsService.deleteLead: JSON body response:', resp);
    logger.debug('deleteLead: JSON body response received', { status: resp.status_code, content: resp.content });

    // If JSON body approach fails with 404, try query parameters
    if (resp.status_code === 404) {
      console.log('⚠️ leadsService.deleteLead: JSON body failed with 404, trying query params...');
      logger.warn('deleteLead: JSON body approach failed with 404, trying query params');
      
      const params = new URLSearchParams();
      params.append('lead_id', leadId);
      if (bucketId) {
        params.append('bucket_id', bucketId);
      }

      const path = `/api/leadflow-service/leads/delete-lead?${params.toString()}`;
      console.log('📤 leadsService.deleteLead: Making request with query params to:', path);
      logger.debug('deleteLead: Making DELETE request with query params', { path });
      
      resp = await request(path, { method: 'DELETE' });
      console.log('📥 leadsService.deleteLead: Query params response:', resp);
      logger.debug('deleteLead: Query params response received', { status: resp.status_code, content: resp.content });
    }

    logger.info('deleteLead: Completed', { status: resp.status_code, success: resp.status_code === 200 });
    return resp;
  } catch (error) {
    console.error('💥 leadsService.deleteLead: Error:', error);
    logger.error('deleteLead: Exception caught', { error: error.message, stack: error.stack });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

// Move lead to different bucket
const moveLeadToBucket = async (leadId, targetBucketId, sourceBucketId = null) => {
  console.log('🔄 leadsService.moveLeadToBucket called with:', {
    leadId: leadId,
    targetBucketId: targetBucketId,
    sourceBucketId: sourceBucketId
  });
  logger.info('moveLeadToBucket called', { leadId, targetBucketId, sourceBucketId });

  if (!leadId || !targetBucketId) {
    console.error('❌ leadsService.moveLeadToBucket: leadId and targetBucketId are required');
    logger.error('moveLeadToBucket: leadId and targetBucketId are required');
    return { status_code: 400, content: { detail: 'lead_id and new_bucket_id are required' } };
  }

  try {
    const body = { 
      lead_id: leadId, 
      new_bucket_id: targetBucketId 
    };

    console.log('📤 leadsService.moveLeadToBucket: Making request with body:', body);
    logger.debug('moveLeadToBucket: Making PUT request', body);

    const resp = await request('/api/leadflow-service/leads/change-lead-bucket', {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    console.log('📥 leadsService.moveLeadToBucket: Response received:', resp);
    logger.info('moveLeadToBucket: Completed', { status: resp.status_code, success: resp.status_code === 200 });
    
    return resp;
  } catch (error) {
    console.error('💥 leadsService.moveLeadToBucket: Error:', error);
    logger.error('moveLeadToBucket: Exception caught', { error: error.message, stack: error.stack });
    return { status_code: 503, content: { detail: String(error) } };
  }
};

export { getAllLeads, updateLeadStatus, updateLeadNotes, addLead, deleteLead, moveLeadToBucket };
