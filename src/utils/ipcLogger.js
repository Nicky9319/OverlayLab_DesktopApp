const logger = require('../../logger');

// IPC Event Logger - automatically logs all IPC events
class IPCLogger {
  constructor() {
    this.loggedChannels = new Set();
  }

  // Log IPC handle registration
  logHandleRegistration(channel) {
    if (!this.loggedChannels.has(channel)) {
      logger.debug(`IPC Handle registered: ${channel}`);
      this.loggedChannels.add(channel);
    }
  }

  // Log IPC event
  logIPCEvent(channel, direction, data = null) {
    const sanitizedData = this.sanitizeData(data);
    logger.debug(`IPC ${direction}: ${channel}`, sanitizedData);
  }

  // Sanitize sensitive data before logging
  sanitizeData(data) {
    if (!data) return null;
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    const sanitized = { ...data };
    
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  // Wrap IPC handlers to automatically log events
  wrapHandler(channel, handler) {
    return async (event, ...args) => {
      try {
        this.logIPCEvent(channel, 'REQUEST', args);
        const result = await handler(event, ...args);
        this.logIPCEvent(channel, 'RESPONSE', { success: true, result });
        return result;
      } catch (error) {
        this.logIPCEvent(channel, 'ERROR', { error: error.message, stack: error.stack });
        throw error;
      }
    };
  }
}

const ipcLogger = new IPCLogger();

module.exports = ipcLogger;
