import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setViewMode, setSelectedTeamId } from '../../../../store/slices/teamsSlice';

const TeamModeToggle = () => {
  const dispatch = useDispatch();
  const { viewMode, selectedTeamId, teams } = useSelector((state) => state.teams);

  const handleModeChange = (mode) => {
    dispatch(setViewMode(mode));
    if (mode === 'customer') {
      dispatch(setSelectedTeamId(null));
    }
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#E5E5E7]">View Mode:</span>
        <div className="flex border border-[#3A3A3C] rounded-lg overflow-hidden bg-[#1C1C1E]">
          <button
            className={`px-4 py-2 text-sm transition-all duration-200 ${
              viewMode === 'customer'
                ? 'bg-[#007AFF] text-white'
                : 'bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#2C2C2E]'
            }`}
            onClick={() => handleModeChange('customer')}
          >
            Customer
          </button>
          <button
            className={`px-4 py-2 text-sm transition-all duration-200 ${
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

      {viewMode === 'team' && (
        <div className="flex items-center gap-2">
          <label htmlFor="team-select" className="text-sm font-medium text-[#E5E5E7]">
            Select Team:
          </label>
          <select
            id="team-select"
            value={selectedTeamId || ''}
            onChange={(e) => dispatch(setSelectedTeamId(e.target.value || null))}
            className="px-3 py-2 bg-[#1C1C1E] border border-[#007AFF] rounded-md text-[#E5E5E7] text-sm focus:outline-none focus:ring-1 focus:ring-[#007AFF] min-w-[200px]"
          >
            <option value="">Select a team...</option>
            {teams.map((team) => (
              <option key={team.teamId || team.id} value={team.teamId || team.id}>
                {team.teamName || team.name} ({team.teamId || team.id})
              </option>
            ))}
          </select>
        </div>
      )}

      {viewMode === 'team' && selectedTeamId && (
        <div className="text-sm text-[#8E8E93]">
          <span className="font-medium text-[#E5E5E7]">Team:</span>{' '}
          {teams.find(t => (t.teamId || t.id) === selectedTeamId)?.teamName || 'Unknown'}
          {' '}
          <span className="text-[#8E8E93]">
            (ID: {selectedTeamId.substring(0, 8)}...)
          </span>
        </div>
      )}
    </div>
  );
};

export default TeamModeToggle;

