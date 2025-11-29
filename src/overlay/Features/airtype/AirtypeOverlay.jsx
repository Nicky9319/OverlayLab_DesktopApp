import React from 'react';
import { themeColors } from '../common/utils/colors';

const AirtypeOverlay = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      {/* Translucent black background behind the widget */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '200px',
          height: '200px',
          borderRadius: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', // Translucent black background
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: -1,
        }}
      />
      
      {/* Mic Button */}
      <button
        disabled
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: themeColors.tertiaryBackground,
          border: `2px solid ${themeColors.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'not-allowed',
          opacity: 0.5,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.5';
        }}
      >
        {/* Microphone Icon SVG */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
            fill={themeColors.mutedText}
          />
          <path
            d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z"
            fill={themeColors.mutedText}
          />
          <path
            d="M11 22H13V19H11V22Z"
            fill={themeColors.mutedText}
          />
        </svg>
      </button>

      {/* Upcoming Feature Label */}
      <div
        style={{
          marginTop: '16px',
          color: themeColors.mutedText,
          fontSize: '14px',
          fontWeight: '500',
          textAlign: 'center',
        }}
      >
        Upcoming Feature
      </div>
      <div
        style={{
          marginTop: '4px',
          color: themeColors.mutedText,
          fontSize: '12px',
          textAlign: 'center',
          opacity: 0.7,
        }}
      >
        Voice recording will be available soon
      </div>
    </div>
  );
};

export default AirtypeOverlay;

