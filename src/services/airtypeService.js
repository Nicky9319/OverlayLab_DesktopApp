// AirType Service - Voice-to-text functionality
// This service handles voice recognition and transcription

// Base URL resolved from centralized API config
import { AIRTYPE_API_URL } from '../config/api';

const BASE_URL = AIRTYPE_API_URL;

// Import renderer logger
import { createLogger } from '../utils/rendererLogger';
const logger = createLogger('AirTypeService');

// Import token provider
import { getClerkToken } from '../utils/clerkTokenProvider';

/**
 * Send audio chunk to server for streaming transcription
 * @param {Blob} audioChunk - Audio chunk blob
 * @param {string} sessionId - Unique session identifier
 * @param {boolean} isFinal - Whether this is the final chunk
 * @returns {Promise<Object>} Response with status_code and message
 */
const sendAudioChunk = async (audioChunk, sessionId, isFinal = false, abortSignal = null) => {
  logger.debug('sendAudioChunk called', { chunkSize: audioChunk?.size, sessionId, isFinal });
  
  if (!audioChunk || !(audioChunk instanceof Blob)) {
    logger.error('Invalid audio chunk provided');
    return { 
      status_code: 400, 
      content: { success: false, error: 'Invalid audio chunk provided' } 
    };
  }
  
  // Get Clerk token for authentication
  const token = await getClerkToken();
  
  if (!token) {
    logger.error('No authentication token available');
    return { 
      status_code: 401, 
      content: { success: false, error: 'Authentication required' } 
    };
  }
  
  // Create FormData for multipart/form-data upload
  const formData = new FormData();
  formData.append('audio', audioChunk, 'chunk.webm');
  formData.append('session_id', sessionId);
  formData.append('is_final', isFinal ? 'true' : 'false');
  
  // Build headers with Authorization
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const url = `${BASE_URL}/api/airtype-service/transcribe-chunk`;
  
  try {
    const fetchOptions = {
      method: 'POST',
      headers: headers,
      body: formData,
      mode: 'cors',
      credentials: 'omit'
    };
    
    // Add abort signal if provided
    if (abortSignal) {
      fetchOptions.signal = abortSignal;
    }
    
    const response = await fetch(url, fetchOptions);
    
    let content;
    try {
      content = await response.json();
    } catch (err) {
      const textContent = await response.text();
      logger.warn(`Non-JSON response from ${url}`, { status: response.status, text: textContent.substring(0, 200) });
      content = { success: false, error: textContent };
    }
    
    if (response.ok && content.success) {
      return { 
        status_code: response.status, 
        content: {
          success: true,
          transcription: content.transcription || null,
          message: content.message
        }
      };
    } else {
      return { 
        status_code: response.status, 
        content: {
          success: false,
          error: content.error || 'Chunk upload failed'
        }
      };
    }
  } catch (error) {
    // Check if error is due to abort
    if (error.name === 'AbortError') {
      logger.debug(`Request aborted for ${url}`);
      return { 
        status_code: 499, 
        content: { 
          success: false,
          error: 'Request cancelled' 
        } 
      };
    }
    logger.error(`Network error while calling ${url}`, { error: error.message });
    return { 
      status_code: 503, 
      content: { 
        success: false,
        error: `Network error: ${error.message}` 
      } 
    };
  }
};

/**
 * Transcribe voice audio to text
 * @param {Blob} audioBlob - Audio blob from MediaRecorder
 * @returns {Promise<Object>} Response with status_code and transcription text
 */
const transcribeVoice = async (audioBlob) => {
  logger.info('transcribeVoice called', { blobSize: audioBlob?.size, blobType: audioBlob?.type });
  
  if (!audioBlob || !(audioBlob instanceof Blob)) {
    logger.error('Invalid audio blob provided');
    return { 
      status_code: 400, 
      content: { success: false, error: 'Invalid audio blob provided' } 
    };
  }
  
  // Get Clerk token for authentication
  const token = await getClerkToken();
  
  if (!token) {
    logger.error('No authentication token available');
    return { 
      status_code: 401, 
      content: { success: false, error: 'Authentication required' } 
    };
  }
  
  // Create FormData for multipart/form-data upload
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  
  // Build headers with Authorization
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const url = `${BASE_URL}/api/airtype-service/transcribe-voice`;
  
  try {
    logger.debug(`Making POST request to: ${url}`, { 
      hasToken: !!token,
      audioSize: audioBlob.size,
      audioType: audioBlob.type
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: formData,
      mode: 'cors',
      credentials: 'omit'
    });
    
    let content;
    try {
      content = await response.json();
    } catch (err) {
      const textContent = await response.text();
      logger.warn(`Non-JSON response from ${url}`, { status: response.status, text: textContent.substring(0, 200) });
      content = { success: false, error: textContent };
    }
    
    logger.debug(`Response from ${url}:`, { status: response.status, hasTranscription: !!content.transcription });
    
    if (response.ok && content.success) {
      logger.info('Transcription successful', { transcriptionLength: content.transcription?.length });
      return { 
        status_code: response.status, 
        content: {
          success: true,
          transcription: content.transcription
        }
      };
    } else {
      logger.warn('Transcription failed', { status: response.status, error: content.error });
      return { 
        status_code: response.status, 
        content: {
          success: false,
          error: content.error || 'Transcription failed'
        }
      };
    }
  } catch (error) {
    logger.error(`Network error while calling ${url}`, { error: error.message, stack: error.stack });
    return { 
      status_code: 503, 
      content: { 
        success: false,
        error: `Network error: ${error.message}` 
      } 
    };
  }
};

/**
 * Initialize AirType service
 * @returns {Promise<Object>} Response with status_code and content
 */
const initializeAirType = async () => {
  logger.info('initializeAirType called');
  return { status_code: 200, content: { message: 'AirType service initialized' } };
};

/**
 * Start voice recognition (placeholder - actual recording handled in overlay)
 * @returns {Promise<Object>} Response with status_code and content
 */
const startVoiceRecognition = async () => {
  logger.info('startVoiceRecognition called');
  return { status_code: 200, content: { message: 'Voice recognition started' } };
};

/**
 * Stop voice recognition (placeholder - actual recording handled in overlay)
 * @returns {Promise<Object>} Response with status_code and content
 */
const stopVoiceRecognition = async () => {
  logger.info('stopVoiceRecognition called');
  return { status_code: 200, content: { message: 'Voice recognition stopped' } };
};

/**
 * Type text at cursor position (placeholder - actual typing handled via IPC)
 * @param {string} text - Text to type
 * @returns {Promise<Object>} Response with status_code and content
 */
const typeTextAtCursor = async (text) => {
  logger.info('typeTextAtCursor called', { textLength: text?.length });
  return { status_code: 200, content: { message: 'Text typed at cursor' } };
};

// ============================================================================
// EXPORTS
// ============================================================================

export { 
  initializeAirType,
  startVoiceRecognition,
  stopVoiceRecognition,
  typeTextAtCursor,
  transcribeVoice,
  sendAudioChunk
};




