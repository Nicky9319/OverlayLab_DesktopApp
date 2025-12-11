import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMetrics, createMetric, updateMetricObjective, deleteMetric } from '../../../store/thunks/metricsThunks';
import { setMetrics, setMetricVisibility } from '../../../store/slices/metricsSlice';
import AddMetricModal from './components/AddMetricModal';

const Metrics = () => {
    const dispatch = useDispatch();
    const metricsState = useSelector((state) => state.metrics?.personal || { metrics: [], loading: false, error: null });
    const { metrics, loading, error } = metricsState;
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMetricId, setEditingMetricId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const inputRefs = useRef({});
    
    // Use metrics directly from Redux
    const metricsArray = Array.isArray(metrics) ? metrics : [];

    // Fetch metrics on component mount
    useEffect(() => {
        dispatch(setMetrics([], 'personal', false));
        dispatch(fetchMetrics());
    }, [dispatch]);

    // Function to handle metric creation
    const handleCreateMetric = async (fieldName, objectiveCount) => {
        try {
            const result = await dispatch(createMetric({ fieldName, objectiveCount }));
            
            if (createMetric.fulfilled.match(result)) {
                console.log('Metric created successfully:', result.payload);
                // Refresh metrics after creation
                await dispatch(fetchMetrics());
            } else {
                console.error('Failed to create metric:', result.error);
                alert(`Failed to create metric: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating metric:', error);
            alert(`Error creating metric: ${error.message || 'Unknown error'}`);
        }
    };

    // Function to start editing a metric
    const handleStartEdit = (metric) => {
        const metricId = metric.metricId || metric.id;
        setEditingMetricId(metricId);
        setEditValue(metric.objectiveCount?.toString() || '0');
        // Focus the input after a brief delay to ensure it's rendered
        setTimeout(() => {
            const inputRef = inputRefs.current[metricId];
            if (inputRef) {
                inputRef.focus();
                inputRef.select();
            }
        }, 50);
    };

    // Function to cancel editing
    const handleCancelEdit = () => {
        setEditingMetricId(null);
        setEditValue('');
    };

    // Function to handle metric objective update (inline)
    const handleConfirmUpdate = async (metricId, newObjectiveCount) => {
        if (isNaN(newObjectiveCount) || newObjectiveCount < 0) {
            alert('Please enter a valid number (0 or greater)');
            return;
        }

        // Confirm update
        if (!window.confirm(`Update objective count to ${newObjectiveCount}? This will reset the backlog count to 0.`)) {
            return;
        }

        try {
            const result = await dispatch(updateMetricObjective({ metricId, objectiveCount: newObjectiveCount }));
            
            if (updateMetricObjective.fulfilled.match(result)) {
                console.log('Metric updated successfully:', result.payload);
                setEditingMetricId(null);
                setEditValue('');
            } else {
                console.error('Failed to update metric:', result.error);
                alert(`Failed to update metric: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating metric:', error);
            alert(`Error updating metric: ${error.message || 'Unknown error'}`);
        }
    };

    // Function to handle metric deletion
    const handleDeleteMetric = async (metricId) => {
        if (!metricId) {
            console.error('Metric ID is required for deletion');
            return;
        }
        
        // Confirm deletion
        if (!window.confirm(`Are you sure you want to delete this metric? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const result = await dispatch(deleteMetric(metricId));
            
            if (deleteMetric.fulfilled.match(result)) {
                console.log('Metric deleted successfully', { metricId });
                // Refresh metrics after deletion
                await dispatch(fetchMetrics());
            } else {
                console.error('Failed to delete metric:', result.error);
                alert(`Failed to delete metric: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting metric:', error);
            alert(`Error deleting metric: ${error.message || 'Unknown error'}`);
        }
    };

    // Function to handle metric visibility toggle
    const handleToggleVisibility = (metricId, currentVisibility) => {
        const newVisibility = !currentVisibility;
        dispatch(setMetricVisibility(metricId, newVisibility, 'personal', true));
    };

    return (
        <div className="p-5 max-w-6xl mx-auto bg-black min-h-screen">
            <div className="mb-8">
                <div className="flex justify-between items-start gap-5 flex-wrap">
                    <div className="flex-1">
                        <h2 className="text-3xl font-semibold text-white mb-2">Metrics</h2>
                        <p className="text-base text-gray-400">Track and manage your daily metrics</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button 
                            className="px-4 py-2.5 bg-[#1C1C1E] text-[#8E8E93] border border-[#2D2D2F] rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:bg-[#2D2D2F] hover:text-white hover:border-[#3A3A3C] disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => dispatch(fetchMetrics())}
                            disabled={loading}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                        
                        <button 
                            className="px-5 py-2.5 bg-[#007AFF] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors duration-200 hover:bg-[#0056CC] shadow-[0_2px_8px_rgba(0,122,255,0.3)]"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Metric
                        </button>
                    </div>
                </div>
            </div>
            
            {loading ? (
                <div className="text-center py-15 text-gray-400">
                    <div className="w-10 h-10 border-3 border-gray-800 border-t-blue-500 rounded-full mx-auto mb-2.5 animate-spin"></div>
                    <p className="text-base">Loading metrics...</p>
                </div>
            ) : error ? (
                <div className="text-center py-15">
                    <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-base text-red-400 mb-2">Error loading metrics</p>
                    <p className="text-sm text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => dispatch(fetchMetrics())}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metricsArray.map((metric, index) => {
                        const metricId = metric.metricId || metric.id;
                        const fieldName = metric.fieldName || '';
                        const objectiveCount = metric.objectiveCount || 0;
                        const isEditing = editingMetricId === metricId;
                        const visibleInActionBar = metric.visibleInActionBar || false;
                        
                        return (
                            <div
                                key={metricId || `metric-${index}`}
                                className="bg-[#111111] border border-[#1C1C1E] rounded-xl p-5 transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:border-[#3A3A3C] flex flex-col"
                            >
                                {/* Header with title, eye icon, and delete icon */}
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-white flex-1 pr-2">{fieldName}</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleVisibility(metricId, visibleInActionBar)}
                                            className={`p-1.5 rounded-lg transition-all duration-200 flex-shrink-0 ${
                                                visibleInActionBar 
                                                    ? 'text-[#007AFF] hover:bg-[#1C1C1E]' 
                                                    : 'text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#1C1C1E]'
                                            }`}
                                            title={visibleInActionBar ? "Hide in action bar" : "Show in action bar"}
                                        >
                                            {visibleInActionBar ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMetric(metricId)}
                                            className="p-1.5 text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#1C1C1E] rounded-lg transition-all duration-200 flex-shrink-0"
                                            title="Delete metric"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Objective Count Section */}
                                <div className="flex-1 flex flex-col gap-3">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">
                                            Objective Count
                                        </label>
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    ref={(el) => {
                                                        if (el) {
                                                            inputRefs.current[metricId] = el;
                                                            // Focus and select when ref is set
                                                            setTimeout(() => {
                                                                el.focus();
                                                                el.select();
                                                            }, 10);
                                                        }
                                                    }}
                                                    type="number"
                                                    min="0"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleConfirmUpdate(metricId, parseInt(editValue, 10));
                                                        } else if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            handleCancelEdit();
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.target.focus();
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    className="flex-1 px-3 py-2 bg-[#1C1C1E] border-2 border-[#007AFF] rounded-lg text-sm text-white outline-none transition-colors duration-200 focus:border-[#0056CC] cursor-text"
                                                />
                                                <button
                                                    onClick={() => handleConfirmUpdate(metricId, parseInt(editValue, 10))}
                                                    className="px-3 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-[#0056CC] transition-colors duration-200 flex items-center justify-center"
                                                    title="Save"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-3 py-2 bg-[#1C1C1E] text-[#8E8E93] border border-[#2D2D2F] rounded-lg text-sm font-medium hover:bg-[#2D2D2F] hover:text-white transition-colors duration-200 flex items-center justify-center"
                                                    title="Cancel"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-bold text-[#007AFF]">{objectiveCount}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleStartEdit(metric)}
                                                    className="px-3 py-1.5 bg-[#1C1C1E] text-[#8E8E93] border border-[#2D2D2F] rounded-lg text-xs font-medium hover:bg-[#2D2D2F] hover:text-white hover:border-[#3A3A3C] transition-all duration-200 flex items-center gap-1.5"
                                                    title="Edit objective count"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {!loading && !error && metricsArray.length === 0 && (
                <div className="text-center py-15 text-gray-400">
                    <p className="text-base">
                        No metrics yet. Create your first metric to get started!
                    </p>
                </div>
            )}
            
            <AddMetricModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onCreateMetric={handleCreateMetric}
            />
        </div>
    );
};

export default Metrics;
