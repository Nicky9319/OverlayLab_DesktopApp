import React from 'react';
import LeadCard from './LeadCard';

// Simplified LeadsContainer - navigation logic moved to parent (leads.jsx)
// This component is kept for backward compatibility but is no longer used in the main layout
const LeadsContainer = ({ 
  leads = [], 
  currentIndex = 0,
  updateLeadContext, 
  updateLeadStatus, 
  updateLeadCheckpoint, 
  deleteLead, 
  moveLeadToBucket, 
  buckets = [], 
  currentBucketId 
}) => {
  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#1C1C1E] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-[#FFFFFF] mb-2">No Leads Found</h3>
          <p className="text-[#8E8E93]">Add some leads to get started with the card view.</p>
        </div>
      </div>
    );
  }

  const currentLead = leads[currentIndex];

  if (!currentLead) {
    return null;
  }

  return (
    <div className="leads-container">
      <LeadCard 
        lead={currentLead} 
        isActive={true}
        updateLeadContext={updateLeadContext}
        updateLeadStatus={updateLeadStatus}
        updateLeadCheckpoint={updateLeadCheckpoint}
        deleteLead={deleteLead}
        moveLeadToBucket={moveLeadToBucket}
        buckets={buckets}
        currentBucketId={currentBucketId}
      />
    </div>
  );
};

export default LeadsContainer;
