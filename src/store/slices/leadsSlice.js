import { createSlice } from '@reduxjs/toolkit';

/**
 * Leads Redux Slice with IPC Broadcast Support
 * 
 * MongoDB Schema (supports both old and new formats):
 * 
 * Legacy fields: { leadId, url, username, platform, status, bucketId, notes, createdAt }
 * 
 * New multi-platform fields:
 * - linkedinUrl, linkedinUsername
 * - instaUrl, instaUsername
 * - xUrl, xUsername
 * - companyName, context
 * 
 * Each reducer supports a 'broadcast' parameter:
 * - broadcast=true: Send to main process for broadcasting (don't update local state)
 * - broadcast=false: Update local state (received from broadcast)
 */
const leadsSlice = createSlice({
  name: 'leads',
  initialState: {
    personal: {
      leads: [], // Array of lead objects
      loading: false,
      error: null,
      lastFetched: null, // Timestamp of last successful fetch
      selectedBucketId: null, // Currently selected bucket filter
    },
    teams: {}, // Object keyed by teamId: { leads: [], loading: false, error: null, lastFetched: null, selectedBucketId: null }
  },
  reducers: {
    // Set all leads (used after fetching from API)
    // context: 'personal' or teamId string
    setLeads: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        const leadsData = Array.isArray(data) ? data : [];
        
        // Initialize team state if it doesn't exist
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            leads: [],
            loading: false,
            error: null,
            lastFetched: null,
            selectedBucketId: null,
          };
        }
        
        // Update the target state
        if (context === 'personal') {
          state.personal.leads = leadsData;
          state.personal.loading = false;
          state.personal.error = null;
          state.personal.lastFetched = Date.now();
        } else {
          state.teams[context].leads = leadsData;
          state.teams[context].loading = false;
          state.teams[context].error = null;
          state.teams[context].lastFetched = Date.now();
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Set loading state
    // context: 'personal' or teamId string
    setLoading: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            leads: [],
            loading: false,
            error: null,
            lastFetched: null,
            selectedBucketId: null,
          };
        }
        
        if (context === 'personal') {
          state.personal.loading = data;
          if (data) {
            state.personal.error = null;
          }
        } else {
          state.teams[context].loading = data;
          if (data) {
            state.teams[context].error = null;
          }
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Set error state
    // context: 'personal' or teamId string
    setError: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            leads: [],
            loading: false,
            error: null,
            lastFetched: null,
            selectedBucketId: null,
          };
        }
        
        if (context === 'personal') {
          state.personal.error = data;
          state.personal.loading = false;
        } else {
          state.teams[context].error = data;
          state.teams[context].loading = false;
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Set selected bucket ID for filtering
    // context: 'personal' or teamId string
    setSelectedBucketId: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            leads: [],
            loading: false,
            error: null,
            lastFetched: null,
            selectedBucketId: null,
          };
        }
        
        if (context === 'personal') {
          state.personal.selectedBucketId = data;
        } else {
          state.teams[context].selectedBucketId = data;
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Add a new lead
    // context: 'personal' or teamId string
    addLead: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          state.teams[context] = {
            leads: [],
            loading: false,
            error: null,
            lastFetched: null,
            selectedBucketId: null,
          };
        }
        
        const leads = context === 'personal' ? state.personal.leads : state.teams[context].leads;
        if (!Array.isArray(leads)) {
          if (context === 'personal') {
            state.personal.leads = [];
          } else {
            state.teams[context].leads = [];
          }
        }
        
        const lead = data;
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
        
        const targetLeads = context === 'personal' ? state.personal.leads : state.teams[context].leads;
        const exists = targetLeads.some(l => 
          l.leadId === normalizedLead.leadId || 
          (l.id && l.id === normalizedLead.leadId)
        );
        
        if (!exists) {
          targetLeads.push(normalizedLead);
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Update lead status
    // context: 'personal' or teamId string
    updateLeadStatus: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const leads = context === 'personal' ? state.personal.leads : state.teams[context].leads;
        if (!Array.isArray(leads)) {
          return;
        }
        
        const { leadId, status } = data;
        const lead = leads.find(l => 
          l.leadId === leadId || l.id === leadId
        );
        if (lead) {
          lead.status = status;
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Update lead context
    // storeContext: 'personal' or teamId string (where to store the lead)
    updateLeadContext: {
      reducer: (state, action) => {
        const { data, storeContext, broadcast } = action.payload;
        
        if (storeContext !== 'personal' && !state.teams[storeContext]) {
          return;
        }
        
        const leads = storeContext === 'personal' ? state.personal.leads : state.teams[storeContext].leads;
        if (!Array.isArray(leads)) {
          return;
        }
        
        const { leadId, context: newLeadContext } = data;
        const lead = leads.find(l => 
          l.leadId === leadId || l.id === leadId
        );
        if (lead) {
          lead.context = newLeadContext;
        }
      },
      prepare: (data, storeContext = 'personal', broadcast = false) => ({
        payload: { data, storeContext, broadcast }
      })
    },
    
    // Update entire lead object
    // context: 'personal' or teamId string
    updateLead: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const leads = context === 'personal' ? state.personal.leads : state.teams[context].leads;
        if (!Array.isArray(leads)) {
          return;
        }
        
        const updatedLead = data;
        const leadIndex = leads.findIndex(l => 
          l.leadId === updatedLead.leadId || 
          l.id === updatedLead.leadId ||
          l.leadId === updatedLead.id ||
          l.id === updatedLead.id
        );
        
        if (leadIndex !== -1) {
          if (context === 'personal') {
            state.personal.leads[leadIndex] = {
              ...state.personal.leads[leadIndex],
              ...updatedLead
            };
          } else {
            state.teams[context].leads[leadIndex] = {
              ...state.teams[context].leads[leadIndex],
              ...updatedLead
            };
          }
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Delete a lead by ID
    // context: 'personal' or teamId string
    deleteLead: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const leads = context === 'personal' ? state.personal.leads : state.teams[context].leads;
        if (!Array.isArray(leads)) {
          return;
        }
        
        const leadId = data;
        if (context === 'personal') {
          state.personal.leads = leads.filter(lead => 
            lead.leadId !== leadId && lead.id !== leadId
          );
        } else {
          state.teams[context].leads = leads.filter(lead => 
            lead.leadId !== leadId && lead.id !== leadId
          );
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Move lead to different bucket
    // context: 'personal' or teamId string
    moveLeadToBucket: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const leads = context === 'personal' ? state.personal.leads : state.teams[context].leads;
        if (!Array.isArray(leads)) {
          return;
        }
        
        const { leadId, targetBucketId } = data;
        const lead = leads.find(l => 
          l.leadId === leadId || l.id === leadId
        );
        if (lead) {
          lead.bucketId = targetBucketId;
          if (lead.bucket_id !== undefined) {
            lead.bucket_id = targetBucketId;
          }
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
      })
    },
    
    // Clear all leads
    // context: 'personal' or teamId string
    clearLeads: {
      reducer: (state, action) => {
        const { context, broadcast } = action.payload;
        
        if (context === 'personal') {
          state.personal.leads = [];
          state.personal.error = null;
          state.personal.lastFetched = null;
        } else {
          if (state.teams[context]) {
            state.teams[context].leads = [];
            state.teams[context].error = null;
            state.teams[context].lastFetched = null;
          }
        }
      },
      prepare: (context = 'personal', broadcast = false) => ({
        payload: { context, broadcast }
      })
    },
    
    // Remove all leads from a specific bucket (when bucket is deleted)
    // context: 'personal' or teamId string
    removeLeadsByBucketId: {
      reducer: (state, action) => {
        const { data, context, broadcast } = action.payload;
        
        if (context !== 'personal' && !state.teams[context]) {
          return;
        }
        
        const leads = context === 'personal' ? state.personal.leads : state.teams[context].leads;
        if (!Array.isArray(leads)) {
          return;
        }
        
        const bucketId = data;
        if (context === 'personal') {
          state.personal.leads = leads.filter(lead => 
            lead.bucketId !== bucketId && lead.bucket_id !== bucketId
          );
        } else {
          state.teams[context].leads = leads.filter(lead => 
            lead.bucketId !== bucketId && lead.bucket_id !== bucketId
          );
        }
      },
      prepare: (data, context = 'personal', broadcast = false) => ({
        payload: { data, context, broadcast }
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
  updateLeadContext,
  updateLead,
  deleteLead,
  moveLeadToBucket,
  clearLeads,
  removeLeadsByBucketId
} = leadsSlice.actions;

export default leadsSlice.reducer;