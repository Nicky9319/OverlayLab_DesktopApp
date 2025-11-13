import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LeadsContainer from './components/LeadsContainer';
import { fetchLeads, updateLeadStatus, updateLeadNotes, removeLead, moveLeadToBucket } from '../../../store/thunks/leadsThunks';
import { fetchBuckets } from '../../../store/thunks/bucketsThunks';
import { setSelectedBucketId } from '../../../store/slices/leadsSlice';

const Leads = () => {
  const dispatch = useDispatch();
  
  // Get data from Redux state
  const { leads, loading, selectedBucketId } = useSelector((state) => state.leads);
  const { buckets, loading: bucketsLoading } = useSelector((state) => state.buckets);

  // Filter leads by selected bucket (if a bucket is selected)
  const filteredLeads = selectedBucketId 
    ? leads.filter(lead => lead.bucketId === selectedBucketId || lead.bucket_id === selectedBucketId)
    : leads;

  // Fetch buckets and leads on component mount
  useEffect(() => {
    const loadData = async () => {
      // Fetch buckets first
      const bucketsResult = await dispatch(fetchBuckets());
      
      // Get buckets from the result or from Redux state
      let bucketsData = [];
      if (fetchBuckets.fulfilled.match(bucketsResult)) {
        bucketsData = bucketsResult.payload;
      } else {
        // Fallback: get from current state
        bucketsData = buckets;
      }
      
      // Set first bucket as default if available
      if (bucketsData.length > 0) {
        const firstBucketId = bucketsData[0].bucketId || bucketsData[0].id;
        dispatch(setSelectedBucketId(firstBucketId));
        await dispatch(fetchLeads(firstBucketId));
      } else {
        // If no buckets, load all leads
        await dispatch(fetchLeads(null));
      }
    };

    loadData();
  }, [dispatch]); // Only run on mount

  // Handle bucket selection
  const handleBucketChange = (bucketId) => {
    dispatch(setSelectedBucketId(bucketId));
    dispatch(fetchLeads(bucketId || null));
  };

  // Handle refetch all leads
  const handleRefetchLeads = () => {
    dispatch(fetchLeads(selectedBucketId));
  };

  // Function to update lead notes
  const handleUpdateLeadNotes = async (leadId, newNotes) => {
    try {
      const result = await dispatch(updateLeadNotes({ leadId, notes: newNotes }));
      if (updateLeadNotes.fulfilled.match(result)) {
        console.log('Notes updated successfully for lead:', leadId);
      } else {
        console.error('Failed to update notes:', result.error);
      }
    } catch (error) {
      console.error('Error updating lead notes:', error);
    }
  };

  // Function to update lead status
  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      const result = await dispatch(updateLeadStatus({ leadId, status: newStatus }));
      if (updateLeadStatus.fulfilled.match(result)) {
        console.log('Status updated successfully for lead:', leadId);
      } else {
        console.error('Failed to update status:', result.error);
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  // Function to delete lead
  const handleDeleteLead = async (leadId) => {
    try {
      const result = await dispatch(removeLead({ leadId, bucketId: selectedBucketId }));
      if (removeLead.fulfilled.match(result)) {
        console.log('Lead deleted successfully:', leadId);
      } else {
        console.error('Failed to delete lead:', result.error);
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  // Function to move lead to different bucket
  const handleMoveLeadToBucket = async (leadId, targetBucketId, sourceBucketId) => {
    try {
      console.log('Moving lead:', { leadId, targetBucketId, sourceBucketId });
      const result = await dispatch(moveLeadToBucket({ leadId, targetBucketId, sourceBucketId }));
      
      if (moveLeadToBucket.fulfilled.match(result)) {
        // If we're currently viewing the target bucket, refresh to show the moved lead
        if (selectedBucketId === targetBucketId) {
          await dispatch(fetchLeads(targetBucketId));
        }
        console.log('Lead moved successfully to bucket:', targetBucketId);
      } else {
        console.error('Failed to move lead:', result.error);
        throw new Error(result.error || 'Failed to move lead');
      }
    } catch (error) {
      console.error('Error moving lead:', error);
      throw error; // Re-throw to let the BucketSelector handle the error
    }
  };


  if (loading || bucketsLoading) {
    return (
      <div className="leads-page p-6 bg-[#000000] min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#8E8E93]">{bucketsLoading ? 'Loading buckets...' : 'Loading leads...'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leads-page p-6 bg-[#000000] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#FFFFFF] mb-2">Leads</h1>
          <p className="text-[#8E8E93] mb-4">
            Browse through your leads one at a time with our card-based interface
          </p>
          
          {/* Bucket Selection and Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label htmlFor="bucket-select" className="text-sm font-medium text-[#E5E5E7]">
                Filter by Bucket:
              </label>
              <select
                id="bucket-select"
                value={selectedBucketId || ''}
                onChange={(e) => handleBucketChange(e.target.value || null)}
                className="px-3 py-2 bg-[#1C1C1E] border border-[#007AFF] rounded-md text-[#E5E5E7] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
              >
                <option value="">All Leads</option>
                {buckets.map((bucket) => (
                  <option key={bucket.bucketId || bucket.id} value={bucket.bucketId || bucket.id}>
                    {bucket.bucketName || bucket.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleRefetchLeads}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-md hover:bg-[#0056CC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refetch Leads
                </>
              )}
            </button>
          </div>
          
          {/* Lead count display */}
          <div className="text-sm text-[#8E8E93] mb-4">
            Showing {filteredLeads.length} leads {selectedBucketId ? `from bucket: ${buckets.find(b => (b.bucketId || b.id) === selectedBucketId)?.bucketName || buckets.find(b => (b.bucketId || b.id) === selectedBucketId)?.name || 'Unknown'}` : '(all buckets)'}
          </div>
        </div>
        
        <LeadsContainer 
          leads={filteredLeads} 
          updateLeadNotes={handleUpdateLeadNotes} 
          updateLeadStatus={handleUpdateLeadStatus} 
          deleteLead={handleDeleteLead}
          moveLeadToBucket={handleMoveLeadToBucket}
          buckets={buckets}
          currentBucketId={selectedBucketId}
        />
      </div>
    </div>
  );
};

export default Leads;
