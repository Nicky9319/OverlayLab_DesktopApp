import { createSlice } from '@reduxjs/toolkit';

/**
 * Leads Redux Slice with IPC Broadcast Support
 * Based on MongoDB schema: { leadId, url, username, platform, status, bucketId, notes, createdAt }
 * 
 * Each reducer supports a 'broadcast' parameter:
 * - broadcast=true: Send to main process for broadcasting (don't update local state)
 * - broadcast=false: Update local state (received from broadcast)
 */
const leadsSlice = createSlice({
  name: 'leads',
  initialState: {
    leads: [], // Array of lead objects
    loading: false,
    error: null,
    lastFetched: null, // Timestamp of last successful fetch
    selectedBucketId: null, // Currently selected bucket filter
  },
  reducers: {
    // Set all leads (used after fetching from API)
    setLeads: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware to decide whether to broadcast)
        // Ensure we always set an array, even if data is undefined/null
        state.leads = Array.isArray(action.payload.data) ? action.payload.data : [];
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
        // Always update local state (broadcast flag is only for middleware)
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
        // Always update local state (broadcast flag is only for middleware)
        state.error = action.payload.data;
        state.loading = false;
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Set selected bucket ID for filtering
    setSelectedBucketId: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        state.selectedBucketId = action.payload.data;
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Add a new lead
    addLead: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        // Ensure leads is always an array
        if (!Array.isArray(state.leads)) {
          state.leads = [];
        }
        
        const lead = action.payload.data;
        // Normalize lead to ensure required fields exist
        const normalizedLead = {
          leadId: lead.leadId || lead.id || lead.lead_id,
          url: lead.url || '',
          username: lead.username || lead.user_name || '',
          platform: lead.platform || '',
          status: lead.status || 'Cold Message',
          bucketId: lead.bucketId || lead.bucket_id,
          notes: lead.notes || null,
          createdAt: lead.createdAt || new Date().toISOString(),
          ...lead // Preserve other fields
        };
        
        // Check if lead already exists
        const exists = state.leads.some(l => 
          l.leadId === normalizedLead.leadId || 
          (l.id && l.id === normalizedLead.leadId)
        );
        
        if (!exists) {
          state.leads.push(normalizedLead);
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update lead status
    updateLeadStatus: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        // Ensure leads is always an array
        if (!Array.isArray(state.leads)) {
          state.leads = [];
          return;
        }
        
        const { leadId, status } = action.payload.data;
        const lead = state.leads.find(l => 
          l.leadId === leadId || l.id === leadId
        );
        if (lead) {
          lead.status = status;
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update lead notes
    updateLeadNotes: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        // Ensure leads is always an array
        if (!Array.isArray(state.leads)) {
          state.leads = [];
          return;
        }
        
        const { leadId, notes } = action.payload.data;
        const lead = state.leads.find(l => 
          l.leadId === leadId || l.id === leadId
        );
        if (lead) {
          lead.notes = notes;
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Update entire lead object
    updateLead: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        // Ensure leads is always an array
        if (!Array.isArray(state.leads)) {
          state.leads = [];
          return;
        }
        
        const updatedLead = action.payload.data;
        const leadIndex = state.leads.findIndex(l => 
          l.leadId === updatedLead.leadId || 
          l.id === updatedLead.leadId ||
          l.leadId === updatedLead.id ||
          l.id === updatedLead.id
        );
        
        if (leadIndex !== -1) {
          state.leads[leadIndex] = {
            ...state.leads[leadIndex],
            ...updatedLead
          };
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Delete a lead by ID
    deleteLead: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        // Ensure leads is always an array
        if (!Array.isArray(state.leads)) {
          state.leads = [];
          return;
        }
        
        const leadId = action.payload.data;
        state.leads = state.leads.filter(lead => 
          lead.leadId !== leadId && lead.id !== leadId
        );
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Move lead to different bucket
    moveLeadToBucket: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        // Ensure leads is always an array
        if (!Array.isArray(state.leads)) {
          state.leads = [];
          return;
        }
        
        const { leadId, targetBucketId } = action.payload.data;
        const lead = state.leads.find(l => 
          l.leadId === leadId || l.id === leadId
        );
        if (lead) {
          lead.bucketId = targetBucketId;
          // Also update bucket_id if it exists for backward compatibility
          if (lead.bucket_id !== undefined) {
            lead.bucket_id = targetBucketId;
          }
        }
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Clear all leads
    clearLeads: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        state.leads = [];
        state.error = null;
        state.lastFetched = null;
      },
      prepare: (data = null, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
    
    // Remove all leads from a specific bucket (when bucket is deleted)
    removeLeadsByBucketId: {
      reducer: (state, action) => {
        // Always update local state (broadcast flag is only for middleware)
        // Ensure leads is always an array
        if (!Array.isArray(state.leads)) {
          state.leads = [];
          return;
        }
        
        const bucketId = action.payload.data;
        state.leads = state.leads.filter(lead => 
          lead.bucketId !== bucketId && lead.bucket_id !== bucketId
        );
      },
      prepare: (data, broadcast = false) => ({
        payload: { data, broadcast }
      })
    },
  },
});

export const { 
  setLeads,
  setLoading,
  setError,
  setSelectedBucketId,
  addLead,
  updateLeadStatus,
  updateLeadNotes,
  updateLead,
  deleteLead,
  moveLeadToBucket,
  clearLeads,
  removeLeadsByBucketId
} = leadsSlice.actions;

export default leadsSlice.reducer;