import React, { useState, useEffect } from 'react';

const UpdateMetricModal = ({ isOpen, onClose, onUpdateMetric, metric }) => {
    const [objectiveCount, setObjectiveCount] = useState('');
    const [nextDay, setNextDay] = useState('');

    useEffect(() => {
        if (metric) {
            setObjectiveCount(metric.objectiveCount?.toString() || '0');
            
            // Calculate next day's date
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const formattedDate = tomorrow.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
            });
            setNextDay(formattedDate);
        }
    }, [metric]);

    const handleUpdate = () => {
        const objectiveCountNum = parseInt(objectiveCount, 10);
        
        if (!isNaN(objectiveCountNum) && objectiveCountNum >= 0 && metric?.metricId) {
            onUpdateMetric(metric.metricId, objectiveCountNum);
        }
    };

    const handleCancel = () => {
        setObjectiveCount('');
        onClose();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleUpdate();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isOpen || !metric) return null;

    const metricName = metric.fieldName || 'Unnamed Metric';
    const currentObjectiveCount = metric.objectiveCount || 0;
    const objectiveCountNum = parseInt(objectiveCount, 10);
    const isFormValid = !isNaN(objectiveCountNum) && objectiveCountNum >= 0 && objectiveCountNum !== currentObjectiveCount;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
            <div className="bg-[#111111] border border-[#1C1C1E] rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.8)] max-w-lg w-[90%] max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-4 py-3 border-b border-[#1C1C1E] flex justify-between items-center">
                    <h3 className="text-base font-semibold text-white m-0">Update Metric Objective</h3>
                    <button 
                        className="bg-transparent border-none text-xl text-[#8E8E93] cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-[#1C1C1E] hover:text-white"
                        onClick={handleCancel}
                    >
                        ×
                    </button>
                </div>
                
                <div className="p-4">
                    <div className="mb-4 p-3 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg">
                        <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-400 mb-1">Important Notice</p>
                                <p className="text-xs text-yellow-300">
                                    Updating the objective count will reset the backlog to 0. This change will take effect from <strong>{nextDay}</strong>, not today.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <label htmlFor="metricName" className="block text-xs font-medium text-white mb-1.5">
                            Metric Name
                        </label>
                        <input
                            id="metricName"
                            type="text"
                            value={metricName}
                            disabled
                            className="w-full px-3 py-2 border-2 border-[#1C1C1E] rounded-lg text-sm bg-[#1C1C1E] text-white outline-none opacity-60 cursor-not-allowed"
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label htmlFor="currentObjective" className="block text-xs font-medium text-white mb-1.5">
                            Current Objective Count
                        </label>
                        <input
                            id="currentObjective"
                            type="number"
                            value={currentObjectiveCount}
                            disabled
                            className="w-full px-3 py-2 border-2 border-[#1C1C1E] rounded-lg text-sm bg-[#1C1C1E] text-white outline-none opacity-60 cursor-not-allowed"
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label htmlFor="objectiveCount" className="block text-xs font-medium text-white mb-1.5">
                            New Objective Count
                        </label>
                        <input
                            id="objectiveCount"
                            type="number"
                            min="0"
                            value={objectiveCount}
                            onChange={(e) => setObjectiveCount(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-3 py-2 border-2 border-[#1C1C1E] rounded-lg text-sm bg-[#1C1C1E] text-white outline-none transition-colors duration-200 focus:border-[#007AFF] placeholder-[#8E8E93] box-border"
                            placeholder="Enter new objective count..."
                            autoFocus
                        />
                    </div>
                </div>
                
                <div className="px-4 py-3 border-t border-[#1C1C1E] flex justify-end gap-2">
                    <button 
                        className="px-3 py-1.5 bg-[#1C1C1E] text-[#8E8E93] border-none rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-[#2C2C2E] hover:text-white"
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-3 py-1.5 bg-[#007AFF] text-white border-none rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-[#0056CC] disabled:bg-[#2C2C2E] disabled:text-[#8E8E93] disabled:cursor-not-allowed"
                        onClick={handleUpdate}
                        disabled={!isFormValid}
                    >
                        Update Metric
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateMetricModal;

