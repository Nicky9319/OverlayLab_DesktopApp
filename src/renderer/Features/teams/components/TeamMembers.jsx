import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTeamMembers, updateMemberRole } from '../../../../store/thunks/teamsThunks';
import { getCustomerId } from '../../../../utils/clerkTokenProvider';

const TeamMembers = () => {
  const dispatch = useDispatch();
  const { selectedTeamId, teamMembers, teams, loading, error } = useSelector((state) => state.teams);
  const [currentUserCustomerId, setCurrentUserCustomerId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // Get current user's customerId
  useEffect(() => {
    const customerId = getCustomerId();
    setCurrentUserCustomerId(customerId);
    
    // Find current user's role in the team
    if (customerId && selectedTeamId && teams.length > 0) {
      const team = teams.find(t => (t.teamId || t.id) === selectedTeamId);
      if (team && Array.isArray(team.members)) {
        const member = team.members.find(m => 
          m.customerIds === customerId || m.customerId === customerId
        );
        if (member) {
          setCurrentUserRole(member.role);
        }
      }
    }
  }, [selectedTeamId, teams]);

  // Fetch team members when team is selected
  useEffect(() => {
    if (selectedTeamId) {
      dispatch(fetchTeamMembers(selectedTeamId));
    }
  }, [dispatch, selectedTeamId]);

  const handleRoleChange = async (memberCustomerId, newRole) => {
    if (!selectedTeamId || !memberCustomerId || !newRole) {
      return;
    }
    
    try {
      await dispatch(updateMemberRole({
        teamId: selectedTeamId,
        memberCustomerId,
        newRole
      })).unwrap();
    } catch (error) {
      console.error('Failed to update member role:', error);
      alert(`Failed to update member role: ${error}`);
    }
  };

  const members = selectedTeamId && teamMembers[selectedTeamId] 
    ? teamMembers[selectedTeamId] 
    : [];

  // Filter out current user from the list
  const filteredMembers = members.filter(member => 
    member.customerId !== currentUserCustomerId && 
    member.customerIds !== currentUserCustomerId
  );

  const isAdmin = currentUserRole === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#8E8E93]">Loading team members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-[#FF3B30] mb-4">Error loading team members: {error}</p>
          <button
            onClick={() => selectedTeamId && dispatch(fetchTeamMembers(selectedTeamId))}
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
        <h2 className="text-3xl font-semibold text-white mb-2">Team Members</h2>
        <p className="text-base text-[#8E8E93]">Manage team members and their roles</p>
      </div>

      {filteredMembers.length === 0 ? (
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
          <p className="text-lg mb-4">No other team members</p>
          <p className="text-sm">You are the only member of this team</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMembers.map((member) => {
            const memberCustomerId = member.customerId || member.customerIds;
            const memberRole = member.role || 'user';
            
            return (
              <div
                key={memberCustomerId}
                className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-xl p-6 transition-all duration-200 hover:border-[#007AFF] hover:bg-[#2C2C2E]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-[#007AFF] rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {member.email ? member.email.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {member.email || 'No email'}
                        </h3>
                        <p className="text-sm text-[#8E8E93]">
                          User ID: {memberCustomerId?.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        memberRole === 'admin' 
                          ? 'bg-[#007AFF]/20 text-[#007AFF]' 
                          : 'bg-[#8E8E93]/20 text-[#8E8E93]'
                      }`}>
                        {memberRole === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="ml-4">
                      <select
                        value={memberRole}
                        onChange={(e) => handleRoleChange(memberCustomerId, e.target.value)}
                        className="px-4 py-2 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white text-sm focus:outline-none focus:border-[#007AFF] transition-colors"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamMembers;

