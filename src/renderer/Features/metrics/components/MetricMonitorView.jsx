import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMetricHistory } from '../../../../store/thunks/metricsThunks';
import { parseISO, isAfter, isBefore, isSameDay } from 'date-fns';
import MetricHistoryChart from './MetricHistoryChart';
import TimeFrameSelector from './TimeFrameSelector';
import * as leadflowService from '../../../../services/leadflowService';
import { updateMetric as updateMetricAction } from '../../../../store/slices/metricsSlice';

const MetricMonitorView = ({ metricId, metricName, onBack }) => {
  const dispatch = useDispatch();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFrame, setTimeFrame] = useState(null);
  const [todayTrackingData, setTodayTrackingData] = useState(null);

  // Get metric data to access objectiveUpdates
  const metricsState = useSelector((state) => state.metrics?.personal || { metrics: [] });
  const metric = metricsState.metrics?.find((m) => (m.metricId || m.id) === metricId);
  const objectiveUpdates = metric?.objectiveUpdates || [];
  
  // Get today's tracking data for backlog and objective display
  useEffect(() => {
    const loadTodayTrackingData = async () => {
      if (!metricId) return;
      
      try {
        const metricInfoResponse = await leadflowService.getMetricInformation(metricId);
        
        if (metricInfoResponse.status_code >= 200 && metricInfoResponse.status_code < 300) {
          const metricInfo = metricInfoResponse.content;
          const metricData = metricInfo?.metric || metricInfo;
          
          setTodayTrackingData({
            backlogCount: metricData?.BacklogCount ?? 0,
            objectiveCount: metricData?.ObjectiveCount ?? 0,
            completedCount: metricData?.CompletedCount ?? 0
          });
          
          // Also update Redux state
          dispatch(updateMetricAction(metricId, {
            backlogCount: metricData?.BacklogCount ?? 0,
            objectiveCount: metricData?.ObjectiveCount ?? 0,
            completedCount: metricData?.CompletedCount ?? 0,
            date: metricData?.Date ?? null
          }, 'personal', true));
        }
      } catch (err) {
        console.error('Error loading today\'s tracking data:', err);
      }
    };
    
    loadTodayTrackingData();
  }, [metricId, dispatch]);

  // Fetch history on mount and when metricId changes
  useEffect(() => {
    if (metricId) {
      loadHistory();
    }
  }, [metricId]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dispatch(fetchMetricHistory(metricId));
      if (fetchMetricHistory.fulfilled.match(result)) {
        setHistory(result.payload.history || []);
      } else {
        setError(result.payload || 'Failed to load metric history');
      }
    } catch (err) {
      setError(err.message || 'Failed to load metric history');
    } finally {
      setLoading(false);
    }
  };

  // Filter history based on selected time frame
  const filteredHistory = useMemo(() => {
    if (!timeFrame || !history || history.length === 0) {
      return history;
    }

    const startDate = parseISO(timeFrame.startDate);
    const endDate = parseISO(timeFrame.endDate);

    return history.filter((entry) => {
      if (!entry.Date) return false;
      const entryDate = typeof entry.Date === 'string' ? parseISO(entry.Date) : new Date(entry.Date);
      // Include dates that are on or after startDate and on or before endDate
      return (
        (isAfter(entryDate, startDate) || isSameDay(entryDate, startDate)) &&
        (isBefore(entryDate, endDate) || isSameDay(entryDate, endDate))
      );
    });
  }, [history, timeFrame]);

  const handleTimeFrameChange = (newTimeFrame) => {
    setTimeFrame(newTimeFrame);
  };

  return (
    <div className="p-5 max-w-6xl mx-auto bg-black min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start gap-5 flex-wrap">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={onBack}
                className="p-2 text-[#8E8E93] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-colors"
                title="Back to metrics"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-3xl font-semibold text-white">{metricName || 'Metric History'}</h2>
            </div>
            <p className="text-base text-gray-400">Monitor and analyze your metric performance over time</p>
            
            {/* Today's Backlog and Total Objective */}
            {todayTrackingData && (
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Backlog:</span>
                  <span className="text-lg font-semibold text-white">{todayTrackingData.backlogCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Total Objective:</span>
                  <span className="text-lg font-semibold text-white">
                    {todayTrackingData.backlogCount + todayTrackingData.objectiveCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Today's Objective:</span>
                  <span className="text-lg font-semibold text-white">{todayTrackingData.objectiveCount}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              className="px-4 py-2.5 bg-[#1C1C1E] text-[#8E8E93] border border-[#2D2D2F] rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:bg-[#2D2D2F] hover:text-white hover:border-[#3A3A3C] disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={loadHistory}
              disabled={loading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Time Frame Selector */}
      <div className="mb-6">
        <TimeFrameSelector onTimeFrameChange={handleTimeFrameChange} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-15 text-gray-400">
          <div className="w-10 h-10 border-3 border-gray-800 border-t-blue-500 rounded-full mx-auto mb-2.5 animate-spin"></div>
          <p className="text-base">Loading metric history...</p>
        </div>
      ) : error ? (
        <div className="text-center py-15">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-base text-red-400 mb-2">Error loading metric history</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadHistory}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-15 text-gray-400">
          <p className="text-base">No history data available for the selected time frame.</p>
        </div>
      ) : (
        <MetricHistoryChart 
          history={filteredHistory} 
          objectiveUpdates={objectiveUpdates}
        />
      )}
    </div>
  );
};

export default MetricMonitorView;

