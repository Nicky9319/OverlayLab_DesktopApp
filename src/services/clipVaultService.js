// ClipVault Service - Unified API client for all ClipVault API calls
// Base URL resolved from centralized API config
import { CLIPVAULT_API_URL } from '../config/api';

const BASE_URL = CLIPVAULT_API_URL;

// Import renderer logger
import { createLogger } from '../utils/rendererLogger';
const logger = createLogger('ClipVaultService');

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
// VAULT CLASS APIs
// ============================================================================

/**
 * Add a vault class
 * @param {string} vaultName - Name of the vault
 * @param {string|null} customerId - Optional customer ID
 * @param {string|null} teamId - Optional team ID (mutually exclusive with customerId)
 * @returns {Promise<Object>} Response with status_code and normalized vault object
 */
const addVaultClass = async (vaultName, customerId = null, teamId = null) => {
  logger.info('addVaultClass called', { vaultName, customerId, teamId });
  
  if (!vaultName) {
    return { status_code: 400, content: { detail: 'vaultName is required' } };
  }
  
  if (!customerId && !teamId) {
    return { status_code: 400, content: { detail: 'Either customerId or teamId is required' } };
  }
  
  if (customerId && teamId) {
    return { status_code: 400, content: { detail: 'Cannot specify both customerId and teamId' } };
  }

  const body = { vaultName };
  if (customerId) {
    body.customerId = customerId;
  }
  if (teamId) {
    body.teamId = teamId;
  }

  const resp = await request('/api/clipvault-service/vaults/add-vault-class', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.vault || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    vaultId: content.vaultId || content.vault_id || content.id,
    vaultName: content.vaultName || content.vault_name || content.name || vaultName,
    customerId: content.customerId || content.customer_id || customerId || null,
    teamId: content.teamId || content.team_id || teamId || null,
    ...content
  };

  logger.info('addVaultClass: Completed', { status: resp.status_code, vaultId: normalized.vaultId });
  return { status_code: resp.status_code, content: normalized };
};

// ============================================================================
// VAULT ITEM APIs
// ============================================================================

/**
 * Add an item to a vault
 * @param {string} vaultId - ID of the vault
 * @param {string|null} customerId - Optional customer ID
 * @param {string|null} teamId - Optional team ID (mutually exclusive with customerId)
 * @param {string|null} text - Optional text content (defaults to null)
 * @param {Array<string>} imagePaths - Array of blob paths for images
 * @returns {Promise<Object>} Response with status_code and normalized item object
 */
const addVaultItem = async (vaultId, customerId = null, teamId = null, text = null, imagePaths = []) => {
  logger.info('addVaultItem called', { vaultId, customerId, teamId, text, imagePathsCount: imagePaths?.length });
  
  if (!vaultId) {
    return { status_code: 400, content: { detail: 'vaultId is required' } };
  }
  
  if (!customerId && !teamId) {
    return { status_code: 400, content: { detail: 'Either customerId or teamId is required' } };
  }
  
  if (customerId && teamId) {
    return { status_code: 400, content: { detail: 'Cannot specify both customerId and teamId' } };
  }
  
  if (!Array.isArray(imagePaths)) {
    return { status_code: 400, content: { detail: 'imagePaths must be an array' } };
  }

  const body = {
    vaultId,
    text: text || null,
    imagePaths: imagePaths || []
  };
  
  if (customerId) {
    body.customerId = customerId;
  }
  if (teamId) {
    body.teamId = teamId;
  }

  const resp = await request('/api/clipvault-service/vaults/add-item', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.item || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    itemId: content.itemId || content.item_id || content.id,
    vaultId: vaultId,
    text: content.text || text || null,
    Images: content.Images || content.images || imagePaths || [],
    customerId: content.customerId || content.customer_id || customerId || null,
    teamId: content.teamId || content.team_id || teamId || null,
    ...content
  };

  logger.info('addVaultItem: Completed', { status: resp.status_code, itemId: normalized.itemId });
  return { status_code: resp.status_code, content: normalized };
};

// ============================================================================
// VAULT IMAGE APIs
// ============================================================================

/**
 * Add image to vault
 * First checks blob service if image exists, then adds to MongoDB
 * @param {string} itemId - ID of the vault item
 * @param {string} imageBlobPath - Blob path of the image
 * @returns {Promise<Object>} Response with status_code and normalized image object
 */
const addVaultImage = async (itemId, imageBlobPath) => {
  logger.info('addVaultImage called', { itemId, imageBlobPath });
  
  if (!itemId) {
    return { status_code: 400, content: { detail: 'itemId is required' } };
  }
  
  if (!imageBlobPath) {
    return { status_code: 400, content: { detail: 'imageBlobPath is required' } };
  }

  const resp = await request('/api/clipvault-service/vaults/add-image', {
    method: 'POST',
    body: JSON.stringify({ itemId, imageBlobPath }),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.image || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    imageId: content.imageId || content.image_id || content.id,
    imageBlobPath: content.imageBlobPath || content.image_blob_path || imageBlobPath,
    itemId: content.itemId || content.item_id || itemId,
    ...content
  };

  logger.info('addVaultImage: Completed', { status: resp.status_code, imageId: normalized.imageId });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Store image metadata and check/update vaultItems by blob path
 * @param {string} imageBlobPath - Blob path of the image
 * @param {string} itemId - ID of the vault item
 * @returns {Promise<Object>} Response with status_code and image metadata
 */
const storeImageMetadata = async (imageBlobPath, itemId) => {
  logger.info('storeImageMetadata called', { imageBlobPath, itemId });
  
  if (!imageBlobPath) {
    return { status_code: 400, content: { detail: 'imageBlobPath is required' } };
  }
  
  if (!itemId) {
    return { status_code: 400, content: { detail: 'itemId is required' } };
  }

  const resp = await request('/api/clipvault-service/vaults/store-image-metadata', {
    method: 'POST',
    body: JSON.stringify({ imageBlobPath, itemId }),
  });

  logger.info('storeImageMetadata: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Get signed URL for uploading an image to vault
 * @param {string} blobFilePath - Blob file path for the upload
 * @returns {Promise<Object>} Response with status_code and signed URL
 */
const getSignedUploadUrl = async (blobFilePath) => {
  logger.info('getSignedUploadUrl called', { blobFilePath });
  
  if (!blobFilePath) {
    return { status_code: 400, content: { detail: 'blobFilePath is required' } };
  }

  const params = new URLSearchParams();
  params.append('blobFilePath', blobFilePath);

  const path = `/api/clipvault-service/vaults/get-signed-upload-url?${params.toString()}`;
  const resp = await request(path, { method: 'GET' });

  logger.info('getSignedUploadUrl: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Get image details by imageId
 * @param {string} imageId - ID of the image
 * @returns {Promise<Object>} Response with status_code and image details
 */
const getImageById = async (imageId) => {
  logger.info('getImageById called', { imageId });
  
  if (!imageId) {
    return { status_code: 400, content: { detail: 'imageId is required' } };
  }

  const params = new URLSearchParams();
  params.append('imageId', imageId);

  const path = `/api/clipvault-service/vaults/get-image-by-id?${params.toString()}`;
  const resp = await request(path, { method: 'GET' });

  if (!resp || resp.status_code !== 200) return resp;

  let content = resp.content || {};
  const image = content.image || content.content || content.data || content;

  const normalized = {
    imageId: image.imageId || image.image_id || image.id || imageId,
    imageBlobPath: image.imageBlobPath || image.image_blob_path || '',
    itemId: image.itemId || image.item_id || '',
    ...image
  };

  logger.info('getImageById: Completed', { status: resp.status_code });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Get image details by blob path
 * @param {string} imageBlobPath - Blob path of the image
 * @returns {Promise<Object>} Response with status_code and image details
 */
const getImageByBlobPath = async (imageBlobPath) => {
  logger.info('getImageByBlobPath called', { imageBlobPath });
  
  if (!imageBlobPath) {
    return { status_code: 400, content: { detail: 'imageBlobPath is required' } };
  }

  const params = new URLSearchParams();
  params.append('imageBlobPath', imageBlobPath);

  const path = `/api/clipvault-service/vaults/get-image-by-blob-path?${params.toString()}`;
  const resp = await request(path, { method: 'GET' });

  if (!resp || resp.status_code !== 200) return resp;

  let content = resp.content || {};
  const image = content.image || content.content || content.data || content;

  const normalized = {
    imageId: image.imageId || image.image_id || image.id || '',
    imageBlobPath: image.imageBlobPath || image.image_blob_path || imageBlobPath,
    itemId: image.itemId || image.item_id || '',
    ...image
  };

  logger.info('getImageByBlobPath: Completed', { status: resp.status_code });
  return { status_code: resp.status_code, content: normalized };
};

// ============================================================================
// TEAM VAULT MANAGEMENT APIs
// ============================================================================

/**
 * Add a vault class for a team
 * @param {string} teamId - ID of the team
 * @param {string} vaultName - Name of the vault class
 * @returns {Promise<Object>} Response with status_code and vault object
 */
const addTeamVaultClass = async (teamId, vaultName) => {
  logger.info('addTeamVaultClass called', { teamId, vaultName });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!vaultName) {
    return { status_code: 400, content: { detail: 'vaultName is required' } };
  }

  const resp = await request('/api/clipvault-service/teams/vaults/add-vault-class', {
    method: 'POST',
    body: JSON.stringify({ teamId, vaultName }),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.vault || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    vaultId: content.vaultId || content.vault_id || content.id,
    vaultName: content.vaultName || content.vault_name || content.name || vaultName,
    teamId: content.teamId || content.team_id || teamId,
    customerId: null,
    ...content
  };

  logger.info('addTeamVaultClass: Completed', { status: resp.status_code, vaultId: normalized.vaultId });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Add an item to team vault
 * @param {string} teamId - ID of the team
 * @param {string} vaultId - ID of the vault
 * @param {string|null} text - Text content for the item
 * @param {Array<string>} imagePaths - Array of image blob paths
 * @returns {Promise<Object>} Response with status_code and item object
 */
const addTeamVaultItem = async (teamId, vaultId, text = null, imagePaths = []) => {
  logger.info('addTeamVaultItem called', { teamId, vaultId, text, imagePaths });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!vaultId) {
    return { status_code: 400, content: { detail: 'vaultId is required' } };
  }

  const resp = await request('/api/clipvault-service/teams/vaults/add-item', {
    method: 'POST',
    body: JSON.stringify({ 
      teamId, 
      vaultId, 
      text: text || null, 
      imagePaths: Array.isArray(imagePaths) ? imagePaths : [] 
    }),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  const candidate = content.item || content.content || content.data || content;

  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  const normalized = {
    itemId: content.itemId || content.item_id || content.id,
    vaultId: content.vaultId || content.vault_id || vaultId,
    text: content.text || text || null,
    Images: Array.isArray(content.Images) ? content.Images : (Array.isArray(content.images) ? content.images : imagePaths),
    teamId: content.teamId || content.team_id || teamId,
    customerId: null,
    ...content
  };

  logger.info('addTeamVaultItem: Completed', { status: resp.status_code, itemId: normalized.itemId });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Add an image to team vault item
 * @param {string} teamId - ID of the team
 * @param {string} itemId - ID of the vault item
 * @param {string} imageBlobPath - Blob path of the image
 * @returns {Promise<Object>} Response with status_code and image object
 */
const addTeamVaultImage = async (teamId, itemId, imageBlobPath) => {
  logger.info('addTeamVaultImage called', { teamId, itemId, imageBlobPath });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!itemId) {
    return { status_code: 400, content: { detail: 'itemId is required' } };
  }
  
  if (!imageBlobPath) {
    return { status_code: 400, content: { detail: 'imageBlobPath is required' } };
  }

  const resp = await request('/api/clipvault-service/teams/vaults/add-image', {
    method: 'POST',
    body: JSON.stringify({ teamId, itemId, imageBlobPath }),
  });

  logger.info('addTeamVaultImage: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Get signed URL for uploading image to team vault
 * @param {string} teamId - ID of the team
 * @param {string} blobFilePath - Blob file path for the upload
 * @returns {Promise<Object>} Response with status_code and signed URL
 */
const getTeamSignedUploadUrl = async (teamId, blobFilePath) => {
  logger.info('getTeamSignedUploadUrl called', { teamId, blobFilePath });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!blobFilePath) {
    return { status_code: 400, content: { detail: 'blobFilePath is required' } };
  }

  const resp = await request(`/api/clipvault-service/teams/vaults/get-signed-upload-url?teamId=${encodeURIComponent(teamId)}&blobFilePath=${encodeURIComponent(blobFilePath)}`, {
    method: 'GET',
  });

  logger.info('getTeamSignedUploadUrl: Completed', { status: resp.status_code });
  return resp;
};

/**
 * Get image details by ID for team vault
 * @param {string} teamId - ID of the team
 * @param {string} imageId - ID of the image
 * @returns {Promise<Object>} Response with status_code and image object
 */
const getTeamImageById = async (teamId, imageId) => {
  logger.info('getTeamImageById called', { teamId, imageId });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!imageId) {
    return { status_code: 400, content: { detail: 'imageId is required' } };
  }

  const resp = await request(`/api/clipvault-service/teams/vaults/get-image-by-id?teamId=${encodeURIComponent(teamId)}&imageId=${encodeURIComponent(imageId)}`, {
    method: 'GET',
  });

  if (!resp || resp.status_code !== 200) return resp;

  let content = resp.content || {};
  const normalized = {
    imageId: content.imageId || content.image_id || content.id || imageId,
    imageBlobPath: content.imageBlobPath || content.image_blob_path || '',
    itemId: content.itemId || content.item_id || '',
    ...content
  };

  logger.info('getTeamImageById: Completed', { status: resp.status_code });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Get image details by blob path for team vault
 * @param {string} teamId - ID of the team
 * @param {string} imageBlobPath - Blob path of the image
 * @returns {Promise<Object>} Response with status_code and image object
 */
const getTeamImageByBlobPath = async (teamId, imageBlobPath) => {
  logger.info('getTeamImageByBlobPath called', { teamId, imageBlobPath });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!imageBlobPath) {
    return { status_code: 400, content: { detail: 'imageBlobPath is required' } };
  }

  const resp = await request(`/api/clipvault-service/teams/vaults/get-image-by-blob-path?teamId=${encodeURIComponent(teamId)}&imageBlobPath=${encodeURIComponent(imageBlobPath)}`, {
    method: 'GET',
  });

  if (!resp || resp.status_code !== 200) return resp;

  let content = resp.content || {};
  const normalized = {
    imageId: content.imageId || content.image_id || content.id || '',
    imageBlobPath: content.imageBlobPath || content.image_blob_path || imageBlobPath,
    itemId: content.itemId || content.item_id || '',
    ...content
  };

  logger.info('getTeamImageByBlobPath: Completed', { status: resp.status_code });
  return { status_code: resp.status_code, content: normalized };
};

/**
 * Store image metadata for team vault
 * @param {string} teamId - ID of the team
 * @param {string} imageBlobPath - Blob path of the image
 * @param {string} itemId - ID of the vault item
 * @returns {Promise<Object>} Response with status_code
 */
const storeTeamImageMetadata = async (teamId, imageBlobPath, itemId) => {
  logger.info('storeTeamImageMetadata called', { teamId, imageBlobPath, itemId });
  
  if (!teamId) {
    return { status_code: 400, content: { detail: 'teamId is required' } };
  }
  
  if (!imageBlobPath) {
    return { status_code: 400, content: { detail: 'imageBlobPath is required' } };
  }
  
  if (!itemId) {
    return { status_code: 400, content: { detail: 'itemId is required' } };
  }

  const resp = await request('/api/clipvault-service/teams/vaults/store-image-metadata', {
    method: 'POST',
    body: JSON.stringify({ teamId, imageBlobPath, itemId }),
  });

  logger.info('storeTeamImageMetadata: Completed', { status: resp.status_code });
  return resp;
};

// ============================================================================
// EXPORTS
// ============================================================================

// Vault Class exports
export { addVaultClass };

// Vault Item exports
export { addVaultItem };

// Vault Image exports
export { 
  addVaultImage, 
  storeImageMetadata,
  getSignedUploadUrl,
  getImageById,
  getImageByBlobPath
};

// Team Vault Management exports
export {
  addTeamVaultClass,
  addTeamVaultItem,
  addTeamVaultImage,
  getTeamSignedUploadUrl,
  getTeamImageById,
  getTeamImageByBlobPath,
  storeTeamImageMetadata
};

