import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LeadsContainer from './components/LeadsContainer';
import { fetchLeads, updateLeadStatus, updateLeadContext, updateLeadCheckpoint, removeLead, moveLeadToBucket } from '../../../store/thunks/leadsThunks';
import { fetchBuckets } from '../../../store/thunks/bucketsThunks';
import { fetchTeamBuckets } from '../../../store/thunks/teamBucketsThunks';
import { fetchTeamLeads, updateTeamLeadStatus, updateTeamLeadNotes, updateTeamLeadCheckpoint, removeTeamLead, moveTeamLeadToBucket } from '../../../store/thunks/teamLeadsThunks';
import { setSelectedBucketId } from '../../../store/slices/leadsSlice';

const Leads = () => {
  const dispatch = useDispatch();
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  
  // Get view mode and selected team
  const { viewMode, selectedTeamId, teams } = useSelector((state) => state.teams);
  
  // Read directly from Redux state based on view mode - no filtering needed
  const bucketsState = viewMode === 'team' && selectedTeamId
    ? useSelector((state) => state.buckets?.teams?.[selectedTeamId] || { buckets: [], loading: false, error: null, selectedBucketId: null })
    : useSelector((state) => state.buckets?.personal || { buckets: [], loading: false, error: null, selectedBucketId: null });
  
  const leadsState = viewMode === 'team' && selectedTeamId
    ? useSelector((state) => state.leads.teams[selectedTeamId] || { leads: [], loading: false, error: null, selectedBucketId: null })
    : useSelector((state) => state.leads.personal);
  
  const { buckets, loading: bucketsLoading, error: bucketsError, selectedBucketId: bucketsSelectedBucketId } = bucketsState;
  const { leads, loading, selectedBucketId } = leadsState;
  
  // Use buckets and leads directly from Redux - already filtered by context
  const filteredBuckets = Array.isArray(buckets) ? buckets : [];
  const filteredLeads = Array.isArray(leads) ? leads : [];

  // Fetch buckets and leads based on view mode
  useEffect(() => {
    const loadData = async () => {
      if (viewMode === 'team') {
        // Team mode: fetch team buckets and leads
        if (selectedTeamId) {
          const bucketsResult = await dispatch(fetchTeamBuckets(selectedTeamId));
          
          let bucketsData = [];
          if (fetchTeamBuckets.fulfilled.match(bucketsResult)) {
            bucketsData = bucketsResult.payload || [];
          } else {
            // On error, use empty array instead of falling back to personal buckets
            bucketsData = [];
          }
          
          // Set first bucket as default if available
          if (bucketsData.length > 0) {
            const firstBucketId = bucketsData[0].bucketId || bucketsData[0].id;
            dispatch(setSelectedBucketId(firstBucketId, selectedTeamId, true));
            await dispatch(fetchTeamLeads({ teamId: selectedTeamId, bucketId: firstBucketId }));
          } else {
            // If no buckets, load all team leads
            dispatch(setSelectedBucketId(null, selectedTeamId, true));
            await dispatch(fetchTeamLeads({ teamId: selectedTeamId, bucketId: null }));
          }
        }
      } else {
        // Customer mode: fetch customer buckets and leads
        const bucketsResult = await dispatch(fetchBuckets());
        
        let bucketsData = [];
        if (fetchBuckets.fulfilled.match(bucketsResult)) {
          bucketsData = bucketsResult.payload;
        } else {
          bucketsData = [];
        }
        
        // Set first bucket as default if available
        if (bucketsData.length > 0) {
          const firstBucketId = bucketsData[0].bucketId || bucketsData[0].id;
          dispatch(setSelectedBucketId(firstBucketId, 'personal', true));
          await dispatch(fetchLeads(firstBucketId));
        } else {
          // If no buckets, load all leads
          dispatch(setSelectedBucketId(null, 'personal', true));
          await dispatch(fetchLeads(null));
        }
      }
    };

    loadData();
  }, [dispatch, viewMode, selectedTeamId]); // Reload when mode or team changes

  // Handle bucket selection
  const handleBucketChange = (bucketId) => {
    if (viewMode === 'team' && selectedTeamId) {
      dispatch(setSelectedBucketId(bucketId, selectedTeamId, true));
      dispatch(fetchTeamLeads({ teamId: selectedTeamId, bucketId: bucketId || null }));
    } else {
      dispatch(setSelectedBucketId(bucketId, 'personal', true));
      dispatch(fetchLeads(bucketId || null));
    }
  };

  // Handle refetch all leads
  const handleRefetchLeads = () => {
    if (viewMode === 'team' && selectedTeamId) {
      dispatch(fetchTeamLeads({ teamId: selectedTeamId, bucketId: selectedBucketId }));
    } else {
      dispatch(fetchLeads(selectedBucketId));
    }
  };

  // Function to update lead context
  const handleUpdateLeadContext = async (leadId, newContext) => {
    try {
      if (viewMode === 'team' && selectedTeamId) {
        const result = await dispatch(updateTeamLeadNotes({ teamId: selectedTeamId, leadId, notes: newContext }));
        if (updateTeamLeadNotes.fulfilled.match(result)) {
          console.log('Context updated successfully for team lead:', leadId);
        } else {
          console.error('Failed to update team lead context:', result.error);
        }
      } else {
        const result = await dispatch(updateLeadContext({ leadId, context: newContext }));
        if (updateLeadContext.fulfilled.match(result)) {
          console.log('Context updated successfully for lead:', leadId);
        } else {
          console.error('Failed to update context:', result.error);
        }
      }
    } catch (error) {
      console.error('Error updating lead context:', error);
    }
  };

  // Function to update lead status
  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      if (viewMode === 'team' && selectedTeamId) {
        const result = await dispatch(updateTeamLeadStatus({ teamId: selectedTeamId, leadId, status: newStatus }));
        if (updateTeamLeadStatus.fulfilled.match(result)) {
          console.log('Status updated successfully for team lead:', leadId);
        } else {
          console.error('Failed to update team lead status:', result.error);
        }
      } else {
        const result = await dispatch(updateLeadStatus({ leadId, status: newStatus }));
        if (updateLeadStatus.fulfilled.match(result)) {
          console.log('Status updated successfully for lead:', leadId);
        } else {
          console.error('Failed to update status:', result.error);
        }
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  // Function to delete lead
  const handleDeleteLead = async (leadId) => {
    try {
      if (viewMode === 'team' && selectedTeamId) {
        const result = await dispatch(removeTeamLead({ teamId: selectedTeamId, leadId }));
        if (removeTeamLead.fulfilled.match(result)) {
          console.log('Team lead deleted successfully:', leadId);
        } else {
          console.error('Failed to delete team lead:', result.error);
        }
      } else {
        const result = await dispatch(removeLead({ leadId, bucketId: selectedBucketId }));
        if (removeLead.fulfilled.match(result)) {
          console.log('Lead deleted successfully:', leadId);
        } else {
          console.error('Failed to delete lead:', result.error);
        }
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  // Function to update lead checkpoint
  const handleUpdateLeadCheckpoint = async (leadId, checkpoint) => {
    try {
      if (viewMode === 'team' && selectedTeamId) {
        const result = await dispatch(updateTeamLeadCheckpoint({ teamId: selectedTeamId, leadId, checkpoint }));
        if (updateTeamLeadCheckpoint.fulfilled.match(result)) {
          console.log('Checkpoint updated successfully for team lead:', leadId);
        } else {
          console.error('Failed to update team lead checkpoint:', result.error);
        }
      } else {
        const result = await dispatch(updateLeadCheckpoint({ leadId, checkpoint }));
        if (updateLeadCheckpoint.fulfilled.match(result)) {
          console.log('Checkpoint updated successfully for lead:', leadId);
        } else {
          console.error('Failed to update checkpoint:', result.error);
        }
      }
    } catch (error) {
      console.error('Error updating lead checkpoint:', error);
    }
  };

  // Function to move lead to different bucket
  const handleMoveLeadToBucket = async (leadId, targetBucketId, sourceBucketId) => {
    try {
      console.log('Moving lead:', { leadId, targetBucketId, sourceBucketId });
      if (viewMode === 'team' && selectedTeamId) {
        const result = await dispatch(moveTeamLeadToBucket({ teamId: selectedTeamId, leadId, targetBucketId }));
        
        if (moveTeamLeadToBucket.fulfilled.match(result)) {
          // If we're currently viewing the target bucket, refresh to show the moved lead
          if (selectedBucketId === targetBucketId) {
            await dispatch(fetchTeamLeads({ teamId: selectedTeamId, bucketId: targetBucketId }));
          }
          console.log('Team lead moved successfully to bucket:', targetBucketId);
        } else {
          console.error('Failed to move team lead:', result.error);
          throw new Error(result.error || 'Failed to move team lead');
        }
      } else {
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
          {/* Header Row: Title + Filter */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#FFFFFF]">Leads</h1>
            
            {/* Bucket Selection */}
            <div className="flex items-center gap-3">
              <select
                id="bucket-select"
                value={selectedBucketId || ''}
                onChange={(e) => handleBucketChange(e.target.value || null)}
                className="px-3 py-1.5 bg-[#1C1C1E] border border-[#3D3D3F] rounded-md text-[#E5E5E7] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                disabled={bucketsError && viewMode === 'team'}
              >
                <option value="">All Leads</option>
                {filteredBuckets.map((bucket) => (
                  <option key={bucket.bucketId || bucket.id} value={bucket.bucketId || bucket.id}>
                    {bucket.bucketName || bucket.name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => setShowCheckpoints(!showCheckpoints)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-sm ${
                  showCheckpoints 
                    ? 'bg-[#FFD60A] text-black hover:bg-[#FFD60A]/80' 
                    : 'bg-[#1C1C1E] text-[#FFD60A] border border-[#FFD60A]/30 hover:bg-[#FFD60A]/10'
                }`}
                title={showCheckpoints ? 'Hide Checkpoints' : 'Show Checkpoints'}
              >
                <svg className="w-4 h-4" fill={showCheckpoints ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="hidden sm:inline">Checkpoints</span>
              </button>
              
              <button
                onClick={handleRefetchLeads}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF] text-white rounded-md hover:bg-[#0056CC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                title="Refetch Leads"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <p className="text-[#8E8E93] text-sm mb-4">
            Browse through your leads one at a time with our card-based interface
          </p>
          
          {/* Error display */}
          {bucketsError && viewMode === 'team' && selectedTeamId && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400 mb-2">Error loading team buckets: {bucketsError}</p>
              <button
                onClick={() => dispatch(fetchTeamBuckets(selectedTeamId))}
                className="text-sm text-red-300 hover:text-red-200 underline"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Lead count display */}
          <div className="text-sm text-[#8E8E93] mb-4">
            {viewMode === 'team' && selectedTeamId && bucketsError ? (
              <span className="text-red-400">Unable to load buckets. Please retry.</span>
            ) : (
              <>
                Showing {filteredLeads.length} leads{' '}
                {viewMode === 'team' && selectedTeamId ? (
                  <>
                    for team: {teams.find(t => (t.teamId || t.id) === selectedTeamId)?.teamName || 'Unknown'}{' '}
                    {selectedBucketId ? `from bucket: ${filteredBuckets.find(b => (b.bucketId || b.id) === selectedBucketId)?.bucketName || filteredBuckets.find(b => (b.bucketId || b.id) === selectedBucketId)?.name || 'Unknown'}` : '(all buckets)'}
                  </>
                ) : (
                  selectedBucketId ? `from bucket: ${filteredBuckets.find(b => (b.bucketId || b.id) === selectedBucketId)?.bucketName || filteredBuckets.find(b => (b.bucketId || b.id) === selectedBucketId)?.name || 'Unknown'}` : '(all buckets)'
                )}
              </>
            )}
          </div>
        </div>
        
        <LeadsContainer 
          leads={filteredLeads} 
          updateLeadContext={handleUpdateLeadContext} 
          updateLeadStatus={handleUpdateLeadStatus}
          updateLeadCheckpoint={handleUpdateLeadCheckpoint}
          deleteLead={handleDeleteLead}
          moveLeadToBucket={handleMoveLeadToBucket}
          buckets={filteredBuckets}
          currentBucketId={selectedBucketId}
        />
      </div>
      
      {/* Checkpoints Modal */}
      {showCheckpoints && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1C1C1E] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl border border-[#3D3D3F]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#3D3D3F]">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#FFD60A]" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <h2 className="text-lg font-semibold text-white">Checkpoints</h2>
              </div>
              <button
                onClick={() => setShowCheckpoints(false)}
                className="p-1.5 text-[#8E8E93] hover:text-white hover:bg-[#2D2D2F] rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4">
              {(() => {
                const checkpointLeads = filteredLeads.filter(lead => lead.checkpoint);
                if (checkpointLeads.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-[#3D3D3F] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <p className="text-[#8E8E93]">No checkpoints set</p>
                      <p className="text-xs text-[#4A4A4A] mt-1">Mark leads as checkpoints using the bookmark icon</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-4">
                    {/* Bar Graph */}
                    <div className="flex items-end justify-between h-24 gap-px">
                      {filteredLeads.map((lead, index) => (
                        <button
                          key={lead.leadId}
                          onClick={() => {
                            setShowCheckpoints(false);
                            window.dispatchEvent(new CustomEvent('navigateToLead', { detail: { index } }));
                          }}
                          className={`flex-1 min-w-0 transition-all hover:opacity-80 rounded-t ${
                            lead.checkpoint 
                              ? 'bg-[#FFD60A] h-full' 
                              : 'bg-[#3D3D3F] h-2 self-end'
                          }`}
                          title={`Lead ${index + 1}${lead.checkpoint ? ' (Checkpoint)' : ''}`}
                        />
                      ))}
                    </div>
                    
                    {/* X-axis labels - show sparse labels */}
                    <div className="flex justify-between text-xs text-[#8E8E93]">
                      <span>1</span>
                      {filteredLeads.length > 2 && (
                        <span>{Math.ceil(filteredLeads.length / 2)}</span>
                      )}
                      <span>{filteredLeads.length}</span>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 pt-2 border-t border-[#3D3D3F]">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#FFD60A] rounded" />
                        <span className="text-xs text-[#8E8E93]">Checkpoint ({checkpointLeads.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-[#3D3D3F] rounded" />
                        <span className="text-xs text-[#8E8E93]">Regular</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-[#4A4A4A] text-center">Click any bar to navigate to that lead</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
