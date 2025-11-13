import React, { useState } from 'react';

const AddBucketModal = ({ isOpen, onClose, onCreateBucket }) => {
    const [bucketName, setBucketName] = useState('');

    const handleCreate = () => {
        if (bucketName.trim() !== '') {
            onCreateBucket(bucketName.trim());
            setBucketName('');
            onClose();
        }
    };

    const handleCancel = () => {
        setBucketName('');
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
            <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.8)] max-w-lg w-[90%] max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-white m-0">Add New Bucket</h3>
                    <button 
                        className="bg-transparent border-none text-2xl text-gray-400 cursor-pointer p-0 w-7.5 h-7.5 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-800 hover:text-gray-200"
                        onClick={handleCancel}
                    >
                        ×
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="mb-5">
                        <label htmlFor="bucketName" className="block text-sm font-medium text-gray-200 mb-2">
                            Bucket Name
                        </label>
                        <input
                            id="bucketName"
                            type="text"
                            value={bucketName}
                            onChange={(e) => setBucketName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base bg-gray-800 text-white outline-none transition-colors duration-200 focus:border-blue-500 placeholder-gray-400 box-border"
                            placeholder="Enter bucket name..."
                            autoFocus
                        />
                    </div>
                </div>
                
                <div className="px-6 py-5 border-t border-gray-800 flex justify-end gap-3">
                    <button 
                        className="px-5 py-2.5 bg-gray-800 text-gray-200 border-none rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-gray-700 hover:text-white"
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-5 py-2.5 bg-blue-500 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        onClick={handleCreate}
                        disabled={bucketName.trim() === ''}
                    >
                        Create Bucket
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddBucketModal;