import { useState, useEffect, useRef } from 'react'

const UpdateNotification = () => {
  const [updateState, setUpdateState] = useState({
    status: null, // 'checking', 'available', 'downloading', 'downloaded', 'error', 'not-available'
    version: null,
    progress: null, // { percent, transferred, total, bytesPerSecond }
    error: null,
    releaseNotes: null
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const autoDismissTimerRef = useRef(null)

  // Debug: Log component mount
  useEffect(() => {
    console.log('[UpdateNotification] Component mounted')
    return () => {
      console.log('[UpdateNotification] Component unmounted')
    }
  }, [])

  // Format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Format download speed
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s'
    return formatBytes(bytesPerSecond) + '/s'
  }

  // Setup event listeners
  useEffect(() => {
    console.log('[UpdateNotification] Component mounted, checking for electronAPI...')
    console.log('[UpdateNotification] window.electronAPI:', window.electronAPI)
    
    if (!window.electronAPI) {
      console.warn('[UpdateNotification] electronAPI not available')
      return
    }

    const { electronAPI } = window
    console.log('[UpdateNotification] electronAPI found, setting up listeners...')

    // Checking for update - don't show indicator
    electronAPI.onUpdateChecking(() => {
      setUpdateState({
        status: 'checking',
        version: null,
        progress: null,
        error: null,
        releaseNotes: null
      })
    })

    // Update available - show indicator
    electronAPI.onUpdateAvailable((data) => {
      console.log('[UpdateNotification] Update available event received:', data)
      setUpdateState({
        status: 'available',
        version: data.version,
        progress: null,
        error: null,
        releaseNotes: data.releaseNotes
      })
      // Auto-expand when update becomes available
      setIsExpanded(true)
    })

    // Update not available - don't show indicator
    electronAPI.onUpdateNotAvailable(() => {
      setUpdateState({
        status: 'not-available',
        version: null,
        progress: null,
        error: null,
        releaseNotes: null
      })
    })

    // Download progress
    electronAPI.onUpdateProgress((data) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'downloading',
        progress: {
          percent: data.percent || 0,
          transferred: data.transferred || 0,
          total: data.total || 0,
          bytesPerSecond: data.bytesPerSecond || 0
        }
      }))
      // Auto-expand when downloading starts
      if (!isExpanded) {
        setIsExpanded(true)
      }
    })

    // Update downloaded
    electronAPI.onUpdateDownloaded((data) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'downloaded',
        version: data.version,
        releaseNotes: data.releaseNotes
      }))
      setIsDownloading(false)
      // Auto-expand when download completes
      if (!isExpanded) {
        setIsExpanded(true)
      }
    })

    // Update error
    electronAPI.onUpdateError((data) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'error',
        error: data.message || 'Unknown error occurred'
      }))
      setIsDownloading(false)
    })

    // Cleanup
    return () => {
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
      if (electronAPI.removeUpdateListeners) {
        electronAPI.removeUpdateListeners()
      }
    }
  }, [isExpanded])

  // Handle download
  const handleDownload = async () => {
    if (!window.electronAPI || !window.electronAPI.downloadUpdate) {
      console.error('[UpdateNotification] downloadUpdate not available')
      return
    }

    setIsDownloading(true)
    try {
      const result = await window.electronAPI.downloadUpdate()
      if (!result.success) {
        console.error('[UpdateNotification] Download failed:', result.error)
        setIsDownloading(false)
      }
    } catch (error) {
      console.error('[UpdateNotification] Error downloading:', error)
      setIsDownloading(false)
    }
  }

  // Handle restart
  const handleRestart = async () => {
    if (window.electronAPI && window.electronAPI.restartAndInstall) {
      try {
        await window.electronAPI.restartAndInstall()
      } catch (error) {
        console.error('[UpdateNotification] Error restarting:', error)
      }
    }
  }

  // Toggle panel
  const togglePanel = () => {
    setIsExpanded(!isExpanded)
  }

  // Only show indicator when update is available, downloading, or downloaded
  const shouldShow = updateState.status === 'available' || 
                     updateState.status === 'downloading' || 
                     updateState.status === 'downloaded' ||
                     updateState.status === 'error'

  console.log('[UpdateNotification] Render check - status:', updateState.status, 'shouldShow:', shouldShow, 'electronAPI available:', !!window.electronAPI)

  // Always render the component (even if hidden) to ensure event listeners are set up
  // Only hide the visual indicator when there's no update
  if (!shouldShow) {
    // Return a hidden div to keep the component mounted and listeners active
    return <div style={{ display: 'none' }} />
  }

  const getStatusColor = () => {
    switch (updateState.status) {
      case 'error':
        return '#FF3B30'
      case 'downloaded':
        return '#34C759'
      case 'downloading':
      case 'available':
        return '#007AFF' // Match app's primary blue color
      default:
        return '#8E8E93' // Match app's secondary text color
    }
  }

  const getIndicatorIcon = () => {
    switch (updateState.status) {
      case 'available':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        )
      case 'downloading':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
          </svg>
        )
      case 'downloaded':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        )
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px'
      }}
    >
      {/* Expandable Panel */}
      {isExpanded && (
        <div
          className="rounded-lg shadow-lg border"
          style={{
            backgroundColor: '#111111', // Match app's card background
            borderColor: '#1C1C1E', // Match app's border color
            color: '#FFFFFF', // Match app's text color
            padding: '16px',
            width: '280px',
            animation: 'slideInUp 0.3s ease-out',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)' // Match app's shadow style
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 flex-1">
              <div style={{ color: getStatusColor() }}>
                {getIndicatorIcon()}
              </div>
              <h3 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                {updateState.status === 'available' && `Update available: v${updateState.version}`}
                {updateState.status === 'downloading' && `Downloading update...`}
                {updateState.status === 'downloaded' && 'Update ready!'}
                {updateState.status === 'error' && 'Update error'}
              </h3>
            </div>
            <button
              onClick={togglePanel}
              className="p-1 rounded transition-colors flex-shrink-0"
              style={{
                color: '#8E8E93', // Match app's secondary text color
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#FFFFFF'
                e.target.style.backgroundColor = 'rgba(28, 28, 30, 0.6)' // Match app's hover background
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#8E8E93'
                e.target.style.backgroundColor = 'transparent'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Progress bar for downloading */}
          {updateState.status === 'downloading' && updateState.progress && (
            <div className="mb-3">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: '#1C1C1E' }} // Match app's border/background color
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(updateState.progress.percent, 100)}%`,
                    backgroundColor: getStatusColor()
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs" style={{ color: '#8E8E93' }}>
                <span>
                  {formatBytes(updateState.progress.transferred)} / {formatBytes(updateState.progress.total)}
                </span>
                <span>{updateState.progress.percent.toFixed(1)}%</span>
                {updateState.progress.bytesPerSecond > 0 && (
                  <span>{formatSpeed(updateState.progress.bytesPerSecond)}</span>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {updateState.status === 'error' && updateState.error && (
            <p className="text-xs mb-3" style={{ color: '#FF3B30' }}>
              {updateState.error}
            </p>
          )}

          {/* Action buttons */}
          {updateState.status === 'available' && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: isDownloading ? '#1C1C1E' : '#007AFF', // Match app's primary blue
                color: '#FFFFFF',
                cursor: isDownloading ? 'not-allowed' : 'pointer',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isDownloading) {
                  e.target.style.backgroundColor = '#0056CC' // Match app's hover blue
                }
              }}
              onMouseLeave={(e) => {
                if (!isDownloading) {
                  e.target.style.backgroundColor = '#007AFF'
                }
              }}
            >
              {isDownloading ? 'Downloading...' : 'Download Update'}
            </button>
          )}

          {updateState.status === 'downloaded' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestart}
                className="flex-1 px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{
                  backgroundColor: '#007AFF', // Match app's primary blue
                  color: '#FFFFFF',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#0056CC' // Match app's hover blue
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#007AFF'
                }}
              >
                Restart Now
              </button>
              <button
                onClick={togglePanel}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  color: '#8E8E93', // Match app's secondary text color
                  border: '1px solid #1C1C1E' // Match app's border color
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#FFFFFF'
                  e.target.style.borderColor = '#2D2D2F' // Match app's hover border
                  e.target.style.backgroundColor = 'rgba(28, 28, 30, 0.6)' // Match app's hover background
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#8E8E93'
                  e.target.style.borderColor = '#1C1C1E'
                  e.target.style.backgroundColor = 'transparent'
                }}
              >
                Later
              </button>
            </div>
          )}
        </div>
      )}

      {/* Minimal Indicator Icon */}
      <button
        onClick={togglePanel}
        className="rounded-full shadow-lg border transition-all relative"
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#111111', // Match app's card background
          borderColor: '#1C1C1E', // Match app's border color
          color: getStatusColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          animation: updateState.status === 'available' ? 'pulse 2s ease-in-out infinite' : 'none',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)' // Match app's shadow style
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(28, 28, 30, 0.8)' // Match app's hover background
          e.target.style.transform = 'scale(1.1)'
          e.target.style.borderColor = '#2D2D2F' // Match app's hover border
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#111111'
          e.target.style.transform = 'scale(1)'
          e.target.style.borderColor = '#1C1C1E'
        }}
        title={
          updateState.status === 'available' && 'Update available - Click to view'
          || updateState.status === 'downloading' && 'Downloading update...'
          || updateState.status === 'downloaded' && 'Update ready - Click to install'
          || updateState.status === 'error' && 'Update error - Click to view'
        }
      >
        {getIndicatorIcon()}
        {/* Progress indicator ring for downloading */}
        {updateState.status === 'downloading' && updateState.progress && (
          <svg
            width="40"
            height="40"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: 'rotate(-90deg)',
              pointerEvents: 'none'
            }}
          >
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke="#1C1C1E" // Match app's border color
              strokeWidth="2"
            />
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke={getStatusColor()}
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - updateState.progress.percent / 100)}`}
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.7); // Match app's primary blue with pulse
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 8px rgba(0, 122, 255, 0); // Match app's primary blue with pulse
          }
        }
      `}</style>
    </div>
  )
}

export default UpdateNotification

