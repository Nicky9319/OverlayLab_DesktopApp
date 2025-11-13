import React, { useState, useEffect } from 'react';
import LeadsContainer from './components/LeadsContainer';
import { getAllLeads, updateLeadStatus as apiUpdateLeadStatus, updateLeadNotes as apiUpdateLeadNotes, deleteLead as apiDeleteLead, moveLeadToBucket as apiMoveLeadToBucket, getAllBuckets } from '../../../services/leadflowService';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [selectedBucketId, setSelectedBucketId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bucketsLoading, setBucketsLoading] = useState(true);

  // Fetch leads from API
  const fetchLeads = async (bucketId = null) => {
    try {
      setLoading(true);
      const leadsData = await getAllLeads(bucketId);
      setLeads(leadsData);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch buckets from API
  const fetchBuckets = async () => {
    try {
      setBucketsLoading(true);
      const bucketsData = await getAllBuckets();
      setBuckets(bucketsData);
    } catch (error) {
      console.error('Error fetching buckets:', error);
      setBuckets([]);
    } finally {
      setBucketsLoading(false);
    }
  };

  // Function to update lead notes
  const updateLeadNotes = async (leadId, newNotes) => {
    try {
      const response = await apiUpdateLeadNotes(leadId, newNotes);
      if (response.status_code === 200) {
        // Update local state on successful API call
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.leadId === leadId 
              ? { ...lead, notes: newNotes }
              : lead
          )
        );
        console.log('Notes updated successfully for lead:', leadId);
      } else {
        console.error('Failed to update notes:', response.content);
      }
    } catch (error) {
      console.error('Error updating lead notes:', error);
    }
  };

  // Function to update lead status
  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const response = await apiUpdateLeadStatus(leadId, newStatus);
      if (response.status_code === 200) {
        // Update local state on successful API call
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.leadId === leadId 
              ? { ...lead, status: newStatus }
              : lead
          )
        );
        console.log('Status updated successfully for lead:', leadId);
      } else {
        console.error('Failed to update status:', response.content);
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  // Function to delete lead
  const deleteLead = async (leadId) => {
    try {
      const response = await apiDeleteLead(leadId, selectedBucketId);
      if (response.status_code === 200) {
        // Remove lead from local state on successful API call
        setLeads(prevLeads => 
          prevLeads.filter(lead => lead.leadId !== leadId)
        );
        console.log('Lead deleted successfully:', leadId);
      } else {
        console.error('Failed to delete lead:', response.content);
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  // Function to move lead to different bucket
  const moveLeadToBucket = async (leadId, targetBucketId, sourceBucketId) => {
    try {
      console.log('Moving lead:', { leadId, targetBucketId, sourceBucketId });
      const response = await apiMoveLeadToBucket(leadId, targetBucketId, sourceBucketId);
      
      if (response.status_code === 200) {
        // Remove lead from current bucket's leads list
        setLeads(prevLeads => 
          prevLeads.filter(lead => lead.leadId !== leadId)
        );
        
        // If we're currently viewing the source bucket, the lead should disappear
        // If we're viewing the target bucket, we should refresh to show the moved lead
        if (selectedBucketId === targetBucketId) {
          // Refresh leads to show the moved lead in the target bucket
          await fetchLeads(targetBucketId);
        }
        
        console.log('Lead moved successfully to bucket:', targetBucketId);
      } else {
        console.error('Failed to move lead:', response.content);
        throw new Error(response.content?.detail || 'Failed to move lead');
      }
    } catch (error) {
      console.error('Error moving lead:', error);
      throw error; // Re-throw to let the BucketSelector handle the error
    }
  };

  // Handle bucket selection
  const handleBucketChange = (bucketId) => {
    setSelectedBucketId(bucketId);
    fetchLeads(bucketId);
  };

  // Handle refetch all leads
  const handleRefetchLeads = () => {
    fetchLeads(selectedBucketId);
  };

  // Fetch buckets and leads on component mount
  useEffect(() => {
    const loadData = async () => {
      // Fetch buckets first
      const bucketsData = await getAllBuckets();
      setBuckets(bucketsData);
      setBucketsLoading(false);
      
      // Set first bucket as default if available
      if (bucketsData.length > 0) {
        const firstBucketId = bucketsData[0].id;
        setSelectedBucketId(firstBucketId);
        await fetchLeads(firstBucketId);
      } else {
        // If no buckets, load all leads
        await fetchLeads();
      }
    };

    loadData();
  }, []);


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
                onChange={(e) => handleBucketChange(e.target.value)}
                className="px-3 py-2 bg-[#1C1C1E] border border-[#007AFF] rounded-md text-[#E5E5E7] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
              >
                {buckets.map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>
                    {bucket.name}
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
            Showing {leads.length} leads from bucket: {buckets.find(b => b.id === selectedBucketId)?.name || 'Unknown'}
          </div>
        </div>
        
        <LeadsContainer 
          leads={leads} 
          updateLeadNotes={updateLeadNotes} 
          updateLeadStatus={updateLeadStatus} 
          deleteLead={deleteLead}
          moveLeadToBucket={moveLeadToBucket}
          buckets={buckets}
          currentBucketId={selectedBucketId}
        />
      </div>
    </div>
  );
};

export default Leads;
