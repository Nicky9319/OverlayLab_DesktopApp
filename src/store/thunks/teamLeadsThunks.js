import { createAsyncThunk } from '@reduxjs/toolkit';
import * as leadflowService from '../../services/leadflowService';
import { 
  setLeads, 
  setLoading, 
  setError,
  setSelectedBucketId,
  addLead as addLeadAction,
  updateLead as updateLeadAction,
  updateLeadStatus as updateLeadStatusAction,
  updateLeadContext as updateLeadContextAction,
  updateLeadCheckpoint as updateLeadCheckpointAction,
  deleteLead as deleteLeadAction,
  moveLeadToBucket as moveLeadToBucketAction
} from '../slices/leadsSlice';

/**
 * Fetch all leads for a team from API and update Redux state
 * @param {Object} params - { teamId: string, bucketId: string|null }
 */
export const fetchTeamLeads = createAsyncThunk(
  'teamLeads/fetchTeamLeads',
  async ({ teamId, bucketId = null }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true, teamId, true));
      dispatch(setSelectedBucketId(bucketId, teamId, true));
      const leads = await leadflowService.getTeamLeads(teamId, bucketId);
      
      const normalizedLeads = leads.map(lead => ({
        leadId: lead.leadId || lead.id || lead.lead_id,
        url: lead.url || '',
        username: lead.username || lead.user_name || '',
        platform: lead.platform || '',
        status: lead.status || 'Cold Message',
        bucketId: lead.bucketId || lead.bucket_id,
        teamId: lead.teamId || lead.team_id || teamId,
        customerId: null,
        notes: lead.notes || null,
        createdAt: lead.createdAt || new Date().toISOString(),
        ...lead
      }));
      
      // Store in team context - Broadcast to all windows (broadcast=true)
      dispatch(setLeads(normalizedLeads, teamId, true));
      return normalizedLeads;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch team leads';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    } finally {
      dispatch(setLoading(false, teamId, true));
    }
  }
);

/**
 * Create a team lead via API and update Redux state
 * @param {Object} params - { teamId, url, username, platform, status, bucketId, notes }
 */
export const createTeamLead = createAsyncThunk(
  'teamLeads/createTeamLead',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      const { teamId, url, username, platform, status, bucketId, notes } = params;
      const response = await leadflowService.addTeamLead(
        teamId, 
        url, 
        username || '', 
        platform || '', 
        status || 'Cold Message', 
        bucketId, 
        notes || ''
      );
      
      if (response.status_code >= 200 && response.status_code < 300) {
        const normalizedLead = {
          leadId: response.content.leadId || response.content.id || response.content.lead_id,
          url: response.content.url || url,
          username: response.content.username || username || '',
          platform: response.content.platform || platform || '',
          status: response.content.status || status || 'Cold Message',
          bucketId: response.content.bucketId || response.content.bucket_id || bucketId,
          teamId: response.content.teamId || response.content.team_id || teamId,
          customerId: null,
          notes: response.content.notes || notes || null,
          createdAt: response.content.createdAt || new Date().toISOString(),
          ...response.content
        };
        
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(addLeadAction(normalizedLead, teamId, true));
        return normalizedLead;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create team lead';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create team lead';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update team lead via API and update Redux state
 * @param {Object} params - { teamId: string, leadId: string, updates: Object }
 */
export const updateTeamLead = createAsyncThunk(
  'teamLeads/updateTeamLead',
  async ({ teamId, leadId, updates }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateTeamLead(teamId, leadId, updates);
      
      if (response.status_code === 200) {
        const updatedLead = {
          leadId,
          teamId,
          ...updates
        };
        
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(updateLeadAction(updatedLead, teamId, true));
        return { leadId, teamId, updates };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update team lead';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update team lead';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Delete team lead via API and update Redux state
 * @param {Object} params - { teamId: string, leadId: string }
 */
export const removeTeamLead = createAsyncThunk(
  'teamLeads/removeTeamLead',
  async ({ teamId, leadId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.deleteTeamLead(teamId, leadId);
      
      if (response.status_code === 200) {
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(deleteLeadAction(leadId, teamId, true));
        return leadId;
      } else {
        const errorMessage = response.content?.detail || 'Failed to delete team lead';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete team lead';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update team lead status via API and update Redux state
 * @param {Object} params - { teamId: string, leadId: string, status: string }
 */
export const updateTeamLeadStatus = createAsyncThunk(
  'teamLeads/updateTeamLeadStatus',
  async ({ teamId, leadId, status }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateTeamLeadStatus(teamId, leadId, status);
      
      if (response.status_code === 200) {
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(updateLeadStatusAction({ leadId, status }, teamId, true));
        return { leadId, teamId, status };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update team lead status';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update team lead status';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update team lead notes via API and update Redux state
 * @param {Object} params - { teamId: string, leadId: string, notes: string }
 */
export const updateTeamLeadNotes = createAsyncThunk(
  'teamLeads/updateTeamLeadNotes',
  async ({ teamId, leadId, notes }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateTeamLeadNotes(teamId, leadId, notes);
      
      if (response.status_code === 200) {
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(updateLeadContextAction({ leadId, context: notes }, teamId, true));
        return { leadId, teamId, notes };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update team lead notes';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update team lead notes';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Move team lead to different bucket via API and update Redux state
 * @param {Object} params - { teamId: string, leadId: string, targetBucketId: string }
 */
export const moveTeamLeadToBucket = createAsyncThunk(
  'teamLeads/moveTeamLeadToBucket',
  async ({ teamId, leadId, targetBucketId }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.moveTeamLeadToBucket(teamId, leadId, targetBucketId);
      
      if (response.status_code === 200) {
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(moveLeadToBucketAction({ leadId, targetBucketId }, teamId, true));
        return { leadId, teamId, targetBucketId };
      } else {
        const errorMessage = response.content?.detail || 'Failed to move team lead';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to move team lead';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update team lead checkpoint via API and update Redux state
 * @param {Object} params - { teamId: string, leadId: string, checkpoint: boolean }
 */
export const updateTeamLeadCheckpoint = createAsyncThunk(
  'teamLeads/updateTeamLeadCheckpoint',
  async ({ teamId, leadId, checkpoint }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateTeamLeadCheckpoint(teamId, leadId, checkpoint);
      
      if (response.status_code === 200) {
        // Store in team context - Broadcast to all windows (broadcast=true)
        dispatch(updateLeadCheckpointAction({ leadId, checkpoint }, teamId, true));
        return { leadId, teamId, checkpoint };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update team lead checkpoint';
        dispatch(setError(errorMessage, teamId, true));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update team lead checkpoint';
      dispatch(setError(errorMessage, teamId, true));
      return rejectWithValue(errorMessage);
    }
  }
);

