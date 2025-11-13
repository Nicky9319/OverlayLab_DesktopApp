import React, { useState } from 'react';

const BucketCard = ({ bucket, onUpdateBucket, onDeleteBucket, viewMode = 'grid' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(bucket.name);

    const handleSave = () => {
        if (editName.trim() !== bucket.name && editName.trim() !== '') {
            onUpdateBucket(bucket.id, editName.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditName(bucket.name);
        setIsEditing(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (viewMode === 'list') {
        return (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 transition-all duration-200 hover:bg-gray-800 hover:border-gray-700">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5 pb-2 border-b border-gray-800">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ID:</span>
                        <span className="text-xs text-gray-400 font-mono break-all leading-relaxed py-1.5 px-2 bg-gray-800 rounded select-all">{bucket.id}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="flex-1 text-base font-semibold text-white bg-gray-800 border-2 border-blue-500 rounded-md px-3 py-2 outline-none"
                                    autoFocus
                                />
                                <div className="flex gap-1.5 items-center">
                                    <button 
                                        className="w-9 h-9 flex items-center justify-center bg-transparent text-gray-400 text-xl font-bold cursor-pointer transition-all duration-300 hover:text-green-400 hover:shadow-[0_0_8px_rgba(34,197,94,0.6)] hover:scale-110"
                                        onClick={handleSave}
                                        title="Save changes"
                                    >
                                        ✓
                                    </button>
                                    <button 
                                        className="w-9 h-9 flex items-center justify-center bg-transparent text-gray-400 text-lg font-bold cursor-pointer transition-all duration-300 hover:text-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)] hover:scale-110"
                                        onClick={handleCancel}
                                        title="Cancel editing"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 text-lg font-semibold text-white">{bucket.name}</span>
                                <div className="flex gap-1.5 items-center">
                                    <button 
                                        className="bg-transparent text-gray-400 text-base cursor-pointer transition-all duration-300 hover:text-blue-500 hover:shadow-[0_0_8px_rgba(59,130,246,0.6)] hover:scale-110"
                                        onClick={() => setIsEditing(true)}
                                        title="Edit bucket name"
                                    >
                                        ✎
                                    </button>
                                    <button 
                                        className="bg-transparent text-gray-400 text-base cursor-pointer transition-all duration-300 hover:text-red-500 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)] hover:scale-110"
                                        onClick={() => onDeleteBucket(bucket.id)}
                                        title="Delete bucket"
                                    >
                                        🗑
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Grid view (default)
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4.5 transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:border-gray-700 flex flex-col min-h-[140px]">
            <div className="flex flex-col gap-4 h-full">
                <div className="flex flex-col gap-1.5 pb-3 border-b border-gray-800">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ID:</span>
                    <span className="text-xs text-gray-400 font-mono break-all leading-relaxed py-1.5 px-2 bg-gray-800 rounded select-all">{bucket.id}</span>
                </div>
                
                <div className="flex items-center gap-2.5 flex-1">
                    {isEditing ? (
                        <>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="flex-1 w-full text-lg font-semibold text-white bg-gray-800 border-2 border-blue-500 rounded-md px-3 py-2 outline-none"
                                autoFocus
                            />
                            <div className="flex gap-1.5 items-center">
                                <button 
                                    className="w-9 h-9 flex items-center justify-center bg-transparent text-gray-400 text-xl font-bold cursor-pointer transition-all duration-300 hover:text-green-400 hover:shadow-[0_0_8px_rgba(34,197,94,0.6)] hover:scale-110"
                                    onClick={handleSave}
                                    title="Save changes"
                                >
                                    ✓
                                </button>
                                <button 
                                    className="w-9 h-9 flex items-center justify-center bg-transparent text-gray-400 text-lg font-bold cursor-pointer transition-all duration-300 hover:text-red-400 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)] hover:scale-110"
                                    onClick={handleCancel}
                                    title="Cancel editing"
                                >
                                    ✕
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-semibold text-white flex-1 leading-tight">{bucket.name}</h3>
                            <div className="flex gap-1.5 items-center">
                                <button 
                                    className="bg-transparent text-gray-400 text-base cursor-pointer transition-all duration-300 hover:text-blue-500 hover:shadow-[0_0_8px_rgba(59,130,246,0.6)] hover:scale-110"
                                    onClick={() => setIsEditing(true)}
                                    title="Edit bucket name"
                                >
                                    ✎
                                </button>
                                <button 
                                    className="bg-transparent text-gray-400 text-base cursor-pointer transition-all duration-300 hover:text-red-500 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)] hover:scale-110"
                                    onClick={() => onDeleteBucket(bucket.id)}
                                    title="Delete bucket"
                                >
                                    🗑
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BucketCard;