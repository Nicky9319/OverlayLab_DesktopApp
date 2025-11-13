
import React, { useState, useEffect } from 'react';
import LeadCard from './LeadCard';

const LeadsContainer = ({ leads = [], updateLeadNotes, updateLeadStatus, deleteLead, moveLeadToBucket, buckets = [], currentBucketId }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditingCounter, setIsEditingCounter] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeSensitivity, setSwipeSensitivity] = useState(150);
  const [leftSwipeSensitivity, setLeftSwipeSensitivity] = useState(150);
  const [rightSwipeSensitivity, setRightSwipeSensitivity] = useState(150);
  const [useSeparateSensitivity, setUseSeparateSensitivity] = useState(false);
  const [singleSwipeMode, setSingleSwipeMode] = useState(false);
  const [swipeInProgress, setSwipeInProgress] = useState(false);
  const [lastSwipeTime, setLastSwipeTime] = useState(0);
  const [showSensitivityControl, setShowSensitivityControl] = useState(false);
  const [isEditingSensitivity, setIsEditingSensitivity] = useState(false);
  const [editSensitivityValue, setEditSensitivityValue] = useState('');
  const [isEditingLeftSensitivity, setIsEditingLeftSensitivity] = useState(false);
  const [editLeftSensitivityValue, setEditLeftSensitivityValue] = useState('');
  const [isEditingRightSensitivity, setIsEditingRightSensitivity] = useState(false);
  const [editRightSensitivityValue, setEditRightSensitivityValue] = useState('');

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

  // Sensitivity editing functions
  const handleSensitivityClick = () => {
    setIsEditingSensitivity(true);
    setEditSensitivityValue(swipeSensitivity.toString());
  };

  const handleSensitivityEdit = () => {
    const value = parseInt(editSensitivityValue);
    if (value >= 50 && value <= 300) {
      setSwipeSensitivity(value);
    }
    setIsEditingSensitivity(false);
    setEditSensitivityValue('');
  };

  const handleSensitivityKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSensitivityEdit();
    } else if (e.key === 'Escape') {
      setIsEditingSensitivity(false);
      setEditSensitivityValue('');
    }
  };

  const handleSensitivityBlur = () => {
    handleSensitivityEdit();
  };

  // Left sensitivity editing functions
  const handleLeftSensitivityClick = () => {
    setIsEditingLeftSensitivity(true);
    setEditLeftSensitivityValue(leftSwipeSensitivity.toString());
  };

  const handleLeftSensitivityEdit = () => {
    const value = parseInt(editLeftSensitivityValue);
    if (value >= 50 && value <= 300) {
      setLeftSwipeSensitivity(value);
    }
    setIsEditingLeftSensitivity(false);
    setEditLeftSensitivityValue('');
  };

  const handleLeftSensitivityKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLeftSensitivityEdit();
    } else if (e.key === 'Escape') {
      setIsEditingLeftSensitivity(false);
      setEditLeftSensitivityValue('');
    }
  };

  const handleLeftSensitivityBlur = () => {
    handleLeftSensitivityEdit();
  };

  // Right sensitivity editing functions
  const handleRightSensitivityClick = () => {
    setIsEditingRightSensitivity(true);
    setEditRightSensitivityValue(rightSwipeSensitivity.toString());
  };

  const handleRightSensitivityEdit = () => {
    const value = parseInt(editRightSensitivityValue);
    if (value >= 50 && value <= 300) {
      setRightSwipeSensitivity(value);
    }
    setIsEditingRightSensitivity(false);
    setEditRightSensitivityValue('');
  };

  const handleRightSensitivityKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleRightSensitivityEdit();
    } else if (e.key === 'Escape') {
      setIsEditingRightSensitivity(false);
      setEditRightSensitivityValue('');
    }
  };

  const handleRightSensitivityBlur = () => {
    handleRightSensitivityEdit();
  };

  // Touchpad swipe functionality - now uses dynamic sensitivity
  const getSwipeThreshold = (direction) => {
    if (useSeparateSensitivity) {
      return direction === 'left' ? leftSwipeSensitivity : rightSwipeSensitivity;
    }
    return swipeSensitivity;
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
    
    if (singleSwipeMode) {
      // In single swipe mode, any horizontal movement triggers navigation
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
    } else {
      // Normal mode with sensitivity thresholds
      const leftThreshold = getSwipeThreshold('left');
      const rightThreshold = getSwipeThreshold('right');
      
      const isLeftSwipe = distance > leftThreshold;
      const isRightSwipe = distance < -rightThreshold;

      if (isLeftSwipe) {
        // Swipe left -> Next lead
        handleNext();
      } else if (isRightSwipe) {
        // Swipe right -> Previous lead
        handlePrevious();
      }
    }
  };

  // Mouse wheel horizontal scroll for touchpad
  const handleWheel = (e) => {
    // Check if it's a horizontal scroll (touchpad two-finger swipe)
    if (singleSwipeMode) {
      // In single swipe mode, any horizontal movement triggers navigation
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
    } else {
      // Normal mode with sensitivity thresholds
      const wheelThreshold = Math.max(20, swipeSensitivity / 3); // Scale wheel sensitivity
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > wheelThreshold) {
        e.preventDefault();
        if (e.deltaX > 0) {
          // Scroll right -> Next lead
          handleNext();
        } else if (e.deltaX < 0) {
          // Scroll left -> Previous lead
          handlePrevious();
        }
      }
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

        {/* Navigation Buttons and Settings */}
        <div className="flex items-center space-x-2">
          {/* Sensitivity Control Toggle */}
          <button
            onClick={() => setShowSensitivityControl(!showSensitivityControl)}
            className="p-2 text-[#E5E5E7] hover:text-[#FFFFFF] hover:bg-[#2D2D2F] rounded-full transition-colors"
            title="Swipe Sensitivity Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

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

      {/* Sensitivity Control Panel */}
      {showSensitivityControl && (
        <div className="mb-4 p-4 bg-[#111111] border border-[#1C1C1E] rounded-lg space-y-4">
          {/* Single Swipe Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-[#E5E5E7]">Single Swipe Mode</span>
              <div className="text-xs text-[#8E8E93]">Any swipe gesture triggers navigation (ignores distance)</div>
            </div>
            <button
              onClick={() => setSingleSwipeMode(!singleSwipeMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                singleSwipeMode ? 'bg-[#007AFF]' : 'bg-[#1C1C1E]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  singleSwipeMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Separate Sensitivity Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-[#E5E5E7]">Separate Left/Right Sensitivity</span>
              <div className="text-xs text-[#8E8E93]">Set different sensitivity for left and right swipes</div>
            </div>
            <button
              onClick={() => setUseSeparateSensitivity(!useSeparateSensitivity)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useSeparateSensitivity ? 'bg-[#007AFF]' : 'bg-[#1C1C1E]'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useSeparateSensitivity ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sensitivity Controls */}
          {!singleSwipeMode && (
            <div className="space-y-3">
              {useSeparateSensitivity ? (
                // Separate Left/Right Controls
                <div className="space-y-3">
                  {/* Left Swipe Sensitivity */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#E5E5E7]">Left Swipe Sensitivity:</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="50"
                        max="300"
                        value={leftSwipeSensitivity}
                        onChange={(e) => setLeftSwipeSensitivity(parseInt(e.target.value))}
                        className="w-24 h-2 bg-[#1C1C1E] rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #FF3B30 0%, #FF3B30 ${((leftSwipeSensitivity - 50) / 250) * 100}%, #1C1C1E ${((leftSwipeSensitivity - 50) / 250) * 100}%, #1C1C1E 100%)`
                        }}
                      />
                      {isEditingLeftSensitivity ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="50"
                            max="300"
                            value={editLeftSensitivityValue}
                            onChange={(e) => setEditLeftSensitivityValue(e.target.value)}
                            onKeyPress={handleLeftSensitivityKeyPress}
                            onBlur={handleLeftSensitivityBlur}
                            autoFocus
                            className="w-16 px-2 py-1 text-xs bg-[#1C1C1E] border border-[#FF3B30] rounded text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#FF3B30]"
                          />
                          <span className="text-xs text-[#8E8E93]">px</span>
                        </div>
                      ) : (
                        <span 
                          className="text-xs text-[#FF3B30] font-mono bg-[#1C1C1E] px-2 py-1 rounded cursor-pointer hover:bg-[#2D2D2F] transition-colors"
                          onClick={handleLeftSensitivityClick}
                          title="Click to edit"
                        >
                          {leftSwipeSensitivity}px
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Right Swipe Sensitivity */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#E5E5E7]">Right Swipe Sensitivity:</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="50"
                        max="300"
                        value={rightSwipeSensitivity}
                        onChange={(e) => setRightSwipeSensitivity(parseInt(e.target.value))}
                        className="w-24 h-2 bg-[#1C1C1E] rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #00D09C 0%, #00D09C ${((rightSwipeSensitivity - 50) / 250) * 100}%, #1C1C1E ${((rightSwipeSensitivity - 50) / 250) * 100}%, #1C1C1E 100%)`
                        }}
                      />
                      {isEditingRightSensitivity ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="50"
                            max="300"
                            value={editRightSensitivityValue}
                            onChange={(e) => setEditRightSensitivityValue(e.target.value)}
                            onKeyPress={handleRightSensitivityKeyPress}
                            onBlur={handleRightSensitivityBlur}
                            autoFocus
                            className="w-16 px-2 py-1 text-xs bg-[#1C1C1E] border border-[#00D09C] rounded text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#00D09C]"
                          />
                          <span className="text-xs text-[#8E8E93]">px</span>
                        </div>
                      ) : (
                        <span 
                          className="text-xs text-[#00D09C] font-mono bg-[#1C1C1E] px-2 py-1 rounded cursor-pointer hover:bg-[#2D2D2F] transition-colors"
                          onClick={handleRightSensitivityClick}
                          title="Click to edit"
                        >
                          {rightSwipeSensitivity}px
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Unified Sensitivity Control
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#E5E5E7]">Swipe Sensitivity:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={swipeSensitivity}
                      onChange={(e) => setSwipeSensitivity(parseInt(e.target.value))}
                      className="w-32 h-2 bg-[#1C1C1E] rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #007AFF 0%, #007AFF ${((swipeSensitivity - 50) / 250) * 100}%, #1C1C1E ${((swipeSensitivity - 50) / 250) * 100}%, #1C1C1E 100%)`
                      }}
                    />
                    {isEditingSensitivity ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min="50"
                          max="300"
                          value={editSensitivityValue}
                          onChange={(e) => setEditSensitivityValue(e.target.value)}
                          onKeyPress={handleSensitivityKeyPress}
                          onBlur={handleSensitivityBlur}
                          autoFocus
                          className="w-16 px-2 py-1 text-xs bg-[#1C1C1E] border border-[#007AFF] rounded text-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                        />
                        <span className="text-xs text-[#8E8E93]">px</span>
                      </div>
                    ) : (
                      <span 
                        className="text-xs text-[#007AFF] font-mono bg-[#1C1C1E] px-2 py-1 rounded cursor-pointer hover:bg-[#2D2D2F] transition-colors"
                        onClick={handleSensitivityClick}
                        title="Click to edit"
                      >
                        {swipeSensitivity}px
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowSensitivityControl(false)}
              className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              title="Close Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
          updateLeadNotes={updateLeadNotes}
          updateLeadStatus={updateLeadStatus}
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
