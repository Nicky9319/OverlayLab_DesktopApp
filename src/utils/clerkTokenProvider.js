// Clerk Token Provider Utility
// This utility provides a way to get the Clerk session token for API calls
// Since service files can't use React hooks directly, we use a global store

let tokenStore = {
  getToken: null, // Function to get token from Clerk
  currentToken: null,
  tokenExpiry: null
};

/**
 * Initialize the token provider with a function to get tokens from Clerk
 * This should be called from a React component that has access to useAuth hook
 * @param {Function} getTokenFn - Function that returns a promise resolving to the token
 */
export function initializeTokenProvider(getTokenFn) {
  if (typeof getTokenFn === 'function') {
    tokenStore.getToken = getTokenFn;
    console.log('Token provider initialized');
  } else {
    console.error('initializeTokenProvider: getTokenFn must be a function');
  }
}

/**
 * Get the current Clerk session token
 * This will call the getToken function if available, or return cached token
 * @returns {Promise<string|null>} The session token or null if not available
 */
export async function getClerkToken() {
  // If we have a getToken function, use it to get fresh token
  if (tokenStore.getToken) {
    try {
      const token = await tokenStore.getToken();
      tokenStore.currentToken = token;
      return token;
    } catch (error) {
      console.error('Error getting Clerk token:', error);
      return null;
    }
  }
  
  // Fallback to cached token if available
  if (tokenStore.currentToken) {
    return tokenStore.currentToken;
  }
  
  console.warn('Token provider not initialized or no token available');
  return null;
}

/**
 * Clear the cached token (useful on logout)
 */
export function clearToken() {
  tokenStore.currentToken = null;
  tokenStore.tokenExpiry = null;
}

export default {
  initializeTokenProvider,
  getClerkToken,
  clearToken
};

