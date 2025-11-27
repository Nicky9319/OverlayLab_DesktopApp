// Auth Service - API client for authentication endpoints
// Base URL resolved from centralized API config
import { AUTH_API_URL } from '../config/api';

const BASE_URL = AUTH_API_URL;

// Import renderer logger
import { createLogger } from '../utils/rendererLogger';
const logger = createLogger('AuthService');

/**
 * Authenticate Clerk session with backend and create user if needed
 * Calls /api/auth-service/authenticate_customer_id endpoint
 * 
 * @param {string} token - Clerk session token from useAuth().getToken()
 * @returns {Promise<Object>} Response with { authenticated: boolean, customerId: string, message: string }
 */
export const authenticateCustomerId = async (token) => {
  if (!token) {
    logger.error('authenticateCustomerId: No token provided');
    throw new Error('Missing Clerk token');
  }

  const url = `${BASE_URL}/api/auth-service/authenticate_customer_id`;
  
  logger.info('Authenticating customer ID with backend', { url, baseUrl: BASE_URL });
  console.log('[AuthService] Calling authenticate_customer_id:', { url, hasToken: !!token });

  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('[AuthService] Making POST request to:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({}), // Empty body as per backend API
      mode: 'cors',
      credentials: 'omit'
    });

    console.log('[AuthService] Response status:', response.status, response.statusText);

    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      logger.error('Failed to parse response as JSON', { text, parseError });
      throw new Error(`Invalid response format: ${text}`);
    }

    if (!response.ok) {
      const detail = data?.detail || text || `HTTP ${response.status}`;
      logger.error('Backend authentication failed', { 
        status: response.status, 
        detail,
        response: data 
      });
      throw new Error(`Authentication failed: ${detail}`);
    }

    if (data && data.authenticated) {
      logger.info('Backend authentication successful', { 
        customerId: data.customerId,
        message: data.message 
      });
      console.log('[AuthService] ✅ Backend authentication successful:', {
        authenticated: data.authenticated,
        customerId: data.customerId,
        message: data.message
      });
      return data; // { authenticated: true, customerId: string, message: string }
    } else {
      logger.warn('Backend authentication returned not authenticated', { data });
      console.warn('[AuthService] ⚠️ Backend authentication returned not authenticated:', data);
      throw new Error('Authentication failed: User not authenticated');
    }
  } catch (error) {
    logger.error('Error authenticating with backend', { 
      error: error.message, 
      stack: error.stack 
    });
    
    // Re-throw with more context if it's not already an Error
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Backend authentication error: ${String(error)}`);
    }
  }
};

export default {
  authenticateCustomerId,
};

