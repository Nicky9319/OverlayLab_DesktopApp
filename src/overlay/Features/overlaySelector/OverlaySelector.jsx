import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  openSelector,
  closeSelector, 
  navigateNext, 
  navigatePrev, 
  selectIndex,
  setSelectedIndexFromOverlayType
} from '../../store/slices/overlaySelectorSlice';
import { setOverlayType } from '../../store/slices/overlayTypeSlice';
import { overlayTypesConfig } from '../../config/overlayTypes';
import { themeColors } from '../common/utils/colors';
import leadflowLogo from '../../../renderer/assets/leadflow_logo.png';
import airtypeLogo from '../../../renderer/assets/airtype_logo.png';
import clipvaultLogo from '../../../renderer/assets/clipvault_logo.png';

const OverlaySelector = () => {
  const dispatch = useDispatch();
  const { isOpen, selectedIndex } = useSelector((state) => state.overlaySelector);
  const currentOverlayType = useSelector((state) => state.overlayType.currentOverlayType);
  const allWidgetsVisible = useSelector((state) => state.uiVisibility.allWidgetsVisible);
  const containerRef = useRef(null);
  const handleSelectRef = useRef(null);

  // Map logo imports
  const logoMap = {
    leadflow: leadflowLogo,
    airtype: airtypeLogo,
    clipvault: clipvaultLogo,
  };

  // Initialize selected index based on current overlay type when opening
  useEffect(() => {
    if (isOpen) {
      dispatch(setSelectedIndexFromOverlayType(currentOverlayType));
      // Focus the container to capture keyboard events
      if (containerRef.current) {
        containerRef.current.focus();
      }
    }
  }, [isOpen, currentOverlayType, dispatch]);

  // Close selector when overlay window is hidden (when allWidgetsVisible becomes false)
  useEffect(() => {
    if (isOpen && !allWidgetsVisible) {
      // If selector is open but widgets are hidden (overlay window hidden), close the selector
      dispatch(closeSelector());
    }
  }, [isOpen, allWidgetsVisible, dispatch]);

  // Create handleSelect function that we can reference
  useEffect(() => {
    handleSelectRef.current = () => {
      const selectedType = overlayTypesConfig[selectedIndex];
      if (selectedType) {
        dispatch(setOverlayType(selectedType.id));
        dispatch(closeSelector());
        
        // Notify main process to save overlay type
        if (window.widgetAPI && window.widgetAPI.saveOverlayType) {
          window.widgetAPI.saveOverlayType(selectedType.id).catch(err => {
            console.error('Failed to save overlay type:', err);
          });
        }

        // Always enable click-through when overlay is selected
        // HoverComponent will handle making specific areas interactive on hover
        if (window.widgetAPI) {
          window.widgetAPI.enableClickThrough();
        }
      }
    };
  }, [selectedIndex, dispatch, allWidgetsVisible]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      console.log('Key pressed:', e.key);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        dispatch(navigatePrev());
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        dispatch(navigateNext());
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (handleSelectRef.current) {
          handleSelectRef.current();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dispatch(closeSelector());
      }
    };

    // Add listener to document to capture all keyboard events
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, dispatch]);

  // Listen for IPC event to open selector
  useEffect(() => {
    if (window.widgetAPI && window.widgetAPI.onOpenSelector) {
      const handleOpenSelector = () => {
        dispatch(openSelector());
        if (window.widgetAPI) {
          window.widgetAPI.disableClickThrough();
        }
      };
      window.widgetAPI.onOpenSelector(handleOpenSelector);
      return () => {
        if (window.widgetAPI && window.widgetAPI.removeAllListeners) {
          window.widgetAPI.removeAllListeners('overlay:openSelector');
        }
      };
    }
  }, [dispatch]);

  // Ensure click-through is restored when selector closes
  useEffect(() => {
    if (!isOpen && window.widgetAPI) {
      // Small delay to ensure state is settled after selector closes
      const timeoutId = setTimeout(() => {
        // Trigger a re-evaluation by dispatching a dummy action or using a custom event
        // The mainPage component will handle the actual click-through restoration
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('overlaySelectorClosed'));
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const handleSelect = () => {
    if (handleSelectRef.current) {
      handleSelectRef.current();
    }
  };

  const handleSegmentClick = (index) => {
    dispatch(selectIndex(index));
    handleSelect();
  };

  const handleDoubleClick = (index) => {
    dispatch(selectIndex(index));
    handleSelect();
  };

  if (!isOpen) return null;

  const numOverlays = overlayTypesConfig.length;
  const angleStep = 360 / numOverlays;
  const radius = 100; // Increased distance from center to prevent overlap with center circle
  const centerX = 50; // Percentage
  const centerY = 50; // Percentage

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        pointerEvents: 'auto',
        outline: 'none',
      }}
      onClick={(e) => {
        // Close if clicking on backdrop
        if (e.target === containerRef.current) {
          dispatch(closeSelector());
        }
      }}
    >
      {/* Blurred background overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Circular selector */}
      <div
        style={{
          position: 'relative',
          width: '400px',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        {/* Overlay segments in circular loop */}
        {overlayTypesConfig.map((overlay, index) => {
          const angle = (index * angleStep - 90) * (Math.PI / 180); // Start from top, convert to radians
          const x = centerX + (radius / 2) * Math.cos(angle);
          const y = centerY + (radius / 2) * Math.sin(angle);
          const isSelected = index === selectedIndex;

          return (
            <div
              key={overlay.id}
              onClick={() => handleSegmentClick(index)}
              onDoubleClick={() => handleDoubleClick(index)}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                zIndex: isSelected ? 2 : 1, // Lower than center circle (zIndex: 10)
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: isSelected 
                  ? themeColors.primaryBackground 
                  : 'rgba(0, 0, 0, 0.5)', // Grey out background for non-selected
                border: isSelected 
                  ? `2px solid ${themeColors.primaryBlue}` 
                  : `2px solid ${themeColors.borderColor}`,
                boxShadow: isSelected 
                  ? `0 0 20px rgba(0, 122, 255, 0.5)` 
                  : 'none',
                transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.15)' : 'scale(1)'}`,
                minWidth: '120px',
                width: '120px',
              }}
              onMouseEnter={() => {
                if (!isSelected) {
                  dispatch(selectIndex(index));
                }
              }}
            >
              <img
                src={logoMap[overlay.id] || logoMap.leadflow}
                alt={overlay.name}
                style={{
                  width: '70px',
                  height: '70px',
                  objectFit: 'contain',
                  marginBottom: '10px',
                  filter: isSelected ? 'none' : 'grayscale(100%) brightness(0.5)', // Grey out non-selected logo
                  transition: 'filter 0.2s ease',
                }}
              />
              <div
                style={{
                  color: isSelected ? themeColors.primaryBlue : themeColors.mutedText, // Blue text when selected, grey when not
                  fontSize: '14px',
                  fontWeight: isSelected ? '600' : '400',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  opacity: 1, // Text always at full opacity
                }}
              >
                {overlay.name}
              </div>
            </div>
          );
        })}

        {/* Instructions - Centered */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10, // Higher than overlay options to prevent overlap
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              borderRadius: '50%',
              width: '200px',
              height: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '20px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ color: '#ffffff', fontSize: '11px', textAlign: 'center', fontWeight: '500', lineHeight: '1.4' }}>
              Use arrow keys to navigate
            </div>
            <div style={{ color: '#ffffff', fontSize: '11px', textAlign: 'center', marginTop: '6px', fontWeight: '500', lineHeight: '1.4' }}>
              Press Enter to select • Double-click to select • Esc to close
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlaySelector;
