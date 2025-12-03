import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setViewMode, setSelectedTeamId } from '../../../../store/slices/teamsSlice';

const PersonalTeamToggle = () => {
  const dispatch = useDispatch();
  const { viewMode } = useSelector((state) => state.teams);

  const handleModeChange = (mode) => {
    if (mode === 'customer') {
      // Switch to Personal mode - clear team selection
      dispatch(setSelectedTeamId(null));
      dispatch(setViewMode('customer'));
    } else {
      // Switch to Team mode - clear team selection to show selection page
      dispatch(setSelectedTeamId(null));
      dispatch(setViewMode('team'));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex border border-[#3A3A3C] rounded-lg overflow-hidden bg-[#1C1C1E]">
        <button
          className={`px-3 py-1.5 text-sm transition-all duration-200 ${
            viewMode === 'customer'
              ? 'bg-[#007AFF] text-white'
              : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#2C2C2E]'
          }`}
          onClick={() => handleModeChange('customer')}
        >
          Personal
        </button>
        <button
          className={`px-3 py-1.5 text-sm transition-all duration-200 ${
            viewMode === 'team'
              ? 'bg-[#007AFF] text-white'
              : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#2C2C2E]'
          }`}
          onClick={() => handleModeChange('team')}
        >
          Team
        </button>
      </div>
    </div>
  );
};

export default PersonalTeamToggle;

