import React, { useState } from 'react';
import BucketSelector from './BucketSelector';

const LeadCard = ({ lead, isActive, updateLeadNotes, updateLeadStatus, deleteLead, moveLeadToBucket, buckets = [], currentBucketId }) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editedStatus, setEditedStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!lead) return null;

  const handleNotesEdit = () => {
    setIsEditingNotes(true);
    setEditedNotes(lead.notes || '');
  };

  const handleNotesSave = () => {
    if (updateLeadNotes) {
      updateLeadNotes(lead.leadId, editedNotes);
    }
    // Function call when notes are saved
    console.log('Notes updated for lead:', lead.leadId, 'New notes:', editedNotes);
    setIsEditingNotes(false);
  };

  const handleNotesCancel = () => {
    setIsEditingNotes(false);
    setEditedNotes('');
  };

  const handleNotesKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleNotesSave();
    } else if (e.key === 'Escape') {
      handleNotesCancel();
    }
  };

  // Status editing functions
  const handleStatusEdit = () => {
    setIsEditingStatus(true);
    setEditedStatus(lead.status || '');
  };

  const handleStatusSave = () => {
    if (updateLeadStatus) {
      updateLeadStatus(lead.leadId, editedStatus);
    }
    // Function call when status is saved
    console.log('Status updated for lead:', lead.leadId, 'New status:', editedStatus);
    setIsEditingStatus(false);
  };

  const handleStatusCancel = () => {
    setIsEditingStatus(false);
    setEditedStatus('');
  };

  const handleStatusKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleStatusSave();
    } else if (e.key === 'Escape') {
      handleStatusCancel();
    }
  };

  const handleLinkClick = (url) => {
    // Use electron's shell to open URL in default browser
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      // Fallback for development or if electronAPI is not available
      console.log('Would open URL:', url);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteLead) {
      deleteLead(lead.leadId);
    }
    setShowDeleteConfirm(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'cold message':
        return 'bg-[#8E8E93] text-white';
      case 'first follow up':
        return 'bg-[#007AFF] text-white';
      case 'second follow up':
        return 'bg-[#FF9500] text-white';
      case 'meeting':
        return 'bg-[#00D09C] text-white';
      case 'closed':
        return 'bg-[#FF3B30] text-white';
      // Legacy status support
      case 'qualified':
        return 'bg-[#00D09C] text-white';
      case 'contacted':
        return 'bg-[#FF9500] text-white';
      case 'new':
        return 'bg-[#007AFF] text-white';
      default:
        return 'bg-[#8E8E93] text-white';
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'linkedin':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M22.46 0H1.54C.69 0 0 .69 0 1.54v20.92C0 23.31.69 24 1.54 24h20.92c.85 0 1.54-.69 1.54-1.54V1.54C24 .69 23.31 0 22.46 0zM7.11 20.45H3.56V9h3.55v11.45zM5.34 7.43c-1.14 0-2.06-.93-2.06-2.06s.92-2.06 2.06-2.06 2.06.93 2.06 2.06-.92 2.06-2.06 2.06zM20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28z"/>
          </svg>
        );
      case 'insta':
        return (
          <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zm0-2.16c-3.26 0-3.67.01-4.95.07-1.28.06-2.16.27-2.93.57-.79.31-1.46.72-2.13 1.39-.67.67-1.08 1.34-1.39 2.13-.3.77-.51 1.65-.57 2.93-.06 1.28-.07 1.69-.07 4.95s.01 3.67.07 4.95c.06 1.28.27 2.16.57 2.93.31.79.72 1.46 1.39 2.13.67.67 1.34 1.08 2.13 1.39.77.3 1.65.51 2.93.57 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.28-.06 2.16-.27 2.93-.57.79-.31 1.46-.72 2.13-1.39.67-.67 1.08-1.34 1.39-2.13.3-.77.51-1.65.57-2.93.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.27-2.16-.57-2.93-.31-.79-.72-1.46-1.39-2.13-.67-.67-1.34-1.08-2.13-1.39-.77-.3-1.65-.51-2.93-.57C15.67.01 15.26 0 12 0z"/>
              <path d="M12 5.84c-3.4 0-6.16 2.76-6.16 6.16s2.76 6.16 6.16 6.16 6.16-2.76 6.16-6.16-2.76-6.16-6.16-6.16zm0 10.15c-2.2 0-3.99-1.79-3.99-3.99s1.79-3.99 3.99-3.99 3.99 1.79 3.99 3.99-1.79 3.99-3.99 3.99z"/>
              <circle cx="18.41" cy="5.59" r="1.44"/>
            </svg>
          </div>
        );
      case 'reddit':
        return (
          <div className="w-5 h-5 bg-[#FF4500] rounded-full flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
              <path d="M14.238 15.348c.085-.084.085-.221 0-.306-.465-.462-1.194-.687-2.238-.687s-1.773.225-2.238.687c-.085.085-.085.222 0 .306.084.085.222.085.306 0 .31-.31.937-.462 1.932-.462s1.622.152 1.932.462c.084.085.222.085.306 0z"/>
              <path d="M19.25 11.5c0-1.171-.949-2.12-2.12-2.12-.696 0-1.316.34-1.705.864-1.678-1.188-3.991-1.951-6.551-2.049l1.115-5.249 3.648.777c.018 1.016.847 1.835 1.872 1.835 1.034 0 1.888-.867 1.888-1.888 0-1.034-.854-1.888-1.888-1.888-.736 0-1.369.405-1.696 1.006l-4.108-.875c-.128-.027-.263.036-.306.178l-1.257 5.922C4.754 7.227 2.279 8.033.498 9.505c-.355-.487-.927-.811-1.596-.811-1.171 0-2.120.949-2.120 2.120 0 .855.506 1.588 1.233 1.932-.018.197-.018.412 0 .627 0 3.204 3.730 5.8 8.314 5.8s8.314-2.596 8.314-5.8c.018-.215.018-.43 0-.627.727-.344 1.233-1.077 1.233-1.932zM4.609 13.231c0-1.034.854-1.888 1.888-1.888s1.888.854 1.888 1.888-.854 1.888-1.888 1.888-1.888-.854-1.888-1.888zm10.225 4.906c-1.678 1.678-4.906 1.678-6.584 0-.128-.128-.128-.335 0-.463.128-.128.335-.128.463 0 1.422 1.422 4.236 1.422 5.658 0 .128-.128.335-.128.463 0 .128.128.128.335 0 .463zm-.036-3.018c-1.034 0-1.888-.854-1.888-1.888s.854-1.888 1.888-1.888 1.888.854 1.888 1.888-.854 1.888-1.888 1.888z"/>
            </svg>
          </div>
        );
      case 'behance':
        return (
          <div className="w-5 h-5 bg-[#1769FF] rounded flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
              <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.497 1.19.9.26 1.555.67 1.96 1.22.404.55.61 1.24.61 2.06 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.76-.62.16-1.24.24-1.84.24H0V4.51h6.938v-.007zM3.495 8.458h2.77c.645 0 1.12-.075 1.43-.24.31-.16.47-.45.47-.86 0-.23-.045-.41-.135-.56-.09-.15-.211-.27-.368-.35-.157-.08-.34-.14-.55-.18-.21-.04-.433-.06-.67-.06H3.495v2.25zm0 4.523h3.03c.29 0 .55-.02.77-.075.22-.055.41-.14.58-.26.17-.12.29-.27.38-.45.09-.18.135-.39.135-.624 0-.505-.18-.865-.54-1.08-.36-.21-.87-.32-1.53-.32H3.495v2.81zm11.174-2.742h5.308c-.077-.866-.272-1.45-.585-1.756-.31-.305-.72-.458-1.23-.458-.59 0-1.064.16-1.414.48-.35.32-.605.77-.762 1.35-.157-.58-.27-1.03-.317-1.616zm2.05-3.95c.72 0 1.36.128 1.92.383.56.256 1.025.6 1.39 1.035.37.435.64.95.82 1.546.18.596.27 1.23.27 1.9v.435h-7.69c.044.866.31 1.527.795 1.983.49.456 1.05.684 1.69.684.435 0 .84-.06 1.215-.18.375-.12.69-.285.945-.495l.615 1.08c-.39.27-.87.49-1.44.66-.57.17-1.145.255-1.725.255-1.38 0-2.49-.405-3.33-1.215-.84-.81-1.26-1.95-1.26-3.42 0-.735.135-1.41.405-2.025.27-.615.64-1.14 1.11-1.575.47-.435 1.02-.77 1.65-.995.63-.225 1.29-.338 1.98-.338z"/>
            </svg>
          </div>
        );
      case 'pinterest':
        return (
          <div className="w-5 h-5 bg-[#E60023] rounded-full flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.404-5.965 1.404-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-12.014C24.007 5.367 18.641.001 12.017.001z"/>
            </svg>
          </div>
        );
      case 'x':
        return (
          <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
        );
      case 'email':
        return (
          <div className="w-5 h-5 bg-[#EA4335] rounded flex items-center justify-center">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h3.819v.545L12 10.455l6.545-6.089v-.545h3.819c.904 0 1.636.732 1.636 1.636z"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 bg-[#8E8E93] rounded flex items-center justify-center">
            <svg className="w-3 h-3" fill="white" viewBox="0 0 24 24">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/>
            </svg>
          </div>
        );
    }
  };

  return (
    <div 
      className={`lead-card transition-all duration-300 ease-in-out ${
        isActive 
          ? 'opacity-100 scale-100 translate-x-0' 
          : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
      }`}
    >
      <div className="bg-[#111111] rounded-lg shadow-lg border border-[#1C1C1E] p-4 max-w-4xl mx-auto max-h-[70vh] overflow-y-auto">
        {/* Header - More compact */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {lead.username?.charAt(0)?.toUpperCase() || 'L'}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[#FFFFFF]">
              @{lead.username || 'Unknown User'}
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-[#007AFF]">
                {getPlatformIcon(lead.platform)}
              </span>
              <span className="text-sm text-[#8E8E93]">
                {lead.platform || 'Unknown Platform'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteClick}
              className="p-2 text-[#FF3B30] hover:text-[#FF1D18] hover:bg-[#1C1C1E] rounded-lg transition-colors"
              title="Delete lead"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bucket Selector */}
        {buckets.length > 1 && (
          <div className="mb-3">
            <BucketSelector
              buckets={buckets}
              currentBucketId={currentBucketId}
              onBucketChange={moveLeadToBucket}
              leadId={lead.leadId}
              className="flex items-center"
            />
          </div>
        )}

        {/* Profile URL */}
        {lead.url && (
          <div className="mb-3">
            <div className="flex items-center text-sm text-[#E5E5E7]">
              <svg className="w-4 h-4 mr-2 text-[#8E8E93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <button 
                onClick={() => handleLinkClick(lead.url)}
                className="text-[#007AFF] hover:text-[#0056CC] truncate cursor-pointer transition-colors text-xs"
                title="Open in default browser"
              >
                {lead.url.replace('https://', '').replace('http://', '')}
              </button>
            </div>
          </div>
        )}

        {/* Main Content - Horizontal Layout */}
        <div className="flex gap-4">
          {/* Notes Section - Left Side */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[#E5E5E7]">Notes</h4>
              {!isEditingNotes && (
                <button
                  onClick={handleNotesEdit}
                  className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
                  title="Edit notes"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            
            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  onKeyDown={handleNotesKeyPress}
                  className="w-full h-20 px-2 py-2 text-sm bg-[#1C1C1E] border border-[#007AFF] rounded-md text-[#E5E5E7] focus:outline-none focus:ring-1 focus:ring-[#007AFF] resize-none"
                  placeholder="Add your notes here..."
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleNotesCancel}
                    className="px-2 py-1 text-xs bg-[#2D2D2F] text-[#E5E5E7] hover:bg-[#3D3D3F] rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNotesSave}
                    className="px-2 py-1 text-xs bg-[#007AFF] text-white hover:bg-[#0056CC] rounded transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="text-sm text-[#E5E5E7] bg-[#1C1C1E] p-2 rounded-md min-h-[60px] cursor-pointer hover:bg-[#2D2D2F] transition-colors"
                onClick={handleNotesEdit}
              >
                {lead.notes || (
                  <span className="text-[#8E8E93] italic">Click to add notes...</span>
                )}
              </div>
            )}
          </div>

          {/* Status Section - Right Side */}
          <div className="w-64">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-[#E5E5E7]">Status</h4>
              {!isEditingStatus && (
                <button
                  onClick={handleStatusEdit}
                  className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
                  title="Edit status"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            
            {isEditingStatus ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedStatus}
                  onChange={(e) => setEditedStatus(e.target.value)}
                  onKeyDown={handleStatusKeyPress}
                  className="w-full px-2 py-2 text-sm bg-[#1C1C1E] border border-[#007AFF] rounded-md text-[#E5E5E7] focus:outline-none focus:ring-1 focus:ring-[#007AFF]"
                  placeholder="Type custom status..."
                  autoFocus
                />
                <div className="flex flex-wrap gap-1">
                  {['cold message', 'first follow up', 'second follow up', 'meeting', 'closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setEditedStatus(status)}
                      className="px-2 py-1 text-xs bg-[#2D2D2F] text-[#E5E5E7] hover:bg-[#007AFF] hover:text-white rounded transition-colors capitalize"
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleStatusCancel}
                    className="px-2 py-1 text-xs bg-[#2D2D2F] text-[#E5E5E7] hover:bg-[#3D3D3F] rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStatusSave}
                    className="px-2 py-1 text-xs bg-[#007AFF] text-white hover:bg-[#0056CC] rounded transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="cursor-pointer hover:bg-[#2D2D2F] transition-colors p-2 rounded"
                onClick={handleStatusEdit}
              >
                <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full capitalize ${
                  getStatusColor(lead.status)
                }`}>
                  {lead.status || 'Cold Message'}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1C1C1E] rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-[#FFFFFF] mb-3">
              Delete Lead
            </h3>
            <p className="text-[#E5E5E7] mb-6">
              Are you sure you want to delete this lead? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-[#E5E5E7] bg-[#2D2D2F] hover:bg-[#3D3D3F] rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-white bg-[#FF3B30] hover:bg-[#FF1D18] rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadCard;
