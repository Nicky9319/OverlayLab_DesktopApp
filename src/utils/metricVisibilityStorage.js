/**
 * Utility functions for storing metric visibility in localStorage
 * This is a frontend-only property and should not be sent to the backend
 */

const STORAGE_KEY_PREFIX = 'metric_visibility_';

/**
 * Get visibility state for a specific metric from localStorage
 * @param {string} metricId - The metric ID
 * @returns {boolean} - true if visible, false if hidden
 */
export const getMetricVisibility = (metricId) => {
  if (!metricId) return false;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${metricId}`;
    const saved = localStorage.getItem(key);
    return saved === 'true';
  } catch (error) {
    console.error(`Error reading metric visibility for ${metricId}:`, error);
    return false;
  }
};

/**
 * Set visibility state for a specific metric in localStorage
 * @param {string} metricId - The metric ID
 * @param {boolean} visible - Whether the metric should be visible
 */
export const setMetricVisibility = (metricId, visible) => {
  if (!metricId) return;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${metricId}`;
    localStorage.setItem(key, visible.toString());
  } catch (error) {
    console.error(`Error saving metric visibility for ${metricId}:`, error);
  }
};

/**
 * Get all metric visibilities from localStorage
 * @returns {Object} - Object keyed by metricId with boolean visibility values
 */
export const getAllMetricVisibilities = () => {
  const visibilities = {};
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const metricId = key.replace(STORAGE_KEY_PREFIX, '');
        visibilities[metricId] = localStorage.getItem(key) === 'true';
      }
    }
  } catch (error) {
    console.error('Error reading all metric visibilities:', error);
  }
  
  return visibilities;
};

/**
 * Remove visibility state for a specific metric (when metric is deleted)
 * @param {string} metricId - The metric ID
 */
export const removeMetricVisibility = (metricId) => {
  if (!metricId) return;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${metricId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing metric visibility for ${metricId}:`, error);
  }
};

