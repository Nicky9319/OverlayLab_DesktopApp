import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import HoverComponent from '../common/components/HoverComponent';
import { themeColors } from '../common/utils/colors';
import { incrementMetricCompleted, decrementMetricCompleted, fetchMetrics } from '../../../store/thunks/metricsThunks';
import * as leadflowService from '../../../services/leadflowService';
import { updateMetric as updateMetricAction } from '../../../store/slices/metricsSlice';

const MetricBar = () => {
  const dispatch = useDispatch();
  const metricsState = useSelector((state) => state.metrics?.personal || { metrics: [], loading: false, error: null });
  const { metrics } = metricsState;
  
  // Get view mode - hide widget in team mode
  const viewMode = useSelector((state) => state.teams?.viewMode || 'customer');
  
  // Filter metrics to show only those with visibleInActionBar: true
  // This will automatically update when Redux state changes (when eye icon is toggled)
  const visibleMetrics = Array.isArray(metrics) ? metrics.filter(m => m.visibleInActionBar === true) : [];
  
  // Check if metrics bar should be visible from localStorage
  const [isVisible, setIsVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('metricsBarVisible');
      const visible = saved === 'true';
      console.log('MetricBar initial visibility:', visible);
      return visible;
    } catch (error) {
      console.error('Error reading metricsBarVisible from localStorage:', error);
      return false;
    }
  });
  
  // Drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('metricBarPosition');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { x: parsed.x || 100, y: parsed.y || 100 };
      }
    } catch (error) {
      console.error('Error reading metricBarPosition from localStorage:', error);
    }
    return { x: 100, y: 100 }; // Default position
  });
  
  // Loading state for increment/decrement operations
  const [loadingMetrics, setLoadingMetrics] = useState({});
  // State to track which metrics are showing breakdown (clicked)
  const [showBreakdown, setShowBreakdown] = useState({});
  // State to track hover on total
  const [hoveredTotal, setHoveredTotal] = useState(null);
  
  // Ref to track if we've attempted to load metrics on mount
  const hasLoadedMetricsRef = useRef(false);
  // Ref to track if we've loaded today's tracking data
  const hasLoadedTrackingDataRef = useRef(false);
  // Ref for breakdown tooltip to detect outside clicks
  const breakdownRefs = useRef({});

  const widgetRef = useRef(null);
  
  // Listen for localStorage changes and custom events to update visibility
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('metricsBarVisible');
        const visible = saved === 'true';
        console.log('MetricBar: Storage change detected, visibility:', visible);
        setIsVisible(visible);
      } catch (error) {
        console.error('Error reading metricsBarVisible from localStorage:', error);
      }
    };
    
    const handleCustomEvent = (event) => {
      console.log('MetricBar: Custom event received', event.detail);
      if (event.detail && typeof event.detail.visible === 'boolean') {
        setIsVisible(event.detail.visible);
      } else {
        handleStorageChange();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('metricsBarVisibilityChanged', handleCustomEvent);
    // Also check periodically in case same-window localStorage changes
    const interval = setInterval(handleStorageChange, 200);
    
    // Initial check
    handleStorageChange();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('metricsBarVisibilityChanged', handleCustomEvent);
      clearInterval(interval);
    };
  }, []);
  
  // Load metrics function (similar to ActionBar's loadPersonalBuckets)
  const loadMetrics = async (force = false) => {
    // Skip if we've already loaded and have metrics, and not forcing
    if (hasLoadedMetricsRef.current && !force && metrics.length > 0) {
      console.log('MetricBar: Metrics already loaded and available, skipping...');
      return;
    }
    
    // Prevent duplicate simultaneous calls
    if (hasLoadedMetricsRef.current && !force) {
      console.log('MetricBar: Load already in progress, skipping duplicate call...');
      return;
    }
    
    try {
      console.log('MetricBar: Loading metrics...', { 
        force, 
        hasLoaded: hasLoadedMetricsRef.current,
        metricsCount: metrics.length
      });
      hasLoadedMetricsRef.current = true;
      const result = await dispatch(fetchMetrics());
      if (fetchMetrics.fulfilled.match(result)) {
        console.log('MetricBar: Metrics loaded successfully:', result.payload?.length || 0, 'metrics');
        // Keep flag as true since we successfully loaded
      } else {
        console.warn('MetricBar: Failed to load metrics:', result);
        // Reset flag on failure so we can retry after a delay
        setTimeout(() => {
          hasLoadedMetricsRef.current = false;
        }, 2000);
      }
    } catch (error) {
      console.error('MetricBar: Error loading metrics:', error);
      // Reset flag on error so we can retry after a delay
      setTimeout(() => {
        hasLoadedMetricsRef.current = false;
      }, 2000);
    }
  };
  
  // Initialize and load metrics on mount
  useEffect(() => {
    console.log('MetricBar: Component mounted, initializing...');
    
    // Always load metrics on mount
    // This ensures metrics are available immediately when the widget loads
    // Try immediate load first, then retry with delay if needed
    console.log('MetricBar: Mount effect running, attempting immediate load...');
    loadMetrics();
    
    // Also set a delayed retry in case the immediate call doesn't work
    const loadTimer = setTimeout(() => {
      // Only retry if we still don't have metrics
      if (metrics.length === 0) {
        console.log('MetricBar: Mount retry timer fired, loading metrics...');
        loadMetrics(true); // Force retry
      }
    }, 500);
    
    return () => {
      clearTimeout(loadTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount
  
  // Also load metrics when component becomes visible (in case it was conditionally rendered)
  useEffect(() => {
    // Check if we have metrics, if not, load them
    // Only load if widget is visible and we haven't loaded yet
    if (isVisible && !hasLoadedMetricsRef.current) {
      // Small delay to ensure component is fully mounted
      const checkTimer = setTimeout(() => {
        if (metrics.length === 0) {
          console.log('MetricBar: Component visible but no metrics, loading...');
          loadMetrics();
        }
      }, 150);
      return () => clearTimeout(checkTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);
  
  // Additional safeguard: Load metrics when Redux store is ready but metrics are empty
  useEffect(() => {
    // This effect runs whenever metrics change in Redux
    // If metrics are empty and widget is visible, try to load
    if (isVisible && metrics.length === 0) {
      console.log('MetricBar: Redux metrics empty, checking if we should load...', {
        hasLoaded: hasLoadedMetricsRef.current
      });
      
      // Only load if we haven't loaded yet, or if it's been a while (retry case)
      if (!hasLoadedMetricsRef.current) {
        const loadTimer = setTimeout(() => {
          console.log('MetricBar: Redux metrics empty, loading...');
          loadMetrics();
        }, 300);
        return () => clearTimeout(loadTimer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.length, isVisible]);

  // Load today's tracking data for visible metrics
  useEffect(() => {
    const loadTodayTrackingData = async () => {
      // Only load if we have metrics and haven't loaded tracking data yet
      if (visibleMetrics.length === 0 || hasLoadedTrackingDataRef.current) {
        return;
      }

      // Check if any visible metric is missing tracking data (backlogCount, date, etc.)
      const needsTrackingData = visibleMetrics.some(metric => 
        metric.backlogCount === undefined || metric.date === undefined
      );

      if (!needsTrackingData) {
        hasLoadedTrackingDataRef.current = true;
        return;
      }

      console.log('MetricBar: Loading today\'s tracking data for visible metrics...');
      hasLoadedTrackingDataRef.current = true;

      // Load tracking data for each visible metric
      const trackingPromises = visibleMetrics.map(async (metric) => {
        const metricId = metric.metricId || metric.id;
        if (!metricId) return;

        try {
          const metricInfoResponse = await leadflowService.getMetricInformation(metricId);
          
          if (metricInfoResponse.status_code >= 200 && metricInfoResponse.status_code < 300) {
            const metricInfo = metricInfoResponse.content;
            const metricData = metricInfo?.metric || metricInfo;
            
            // Extract all fields from metric_tracking record
            const completedCount = metricData?.CompletedCount ?? 0;
            const objectiveCount = metricData?.ObjectiveCount ?? 0;
            const backlogCount = metricData?.BacklogCount ?? 0;
            const date = metricData?.Date ?? null;
            
            // Update Redux state with all metric tracking fields
            dispatch(updateMetricAction(metricId, { 
              completedCount,
              objectiveCount, // Today's objective from metric_tracking
              backlogCount, // Backlog remaining from metric_tracking
              date // Date for which this information is valid
            }, 'personal', true));
          }
        } catch (error) {
          console.error(`MetricBar: Error loading tracking data for metric ${metricId}:`, error);
        }
      });

      await Promise.all(trackingPromises);
      console.log('MetricBar: Today\'s tracking data loaded for visible metrics');
    };

    // Load tracking data when visible metrics are available
    if (isVisible && visibleMetrics.length > 0) {
      loadTodayTrackingData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, visibleMetrics.length, dispatch]);
  
  // Drag handlers
  const handleMouseDown = (e) => {
    // Only start dragging if clicking on the widget itself, not on buttons or other elements
    if (e.target.closest('button') || e.target.closest('svg')) {
      return;
    }
    
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    // Calculate widget dimensions (approximate)
    const widgetWidth = 300;
    const widgetHeight = Math.max(200, visibleMetrics.length * 80 + 60);
    
    // Keep widget within viewport bounds
    const maxX = window.innerWidth - widgetWidth;
    const maxY = window.innerHeight - widgetHeight;
    
    // Calculate new position based on mouse position and drag offset
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Clamp position to viewport bounds
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: clampedX, y: clampedY });
    
    // Save position to localStorage
    try {
      localStorage.setItem('metricBarPosition', JSON.stringify({ x: clampedX, y: clampedY }));
    } catch (error) {
      console.error('Error saving metricBarPosition to localStorage:', error);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
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
  
  // Handle increment
  const handleIncrement = async (metricId) => {
    try {
      setLoadingMetrics(prev => ({ ...prev, [metricId]: true }));
      await dispatch(incrementMetricCompleted(metricId));
      // Redux state is updated by the thunk, no need to update local state
    } catch (error) {
      console.error('Error incrementing metric:', error);
    } finally {
      setLoadingMetrics(prev => ({ ...prev, [metricId]: false }));
    }
  };
  
  // Handle decrement
  const handleDecrement = async (metricId) => {
    // Find the metric to check current count
    const metric = metrics.find(m => (m.metricId || m.id) === metricId);
    const currentCount = metric?.completedCount || 0;
    
    // Prevent going below 0
    if (currentCount <= 0) {
      return;
    }
    
    try {
      setLoadingMetrics(prev => ({ ...prev, [metricId]: true }));
      await dispatch(decrementMetricCompleted(metricId));
      // Redux state is updated by the thunk, no need to update local state
    } catch (error) {
      console.error('Error decrementing metric:', error);
    } finally {
      setLoadingMetrics(prev => ({ ...prev, [metricId]: false }));
    }
  };
  
  // Close breakdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any breakdown tooltip
      Object.keys(showBreakdown).forEach(metricId => {
        if (showBreakdown[metricId]) {
          const ref = breakdownRefs.current[metricId];
          if (ref && !ref.contains(event.target)) {
            setShowBreakdown(prev => ({
              ...prev,
              [metricId]: false
            }));
          }
        }
      });
    };

    // Only add listener if any breakdown is open
    const hasOpenBreakdown = Object.values(showBreakdown).some(Boolean);
    if (hasOpenBreakdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showBreakdown]);

  // Debug logging
  useEffect(() => {
    console.log('MetricBar render state:', { 
      isVisible, 
      viewMode,
      visibleMetricsCount: visibleMetrics.length,
      metricsCount: metrics.length,
      visibleMetrics: visibleMetrics.map(m => ({ id: m.metricId, name: m.fieldName, visible: m.visibleInActionBar }))
    });
  }, [isVisible, viewMode, visibleMetrics.length, metrics.length]);
  
  // Hide widget in team mode
  if (viewMode === 'team') {
    console.log('MetricBar: Team mode active, hiding widget');
    return null;
  }
  
  if (!isVisible) {
    console.log('MetricBar: Not visible, returning null');
    return null;
  }
  
  // Show the bar even if there are no visible metrics (show empty state)
  // if (visibleMetrics.length === 0) {
  //   console.log('MetricBar: No visible metrics, returning null');
  //   return null;
  // }
  
  return (
    <HoverComponent>
      <style>
        {`
          /* Custom scrollbar for MetricBar */
          .metric-bar-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .metric-bar-scroll::-webkit-scrollbar-track {
            background: ${themeColors.primaryBackground};
            border-radius: 3px;
          }
          .metric-bar-scroll::-webkit-scrollbar-thumb {
            background: ${themeColors.surfaceBackground};
            border-radius: 3px;
          }
          .metric-bar-scroll::-webkit-scrollbar-thumb:hover {
            background: ${themeColors.tertiaryBackground};
          }
        `}
      </style>
      <div
        ref={widgetRef}
        className="metric-bar-scroll"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '240px',
          minHeight: '100px',
          maxHeight: '75vh',
          overflowY: 'auto',
          backgroundColor: themeColors.primaryBackground,
          backdropFilter: 'blur(10px)',
          borderRadius: '8px',
          border: `1px solid ${themeColors.borderColor}`,
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 10001,
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
          pointerEvents: 'auto',
          transition: isDragging ? 'none' : 'all 0.3s ease',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2px',
          paddingBottom: '6px',
          borderBottom: `1px solid ${themeColors.borderColor}`
        }}>
          <h3 style={{
            color: themeColors.primaryText,
            fontSize: '11px',
            fontWeight: '600',
            margin: 0,
            letterSpacing: '0.3px'
          }}>
            Metrics
          </h3>
        </div>
        
        {/* Metrics List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {visibleMetrics.length === 0 ? (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              color: themeColors.mutedText,
              fontSize: '10px',
              lineHeight: '1.4'
            }}>
              No metrics selected for display.
              <br />
              <span style={{ fontSize: '9px', marginTop: '4px', display: 'block', color: themeColors.mutedText }}>
                Use the eye icon in the Metrics page to show metrics here.
              </span>
            </div>
          ) : (
            visibleMetrics.map((metric) => {
            const metricId = metric.metricId || metric.id;
            const fieldName = metric.fieldName || '';
            
            // Get values from metric_tracking (today's record) with fallbacks
            // backlogCount from metric_tracking BacklogCount, fallback to daily_metrics backlogRemainingCount
            const backlogCount = metric.backlogCount !== undefined ? metric.backlogCount : (metric.backlogRemainingCount || 0);
            // objectiveCount: if tracking ObjectiveCount was set via updateMetricAction, use it; otherwise use daily_metrics objectiveCount
            // Note: updateMetricAction sets objectiveCount from tracking, so this will be tracking value if available
            const objectiveCount = metric.objectiveCount !== undefined ? metric.objectiveCount : 0;
            
            // Calculate total (backlog + objective)
            const total = backlogCount + objectiveCount;
            
            // Get completedCount from Redux state (stored in metric object)
            const completedCount = metric.completedCount !== undefined ? metric.completedCount : 0;
            const isLoading = loadingMetrics[metricId] || false;
            
            // Determine tick color based on completion status
            const showBlueTick = completedCount > objectiveCount;
            const showGreenTick = completedCount > total;
            
            // Check if breakdown is shown for this metric
            const isBreakdownShown = showBreakdown[metricId] || false;
            
            // Toggle breakdown handler
            const toggleBreakdown = (e) => {
              e.stopPropagation();
              setShowBreakdown(prev => ({
                ...prev,
                [metricId]: !prev[metricId]
              }));
            };
            
            return (
              <div
                key={metricId}
                style={{
                  background: themeColors.secondaryBackground,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '6px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  position: 'relative'
                }}
              >
                {/* Status Ticks - Top Right */}
                {(showBlueTick || showGreenTick) && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    display: 'flex',
                    gap: '2px'
                  }}>
                    {showGreenTick && (
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#10B981', // green-500
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${themeColors.secondaryBackground}`
                      }} title="Completed exceeds total">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                    {showBlueTick && !showGreenTick && (
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: themeColors.primaryBlue || '#007AFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${themeColors.secondaryBackground}`
                      }} title="Completed exceeds today's objective">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Metric Name */}
                <div style={{
                  color: themeColors.primaryText,
                  fontSize: '10px',
                  fontWeight: '600',
                  marginBottom: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingRight: (showBlueTick || showGreenTick) ? '18px' : '0'
                }}>
                  {fieldName}
                </div>
                
                {/* Total and Completed Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {/* Total with Click to Show Breakdown */}
                  <div 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px',
                      flex: 1,
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{
                      color: themeColors.mutedText,
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      Total
                    </span>
                    <span 
                      onClick={toggleBreakdown}
                      onMouseEnter={() => setHoveredTotal(metricId)}
                      onMouseLeave={() => setHoveredTotal(null)}
                      style={{
                        color: themeColors.primaryText,
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'inline-block',
                        transform: hoveredTotal === metricId ? 'scale(1.15)' : 'scale(1)',
                        transformOrigin: 'left center',
                        transition: 'transform 0.2s ease',
                        cursor: 'pointer'
                      }}
                    >
                      {total}
                    </span>
                    
                    {/* Breakdown Tooltip - shown when clicked */}
                    {isBreakdownShown && (
                      <div 
                        ref={(el) => {
                          if (el) {
                            breakdownRefs.current[metricId] = el;
                          } else {
                            delete breakdownRefs.current[metricId];
                          }
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '0',
                          marginBottom: '4px',
                          background: themeColors.primaryBackground || '#000000',
                          border: `1px solid ${themeColors.borderColor}`,
                          borderRadius: '6px',
                          padding: '6px 8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                          zIndex: 1000,
                          minWidth: '120px',
                          pointerEvents: 'auto'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <span style={{
                              color: themeColors.mutedText,
                              fontSize: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px'
                            }}>
                              Backlog
                            </span>
                            <span style={{
                              color: themeColors.primaryText,
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {backlogCount}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <span style={{
                              color: themeColors.mutedText,
                              fontSize: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px'
                            }}>
                              Objective
                            </span>
                            <span style={{
                              color: themeColors.primaryText,
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {objectiveCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Completed with +/- buttons */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                    alignItems: 'flex-end',
                    flex: 1
                  }}>
                    <span style={{
                      color: themeColors.mutedText,
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      Completed
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <button
                        onClick={() => handleDecrement(metricId)}
                        disabled={isLoading || completedCount <= 0}
                        style={{
                          background: completedCount <= 0 ? themeColors.secondaryBackground : themeColors.secondaryBackground,
                          border: `1px solid ${completedCount <= 0 ? themeColors.borderColor : themeColors.borderColor}`,
                          borderRadius: '4px',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: completedCount <= 0 || isLoading ? 'not-allowed' : 'pointer',
                          color: completedCount <= 0 ? themeColors.mutedText : themeColors.primaryText,
                          opacity: completedCount <= 0 ? 0.4 : 1,
                          transition: 'all 0.2s ease',
                          padding: 0
                        }}
                        onMouseEnter={(e) => {
                          if (completedCount > 0 && !isLoading) {
                            e.target.style.background = themeColors.surfaceBackground;
                            e.target.style.borderColor = themeColors.primaryBlue;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (completedCount > 0 && !isLoading) {
                            e.target.style.background = themeColors.secondaryBackground;
                            e.target.style.borderColor = themeColors.borderColor;
                          }
                        }}
                        title="Decrement"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      
                      <span style={{
                        color: themeColors.primaryText,
                        fontSize: '14px',
                        fontWeight: '600',
                        minWidth: '24px',
                        textAlign: 'center'
                      }}>
                        {isLoading ? '...' : completedCount}
                      </span>
                      
                      <button
                        onClick={() => handleIncrement(metricId)}
                        disabled={isLoading}
                        style={{
                          background: themeColors.secondaryBackground,
                          border: `1px solid ${themeColors.borderColor}`,
                          borderRadius: '4px',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          color: themeColors.primaryText,
                          transition: 'all 0.2s ease',
                          padding: 0
                        }}
                        onMouseEnter={(e) => {
                          if (!isLoading) {
                            e.target.style.background = themeColors.surfaceBackground;
                            e.target.style.borderColor = themeColors.primaryBlue;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isLoading) {
                            e.target.style.background = themeColors.secondaryBackground;
                            e.target.style.borderColor = themeColors.borderColor;
                          }
                        }}
                        title="Increment"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </HoverComponent>
  );
};

export default MetricBar;

