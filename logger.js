const path = require('path');
const fs = require('fs');

// Check if we're in an Electron environment
let log;
try {
  log = require('electron-log');
} catch (error) {
  // Fallback for Node.js environment
  log = {
    info: console.log,
    debug: console.log,
    warn: console.warn,
    error: console.error,
    transports: {
      file: {
        level: 'info',
        resolvePathFn: () => null
      },
      console: {
        level: 'info'
      }
    }
  };
}

class Logger {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = new Date();
    
    // Configure electron-log
    log.transports.file.level = 'info';
    log.transports.console.level = 'info';
    
    // Set log file path only in Electron environment
    if (process.versions && process.versions.electron) {
      const logDir = path.join(process.env.APPDATA || process.env.HOME || '.', 'LeadFlow', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      log.transports.file.resolvePathFn = () => path.join(logDir, 'main-process.log');
    }
    
    // Log session start
    this.logSessionStart();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  logSessionStart() {
    const separator = '='.repeat(80);
    const timestamp = new Date().toISOString();
    const sessionInfo = `
${separator}
DONNA AI DESKTOP APP - MAIN PROCESS SESSION STARTED
Session ID: ${this.sessionId}
Start Time: ${timestamp}
Platform: ${process.platform}
Node Version: ${process.version}
Electron Version: ${process.versions?.electron || 'N/A'}
${separator}
`;
    log.info(sessionInfo);
  }

  logSessionEnd() {
    const separator = '='.repeat(80);
    const endTime = new Date();
    const duration = endTime - this.startTime;
    const sessionInfo = `
${separator}
DONNA AI DESKTOP APP - MAIN PROCESS SESSION ENDED
Session ID: ${this.sessionId}
End Time: ${endTime.toISOString()}
Duration: ${this.formatDuration(duration)}
${separator}
`;
    log.info(sessionInfo);
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  info(message, data = null) {
    const logMessage = this.formatMessage('INFO', message, data);
    log.info(logMessage);
  }

  debug(message, data = null) {
    const logMessage = this.formatMessage('DEBUG', message, data);
    log.debug(logMessage);
  }

  warn(message, data = null) {
    const logMessage = this.formatMessage('WARN', message, data);
    log.warn(logMessage);
  }

  error(message, error = null) {
    const logMessage = this.formatMessage('ERROR', message, error);
    log.error(logMessage);
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const sessionPrefix = `[${this.sessionId}]`;
    const levelPrefix = `[${level}]`;
    
    let formattedMessage = `${sessionPrefix} ${levelPrefix} ${timestamp} - ${message}`;
    
    if (data) {
      if (data instanceof Error) {
        formattedMessage += `\nError: ${data.message}\nStack: ${data.stack}`;
      } else if (typeof data === 'object') {
        formattedMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
      } else {
        formattedMessage += `\nData: ${data}`;
      }
    }
    
    return formattedMessage;
  }

  // Convenience methods for specific use cases
  logWindowEvent(event, windowName, details = null) {
    this.info(`Window Event: ${event}`, { window: windowName, details });
  }

  logIPCEvent(channel, direction, data = null) {
    this.debug(`IPC ${direction}: ${channel}`, data);
  }

  logSystemEvent(event, details = null) {
    this.info(`System Event: ${event}`, details);
  }

  logWSLCommand(command, result = null) {
    this.debug(`WSL Command: ${command}`, result);
  }

  logDockerEvent(event, details = null) {
    this.info(`Docker Event: ${event}`, details);
  }

  logAgentEvent(event, agentId, details = null) {
    this.info(`Agent Event: ${event}`, { agentId, details });
  }

  // Method to get log file path
  getLogFilePath() {
    if (log.transports.file.resolvePathFn) {
      return log.transports.file.resolvePathFn();
    }
    return 'console-only';
  }

  // Method to clear old logs (keep last 7 days)
  async cleanupOldLogs() {
    try {
      const logFilePath = this.getLogFilePath();
      if (logFilePath === 'console-only') {
        return; // No file logging in Node.js environment
      }
      
      const logDir = path.dirname(logFilePath);
      const files = fs.readdirSync(logDir);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < sevenDaysAgo) {
          fs.unlinkSync(filePath);
          this.info(`Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      this.error('Failed to cleanup old logs', error);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Handle process exit to log session end
process.on('exit', () => {
  logger.logSessionEnd();
});

process.on('SIGINT', () => {
  logger.logSessionEnd();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.logSessionEnd();
  process.exit(0);
});

module.exports = logger;
