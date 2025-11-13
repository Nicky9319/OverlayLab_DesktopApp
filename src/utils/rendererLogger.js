/**
 * Renderer Process Logger
 * 
 * This logger sends logs from the renderer process to the main process
 * where they are written to the log file. This ensures production logs
 * are captured even when console is not available.
 * 
 * Usage:
 *   import logger from '@/utils/rendererLogger';
 *   logger.info('ComponentName', 'Message', { data: 'optional' });
 */

class RendererLogger {
  constructor(componentName = 'UNKNOWN') {
    this.componentName = componentName;
    this.isDevelopment = import.meta.env?.DEV || process.env.NODE_ENV === 'development';
  }

  /**
   * Send log to main process and optionally console
   */
  async _log(level, message, data = null) {
    // Always log to console in development
    if (this.isDevelopment) {
      const consoleMethod = console[level] || console.log;
      if (data) {
        consoleMethod(`[${this.componentName}] ${message}`, data);
      } else {
        consoleMethod(`[${this.componentName}] ${message}`);
      }
    }

    // Always send to main process for file logging (production & development)
    try {
      if (window.electronAPI && window.electronAPI.logToMain) {
        await window.electronAPI.logToMain(level, this.componentName, message, data);
      }
    } catch (error) {
      // Fallback to console if IPC fails
      console.error('Failed to send log to main process:', error);
    }
  }

  /**
   * Log info message
   */
  info(message, data = null) {
    return this._log('info', message, data);
  }

  /**
   * Log debug message
   */
  debug(message, data = null) {
    return this._log('debug', message, data);
  }

  /**
   * Log warning message
   */
  warn(message, data = null) {
    return this._log('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message, data = null) {
    return this._log('error', message, data);
  }
}

/**
 * Create a logger instance for a specific component
 * @param {string} componentName - Name of the component/module
 * @returns {RendererLogger} Logger instance
 */
export const createLogger = (componentName) => {
  return new RendererLogger(componentName);
};

// Default export for general use
export default new RendererLogger('RENDERER');
