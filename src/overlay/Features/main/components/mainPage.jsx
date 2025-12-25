import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { incrementMessageCount, clearMessageCount } from '../../../store/slices/uiVisibilitySlice';
import { themeColors } from '../../common/utils/colors';
import FloatingWidget from '../../floatingWidget/FloatingWidget';
import ActionBar from '../../actionBar/ActionBar';
import OverlaySelector from '../../overlaySelector/OverlaySelector';
import AirtypeOverlay from '../../airtype/AirtypeOverlay';
import ClipVaultOverlay from '../../clipvault/ClipVaultOverlay';
import MetricBar from '../../metricBar/MetricBar';
import { OVERLAY_TYPES } from '../../../config/overlayTypes';

const MainPage = () => {
  const dispatch = useDispatch();
  const { floatingWidgetVisible, actionBarVisible, actionBarCollapsed, allWidgetsVisible, messageCount } = useSelector(
    (state) => state.uiVisibility
  );
  const currentOverlayType = useSelector((state) => state.overlayType.currentOverlayType);
  const selectorIsOpen = useSelector((state) => state.overlaySelector.isOpen);

  // Local state to handle smooth transitions
  const [localVisibility, setLocalVisibility] = useState({
    floatingWidget: floatingWidgetVisible && allWidgetsVisible,
    actionBar: actionBarVisible && allWidgetsVisible
  });

  // Handle click-through based on allWidgetsVisible state and selector state
  useEffect(() => {
    if (!window.widgetAPI) return;
    
    // Use a small delay to ensure state is properly settled
    const timeoutId = setTimeout(() => {
      if (window.widgetAPI) {
        // If selector is open, always disable click-through
        if (selectorIsOpen) {
          window.widgetAPI.disableClickThrough();
        } else {
          // Enable click-through by default when selector is closed
          // HoverComponent will handle making specific areas interactive on hover
          window.widgetAPI.enableClickThrough();
        }
      }
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [allWidgetsVisible, selectorIsOpen, currentOverlayType]);

  // Restore click-through state when overlay window becomes visible again
  useEffect(() => {
    if (!window.widgetAPI) return;

    const updateClickThrough = () => {
      // Small delay to ensure state is settled after window visibility changes
      setTimeout(() => {
        if (window.widgetAPI) {
          if (selectorIsOpen) {
            window.widgetAPI.disableClickThrough();
          } else {
            // Enable click-through by default when selector is closed
            // HoverComponent will handle making specific areas interactive on hover
            window.widgetAPI.enableClickThrough();
          }
        }
      }, 100);
    };

    const handleVisibilityChange = () => {
      updateClickThrough();
    };

    const handleSelectorClosed = () => {
      updateClickThrough();
    };

    // Listen for window focus/visibility changes
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('overlaySelectorClosed', handleSelectorClosed);
    
    // Also check when dependencies change
    updateClickThrough();

    return () => {
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('overlaySelectorClosed', handleSelectorClosed);
    };
  }, [allWidgetsVisible, selectorIsOpen, currentOverlayType]);

  // useEffect to handle visibility state changes with smooth transitions
  useEffect(() => {
    const timeoutIds = [];

    // Handle floating widget visibility (considering both individual and global state)
    const shouldShowFloatingWidget = floatingWidgetVisible && allWidgetsVisible;
    if (shouldShowFloatingWidget !== localVisibility.floatingWidget) {
      if (shouldShowFloatingWidget) {
        // Show immediately
        setLocalVisibility(prev => ({ ...prev, floatingWidget: true }));
      } else {
        // Hide with delay for smooth transition
        const timeoutId = setTimeout(() => {
          setLocalVisibility(prev => ({ ...prev, floatingWidget: false }));
        }, 300); // Match the transition duration
        timeoutIds.push(timeoutId);
      }
    }

    // Handle action bar visibility (considering individual, global, and collapsed state)
    // Always keep ActionBar mounted (for event handlers) but hide visually when collapsed
    const shouldShowActionBar = actionBarVisible && allWidgetsVisible && !actionBarCollapsed;
    // Always keep ActionBar mounted so event handlers work even when collapsed (for Ctrl+1)
    if (!localVisibility.actionBar && actionBarVisible) {
      setLocalVisibility(prev => ({ ...prev, actionBar: true }));
    }


    // Cleanup timeouts on unmount or state change
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [floatingWidgetVisible, actionBarVisible, actionBarCollapsed, allWidgetsVisible, localVisibility]);

  return (
    <>
      {/* Overlay Selector - Always on top when open */}
      <OverlaySelector />

      {/* Conditionally render overlays based on type */}
      {currentOverlayType === OVERLAY_TYPES.LEADFLOW && (
        <>
          {localVisibility.floatingWidget && (
            <div style={{
              opacity: (floatingWidgetVisible && allWidgetsVisible) ? 1 : 0,
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: (floatingWidgetVisible && allWidgetsVisible) ? 'scale(1)' : 'scale(0.95)',
              transitionProperty: 'opacity, transform',
              pointerEvents: (floatingWidgetVisible && allWidgetsVisible) ? 'auto' : 'none'
            }}>
              <FloatingWidget />
            </div>
          )}
          
          {/* Always render ActionBar when actionBarVisible is true (even when collapsed) - this ensures event handlers stay active for Ctrl+1 */}
          {actionBarVisible && (
            <div style={{
              opacity: (allWidgetsVisible && !actionBarCollapsed) ? 1 : 0,
              transform: (allWidgetsVisible && !actionBarCollapsed) ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionProperty: 'opacity, transform',
              pointerEvents: (allWidgetsVisible && !actionBarCollapsed) ? 'auto' : 'none',
              visibility: (allWidgetsVisible && !actionBarCollapsed) ? 'visible' : 'hidden'
            }}>
              <ActionBar />
            </div>
          )}
          
          {/* Metric Bar - Show/hide based on its own visibility state, independent of action bar collapse */}
          <MetricBar />
        </>
      )}

      {currentOverlayType === OVERLAY_TYPES.AIRTYPE && (
        <AirtypeOverlay />
      )}

      {currentOverlayType === OVERLAY_TYPES.CLIPVAULT && (
        <ClipVaultOverlay />
      )}
      
    </>
  );
};

export default MainPage;