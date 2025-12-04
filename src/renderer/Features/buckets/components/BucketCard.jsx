import React, { useState } from 'react';

const BucketCard = ({ bucket, onUpdateBucket, onDeleteBucket, viewMode = 'grid' }) => {
    const [isEditing, setIsEditing] = useState(false);
    // Get bucket ID - support both bucketId and id fields
    const bucketId = bucket.bucketId || bucket.id || bucket.bucket_id;
    // Get bucket name - support both bucketName and name fields
    const bucketName = bucket.bucketName || bucket.name || bucket.bucket_name || '';
    const [editName, setEditName] = useState(bucketName);

    const handleSave = () => {
        if (editName.trim() !== bucketName && editName.trim() !== '') {
            onUpdateBucket(bucketId, editName.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditName(bucketName);
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
            <div className="bg-[#111111] border border-[#1C1C1E] rounded-lg p-3 transition-all duration-200 hover:bg-[#1C1C1E] hover:border-[#3A3A3C]">
                <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1 pb-2 border-b border-[#1C1C1E]">
                        <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">ID:</span>
                        <span className="text-xs text-[#8E8E93] font-mono break-all leading-relaxed py-1 px-2 bg-[#1C1C1E] rounded select-all">{bucketId || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="flex-1 text-sm font-semibold text-white bg-[#1C1C1E] border-2 border-[#007AFF] rounded-md px-2 py-1.5 outline-none"
                                    autoFocus
                                />
                                <div className="flex gap-1 items-center">
                                    <button 
                                        className="w-7 h-7 flex items-center justify-center bg-transparent text-[#8E8E93] text-base font-bold cursor-pointer transition-all duration-300 hover:text-[#34C759] hover:scale-110"
                                        onClick={handleSave}
                                        title="Save changes"
                                    >
                                        ✓
                                    </button>
                                    <button 
                                        className="w-7 h-7 flex items-center justify-center bg-transparent text-[#8E8E93] text-sm font-bold cursor-pointer transition-all duration-300 hover:text-[#FF3B30] hover:scale-110"
                                        onClick={handleCancel}
                                        title="Cancel editing"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 text-base font-semibold text-white">{bucketName}</span>
                                <div className="flex gap-1 items-center">
                                    <button 
                                        className="bg-transparent text-[#8E8E93] text-sm cursor-pointer transition-all duration-300 hover:text-[#007AFF] hover:scale-110"
                                        onClick={() => setIsEditing(true)}
                                        title="Edit bucket name"
                                    >
                                        ✎
                                    </button>
                                    <button 
                                        className="bg-transparent text-[#8E8E93] text-sm cursor-pointer transition-all duration-300 hover:text-[#FF3B30] hover:scale-110"
                                        onClick={() => onDeleteBucket(bucketId)}
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
        <div className="bg-[#111111] border border-[#1C1C1E] rounded-xl p-3 transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:border-[#3A3A3C] flex flex-col min-h-[120px]">
            <div className="flex flex-col gap-3 h-full">
                <div className="flex flex-col gap-1 pb-2 border-b border-[#1C1C1E]">
                    <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wide">ID:</span>
                    <span className="text-xs text-[#8E8E93] font-mono break-all leading-relaxed py-1 px-2 bg-[#1C1C1E] rounded select-all">{bucketId || 'N/A'}</span>
                </div>
                
                <div className="flex items-center gap-2 flex-1">
                    {isEditing ? (
                        <>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className="flex-1 w-full text-base font-semibold text-white bg-[#1C1C1E] border-2 border-[#007AFF] rounded-md px-2 py-1.5 outline-none"
                                autoFocus
                            />
                            <div className="flex gap-1 items-center">
                                <button 
                                    className="w-7 h-7 flex items-center justify-center bg-transparent text-[#8E8E93] text-base font-bold cursor-pointer transition-all duration-300 hover:text-[#34C759] hover:scale-110"
                                    onClick={handleSave}
                                    title="Save changes"
                                >
                                    ✓
                                </button>
                                <button 
                                    className="w-7 h-7 flex items-center justify-center bg-transparent text-[#8E8E93] text-sm font-bold cursor-pointer transition-all duration-300 hover:text-[#FF3B30] hover:scale-110"
                                    onClick={handleCancel}
                                    title="Cancel editing"
                                >
                                    ✕
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-base font-semibold text-white flex-1 leading-tight">{bucketName}</h3>
                            <div className="flex gap-1 items-center">
                                <button 
                                    className="bg-transparent text-[#8E8E93] text-sm cursor-pointer transition-all duration-300 hover:text-[#007AFF] hover:scale-110"
                                    onClick={() => setIsEditing(true)}
                                    title="Edit bucket name"
                                >
                                    ✎
                                </button>
                                <button 
                                    className="bg-transparent text-[#8E8E93] text-sm cursor-pointer transition-all duration-300 hover:text-[#FF3B30] hover:scale-110"
                                    onClick={() => onDeleteBucket(bucketId)}
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