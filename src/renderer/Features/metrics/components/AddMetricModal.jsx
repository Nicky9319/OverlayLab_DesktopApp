import React, { useState } from 'react';

const AddMetricModal = ({ isOpen, onClose, onCreateMetric }) => {
    const [fieldName, setFieldName] = useState('');
    const [objectiveCount, setObjectiveCount] = useState('');

    const handleCreate = () => {
        const fieldNameTrimmed = fieldName.trim();
        const objectiveCountNum = parseInt(objectiveCount, 10);
        
        if (fieldNameTrimmed !== '' && !isNaN(objectiveCountNum) && objectiveCountNum >= 0) {
            onCreateMetric(fieldNameTrimmed, objectiveCountNum);
            setFieldName('');
            setObjectiveCount('');
            onClose();
        }
    };

    const handleCancel = () => {
        setFieldName('');
        setObjectiveCount('');
        onClose();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleCreate();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isOpen) return null;

    const isFormValid = fieldName.trim() !== '' && !isNaN(parseInt(objectiveCount, 10)) && parseInt(objectiveCount, 10) >= 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
            <div className="bg-[#111111] border border-[#1C1C1E] rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.8)] max-w-lg w-[90%] max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-4 py-3 border-b border-[#1C1C1E] flex justify-between items-center">
                    <h3 className="text-base font-semibold text-white m-0">Add New Metric</h3>
                    <button 
                        className="bg-transparent border-none text-xl text-[#8E8E93] cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-[#1C1C1E] hover:text-white"
                        onClick={handleCancel}
                    >
                        ×
                    </button>
                </div>
                
                <div className="p-4">
                    <div className="mb-4">
                        <label htmlFor="fieldName" className="block text-xs font-medium text-white mb-1.5">
                            Metric Name
                        </label>
                        <input
                            id="fieldName"
                            type="text"
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-3 py-2 border-2 border-[#1C1C1E] rounded-lg text-sm bg-[#1C1C1E] text-white outline-none transition-colors duration-200 focus:border-[#007AFF] placeholder-[#8E8E93] box-border"
                            placeholder="Enter metric name..."
                            autoFocus
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label htmlFor="objectiveCount" className="block text-xs font-medium text-white mb-1.5">
                            Objective Count
                        </label>
                        <input
                            id="objectiveCount"
                            type="number"
                            min="0"
                            value={objectiveCount}
                            onChange={(e) => setObjectiveCount(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-3 py-2 border-2 border-[#1C1C1E] rounded-lg text-sm bg-[#1C1C1E] text-white outline-none transition-colors duration-200 focus:border-[#007AFF] placeholder-[#8E8E93] box-border"
                            placeholder="Enter objective count..."
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
                        onClick={handleCreate}
                        disabled={!isFormValid}
                    >
                        Create Metric
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMetricModal;



