import React from 'react';

const AuthTitlebar = () => {
  const handleClose = () => {
    console.log('Close button clicked - closing application');
    // Close the entire application
    if (window.electronAPI && window.electronAPI.quitApp) {
      window.electronAPI.quitApp();
    } else if (window.electronAPI && window.electronAPI.closeApp) {
      // If quitApp doesn't exist, use closeApp which should quit if it's the last window
      window.electronAPI.closeApp();
    } else {
      console.warn('Electron API not available. Cannot close app.');
      // Fallback for development
      if (window.close) {
        window.close();
      }
    }
  };

  const handleMinimize = () => {
    console.log('Minimize button clicked');
    if (window.electronAPI && window.electronAPI.minimizeApp) {
      window.electronAPI.minimizeApp();
    } else {
      console.warn('Electron API not available. Cannot minimize app.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '32px',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '12px',
        paddingRight: '12px',
        zIndex: 10000,
        WebkitAppRegion: 'drag', // Make the titlebar draggable
        borderBottom: '1px solid #1C1C1E'
      }}
    >
      {/* Left side - Window Control Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', WebkitAppRegion: 'no-drag' }}>
        {/* Close Button (Red) */}
        <button
          onClick={handleClose}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#FF3B30',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
            WebkitAppRegion: 'no-drag',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#D70015';
            const svg = e.target.querySelector('svg');
            if (svg) svg.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#FF3B30';
            const svg = e.target.querySelector('svg');
            if (svg) svg.style.opacity = '0';
          }}
        >
          {/* X icon that appears on hover */}
          <svg
            style={{
              width: '6px',
              height: '6px',
              opacity: 0,
              transition: 'opacity 0.15s',
              color: '#FFFFFF',
              pointerEvents: 'none'
            }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Minimize Button (Yellow) */}
        <button
          onClick={handleMinimize}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#FF9500',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s',
            WebkitAppRegion: 'no-drag',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#E6850E';
            const svg = e.target.querySelector('svg');
            if (svg) svg.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#FF9500';
            const svg = e.target.querySelector('svg');
            if (svg) svg.style.opacity = '0';
          }}
        >
          {/* Minus icon that appears on hover */}
          <svg
            style={{
              width: '6px',
              height: '6px',
              opacity: 0,
              transition: 'opacity 0.15s',
              color: '#FFFFFF',
              pointerEvents: 'none'
            }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AuthTitlebar;

