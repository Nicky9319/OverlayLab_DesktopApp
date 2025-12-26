import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LeadsContainer from './components/LeadsContainer';
import LeadCard from './components/LeadCard';
import { fetchLeads, updateLeadStatus, updateLeadContext, updateLeadCheckpoint, removeLead, moveLeadToBucket } from '../../../store/thunks/leadsThunks';
import { fetchBuckets } from '../../../store/thunks/bucketsThunks';
import { fetchTeamBuckets } from '../../../store/thunks/teamBucketsThunks';
import { fetchTeamLeads, updateTeamLeadStatus, updateTeamLeadNotes, updateTeamLeadCheckpoint, removeTeamLead, moveTeamLeadToBucket } from '../../../store/thunks/teamLeadsThunks';
import { setSelectedBucketId } from '../../../store/slices/leadsSlice';

const Leads = () => {
  const dispatch = useDispatch();
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditingCounter, setIsEditingCounter] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeInProgress, setSwipeInProgress] = useState(false);
  const [lastSwipeTime, setLastSwipeTime] = useState(0);
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editedContext, setEditedContext] = useState('');
  
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

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : filteredLeads.length - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < filteredLeads.length - 1 ? prev + 1 : 0);
  };

  // Preserve current lead index when leads change
  useEffect(() => {
    if (filteredLeads.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(prevIndex => {
      if (prevIndex >= filteredLeads.length) {
        return Math.max(0, filteredLeads.length - 1);
      }
      if (prevIndex >= 0 && prevIndex < filteredLeads.length) {
        const prevLead = filteredLeads[prevIndex];
        if (prevLead) {
          const foundIdx = filteredLeads.findIndex(l => l.leadId === prevLead.leadId);
          if (foundIdx !== -1) {
            return foundIdx;
          }
        }
      }
      return Math.min(prevIndex, filteredLeads.length - 1);
    });
  }, [filteredLeads]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, filteredLeads.length]);

  // Listen for navigation events from checkpoints modal
  useEffect(() => {
    const handleNavigateToLead = (e) => {
      const { index } = e.detail;
      if (index >= 0 && index < filteredLeads.length) {
        setCurrentIndex(index);
      }
    };

    window.addEventListener('navigateToLead', handleNavigateToLead);
    return () => {
      window.removeEventListener('navigateToLead', handleNavigateToLead);
    };
  }, [filteredLeads.length]);

  const handleCounterClick = () => {
    setIsEditingCounter(true);
    setEditValue(currentIndex + 1);
  };

  const handleCounterEdit = () => {
    const index = parseInt(editValue) - 1;
    if (index >= 0 && index < filteredLeads.length) {
      setCurrentIndex(index);
    }
    setIsEditingCounter(false);
    setEditValue('');
  };

  const handleCounterKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCounterEdit();
    } else if (e.key === 'Escape') {
      setIsEditingCounter(false);
      setEditValue('');
    }
  };

  const handleCounterBlur = () => {
    handleCounterEdit();
  };

  // Touch/swipe handlers
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setSwipeInProgress(false);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const currentTime = Date.now();
    
    if (Math.abs(distance) > 10 && !swipeInProgress && (currentTime - lastSwipeTime) > 300) {
      setSwipeInProgress(true);
      setLastSwipeTime(currentTime);
      
      if (distance > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
      
      setTimeout(() => setSwipeInProgress(false), 500);
    }
  };

  // Mouse wheel horizontal scroll
  const handleWheel = (e) => {
    const currentTime = Date.now();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5 && !swipeInProgress && (currentTime - lastSwipeTime) > 300) {
      e.preventDefault();
      setSwipeInProgress(true);
      setLastSwipeTime(currentTime);
      
      if (e.deltaX > 0) {
        handleNext();
      } else if (e.deltaX < 0) {
        handlePrevious();
      }
      
      setTimeout(() => setSwipeInProgress(false), 500);
    }
  };

  // Context editing handlers
  const handleContextEdit = () => {
    if (currentLead) {
      setIsEditingContext(true);
      setEditedContext(currentLead.context || '');
    }
  };

  const handleContextSave = async () => {
    if (currentLead) {
      await handleUpdateLeadContext(currentLead.leadId, editedContext);
    }
    setIsEditingContext(false);
  };

  const handleContextCancel = () => {
    setIsEditingContext(false);
    setEditedContext('');
  };

  const handleContextKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleContextSave();
    } else if (e.key === 'Escape') {
      handleContextCancel();
    }
  };

  // Reset editing state when lead changes
  useEffect(() => {
    setIsEditingContext(false);
    setEditedContext('');
  }, [currentIndex]);

  const currentLead = filteredLeads[currentIndex] || null;

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
      <div className="leads-page bg-[#000000] min-h-screen">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8E8E93]">{bucketsLoading ? 'Loading buckets...' : 'Loading leads...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leads-page bg-[#000000] h-screen flex flex-col overflow-hidden">
      {/* Top Header Bar - Modernized with Rounded Edges */}
      <div className="bg-[#111111] border-b border-[#1C1C1E] py-2 flex items-center justify-between gap-4 flex-shrink-0 rounded-b-2xl shadow-lg w-full mb-4">
        {/* Center: Navigation with Counter */}
        <div className="flex items-center gap-3 flex-1 justify-center px-6">
          <button
            onClick={handlePrevious}
            disabled={filteredLeads.length <= 1}
            className="p-2 text-[#E5E5E7] hover:text-[#FFFFFF] hover:bg-[#2D2D2F] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            title="Previous Lead"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {isEditingCounter ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-[#E5E5E7]">Lead</span>
              <input
                type="number"
                min="1"
                max={filteredLeads.length}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyPress={handleCounterKeyPress}
                onBlur={handleCounterBlur}
                autoFocus
                className="w-14 px-2 py-1 text-sm bg-[#1C1C1E] border border-[#007AFF] rounded-lg text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF]"
              />
              <span className="text-sm font-medium text-[#E5E5E7]">of {filteredLeads.length}</span>
            </div>
          ) : (
            <div 
              className="text-sm font-medium text-[#E5E5E7] cursor-pointer hover:text-[#FFFFFF] transition-colors px-3 py-1 rounded-lg hover:bg-[#1C1C1E]"
              onClick={handleCounterClick}
              title="Click to edit"
            >
              Lead {currentIndex + 1} of {filteredLeads.length}
            </div>
          )}
          
          <button
            onClick={handleNext}
            disabled={filteredLeads.length <= 1}
            className="p-2 text-[#E5E5E7] hover:text-[#FFFFFF] hover:bg-[#2D2D2F] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            title="Next Lead"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Right side: Checkpoints and Bucket Selector */}
        <div className="flex items-center gap-3 ml-auto px-6">
          <button
            onClick={() => setShowCheckpoints(!showCheckpoints)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
              showCheckpoints 
                ? 'bg-[#FFD60A] text-black hover:bg-[#FFD60A]/90 shadow-md' 
                : 'bg-[#1C1C1E] text-[#FFD60A] border border-[#FFD60A]/40 hover:bg-[#FFD60A]/10 hover:border-[#FFD60A]/60'
            }`}
            title={showCheckpoints ? 'Hide Checkpoints' : 'Show Checkpoints'}
          >
            <svg className="w-4 h-4" fill={showCheckpoints ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="hidden sm:inline">Checkpoints</span>
          </button>

          {/* Bucket Selector Dropdown */}
          <select
            id="bucket-select"
            value={selectedBucketId || ''}
            onChange={(e) => handleBucketChange(e.target.value || null)}
            className="px-3 py-1.5 bg-[#1C1C1E] border border-[#3D3D3F] rounded-lg text-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] min-w-[180px] transition-all hover:border-[#4A4A4A]"
            disabled={bucketsError && viewMode === 'team'}
          >
            <option value="">All Leads</option>
            {filteredBuckets.map((bucket) => (
              <option key={bucket.bucketId || bucket.id} value={bucket.bucketId || bucket.id}>
                {bucket.bucketName || bucket.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area - Two Column Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0 px-4 gap-4">
        {/* Middle Section - Lead Card */}
        <div 
          className="flex-1 overflow-y-auto p-6 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1C1C1E] [&::-webkit-scrollbar-thumb]:bg-[#4A4A4A] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#6A6A6A]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onWheel={handleWheel}
        >
          {filteredLeads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#1C1C1E] rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[#FFFFFF] mb-2">No Leads Found</h3>
                <p className="text-[#8E8E93]">Add some leads to get started with the card view.</p>
              </div>
            </div>
          ) : currentLead ? (
            <LeadCard 
              lead={currentLead} 
              isActive={true}
              updateLeadContext={handleUpdateLeadContext} 
              updateLeadStatus={handleUpdateLeadStatus}
              updateLeadCheckpoint={handleUpdateLeadCheckpoint}
              deleteLead={handleDeleteLead}
              moveLeadToBucket={handleMoveLeadToBucket}
              buckets={filteredBuckets}
              currentBucketId={selectedBucketId}
            />
          ) : null}
        </div>

        {/* Right Sidebar - Context, Notes & History */}
        <div className="w-80 bg-[#111111] border-l-2 border-[#2D2D2F] overflow-y-auto min-h-0 h-full rounded-l-2xl [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#1C1C1E] [&::-webkit-scrollbar-thumb]:bg-[#4A4A4A] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#6A6A6A]">
          {currentLead ? (
            <div className="p-4 space-y-4">
              {/* Context Section */}
              <div className="bg-[#1C1C1E] rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#E5E5E7]">Context</h3>
                  {!isEditingContext && (
                    <button 
                      onClick={handleContextEdit} 
                      className="p-1 text-[#8E8E93] hover:text-white hover:bg-[#2D2D2F] rounded transition-colors"
                      title="Edit context"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
                {isEditingContext ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedContext}
                      onChange={(e) => setEditedContext(e.target.value)}
                      onKeyDown={handleContextKeyPress}
                      className="w-full min-h-[200px] max-h-[calc(100vh-300px)] px-3 py-2 text-xs bg-[#2D2D2F] border border-[#007AFF] rounded-lg text-[#E5E5E7] focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-y overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#1C1C1E] [&::-webkit-scrollbar-thumb]:bg-[#4A4A4A] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#6A6A6A]"
                      placeholder="Add context about this lead..."
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={handleContextCancel} 
                        className="px-3 py-1.5 text-xs bg-[#2D2D2F] text-[#E5E5E7] hover:bg-[#3D3D3F] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleContextSave} 
                        className="px-3 py-1.5 text-xs bg-[#007AFF] text-white hover:bg-[#0056CC] rounded-lg transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="text-xs text-[#E5E5E7] whitespace-pre-wrap min-h-[100px] max-h-[calc(100vh-300px)] overflow-y-auto cursor-text [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#1C1C1E] [&::-webkit-scrollbar-thumb]:bg-[#4A4A4A] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#6A6A6A]"
                    onClick={handleContextEdit}
                  >
                    {currentLead.context || <span className="text-[#4A4A4A] italic">No context available - click to add</span>}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm text-[#8E8E93]">Select a lead to view details</p>
            </div>
          )}
        </div>
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
