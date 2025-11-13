import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BucketCard from './components/BucketCard';
import AddBucketModal from './components/AddBucketModal';
import { setBuckets, setLoading, setError, updateBucket, addBucket, deleteBucket } from '../../../store/slices/bucketsSlice';
import { getAllBuckets, addNewBucket, updateBucketName, deleteBucket as deleteBucketService } from '../../../services/leadflowService';

const Buckets = () => {
    const dispatch = useDispatch();
    const { buckets, loading } = useSelector((state) => state.buckets);
    const bucketsArray = Array.isArray(buckets) ? buckets : [];
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Function to fetch buckets
    const fetchBuckets = async () => {
        try {
            dispatch(setLoading(true));
            const fetchedBuckets = await getAllBuckets();
            dispatch(setBuckets(fetchedBuckets));
            console.log('Fetched buckets:', fetchedBuckets);
        } catch (error) {
            console.error('Error fetching buckets:', error);
            dispatch(setError(error.message));
        }
    };

    // Fetch buckets on component mount
    useEffect(() => {
        fetchBuckets();
    }, []);

    // Function to handle bucket name update
    const handleUpdateBucket = async (bucketId, newName) => {
        try {
            const response = await updateBucketName(bucketId, newName);
            if (response.status_code === 200) {
                dispatch(updateBucket({ id: bucketId, name: newName }));
                console.log('Bucket updated successfully:', response.content);
                // notify widget of updated buckets
                try {
                    const updated = bucketsArray.map(b => b.id === bucketId ? { ...b, name: newName } : b);
                    console.log('Main: Sending bucket update to widget:', updated);
                    if (window && window.electronAPI && window.electronAPI.sendToWidget) {
                        const result = await window.electronAPI.sendToWidget('buckets-updated', updated);
                        console.log('Main: sendToWidget update result:', result);
                    } else {
                        console.warn('Main: electronAPI.sendToWidget not available for update');
                    }
                } catch (err) {
                    console.error('Failed to notify widget about updated bucket:', err);
                }
            } else {
                console.error('Failed to update bucket:', response);
            }
        } catch (error) {
            console.error('Error updating bucket:', error);
        }
    };

    // Function to handle bucket creation
    const handleCreateBucket = async (bucketName) => {
        try {
            const response = await addNewBucket(bucketName);
            // treat any 2xx as success
            if (response && response.status_code >= 200 && response.status_code < 300) {
                // Normalize response content which may be nested or use different field names
                let content = response.content || {};
                if (content.content && typeof content.content === 'object') content = content.content;

                // service now returns a normalized content when possible
                const id = content.id || content.bucketId || content._id || `bucket-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                const name = content.name || content.bucketName || bucketName;

                const newBucket = { id: String(id), name, ...content };

                dispatch(addBucket(newBucket));
                console.log('Bucket created successfully:', newBucket, 'raw response:', response);

                // Notify widget/overlay about updated buckets so its dropdown stays in sync
                try {
                    const updated = Array.isArray(bucketsArray) ? [...bucketsArray, newBucket] : [newBucket];
                    console.log('Main: Sending buckets-updated to widget:', updated);
                    if (window && window.electronAPI && window.electronAPI.sendToWidget) {
                        const result = await window.electronAPI.sendToWidget('buckets-updated', updated);
                        console.log('Main: sendToWidget result:', result);
                    } else {
                        console.warn('Main: electronAPI.sendToWidget not available');
                    }
                } catch (err) {
                    console.error('Failed to notify widget about new bucket:', err);
                }
            } else {
                console.error('Failed to create bucket: ', response);
            }
        } catch (error) {
            console.error('Error creating bucket:', error);
        }
    };

    // Function to handle bucket deletion
    const handleDeleteBucket = async (bucketId) => {
        try {
            const response = await deleteBucketService(bucketId);
            if (response.status_code === 200) {
                dispatch(deleteBucket(bucketId));
                console.log('Bucket deleted successfully:', response.content);
                // notify widget of updated buckets
                try {
                    const updated = bucketsArray.filter(b => b.id !== bucketId);
                    console.log('Main: Sending bucket delete to widget:', updated);
                    if (window && window.electronAPI && window.electronAPI.sendToWidget) {
                        const result = await window.electronAPI.sendToWidget('buckets-updated', updated);
                        console.log('Main: sendToWidget delete result:', result);
                    } else {
                        console.warn('Main: electronAPI.sendToWidget not available for delete');
                    }
                } catch (err) {
                    console.error('Failed to notify widget about deleted bucket:', err);
                }
            } else {
                console.error('Failed to delete bucket:', response);
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
                            onClick={fetchBuckets}
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
            ) : (
                <div className={`transition-all duration-300 ${
                    viewMode === 'grid' 
                        ? 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5' 
                        : 'flex flex-col gap-3'
                }`}>
                        {bucketsArray.map((bucket, index) => (
                            <BucketCard
                                key={bucket && bucket.id ? bucket.id : `bucket-${index}`}
                                bucket={bucket}
                                onUpdateBucket={handleUpdateBucket}
                                onDeleteBucket={handleDeleteBucket}
                                viewMode={viewMode}
                            />
                        ))}
                </div>
            )}
            
                {!loading && bucketsArray.length === 0 && (
                <div className="text-center py-15 text-gray-400">
                    <p className="text-base">No buckets yet. Create your first bucket to get started!</p>
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