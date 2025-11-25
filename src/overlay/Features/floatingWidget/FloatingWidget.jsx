import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import HoverComponent from '../common/components/HoverComponent';
import { themeColors } from '../common/utils/colors';
import { 
  toggleAllWidgets, 
  clearMessageCount
} from '../../store/slices/uiVisibilitySlice';
import { setPosition } from '../../store/slices/floatingWidgetSlice';

const FloatingWidget = () => {
  const messageCount = useSelector((state) => state.uiVisibility.messageCount);
  const position = useSelector((state) => state.floatingWidget.position);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [screenshotAnimation, setScreenshotAnimation] = useState('idle'); // 'idle', 'processing', 'success'
  const [leadProcessingStatus, setLeadProcessingStatus] = useState('idle'); // 'idle', 'processing', 'success', 'error'
  const dispatch = useDispatch();

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('LeadFlow FloatingWidget mounted');
  }, []);

  // Screenshot and Lead Processing event listener
  useEffect(() => {
    const onScreenshotEvent = (event, data) => {
      console.log('FloatingWidget received screenshot event:', data);
      try {
        if (!data) return;
        const { eventName, payload } = data;
        
        if (eventName === 'screenshot-processing') {
          console.log('FloatingWidget: Screenshot processing - starting animation');
          setScreenshotAnimation('processing');
        } else if (eventName === 'screenshot-taken' && payload && payload.success) {
          console.log('FloatingWidget: Screenshot taken successfully - showing success animation');
          setScreenshotAnimation('success');
          
          // Reset to idle after success animation duration
          setTimeout(() => {
            setScreenshotAnimation('idle');
          }, 1500);
        } else if (eventName === 'screenshot-error') {
          console.log('FloatingWidget: Screenshot error - reset animation');
          setScreenshotAnimation('idle');
        } else if (eventName === 'lead-processing-feedback') {
          console.log('FloatingWidget: Lead processing feedback received:', payload);
          handleLeadProcessingFeedback(payload);
        }
      } catch (err) {
        console.error('FloatingWidget: Error handling screenshot event:', err);
      }
    };

    // Handle lead processing feedback
    const handleLeadProcessingFeedback = (data) => {
      const { status, data: responseData } = data;
      console.log('FloatingWidget: Handling lead processing feedback:', status, responseData);
      
      if (status === 'processing') {
        setLeadProcessingStatus('processing');
        console.log('FloatingWidget: Starting lead processing animation - background processing initiated');
        
        // For background processing (202 response), show longer processing animation
        // The processing will continue until we get success/error feedback
        
      } else if (status === 'success') {
        setLeadProcessingStatus('success');
        console.log('FloatingWidget: Showing lead success animation');
        
        // Reset to idle after success animation (longer for better feedback)
        setTimeout(() => {
          setLeadProcessingStatus('idle');
        }, 3000);
      } else if (status === 'error') {
        setLeadProcessingStatus('error');
        console.log('FloatingWidget: Showing lead error animation');
        
        // Reset to idle after error animation
        setTimeout(() => {
          setLeadProcessingStatus('idle');
        }, 2500);
      }
    };

    // Setup IPC listeners for screenshot events
    if (window && window.electronAPI && window.electronAPI.onEventFromMain) {
      console.log('FloatingWidget: Setting up screenshot event listener via electronAPI');
      window.electronAPI.onEventFromMain(onScreenshotEvent);
    } else if (window && window.widgetAPI && window.widgetAPI.onEventFromMain) {
      console.log('FloatingWidget: Setting up screenshot event listener via widgetAPI');
      window.widgetAPI.onEventFromMain(onScreenshotEvent);
    }

    // Cleanup
    return () => {
      if (window && window.electronAPI && window.electronAPI.removeAllListeners) {
        try {
          window.electronAPI.removeAllListeners('eventFromMain');
        } catch (e) {
          console.warn('FloatingWidget: Error cleaning up electronAPI listeners:', e);
        }
      }
      if (window && window.widgetAPI && window.widgetAPI.removeAllListeners) {
        try {
          window.widgetAPI.removeAllListeners('eventFromMain');
        } catch (e) {
          console.warn('FloatingWidget: Error cleaning up widgetAPI listeners:', e);
        }
      }
    };
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+Space to trigger widget click
      if (e.ctrlKey && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        // Add a brief flash effect for keyboard shortcut
        setIsClicked(true);
        setTimeout(() => setIsClicked(false), 200);
        handleWidgetClick(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWidgetClick = (e) => {
    // Prevent click if we just finished dragging
    if (hasDragged) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Add click animation
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 150);
    
    // Widget click functionality can be added here if needed
    console.log('Floating widget clicked');
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Drag functionality
  const handleMouseDown = (e) => {
    // Only start dragging if clicking on the widget itself, not on buttons or other elements
    if (e.target.closest('button') || e.target.closest('svg')) {
      return;
    }
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    // Set hasDragged to true when mouse moves during drag
    setHasDragged(true);
    
    // Calculate widget dimensions
    const widgetWidth = 50;
    const widgetHeight = 50;
    
    // Keep widget within viewport bounds
    const maxX = window.innerWidth - widgetWidth;
    const maxY = window.innerHeight - widgetHeight;
    
    // Calculate new position based on mouse position and drag offset
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Clamp position to viewport bounds
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));
    
    // Only update position if it's within bounds
    if (newX >= 0 && newX <= maxX && newY >= 0 && newY <= maxY) {
      dispatch(setPosition({
        x: newX,
        y: newY
      }));
    } else {
      // If we're at the edge, stay at the clamped position
      dispatch(setPosition({
        x: clampedX,
        y: clampedY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click to be processed
    setTimeout(() => {
      setHasDragged(false);
    }, 10);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <>
      {/* Widget always visible at a fixed position */}
      <div style={{
        position: 'absolute',
        left: position.x || 1200,
        top: position.y || 20,
        width: '60px',
        height: '60px',
        pointerEvents: 'auto',
        cursor: isDragging ? 'grabbing' : 'pointer',
        zIndex: 2147483647 // Maximum possible z-index
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <HoverComponent onClick={handleWidgetClick}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: themeColors.primaryBackground,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: screenshotAnimation === 'processing' 
                  ? '0 4px 24px rgba(37, 99, 235, 0.4), 0 8px 48px rgba(59, 130, 246, 0.25)' 
                  : screenshotAnimation === 'success' 
                    ? '0 4px 20px rgba(16, 185, 129, 0.5), 0 8px 40px rgba(16, 185, 129, 0.25)' 
                    : isClicked 
                      ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.4)' 
                      : isHovered 
                        ? '0 6px 24px rgba(0, 0, 0, 0.6), 0 0 32px rgba(59, 130, 246, 0.35)' 
                        : '0 4px 16px rgba(0, 0, 0, 0.4)',
                border: `1.5px solid ${
                  screenshotAnimation === 'processing' ? 'rgba(37, 99, 235, 0.5)' : 
                  screenshotAnimation === 'success' ? 'rgba(16, 185, 129, 0.6)' : 
                  isClicked ? 'rgba(59, 130, 246, 0.7)' : 
                  isHovered ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 255, 255, 0.2)'
                }`,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                transform: screenshotAnimation === 'processing' ? 'scale(1.08)' : 
                          screenshotAnimation === 'success' ? 'scale(1.05)' : 
                          isClicked ? 'scale(0.92)' : 
                          isHovered ? 'scale(1.12)' : 'scale(1)',
                pointerEvents: 'auto',
                overflow: 'visible'
              }}
            >
              {/* Orbital particles - visible during processing */}
              {screenshotAnimation === 'processing' && (
                <>
                  {/* Particle 1 */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(30, 64, 175, 0.9), rgba(30, 64, 175, 0.4))',
                    boxShadow: '0 0 10px rgba(30, 64, 175, 0.8)',
                    filter: 'blur(0.5px)',
                    transform: 'translate(-50%, -50%)',
                    animation: 'orbitRotate1 2.5s linear infinite',
                    pointerEvents: 'none'
                  }} />
                  {/* Particle 2 */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(37, 99, 235, 0.9), rgba(37, 99, 235, 0.4))',
                    boxShadow: '0 0 10px rgba(37, 99, 235, 0.8)',
                    filter: 'blur(0.5px)',
                    transform: 'translate(-50%, -50%)',
                    animation: 'orbitRotate2 2.5s linear infinite',
                    pointerEvents: 'none'
                  }} />
                  {/* Particle 3 */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.9), rgba(59, 130, 246, 0.4))',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
                    filter: 'blur(0.5px)',
                    transform: 'translate(-50%, -50%)',
                    animation: 'orbitRotate3 2.5s linear infinite',
                    pointerEvents: 'none'
                  }} />
                </>
              )}

              {/* Success glow burst */}
              {screenshotAnimation === 'success' && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '120%',
                  height: '120%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3), transparent 70%)',
                  transform: 'translate(-50%, -50%)',
                  animation: 'successBurst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  pointerEvents: 'none'
                }} />
              )}

              {/* Core orb with gradient */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  background: screenshotAnimation === 'processing' || leadProcessingStatus === 'processing'
                    ? 'linear-gradient(135deg, #1E40AF 0%, #2563EB 25%, #3B82F6 50%, #2563EB 75%, #1E40AF 100%)'
                    : screenshotAnimation === 'success' || leadProcessingStatus === 'success'
                      ? 'linear-gradient(135deg, #10B981, #34D399)'
                      : leadProcessingStatus === 'error'
                        ? 'linear-gradient(135deg, #EF4444, #F87171)'
                        : themeColors.primaryBlue,
                  backgroundSize: (screenshotAnimation === 'processing' || leadProcessingStatus === 'processing') ? '300% 300%' : '100% 100%',
                  borderRadius: '50%',
                  position: 'relative',
                  transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  filter: (screenshotAnimation === 'processing' || leadProcessingStatus === 'processing') ? 'blur(2px)' : 
                         (screenshotAnimation === 'success' || leadProcessingStatus === 'success') ? 'blur(0.5px)' : 
                         leadProcessingStatus === 'error' ? 'blur(1px)' : 'blur(1.5px)',
                  boxShadow: (screenshotAnimation === 'processing' || leadProcessingStatus === 'processing')
                    ? '0 0 28px rgba(30, 64, 175, 0.7), 0 0 56px rgba(37, 99, 235, 0.5), 0 0 84px rgba(59, 130, 246, 0.3), inset 0 0 12px rgba(255, 255, 255, 0.3)'
                    : (screenshotAnimation === 'success' || leadProcessingStatus === 'success')
                      ? '0 0 20px rgba(16, 185, 129, 0.9), 0 0 40px rgba(16, 185, 129, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.4)'
                      : leadProcessingStatus === 'error'
                        ? '0 0 20px rgba(239, 68, 68, 0.9), 0 0 40px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.4)'
                        : isClicked
                          ? `0 0 32px ${themeColors.primaryBlue}DD, 0 0 64px ${themeColors.primaryBlue}99, inset 0 0 8px rgba(255, 255, 255, 0.25)`
                          : isHovered 
                            ? `0 0 28px ${themeColors.primaryBlue}BB, 0 0 56px ${themeColors.primaryBlue}77, inset 0 0 8px rgba(255, 255, 255, 0.2)`
                            : `0 0 16px ${themeColors.primaryBlue}88, 0 0 32px ${themeColors.primaryBlue}44, inset 0 0 6px rgba(255, 255, 255, 0.15)`,
                  animation: (screenshotAnimation === 'processing' || leadProcessingStatus === 'processing')
                    ? 'siriOrbPulse 1.2s ease-in-out infinite, siriFlowingGradient 4s ease-in-out infinite' 
                    : (screenshotAnimation === 'success' || leadProcessingStatus === 'success')
                      ? 'successBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      : leadProcessingStatus === 'error'
                        ? 'errorShake 0.6s ease-in-out'
                        : 'heartbeatColor 2s ease-in-out infinite',
                  pointerEvents: 'none',
                  zIndex: 2
                }}
              >
                {/* Inner shimmer layer */}
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  right: '2px',
                  bottom: '2px',
                  borderRadius: '50%',
                  background: screenshotAnimation === 'processing'
                    ? 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.35), transparent 60%)'
                    : screenshotAnimation === 'success'
                      ? 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.5), transparent 60%)'
                      : 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.25), transparent 60%)',
                  animation: screenshotAnimation === 'processing' ? 'shimmerMove 2.5s ease-in-out infinite' : 'none',
                  pointerEvents: 'none'
                }} />
              </div>

              {/* Ambient glow layer */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '32px',
                  height: '32px',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: (screenshotAnimation === 'processing' || leadProcessingStatus === 'processing')
                    ? 'radial-gradient(circle, rgba(30, 64, 175, 0.3) 0%, rgba(37, 99, 235, 0.2) 35%, rgba(59, 130, 246, 0.1) 65%, transparent 100%)'
                    : (screenshotAnimation === 'success' || leadProcessingStatus === 'success')
                      ? 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(52, 211, 153, 0.15) 50%, transparent 100%)'
                      : leadProcessingStatus === 'error'
                        ? 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, rgba(248, 113, 113, 0.15) 50%, transparent 100%)'
                        : `radial-gradient(circle, ${themeColors.primaryBlue}30 0%, ${themeColors.primaryBlue}15 50%, transparent 100%)`,
                  filter: 'blur(8px)',
                  animation: (screenshotAnimation === 'processing' || leadProcessingStatus === 'processing')
                    ? 'ambientPulse 1.8s ease-in-out infinite'
                    : (screenshotAnimation === 'success' || leadProcessingStatus === 'success')
                      ? 'successGlow 0.6s ease-out'
                      : leadProcessingStatus === 'error'
                        ? 'errorGlow 0.6s ease-out'
                        : 'heartbeat 2s ease-in-out infinite',
                  animationDelay: '0.5s',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
            </div>
          </HoverComponent>
        </div>
      </div>

      {/* Hover text with improved styling */}
      {isHovered && !screenshotAnimation && (
        <div style={{
          position: 'absolute',
          left: position.x || 1200,
          top: (position.y || 20) + 70,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 2147483646,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          animation: 'tooltipSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          LeadFlow Widget
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '3px', fontWeight: '400' }}>
            Ctrl+Shift+Space
          </div>
        </div>
      )}

      {/* Status indicator text */}
      {screenshotAnimation === 'processing' && (
        <div style={{
          position: 'absolute',
          left: position.x || 1200,
          top: (position.y || 20) + 70,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          backdropFilter: 'blur(12px)',
          color: '#3B82F6',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 2147483646,
          border: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)',
          animation: 'tooltipSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          Processing...
        </div>
      )}

      {screenshotAnimation === 'success' && (
        <div style={{
          position: 'absolute',
          left: position.x || 1200,
          top: (position.y || 20) + 70,
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          backdropFilter: 'blur(12px)',
          color: '#10B981',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 2147483646,
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
          animation: 'tooltipSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          ✓ Captured!
        </div>
      )}
    </>
  );
};

export default FloatingWidget;

