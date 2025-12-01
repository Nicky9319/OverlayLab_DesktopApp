import React from 'react';
import { themeColors } from '../common/utils/colors';

const ClipVaultOverlay = () => {
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
      
      {/* Vault/Folder Button */}
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
        {/* Folder/Vault Icon SVG */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4Z"
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
        Clip Vault will be available soon
      </div>
    </div>
  );
};

export default ClipVaultOverlay;


