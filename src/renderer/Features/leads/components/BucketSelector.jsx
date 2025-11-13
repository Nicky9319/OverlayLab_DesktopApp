import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const BucketSelector = ({ 
  buckets = [], 
  currentBucketId, 
  onBucketChange, 
  leadId, 
  disabled = false,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter out the current bucket from the list
  const availableBuckets = buckets.filter(bucket => bucket.id !== currentBucketId);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const calculatePosition = () => {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Position the dropdown right at the button's position
        let top = buttonRect.top;
        let left = buttonRect.left;
        
        // If dropdown would go off bottom of screen, adjust top position
        if (top + 300 > viewportHeight) { // 300px estimated dropdown height
          top = viewportHeight - 300 - 16; // 16px margin from bottom
        }
        
        // If dropdown would go off right side of screen, adjust left position
        if (left + 250 > viewportWidth) { // 250px estimated dropdown width
          left = viewportWidth - 250 - 16; // 16px margin from edge
        }
        
        // Ensure dropdown doesn't go off left side
        if (left < 16) {
          left = 16;
        }
        
        // Ensure dropdown doesn't go off top side
        if (top < 16) {
          top = 16;
        }
        
        return { top, left };
      };

      // Set initial position
      setDropdownPosition(calculatePosition());

      // Recalculate position on scroll/resize to prevent glitching
      const handleScroll = () => {
        if (isOpen) {
          setDropdownPosition(calculatePosition());
        }
      };

      const handleResize = () => {
        if (isOpen) {
          setDropdownPosition(calculatePosition());
        }
      };

      // Add event listeners
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      // Cleanup
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && 
          buttonRef.current && 
          dropdownRef.current && 
          !buttonRef.current.contains(event.target) && 
          !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleBucketSelect = async (targetBucketId) => {
    if (disabled || isLoading || !onBucketChange) return;
    
    setIsLoading(true);
    try {
      await onBucketChange(leadId, targetBucketId, currentBucketId);
    } catch (error) {
      console.error('Error moving lead to bucket:', error);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const getCurrentBucketName = () => {
    const currentBucket = buckets.find(bucket => bucket.id === currentBucketId);
    return currentBucket ? currentBucket.name : 'Unknown Bucket';
  };

  if (availableBuckets.length === 0) {
    return (
      <div className={`text-xs text-[#8E8E93] ${className}`}>
        No other buckets available
      </div>
    );
  }

  return (
    <>
      {/* Current Bucket Display */}
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-xs text-[#8E8E93]">Bucket:</span>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-[#E5E5E7] bg-[#1C1C1E] px-2 py-1 rounded">
            {getCurrentBucketName()}
          </span>
          {!disabled && (
            <button
              ref={buttonRef}
              onClick={() => setIsOpen(!isOpen)}
              disabled={isLoading}
              className="p-1 text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#1C1C1E] rounded transition-colors disabled:opacity-50"
              title="Move to different bucket"
            >
              {isLoading ? (
                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Floating Dropdown Menu - Using Portal to render outside DOM hierarchy */}
      {isOpen && createPortal(
        <>
          {/* Custom scrollbar styles */}
          <style>
            {`
              .bucket-selector-scroll::-webkit-scrollbar {
                width: 4px;
              }
              .bucket-selector-scroll::-webkit-scrollbar-track {
                background: transparent;
              }
              .bucket-selector-scroll::-webkit-scrollbar-thumb {
                background: #2D2D2F;
                border-radius: 2px;
              }
              .bucket-selector-scroll::-webkit-scrollbar-thumb:hover {
                background: #3D3D3F;
              }
              .bucket-selector-scroll {
                scrollbar-width: thin;
                scrollbar-color: #2D2D2F transparent;
              }
            `}
          </style>
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-[#1C1C1E] border border-[#2D2D2F] rounded-xl shadow-2xl min-w-[200px] max-w-[240px] backdrop-blur-sm"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              maxHeight: '240px',
              position: 'fixed',
              transform: 'none'
            }}
          >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#2D2D2F]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#E5E5E7]">Move Lead</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#2D2D2F] rounded-md transition-colors"
                title="Close"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Bucket List */}
          <div className="max-h-[160px] overflow-y-auto bucket-selector-scroll">
            {availableBuckets.map((bucket) => (
              <button
                key={bucket.id}
                onClick={() => handleBucketSelect(bucket.id)}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 text-sm text-[#E5E5E7] hover:bg-[#2D2D2F] hover:text-[#FFFFFF] transition-colors disabled:opacity-50 border-b border-[#2D2D2F] last:border-b-0 group"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#007AFF] to-[#0056CC] rounded-md flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#E5E5E7] truncate text-xs">{bucket.name}</div>
                  </div>
                  {isLoading && (
                    <svg className="w-3 h-3 animate-spin text-[#007AFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-[#2D2D2F] bg-[#111111] rounded-b-xl">
            <div className="text-xs text-[#8E8E93] text-center">
              {availableBuckets.length} available
            </div>
          </div>
        </div>
        </>,
        document.body
      )}
    </>
  );
};

export default BucketSelector;
