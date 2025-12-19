
import React, { useState, useEffect } from 'react';
import LeadCard from './LeadCard';

const LeadsContainer = ({ leads = [], updateLeadContext, updateLeadStatus, updateLeadCheckpoint, deleteLead, moveLeadToBucket, buckets = [], currentBucketId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditingCounter, setIsEditingCounter] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeInProgress, setSwipeInProgress] = useState(false);
  const [lastSwipeTime, setLastSwipeTime] = useState(0);

  // Preserve current lead index when leads change
  useEffect(() => {
    if (leads.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(prevIndex => {
      // Try to preserve the current lead by leadId
      const prevLead = leads[prevIndex];
      if (!prevLead) return 0;
      const foundIdx = leads.findIndex(l => l.leadId === prevLead.leadId);
      return foundIdx !== -1 ? foundIdx : 0;
    });
  }, [leads]);

  // Add keyboard navigation
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
  }, [currentIndex, leads.length]);

  // Listen for navigation events from checkpoints modal
  useEffect(() => {
    const handleNavigateToLead = (e) => {
      const { index } = e.detail;
      if (index >= 0 && index < leads.length) {
        setCurrentIndex(index);
      }
    };

    window.addEventListener('navigateToLead', handleNavigateToLead);
    return () => {
      window.removeEventListener('navigateToLead', handleNavigateToLead);
    };
  }, [leads.length]);

  const handlePrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : leads.length - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < leads.length - 1 ? prev + 1 : 0);
  };

  const handleCounterClick = () => {
    setIsEditingCounter(true);
    setEditValue(currentIndex + 1);
  };

  const handleCounterEdit = () => {
    const index = parseInt(editValue) - 1; // Convert to 0-based index
    if (index >= 0 && index < leads.length) {
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
    
    // Single swipe mode: any horizontal movement triggers navigation
    // But only if we haven't already processed a swipe recently (like Windows desktop switching)
    if (Math.abs(distance) > 10 && !swipeInProgress && (currentTime - lastSwipeTime) > 300) {
      setSwipeInProgress(true);
      setLastSwipeTime(currentTime);
      
      if (distance > 0) {
        // Swipe left (finger moves left) -> Next lead
        handleNext();
      } else {
        // Swipe right (finger moves right) -> Previous lead
        handlePrevious();
      }
      
      // Reset swipe progress after a longer delay to prevent multiple swipes
      setTimeout(() => setSwipeInProgress(false), 500);
    }
  };

  // Mouse wheel horizontal scroll for touchpad
  const handleWheel = (e) => {
    // Check if it's a horizontal scroll (touchpad two-finger swipe)
    // Single swipe mode: any horizontal movement triggers navigation
    // But only if we haven't already processed a swipe recently (like Windows desktop switching)
    const currentTime = Date.now();
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5 && !swipeInProgress && (currentTime - lastSwipeTime) > 300) {
      e.preventDefault();
      setSwipeInProgress(true);
      setLastSwipeTime(currentTime);
      
      if (e.deltaX > 0) {
        // Scroll right -> Next lead
        handleNext();
      } else if (e.deltaX < 0) {
        // Scroll left -> Previous lead
        handlePrevious();
      }
      
      // Reset swipe progress after a longer delay to prevent multiple swipes
      setTimeout(() => setSwipeInProgress(false), 500);
    }
  };

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
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
    );
  }

  return (
    <div className="leads-container">
      {/* Header with Counter and Navigation */}
      <div className="flex items-center justify-between mb-6">
        {/* Counter */}
        <div className="flex items-center space-x-4">
          {isEditingCounter ? (
            <div className="flex items-center space-x-1">
              <span className="text-sm text-[#E5E5E7]">Lead</span>
              <input
                type="number"
                min="1"
                max={leads.length}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyPress={handleCounterKeyPress}
                onBlur={handleCounterBlur}
                autoFocus
                className="w-12 px-1 py-0.5 text-sm bg-[#1C1C1E] border border-[#007AFF] rounded text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
              />
              <span className="text-sm text-[#E5E5E7]">of {leads.length}</span>
            </div>
          ) : (
            <div 
              className="text-sm text-[#E5E5E7] cursor-pointer hover:text-[#FFFFFF] transition-colors"
              onClick={handleCounterClick}
              title="Click to edit"
            >
              Lead {currentIndex + 1} of {leads.length}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevious}
            disabled={leads.length <= 1}
            className="p-2 text-[#E5E5E7] hover:text-[#FFFFFF] hover:bg-[#2D2D2F] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous Lead"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={handleNext}
            disabled={leads.length <= 1}
            className="p-2 text-[#E5E5E7] hover:text-[#FFFFFF] hover:bg-[#2D2D2F] rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next Lead"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-[#1C1C1E] rounded-full h-2">
          <div 
            className="bg-[#007AFF] h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${((currentIndex + 1) / leads.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Card Container */}
      <div 
        className="relative min-h-96"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={handleWheel}
      >
        <LeadCard 
          lead={leads[currentIndex]} 
          isActive={true}
          updateLeadContext={updateLeadContext}
          updateLeadStatus={updateLeadStatus}
          updateLeadCheckpoint={updateLeadCheckpoint}
          deleteLead={deleteLead}
          moveLeadToBucket={moveLeadToBucket}
          buckets={buckets}
          currentBucketId={currentBucketId}
        />
      </div>

      {/* Navigation Info */}
      <div className="mt-6 text-center">
        <p className="text-xs text-[#8E8E93]">
          Use ← → arrow keys, swipe left/right on touchpad, or click navigation buttons to move between leads
        </p>
      </div>
    </div>
  );
};

export default LeadsContainer;
