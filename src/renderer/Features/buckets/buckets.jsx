import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BucketCard from './components/BucketCard';
import AddBucketModal from './components/AddBucketModal';
import { fetchBuckets, createBucket, updateBucketName, removeBucket } from '../../../store/thunks/bucketsThunks';
import { fetchTeamBuckets, createTeamBucket, updateTeamBucketName, removeTeamBucket } from '../../../store/thunks/teamBucketsThunks';
import { setBuckets } from '../../../store/slices/bucketsSlice';

const Buckets = () => {
    const dispatch = useDispatch();
    const { buckets, loading, error } = useSelector((state) => state.buckets);
    const { viewMode: teamViewMode, selectedTeamId } = useSelector((state) => state.teams);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Filter buckets based on view mode to ensure we only show relevant buckets
    let bucketsArray = Array.isArray(buckets) ? buckets : [];
    
    console.log('Buckets component: Raw buckets from Redux', { 
        count: bucketsArray.length, 
        teamViewMode, 
        selectedTeamId,
        rawBuckets: buckets,
        bucketsArray: bucketsArray.map(b => ({ 
            bucketId: b.bucketId || b.id, 
            bucketName: b.bucketName || b.name, 
            teamId: b.teamId || b.team_id,
            customerId: b.customerId,
            fullBucket: b
        }))
    });
    
    if (teamViewMode === 'team' && selectedTeamId) {
        // In team mode, only show buckets for the selected team (filter out personal buckets)
        bucketsArray = bucketsArray.filter(bucket => {
            const bucketTeamId = bucket.teamId || bucket.team_id;
            const matches = bucketTeamId === selectedTeamId && !bucket.customerId;
            if (!matches && bucketTeamId) {
                console.log('Buckets component: Filtered out bucket (team mode)', {
                    bucketId: bucket.bucketId || bucket.id,
                    bucketTeamId,
                    selectedTeamId,
                    hasCustomerId: !!bucket.customerId
                });
            }
            return matches;
        });
    } else if (teamViewMode === 'customer') {
        // In customer mode, only show personal buckets (filter out team buckets)
        bucketsArray = bucketsArray.filter(bucket => {
            const hasTeamId = !!(bucket.teamId || bucket.team_id);
            if (hasTeamId) {
                console.log('Buckets component: Filtered out bucket (customer mode)', {
                    bucketId: bucket.bucketId || bucket.id,
                    teamId: bucket.teamId || bucket.team_id
                });
            }
            return !hasTeamId;
        });
    }
    
    console.log('Buckets component: Filtered buckets array', { 
        count: bucketsArray.length, 
        teamViewMode, 
        selectedTeamId,
        filteredBuckets: bucketsArray.map(b => ({ 
            bucketId: b.bucketId || b.id, 
            bucketName: b.bucketName || b.name,
            teamId: b.teamId || b.team_id
        }))
    });

    // Fetch buckets based on view mode
    useEffect(() => {
        if (teamViewMode === 'team' && selectedTeamId) {
            // Clear buckets first, then fetch team buckets
            dispatch(setBuckets([], false));
            dispatch(fetchTeamBuckets(selectedTeamId));
        } else if (teamViewMode === 'customer') {
            // Clear buckets first, then fetch customer buckets
            dispatch(setBuckets([], false));
            dispatch(fetchBuckets());
        } else {
            // Clear buckets if in team mode but no team selected
            dispatch(setBuckets([]));
        }
    }, [dispatch, teamViewMode, selectedTeamId]);

    // Function to handle bucket name update
    const handleUpdateBucket = async (bucketId, newName) => {
        try {
            let result;
            if (teamViewMode === 'team' && selectedTeamId) {
                result = await dispatch(updateTeamBucketName({ teamId: selectedTeamId, bucketId, bucketName: newName }));
            } else {
                result = await dispatch(updateBucketName({ bucketId, bucketName: newName }));
            }
            
            if ((teamViewMode === 'team' ? updateTeamBucketName.fulfilled : updateBucketName.fulfilled).match(result)) {
                console.log('Bucket updated successfully');
                // Notify widget of updated buckets
                try {
                    const updated = bucketsArray.map(b => 
                        (b.bucketId === bucketId || b.id === bucketId) 
                            ? { ...b, bucketName: newName, name: newName } 
                            : b
                    );
                    console.log('Main: Sending bucket update to widget:', updated);
                    if (window && window.electronAPI && window.electronAPI.sendToWidget) {
                        await window.electronAPI.sendToWidget('buckets-updated', updated);
                    }
                } catch (err) {
                    console.error('Failed to notify widget about updated bucket:', err);
                }
            } else {
                console.error('Failed to update bucket:', result.error);
            }
        } catch (error) {
            console.error('Error updating bucket:', error);
        }
    };

    // Function to handle bucket creation
    const handleCreateBucket = async (bucketName) => {
        try {
            let result;
            if (teamViewMode === 'team' && selectedTeamId) {
                result = await dispatch(createTeamBucket({ teamId: selectedTeamId, bucketName }));
            } else {
                result = await dispatch(createBucket(bucketName));
            }
            
            if ((teamViewMode === 'team' ? createTeamBucket.fulfilled : createBucket.fulfilled).match(result)) {
                console.log('Bucket created successfully:', result.payload);
                
                // Notify widget/overlay about updated buckets so its dropdown stays in sync
                try {
                    const updated = [...bucketsArray, result.payload];
                    console.log('Main: Sending buckets-updated to widget:', updated);
                    if (window && window.electronAPI && window.electronAPI.sendToWidget) {
                        await window.electronAPI.sendToWidget('buckets-updated', updated);
                    }
                } catch (err) {
                    console.error('Failed to notify widget about new bucket:', err);
                }
            } else {
                console.error('Failed to create bucket:', result.error);
            }
        } catch (error) {
            console.error('Error creating bucket:', error);
        }
    };

    // Function to handle bucket deletion
    const handleDeleteBucket = async (bucketId) => {
        try {
            let result;
            if (teamViewMode === 'team' && selectedTeamId) {
                result = await dispatch(removeTeamBucket({ teamId: selectedTeamId, bucketId }));
            } else {
                result = await dispatch(removeBucket(bucketId));
            }
            
            if ((teamViewMode === 'team' ? removeTeamBucket.fulfilled : removeBucket.fulfilled).match(result)) {
                console.log('Bucket deleted successfully');
                // Notify widget of updated buckets
                try {
                    const updated = bucketsArray.filter(b => 
                        b.bucketId !== bucketId && b.id !== bucketId
                    );
                    console.log('Main: Sending bucket delete to widget:', updated);
                    if (window && window.electronAPI && window.electronAPI.sendToWidget) {
                        await window.electronAPI.sendToWidget('buckets-updated', updated);
                    }
                } catch (err) {
                    console.error('Failed to notify widget about deleted bucket:', err);
                }
            } else {
                console.error('Failed to delete bucket:', result.error);
            }
        } catch (error) {
            console.error('Error deleting bucket:', error);
        }
    };

    return (
        <div className="p-5 max-w-6xl mx-auto bg-black min-h-screen">
            <div className="mb-8">
                <div className="flex justify-between items-start gap-5 flex-wrap">
                    <div className="flex-1">
                        <h2 className="text-3xl font-semibold text-white mb-2">Buckets</h2>
                        <p className="text-base text-gray-400">Organize your leads into different categories</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex border border-gray-800 rounded-lg overflow-hidden bg-gray-900">
                            <button 
                                className={`px-4 py-2 text-sm flex items-center gap-1.5 transition-all duration-200 ${
                                    viewMode === 'grid' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                }`}
                                onClick={() => setViewMode('grid')}
                            >
                                <span className="text-base">⊞</span>
                                Grid
                            </button>
                            <button 
                                className={`px-4 py-2 text-sm flex items-center gap-1.5 transition-all duration-200 ${
                                    viewMode === 'list' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                }`}
                                onClick={() => setViewMode('list')}
                            >
                                <span className="text-base">☰</span>
                                List
                            </button>
                        </div>
                        
                        <button 
                            className="px-4 py-2.5 bg-gray-900 text-gray-200 border border-gray-800 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:bg-gray-800 hover:border-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => {
                                if (teamViewMode === 'team' && selectedTeamId) {
                                    dispatch(fetchTeamBuckets(selectedTeamId));
                                } else {
                                    dispatch(fetchBuckets());
                                }
                            }}
                            disabled={loading}
                        >
                            <span className="text-base">↻</span>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                        
                        <button 
                            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors duration-200 hover:bg-blue-600"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <span className="text-lg font-bold">+</span>
                            Add Bucket
                        </button>
                    </div>
                </div>
            </div>
            
            {loading ? (
                <div className="text-center py-15 text-gray-400">
                    <div className="w-10 h-10 border-3 border-gray-800 border-t-blue-500 rounded-full mx-auto mb-2.5 animate-spin"></div>
                    <p className="text-base">Loading buckets...</p>
                </div>
            ) : error && teamViewMode === 'team' && selectedTeamId ? (
                <div className="text-center py-15">
                    <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-base text-red-400 mb-2">Error loading team buckets</p>
                    <p className="text-sm text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => dispatch(fetchTeamBuckets(selectedTeamId))}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <div className={`transition-all duration-300 ${
                    viewMode === 'grid' 
                        ? 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5' 
                        : 'flex flex-col gap-3'
                }`}>
                        {bucketsArray.map((bucket, index) => (
                            <BucketCard
                                key={bucket && (bucket.bucketId || bucket.id) ? (bucket.bucketId || bucket.id) : `bucket-${index}`}
                                bucket={bucket}
                                onUpdateBucket={handleUpdateBucket}
                                onDeleteBucket={handleDeleteBucket}
                                viewMode={viewMode}
                            />
                        ))}
                </div>
            )}
            
            {!loading && !error && bucketsArray.length === 0 && (
                <div className="text-center py-15 text-gray-400">
                    <p className="text-base">
                        {teamViewMode === 'team' && selectedTeamId 
                            ? 'No buckets yet for this team. Create your first team bucket to get started!' 
                            : 'No buckets yet. Create your first bucket to get started!'}
                    </p>
                </div>
            )}
            
            <AddBucketModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreateBucket={handleCreateBucket}
            />
        </div>
    );
};

export default Buckets;