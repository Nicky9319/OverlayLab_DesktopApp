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
            className="px-3 py-1.5 bg-[#007AFF] text-white rounded-lg text-sm hover:bg-[#0056CC] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleCopyId = (id, type) => {
    navigator.clipboard.writeText(id);
    // You could add a toast notification here
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-1">Team Members</h2>
        <p className="text-sm text-[#8E8E93]">Manage team members and their roles</p>
        {selectedTeamId && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-[#8E8E93]">Team ID:</span>
            <span className="text-xs text-[#8E8E93] font-mono select-all">{selectedTeamId}</span>
            <button
              onClick={() => handleCopyId(selectedTeamId, 'team')}
              className="text-xs text-[#007AFF] hover:text-[#0056CC] transition-colors"
              title="Copy Team ID"
            >
              📋
            </button>
          </div>
        )}
      </div>

      {filteredMembers.length === 0 ? (
        <div className="text-center py-16 text-[#8E8E93]">
          <div className="mb-3">
            <svg 
              className="w-12 h-12 mx-auto text-[#3A3A3C]" 
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
          <p className="text-base mb-2">No other team members</p>
          <p className="text-xs">You are the only member of this team</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member, index) => {
            const memberCustomerId = member.customerId || member.customerIds;
            const memberRole = member.role || 'user';
            
            // Generate platform-aligned gradient colors based on index
            const gradientColors = [
              'from-[#007AFF] to-[#0051D5]', // Primary blue gradient
              'from-[#007AFF] to-[#5856D6]', // Blue to purple gradient
              'from-[#5856D6] to-[#AF52DE]', // Purple to pink gradient
              'from-[#AF52DE] to-[#FF2D55]', // Pink gradient
              'from-[#5AC8FA] to-[#007AFF]', // Light blue to blue gradient
              'from-[#007AFF] to-[#5E5CE6]', // Blue to purple-blue gradient
            ];
            const avatarGradient = gradientColors[index % gradientColors.length];
            
            return (
              <div
                key={memberCustomerId}
                className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-xl p-4 transition-all duration-300 hover:border-[#007AFF] hover:bg-[#2C2C2E] hover:shadow-[0_4px_16px_rgba(0,122,255,0.2)] hover:scale-[1.01] group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 bg-gradient-to-br ${avatarGradient} rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-[#1C1C1E] group-hover:ring-[#007AFF]/30 transition-all duration-300`}>
                        <span className="text-white font-semibold text-sm drop-shadow-sm">
                          {member.email ? member.email.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-white truncate">
                          {member.email || 'No email'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-[#8E8E93]">User ID:</span>
                          <span className="text-xs text-[#8E8E93] font-mono break-all select-all">
                            {memberCustomerId || 'N/A'}
                          </span>
                          <button
                            onClick={() => handleCopyId(memberCustomerId, 'user')}
                            className="text-xs text-[#007AFF] hover:text-[#0056CC] transition-colors flex-shrink-0"
                            title="Copy User ID"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        memberRole === 'admin' 
                          ? 'bg-[#007AFF]/20 text-[#007AFF] border border-[#007AFF]/40' 
                          : 'bg-[#8E8E93]/20 text-[#8E8E93] border border-[#8E8E93]/20'
                      }`}>
                        {memberRole === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="ml-3 flex-shrink-0">
                      <select
                        value={memberRole}
                        onChange={(e) => handleRoleChange(memberCustomerId, e.target.value)}
                        className="px-3 py-1.5 bg-[#2C2C2E] border border-[#3A3A3C] rounded-lg text-white text-xs focus:outline-none focus:border-[#007AFF] transition-colors"
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

