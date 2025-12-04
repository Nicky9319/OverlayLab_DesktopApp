// Centralized API configuration
// Single source of truth for all service URLs based on ENV defined in envConfig.js
import { ENV } from './envConfig';

// Map of service URLs per environment
const SERVICE_URLS = {
  development: {
    LEADFLOW_SERVICE_URL: 'https://leadflow.api.overlaylab.studio',
    AUTH_SERVICE_URL: 'https://api.overlaylab.studio',
    CLIPVAULT_SERVICE_URL: 'https://clipvault.api.overlaylab.studio',
    AIRTYPE_SERVICE_URL: 'https://api.overlaylab.studio',
  },
  production: {
    LEADFLOW_SERVICE_URL: 'https://leadflow.api.overlaylab.studio',
    AUTH_SERVICE_URL: 'https://api.overlaylab.studio',
    CLIPVAULT_SERVICE_URL: 'https://clipvault.api.overlaylab.studio',
    AIRTYPE_SERVICE_URL: 'https://api.overlaylab.studio',
  }
};


const CLERK_PUBLISHABLE_KEY = {
  development: "pk_test_Zmx1ZW50LWJlbmdhbC05Mi5jbGVyay5hY2NvdW50cy5kZXYk",
  production: "pk_live_Y2xlcmsub3ZlcmxheWxhYi5zdHVkaW8k"
}

// Resolve active environment config (defaults to production if unknown)
const ACTIVE = SERVICE_URLS[ENV] || SERVICE_URLS.production;

// Export a single config object and direct named exports for convenience
export const API_CONFIG = {
  LEADFLOW_SERVICE_URL: ACTIVE.LEADFLOW_SERVICE_URL,
  AUTH_SERVICE_URL: ACTIVE.AUTH_SERVICE_URL,
  CLIPVAULT_SERVICE_URL: ACTIVE.CLIPVAULT_SERVICE_URL,
  AIRTYPE_SERVICE_URL: ACTIVE.AIRTYPE_SERVICE_URL,
  CLERK_PUBLISHABLE_KEY: CLERK_PUBLISHABLE_KEY[ENV] || CLERK_PUBLISHABLE_KEY.production
};

export const LEADFLOW_API_URL = API_CONFIG.LEADFLOW_SERVICE_URL;
export const AUTH_API_URL = API_CONFIG.AUTH_SERVICE_URL;
export const CLIPVAULT_API_URL = API_CONFIG.CLIPVAULT_SERVICE_URL;
export const AIRTYPE_API_URL = API_CONFIG.AIRTYPE_SERVICE_URL;
