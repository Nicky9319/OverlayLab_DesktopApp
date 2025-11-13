import { createSlice } from '@reduxjs/toolkit';

/**
 * Leads Redux Slice
 * Based on MongoDB schema: {
 *   leadId: string,
 *   url: string,
 *   username: string,
 *   platform: string,
 *   status: string,
 *   bucketId: string,
 *   notes: string | null,
 *   createdAt: date
 * }
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
    setLeads: (state, action) => {
      state.leads = action.payload;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null; // Clear error when starting to load
      }
    },
    // Set error state
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    // Set selected bucket filter
    setSelectedBucketId: (state, action) => {
      state.selectedBucketId = action.payload;
    },
    // Add a new lead
    addLead: (state, action) => {
      const lead = action.payload;
      // Normalize to ensure leadId exists
      const normalizedLead = {
        leadId: lead.leadId || lead.id || lead.lead_id,
        url: lead.url || '',
        username: lead.username || lead.user_name || '',
        platform: lead.platform || '',
        status: lead.status || 'Cold Message',
        bucketId: lead.bucketId || lead.bucket_id,
        notes: lead.notes || null,
        createdAt: lead.createdAt || new Date().toISOString(),
        ...lead
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
    // Update lead status
    updateLeadStatus: (state, action) => {
      const { leadId, status } = action.payload;
      const lead = state.leads.find(l => 
        l.leadId === leadId || l.id === leadId || l.lead_id === leadId
      );
      if (lead) {
        lead.status = status;
      }
    },
    // Update lead notes
    updateLeadNotes: (state, action) => {
      const { leadId, notes } = action.payload;
      const lead = state.leads.find(l => 
        l.leadId === leadId || l.id === leadId || l.lead_id === leadId
      );
      if (lead) {
        lead.notes = notes || null;
      }
    },
    // Update lead (general update for any field)
    updateLead: (state, action) => {
      const { leadId, updates } = action.payload;
      const lead = state.leads.find(l => 
        l.leadId === leadId || l.id === leadId || l.lead_id === leadId
      );
      if (lead) {
        Object.assign(lead, updates);
      }
    },
    // Delete a lead by ID
    deleteLead: (state, action) => {
      const leadId = action.payload;
      state.leads = state.leads.filter(lead => 
        lead.leadId !== leadId && lead.id !== leadId && lead.lead_id !== leadId
      );
    },
    // Move lead to different bucket
    moveLeadToBucket: (state, action) => {
      const { leadId, newBucketId } = action.payload;
      const lead = state.leads.find(l => 
        l.leadId === leadId || l.id === leadId || l.lead_id === leadId
      );
      if (lead) {
        lead.bucketId = newBucketId;
        // Also update bucket_id if it exists for backward compatibility
        if (lead.bucket_id !== undefined) {
          lead.bucket_id = newBucketId;
        }
      }
    },
    // Clear all leads
    clearLeads: (state) => {
      state.leads = [];
      state.error = null;
      state.lastFetched = null;
      state.selectedBucketId = null;
    },
    // Remove leads by bucket ID (when bucket is deleted)
    removeLeadsByBucketId: (state, action) => {
      const bucketId = action.payload;
      state.leads = state.leads.filter(lead => 
        lead.bucketId !== bucketId && lead.bucket_id !== bucketId
      );
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
