// Centralized API configuration
// Single source of truth for all service URLs based on ENV defined in envConfig.js
import { ENV } from './envConfig';

// Map of service URLs per environment
const SERVICE_URLS = {
  development: {
    LEADFLOW_SERVICE_URL: 'http://127.0.0.1:8000',
  },
  production: {
    LEADFLOW_SERVICE_URL: 'https://leadflow.api.overlaylab.studio',
  }
};

// Resolve active environment config (defaults to production if unknown)
const ACTIVE = SERVICE_URLS[ENV] || SERVICE_URLS.production;

// Export a single config object and direct named exports for convenience
export const API_CONFIG = {
  LEADFLOW_SERVICE_URL: ACTIVE.LEADFLOW_SERVICE_URL,
};

export const LEADFLOW_API_URL = API_CONFIG.LEADFLOW_SERVICE_URL;
