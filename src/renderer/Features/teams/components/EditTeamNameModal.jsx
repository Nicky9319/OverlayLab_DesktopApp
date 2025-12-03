import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateTeamName } from '../../../../store/thunks/teamsThunks';

const EditTeamNameModal = ({ isOpen, onClose, team, onTeamUpdated }) => {
  const [teamName, setTeamName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  // Pre-populate with current team name when modal opens or team changes
  useEffect(() => {
    if (team && isOpen) {
      setTeamName(team.teamName || team.name || '');
      setError(null);
    }
  }, [team, isOpen]);

  const handleUpdate = async () => {
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    if (!team || !team.teamId) {
      setError('Team information is missing');
      return;
    }

    // Check if name actually changed
    const currentName = team.teamName || team.name || '';
    if (teamName.trim() === currentName) {
      onClose();
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const result = await dispatch(updateTeamName({ 
        teamId: team.teamId || team.id,
        teamName: teamName.trim()
      }));

      if (updateTeamName.fulfilled.match(result)) {
        setTeamName('');
        onTeamUpdated?.(result.payload);
        onClose();
      } else {
        setError(result.error || 'Failed to update team name');
      }
    } catch (err) {
      setError(err.message || 'Failed to update team name');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setTeamName(team?.teamName || team?.name || '');
    setError(null);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isUpdating) {
      handleUpdate();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={handleCancel}
    >
      <div 
        className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-xl shadow-lg max-w-lg w-[90%] max-h-[90vh] overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#3A3A3C] flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white m-0">Edit Team Name</h3>
          <button 
            className="bg-transparent border-none text-2xl text-[#8E8E93] cursor-pointer p-0 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-[#2C2C2E] hover:text-white"
            onClick={handleCancel}
          >
            ×
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-5">
            <label htmlFor="teamName" className="block text-sm font-medium text-[#E5E5E7] mb-2">
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyPress}
              placeholder="Enter team name"
              className="w-full px-4 py-2.5 bg-[#000000] border border-[#3A3A3C] rounded-lg text-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent transition-all"
              autoFocus
              disabled={isUpdating}
            />
            {error && (
              <p className="mt-2 text-sm text-[#FF3B30]">{error}</p>
            )}
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="px-4 py-2 bg-[#2C2C2E] text-[#E5E5E7] rounded-lg text-sm font-medium hover:bg-[#3A3A3C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || !teamName.trim()}
              className="px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-[#0056CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                'Update Team Name'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTeamNameModal;

