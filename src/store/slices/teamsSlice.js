import { createSlice } from '@reduxjs/toolkit';

/**
 * Teams Redux Slice with IPC Broadcast Support
 * Based on MongoDB schema: { teamId, teamName, application, members }
 * 
 * Each reducer supports a 'broadcast' parameter:
 * - broadcast=true: Send to main process for broadcasting (don't update local state)
 * - broadcast=false: Update local state (received from broadcast)
 */
const teamsSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [], // Array of { teamId, teamName, application, members }
    loading: false,
    error: null,
    lastFetched: null,
    selectedTeamId: null,
    viewMode: 'customer', // 'customer' or 'team'
    teamMembers: {}, // Object keyed by teamId, each value is array of { customerId, email, role }
  },
  reducers: {
    // Set all teams (used after fetching from API)
    setTeams: {
      reducer: (state, action) => {
        state.teams = Array.isArray(action.payload.data) ? action.payload.data : [];
        state.loading = false;
        state.error = null;
        state.lastFetched = Date.now();
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set loading state
    setLoading: {
      reducer: (state, action) => {
        state.loading = action.payload.data;
        if (action.payload.data) {
          state.error = null; // Clear error when starting to load
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set error state
    setError: {
      reducer: (state, action) => {
        state.error = action.payload.data;
        state.loading = false;
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set selected team ID for filtering
    setSelectedTeamId: {
      reducer: (state, action) => {
        state.selectedTeamId = action.payload.data;
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set view mode (customer or team)
    setViewMode: {
      reducer: (state, action) => {
        const mode = action.payload.data;
        if (mode === 'customer' || mode === 'team') {
          state.viewMode = mode;
          // Clear selected team when switching to customer mode
          if (mode === 'customer') {
            state.selectedTeamId = null;
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Add a new team
    addTeam: {
      reducer: (state, action) => {
        if (!Array.isArray(state.teams)) {
          state.teams = [];
        }
        
        const team = action.payload.data;
        const normalizedTeam = {
          teamId: team.teamId || team.id || team.team_id,
          teamName: team.teamName || team.team_name || team.name || '',
          application: team.application || '',
          members: Array.isArray(team.members) ? team.members : [],
          ...team
        };
        
        const exists = state.teams.some(t => 
          t.teamId === normalizedTeam.teamId || 
          (t.id && t.id === normalizedTeam.teamId)
        );
        
        if (!exists) {
          state.teams.push(normalizedTeam);
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update team information
    updateTeam: {
      reducer: (state, action) => {
        if (!Array.isArray(state.teams)) {
          state.teams = [];
          return;
        }
        
        const updatedTeam = action.payload.data;
        const teamIndex = state.teams.findIndex(t => 
          t.teamId === updatedTeam.teamId || 
          t.id === updatedTeam.teamId ||
          t.teamId === updatedTeam.id ||
          t.id === updatedTeam.id
        );
        
        if (teamIndex !== -1) {
          state.teams[teamIndex] = {
            ...state.teams[teamIndex],
            ...updatedTeam
          };
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Delete a team by ID
    deleteTeam: {
      reducer: (state, action) => {
        if (!Array.isArray(state.teams)) {
          state.teams = [];
          return;
        }
        
        const teamId = action.payload.data;
        state.teams = state.teams.filter(team => 
          team.teamId !== teamId && team.id !== teamId
        );
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Add member to team
    addTeamMember: {
      reducer: (state, action) => {
        if (!Array.isArray(state.teams)) {
          state.teams = [];
          return;
        }
        
        const { teamId, customerId, role } = action.payload.data;
        const team = state.teams.find(t => 
          t.teamId === teamId || t.id === teamId
        );
        
        if (team) {
          if (!Array.isArray(team.members)) {
            team.members = [];
          }
          
          // Check if member already exists
          const exists = team.members.some(m => 
            m.customerIds === customerId || m.customerId === customerId
          );
          
          if (!exists) {
            team.members.push({
              customerIds: customerId,
              role: role || 'user'
            });
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Clear all teams
    clearTeams: {
      reducer: (state, action) => {
        state.teams = [];
        state.error = null;
        state.lastFetched = null;
      },
      prepare: (data = null, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set team members for a specific team
    setTeamMembers: {
      reducer: (state, action) => {
        const { teamId, members } = action.payload.data;
        if (teamId) {
          state.teamMembers[teamId] = Array.isArray(members) ? members : [];
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update a team member's role
    updateMemberRole: {
      reducer: (state, action) => {
        const { teamId, customerId, newRole } = action.payload.data;
        if (teamId && state.teamMembers[teamId]) {
          const member = state.teamMembers[teamId].find(m => 
            m.customerId === customerId || m.customerIds === customerId
          );
          if (member) {
            member.role = newRole;
          }
        }
        // Also update in teams array if it exists
        const team = state.teams.find(t => 
          t.teamId === teamId || t.id === teamId
        );
        if (team && Array.isArray(team.members)) {
          const member = team.members.find(m => 
            m.customerIds === customerId || m.customerId === customerId
          );
          if (member) {
            member.role = newRole;
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
  },
});

export const { 
  setTeams,
  setLoading,
  setError,
  setSelectedTeamId,
  setViewMode,
  addTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  clearTeams,
  setTeamMembers,
  updateMemberRole
} = teamsSlice.actions;

export default teamsSlice.reducer;

