import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createTeam } from '../../../../store/thunks/teamsThunks';

const CreateTeamModal = ({ isOpen, onClose, onTeamCreated }) => {
  const [teamName, setTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  const handleCreate = async () => {
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await dispatch(createTeam({ 
        teamName: teamName.trim(), 
        application: 'Leadflow' 
      }));

      if (createTeam.fulfilled.match(result)) {
        setTeamName('');
        onTeamCreated?.(result.payload);
        onClose();
      } else {
        setError(result.error || 'Failed to create team');
      }
    } catch (err) {
      setError(err.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setTeamName('');
    setError(null);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
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
          <h3 className="text-xl font-semibold text-white m-0">Create New Team</h3>
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
              disabled={isCreating}
            />
            {error && (
              <p className="mt-2 text-sm text-[#FF3B30]">{error}</p>
            )}
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isCreating}
              className="px-4 py-2 bg-[#2C2C2E] text-[#E5E5E7] rounded-lg text-sm font-medium hover:bg-[#3A3A3C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !teamName.trim()}
              className="px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-[#0056CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTeamModal;

