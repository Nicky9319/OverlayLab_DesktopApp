import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllTeams } from '../../../../store/thunks/teamsThunks';
import { setSelectedTeamId } from '../../../../store/slices/teamsSlice';
import CreateTeamModal from './CreateTeamModal';
import EditTeamNameModal from './EditTeamNameModal';
import AddTeamMemberModal from './AddTeamMemberModal';

const TeamSelection = () => {
  const dispatch = useDispatch();
  const { teams, loading, error } = useSelector((state) => state.teams);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [addingMemberToTeam, setAddingMemberToTeam] = useState(null);

  useEffect(() => {
    dispatch(fetchAllTeams());
  }, [dispatch]);

  const handleTeamSelect = (teamId) => {
    dispatch(setSelectedTeamId(teamId));
  };

  const handleTeamCreated = () => {
    // Refresh teams list after creating a new team
    dispatch(fetchAllTeams());
  };

  const handleTeamUpdated = () => {
    // Refresh teams list after updating team name
    dispatch(fetchAllTeams());
  };

  const handleMemberAdded = () => {
    // Refresh teams list after adding a member
    dispatch(fetchAllTeams());
  };

  const handleEditTeam = (e, team) => {
    e.stopPropagation(); // Prevent team selection when clicking edit
    setEditingTeam(team);
  };

  const handleAddMember = (e, team) => {
    e.stopPropagation(); // Prevent team selection when clicking add member
    setAddingMemberToTeam(team);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#8E8E93]">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-[#FF3B30] mb-4">Error loading teams: {error}</p>
          <button
            onClick={() => dispatch(fetchAllTeams())}
            className="px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056CC] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start gap-5 flex-wrap mb-4">
          <div className="flex-1">
            <h2 className="text-3xl font-semibold text-white mb-2">Select a Team</h2>
            <p className="text-base text-[#8E8E93]">Choose a team to view its buckets and leads, or create a new team</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-[#007AFF] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors duration-200 hover:bg-[#0056CC]"
          >
            <span className="text-lg font-bold">+</span>
            Create Team
          </button>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-20 text-[#8E8E93]">
          <div className="mb-4">
            <svg 
              className="w-16 h-16 mx-auto text-[#3A3A3C]" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
          </div>
          <p className="text-lg mb-4">No teams yet</p>
          <p className="text-sm mb-6">Create your first team to get started with team collaboration</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-[#007AFF] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors duration-200 hover:bg-[#0056CC] mx-auto"
          >
            <span className="text-lg font-bold">+</span>
            Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {teams.map((team) => (
            <div
              key={team.teamId || team.id}
              onClick={() => handleTeamSelect(team.teamId || team.id)}
              className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-xl p-6 cursor-pointer transition-all duration-200 hover:border-[#007AFF] hover:bg-[#2C2C2E] hover:shadow-lg relative"
            >
              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => handleEditTeam(e, team)}
                  className="p-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-lg transition-colors"
                  title="Edit team name"
                >
                  <svg className="w-4 h-4 text-[#8E8E93] hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleAddMember(e, team)}
                  className="p-2 bg-[#2C2C2E] hover:bg-[#3A3A3C] rounded-lg transition-colors"
                  title="Add team member"
                >
                  <svg className="w-4 h-4 text-[#8E8E93] hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>

              <div className="mb-3 pr-16">
                <h3 className="text-xl font-semibold text-white mb-1">
                  {team.teamName || team.name || 'Unnamed Team'}
                </h3>
                <p className="text-sm text-[#8E8E93]">
                  ID: {(team.teamId || team.id || '').substring(0, 8)}...
                </p>
              </div>
              
              {team.members && Array.isArray(team.members) && (
                <div className="mt-4 pt-4 border-t border-[#3A3A3C]">
                  <p className="text-xs text-[#8E8E93]">
                    {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                  </p>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-[#3A3A3C]">
                <span className="text-xs text-[#007AFF] font-medium">Click to select →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTeamCreated={handleTeamCreated}
      />

      <EditTeamNameModal
        isOpen={!!editingTeam}
        onClose={() => setEditingTeam(null)}
        team={editingTeam}
        onTeamUpdated={handleTeamUpdated}
      />

      <AddTeamMemberModal
        isOpen={!!addingMemberToTeam}
        onClose={() => setAddingMemberToTeam(null)}
        team={addingMemberToTeam}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
};

export default TeamSelection;

