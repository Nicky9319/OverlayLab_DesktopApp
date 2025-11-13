import { createAsyncThunk } from '@reduxjs/toolkit';
import * as leadflowService from '../../services/leadflowService';
import { 
  setLeads, 
  setLoading, 
  setError, 
  setSelectedBucketId,
  addLead as addLeadAction,
  updateLeadStatus as updateLeadStatusAction,
  updateLeadNotes as updateLeadNotesAction,
  deleteLead as deleteLeadAction,
  moveLeadToBucket as moveLeadToBucketAction
} from '../slices/leadsSlice';

/**
 * Fetch all leads from API and update Redux state
 * @param {string|null} bucketId - Optional bucket ID to filter leads
 */
export const fetchLeads = createAsyncThunk(
  'leads/fetchLeads',
  async (bucketId = null, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      dispatch(setSelectedBucketId(bucketId));
      
      const leads = await leadflowService.getAllLeads(bucketId);
      
      // Normalize leads to match MongoDB schema
      const normalizedLeads = leads.map(lead => ({
        leadId: lead.leadId || lead.id || lead.lead_id,
        url: lead.url || '',
        username: lead.username || lead.user_name || '',
        platform: lead.platform || '',
        status: lead.status || 'Cold Message',
        bucketId: lead.bucketId || lead.bucket_id,
        notes: lead.notes || null,
        createdAt: lead.createdAt || new Date().toISOString(),
        ...lead // Preserve other fields
      }));
      
      dispatch(setLeads(normalizedLeads));
      return normalizedLeads;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch leads';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Add a new lead via API and update Redux state
 * @param {Object} params - { imageFile: File, bucketId: string|null }
 */
export const createLead = createAsyncThunk(
  'leads/createLead',
  async ({ imageFile, bucketId = null }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.addLead(imageFile, bucketId);
      
      if (response.status_code >= 200 && response.status_code < 300) {
        // Normalize the response to match schema
        const normalizedLead = {
          leadId: response.content.leadId || response.content.id || response.content.lead_id,
          url: response.content.url || '',
          username: response.content.username || response.content.user_name || '',
          platform: response.content.platform || '',
          status: response.content.status || 'Cold Message',
          bucketId: response.content.bucketId || response.content.bucket_id || bucketId,
          notes: response.content.notes || null,
          createdAt: response.content.createdAt || new Date().toISOString(),
          ...response.content
        };
        
        dispatch(addLeadAction(normalizedLead));
        return normalizedLead;
      } else {
        const errorMessage = response.content?.detail || 'Failed to create lead';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create lead';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update lead status via API and update Redux state
 * @param {Object} params - { leadId: string, status: string }
 */
export const updateLeadStatus = createAsyncThunk(
  'leads/updateLeadStatus',
  async ({ leadId, status }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateLeadStatus(leadId, status);
      
      if (response.status_code === 200) {
        dispatch(updateLeadStatusAction({ leadId, status }));
        return { leadId, status };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update lead status';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update lead status';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update lead notes via API and update Redux state
 * @param {Object} params - { leadId: string, notes: string }
 */
export const updateLeadNotes = createAsyncThunk(
  'leads/updateLeadNotes',
  async ({ leadId, notes }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.updateLeadNotes(leadId, notes);
      
      if (response.status_code === 200) {
        dispatch(updateLeadNotesAction({ leadId, notes }));
        return { leadId, notes };
      } else {
        const errorMessage = response.content?.detail || 'Failed to update lead notes';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update lead notes';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Delete lead via API and update Redux state
 * @param {Object} params - { leadId: string, bucketId: string|null }
 */
export const removeLead = createAsyncThunk(
  'leads/removeLead',
  async ({ leadId, bucketId = null }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.deleteLead(leadId, bucketId);
      
      if (response.status_code === 200) {
        dispatch(deleteLeadAction(leadId));
        return leadId;
      } else {
        const errorMessage = response.content?.detail || 'Failed to delete lead';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete lead';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Move lead to different bucket via API and update Redux state
 * @param {Object} params - { leadId: string, targetBucketId: string, sourceBucketId: string|null }
 */
export const moveLeadToBucket = createAsyncThunk(
  'leads/moveLeadToBucket',
  async ({ leadId, targetBucketId, sourceBucketId = null }, { dispatch, rejectWithValue }) => {
    try {
      const response = await leadflowService.moveLeadToBucket(leadId, targetBucketId, sourceBucketId);
      
      if (response.status_code === 200) {
        dispatch(moveLeadToBucketAction({ leadId, newBucketId: targetBucketId }));
        return { leadId, targetBucketId };
      } else {
        const errorMessage = response.content?.detail || 'Failed to move lead';
        dispatch(setError(errorMessage));
        return rejectWithValue(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to move lead';
      dispatch(setError(errorMessage));
      return rejectWithValue(errorMessage);
    }
  }
);

