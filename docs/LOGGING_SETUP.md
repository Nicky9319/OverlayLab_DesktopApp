# Renderer Process Logging Setup

## Overview
This document explains the logging infrastructure added to capture renderer process events in production for debugging purposes.

## Architecture

### Components

1. **Main Process Logger** (`logger.js`)
   - Handles file-based logging for the main Electron process
   - Writes logs to: `%APPDATA%/LeadFlow/logs/main-process.log` (Windows)
   - Uses `electron-log` library

2. **Renderer Logger** (`src/utils/rendererLogger.js`)
   - Sends logs from renderer process to main process via IPC
   - Logs to console in development mode
   - Always sends logs to main process for file logging (production & development)

3. **IPC Bridge** (`preload.js` + `main.js`)
   - `preload.js`: Exposes `electronAPI.logToMain()` method
   - `main.js`: Handles `renderer-log` IPC channel and writes to file

## Usage

### In Renderer Process Services/Components

```javascript
// Import the logger utility
import { createLogger } from '../utils/rendererLogger';

// Create a logger instance for your component
const logger = createLogger('ComponentName');

// Use logger methods
logger.info('User action', { userId: 123 });
logger.debug('Processing data', { count: 50 });
logger.warn('Unexpected state', { state: 'unknown' });
logger.error('API call failed', { error: error.message, stack: error.stack });
```

### Log Levels

- **info**: General information, important events
- **debug**: Detailed debugging information
- **warn**: Warning messages, non-critical issues
- **error**: Error messages, exceptions

### Current Implementation

The following services now have comprehensive logging:

1. **leadsService.js**
   - `getAllLeads()`: Logs request/response, data parsing
   - `addLead()`: Logs file upload process, responses
   - `deleteLead()`: Logs delete operations, fallback attempts
   - `request()`: Logs all HTTP requests/responses

## Log Output

### Development Mode
- Logs appear in browser console
- Logs are also sent to main process file

### Production Mode
- No console output (console may not be available)
- All logs written to: `%APPDATA%/LeadFlow/logs/main-process.log`

### Log Format in File
```
[RENDERER:LeadsService] deleteLead called { leadId: 'xxx', bucketId: 'yyy' }
[RENDERER:LeadsService] deleteLead: Making DELETE request with body { lead_id: 'xxx', bucket_id: 'yyy' }
[RENDERER:LeadsService] Response from /api/main-service/leads/delete-lead: { status: 200, content: {...} }
```

## Benefits

1. **Production Debugging**: Capture errors and events in production builds
2. **Performance Monitoring**: Track API call timing and success rates
3. **User Support**: Reproduce issues from production logs
4. **Development**: See detailed flow without console.log hunting

## Best Practices

1. **Use Appropriate Log Levels**: 
   - `info` for major events
   - `debug` for detailed traces
   - `warn` for recoverable issues
   - `error` for exceptions

2. **Include Context**: Always include relevant data
   ```javascript
   logger.error('Failed to delete lead', { 
     leadId, 
     bucketId, 
     error: error.message 
   });
   ```

3. **Avoid Sensitive Data**: Don't log passwords, tokens, or PII

4. **Keep Console Logs**: Maintain console.log for development visibility while adding logger for production

## Troubleshooting

### Logs Not Appearing in File
1. Check if `electronAPI.logToMain` is available:
   ```javascript
   console.log('Logger available:', !!window.electronAPI?.logToMain);
   ```

2. Verify IPC handler is registered in main.js:
   ```javascript
   ipcMain.handle('renderer-log', ...)
   ```

3. Check log file location:
   - Windows: `%APPDATA%/LeadFlow/logs/main-process.log`
   - macOS: `~/Library/Logs/LeadFlow/main-process.log`
   - Linux: `~/.config/LeadFlow/logs/main-process.log`

### Performance Concerns
- Logging is asynchronous and doesn't block the UI
- IPC calls are fast (<1ms typically)
- File writes are handled by electron-log efficiently

## Future Enhancements

1. **Log Rotation**: Implement automatic log file rotation
2. **Log Levels Config**: Allow users to configure log verbosity
3. **Remote Logging**: Send critical errors to remote monitoring service
4. **Log Viewer**: Add in-app log viewer for support purposes
