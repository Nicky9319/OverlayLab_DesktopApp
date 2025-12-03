import { createAsyncThunk } from '@reduxjs/toolkit';
import * as leadflowService from '../../services/leadflowService';
import { 
  setLoading, 
  setError, 
  setTeams,
  addTeam as addTeamAction,
  updateTeam as updateTeamAction,
  addTeamMember as addTeamMemberAction
} from '../slices/teamsSlice';

/**
 * Create a new team via API and update Redux state
 * @param {Object} params - { teamName: string, application: string }
 */
export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async ({ teamName, application }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await leadflowService.addTeam(teamName, application);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedTeam = {
          teamId: response.content.teamId || response.content.id || response.content.team_id,
          teamName: response.content.teamName || response.content.team_name || response.content.name || teamName,
          application: response.content.application || application,
          members: Array.isArray(response.content.members) ? response.content.members : [],
          ...response.content
        };
        
        dispatch(addTeamAction(normalizedTeam, true));
        return normalizedTeam;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create team';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create team';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Add a member to a team via API and update Redux state
 * @param {Object} params - { teamId: string, customerEmail: string, role: string }
 */
export const addMember = createAsyncThunk(
  'teams/addMember',
  async ({ teamId, customerEmail, role }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await leadflowService.addTeamMember(teamId, customerEmail, role);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        // Extract customerId from response if available, otherwise we'll need to fetch it by email
        const customerId = response.content?.customerId || null;
        
        dispatch(addTeamMemberAction({ teamId, customerId, role }, true));
        return { teamId, customerEmail, role, customerId };
      } else {
        const errorMessage = response.content?.detail || 'Failed to add team member';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to add team member';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Fetch all teams for the authenticated user via API and update Redux state
 */
export const fetchAllTeams = createAsyncThunk(
  'teams/fetchAllTeams',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const teams = await leadflowService.getAllTeams();
      
      // Normalize teams to match MongoDB schema
      const normalizedTeams = teams.map(team => ({
        teamId: team.teamId || team.id || team.team_id,
        teamName: team.teamName || team.team_name || team.name || '',
        application: team.application || '',
        members: Array.isArray(team.members) ? team.members : [],
        ...team
      }));
      
      dispatch(setTeams(normalizedTeams, true));
      return normalizedTeams;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch teams';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Update team name via API and update Redux state
 * @param {Object} params - { teamId: string, teamName: string }
 */
export const updateTeamName = createAsyncThunk(
  'teams/updateTeamName',
  async ({ teamId, teamName }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const response = await leadflowService.updateTeamName(teamId, teamName);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedTeam = {
          teamId: response.content.teamId || response.content.id || response.content.team_id || teamId,
          teamName: response.content.teamName || response.content.team_name || response.content.name || teamName,
          application: response.content.application || '',
          members: Array.isArray(response.content.members) ? response.content.members : [],
          ...response.content
        };
        
        dispatch(updateTeamAction(normalizedTeam, true));
        return normalizedTeam;
      } else {
        const errorMessage = response.content?.detail || 'Failed to update team name';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update team name';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

