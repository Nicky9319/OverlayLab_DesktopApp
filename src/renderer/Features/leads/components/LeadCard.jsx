import React, { useState, useMemo } from 'react';
import BucketSelector from './BucketSelector';
import { useDispatch } from 'react-redux';
import { updateLeadPlatformStatus, updateLeadPlatformReachedOut } from '../../../../store/thunks/leadsThunks';

const LeadCard = ({ lead, isActive, updateLeadContext, updateLeadStatus, updateLeadCheckpoint, deleteLead, moveLeadToBucket, buckets = [], currentBucketId }) => {
  const dispatch = useDispatch();
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editedContext, setEditedContext] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [editedStatus, setEditedStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [activeTab, setActiveTab] = useState(null); // Platform name for active tab

  if (!lead) return null;

  // Define platform configuration
  const platforms = useMemo(() => [
    { key: 'linkedin', urlField: 'linkedinUrl', statusField: 'linkedinStatus', reachedOutField: 'linkedinReachedOut', name: 'LinkedIn', icon: 'linkedin' },
    { key: 'insta', urlField: 'instaUrl', statusField: 'instaStatus', reachedOutField: 'instaReachedOut', name: 'Instagram', icon: 'insta' },
    { key: 'x', urlField: 'xUrl', statusField: 'xStatus', reachedOutField: 'xReachedOut', name: 'X', icon: 'x' },
    { key: 'email', urlField: 'email', statusField: 'emailStatus', reachedOutField: 'emailReachedOut', name: 'Email', icon: 'email' },
    { key: 'pinterest', urlField: 'pinterestUrl', statusField: 'pinterestStatus', reachedOutField: 'pinterestReachedOut', name: 'Pinterest', icon: 'pinterest' },
    { key: 'artstation', urlField: 'artstationUrl', statusField: 'artstationStatus', reachedOutField: 'artstationReachedOut', name: 'ArtStation', icon: 'artstation' },
    { key: 'youtube', urlField: 'youtubeUrl', statusField: 'youtubeStatus', reachedOutField: 'youtubeReachedOut', name: 'YouTube', icon: 'youtube' },
  ], []);

  // Show all platforms, but prioritize those with URLs for initial tab
  const availablePlatforms = useMemo(() => {
    return platforms.filter(p => lead[p.urlField]);
  }, [lead, platforms]);

  // Set initial active tab to first available platform (with URL)
  React.useEffect(() => {
    if (availablePlatforms.length > 0 && !activeTab) {
      setActiveTab(availablePlatforms[0].key);
    }
  }, [availablePlatforms, activeTab]);

  // Get current platform data
  const currentPlatform = useMemo(() => {
    return platforms.find(p => p.key === activeTab);
  }, [activeTab, platforms]);

  const handleContextEdit = () => {
    setIsEditingContext(true);
    setEditedContext(lead.context || '');
  };

  const handleContextSave = () => {
    if (updateLeadContext) {
      updateLeadContext(lead.leadId, editedContext);
    }
    console.log('Context updated for lead:', lead.leadId, 'New context:', editedContext);
    setIsEditingContext(false);
  };

  const handleContextCancel = () => {
    setIsEditingContext(false);
    setEditedContext('');
  };

  const handleContextKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleContextSave();
    } else if (e.key === 'Escape') {
      handleContextCancel();
    }
  };

  // Platform-specific status editing functions
  const handleStatusEdit = () => {
    if (!currentPlatform) return;
    const currentStatus = lead[currentPlatform.statusField] || 'Cold Message';
    setIsEditingStatus(true);
    setEditedStatus(currentStatus);
  };

  const handleStatusSave = () => {
    if (!currentPlatform) return;
    if (updateLeadStatus) {
      // Use the new platform-specific update function
      dispatch(updateLeadPlatformStatus({ leadId: lead.leadId, platform: currentPlatform.key, status: editedStatus }));
    }
    console.log('Platform status updated for lead:', lead.leadId, 'Platform:', currentPlatform.key, 'New status:', editedStatus);
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

  const handleLinkClick = (url, isEmail = false) => {
    const finalUrl = isEmail && !url.startsWith('mailto:') ? `mailto:${url}` : url;
    
    if (window.electronAPI && window.electronAPI.openExternal) {
      window.electronAPI.openExternal(finalUrl);
    } else {
      console.log('Would open URL:', finalUrl);
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

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleReachedOutToggle = (platformKey) => {
    const platform = platforms.find(p => p.key === platformKey);
    if (!platform) return;
    
    const currentReachedOut = lead[platform.reachedOutField] || false;
    dispatch(updateLeadPlatformReachedOut({ 
      leadId: lead.leadId, 
      platform: platformKey, 
      reachedOut: !currentReachedOut 
    }));
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

  const getPlatformIcon = (platformKey) => {
    const platform = platforms.find(p => p.key === platformKey);
    if (!platform) return null;

    switch (platform.icon) {
      case 'linkedin':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M22.46 0H1.54C.69 0 0 .69 0 1.54v20.92C0 23.31.69 24 1.54 24h20.92c.85 0 1.54-.69 1.54-1.54V1.54C24 .69 23.31 0 22.46 0zM7.11 20.45H3.56V9h3.55v11.45zM5.34 7.43c-1.14 0-2.06-.93-2.06-2.06s.92-2.06 2.06-2.06 2.06.93 2.06 2.06-.92 2.06-2.06 2.06zM20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28z"/>
          </svg>
        );
      case 'insta':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zm0-2.16c-3.26 0-3.67.01-4.95.07-1.28.06-2.16.27-2.93.57-.79.31-1.46.72-2.13 1.39-.67.67-1.08 1.34-1.39 2.13-.3.77-.51 1.65-.57 2.93-.06 1.28-.07 1.69-.07 4.95s.01 3.67.07 4.95c.06 1.28.27 2.16.57 2.93.31.79.72 1.46 1.39 2.13.67.67 1.34 1.08 2.13 1.39.77.3 1.65.51 2.93.57 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.28-.06 2.16-.27 2.93-.57.79-.31 1.46-.72 2.13-1.39.67-.67 1.08-1.34 1.39-2.13.3-.77.51-1.65.57-2.93.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.27-2.16-.57-2.93-.31-.79-.72-1.46-1.39-2.13-.67-.67-1.34-1.08-2.13-1.39-.77-.3-1.65-.51-2.93-.57C15.67.01 15.26 0 12 0z"/>
            <path d="M12 5.84c-3.4 0-6.16 2.76-6.16 6.16s2.76 6.16 6.16 6.16 6.16-2.76 6.16-6.16-2.76-6.16-6.16-6.16zm0 10.15c-2.2 0-3.99-1.79-3.99-3.99s1.79-3.99 3.99-3.99 3.99 1.79 3.99 3.99-1.79 3.99-3.99 3.99z"/>
            <circle cx="18.41" cy="5.59" r="1.44"/>
          </svg>
        );
      case 'x':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
      case 'email':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h3.819v.545L12 10.455l6.545-6.089v-.545h3.819c.904 0 1.636.732 1.636 1.636z"/>
          </svg>
        );
      case 'pinterest':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.404-5.965 1.404-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-12.014C24.007 5.367 18.641.001 12.017.001z"/>
          </svg>
        );
      case 'artstation':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M0 17.723l2.027 3.505h.001l2.027-3.505H0zm24 .099l-2.121 3.636h-.001l-2.122-3.636h4.244zm-9.364-3.48L10.727 24h-2.97l4.244-7.401 1.598 2.576 1.597-2.576zm2.193-3.777l3.498 6.004-3.498-6.004h3.497l.001-.001H15.93zm-5.75 0l3.5 6.004-3.5-6.004h3.5l-.001-.001H10.18zm-5.75 0l3.5 6.004-3.5-6.004H8.43l-.001-.001H4.43zm12.696-3.9l-1.599 2.576-1.597 2.576-2.122-3.636h2.97l2.121 3.636h.001l2.121-3.636h2.97l-2.122 3.636-1.599-2.576-1.598 2.576-2.121-3.636h2.97zm-8.843 0l-1.599 2.576-1.598 2.576-2.121-3.636h2.97l2.121 3.636h.001l2.121-3.636h2.97l-2.122 3.636-1.599-2.576-1.598 2.576-2.121-3.636h2.97zm-5.75 0l-1.599 2.576-1.598 2.576L0 4.787h2.97l2.121 3.636h.001l2.121-3.636h2.97l-2.122 3.636-1.599-2.576-1.598 2.576-2.121-3.636h2.97z"/>
          </svg>
        );
      case 'youtube':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getPlatformButtonClass = (platformKey, isActive) => {
    const platform = platforms.find(p => p.key === platformKey);
    if (!platform) return '';
    
    const reachedOut = lead[platform.reachedOutField] || false;
    const hasUrl = lead[platform.urlField];
    const baseClass = 'w-8 h-8 rounded-lg flex items-center justify-center transition-all relative';
    const activeClass = isActive ? 'scale-110' : '';
    const disabledClass = !hasUrl ? 'opacity-50' : '';
    
    let colorClass = '';
    switch (platform.icon) {
      case 'linkedin':
        colorClass = hasUrl ? 'bg-[#0A66C2] hover:bg-[#004182]' : 'bg-[#2D2D2F]';
        break;
      case 'insta':
        colorClass = hasUrl ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 hover:opacity-80' : 'bg-[#2D2D2F]';
        break;
      case 'x':
        colorClass = hasUrl ? 'bg-black hover:bg-[#1a1a1a] border border-[#3D3D3F]' : 'bg-[#2D2D2F]';
        break;
      case 'email':
        colorClass = hasUrl ? 'bg-[#EA4335] hover:bg-[#D33B2C]' : 'bg-[#2D2D2F]';
        break;
      case 'pinterest':
        colorClass = hasUrl ? 'bg-[#E60023] hover:bg-[#CC001F]' : 'bg-[#2D2D2F]';
        break;
      case 'artstation':
        colorClass = hasUrl ? 'bg-[#13AFF0] hover:bg-[#1099D4]' : 'bg-[#2D2D2F]';
        break;
      case 'youtube':
        colorClass = hasUrl ? 'bg-[#FF0000] hover:bg-[#E60000]' : 'bg-[#2D2D2F]';
        break;
      default:
        colorClass = 'bg-[#2D2D2F]';
    }
    
    return `${baseClass} ${colorClass} ${activeClass} ${disabledClass} ${reachedOut ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#111111]' : ''}`;
  };

  const currentStatus = currentPlatform ? (lead[currentPlatform.statusField] || 'Cold Message') : 'Cold Message';
  const currentUrl = currentPlatform ? lead[currentPlatform.urlField] : null;
  const currentReachedOut = currentPlatform ? (lead[currentPlatform.reachedOutField] || false) : false;

  return (
    <div 
      className={`lead-card transition-all duration-300 ease-in-out ${
        isActive 
          ? 'opacity-100 scale-100 translate-x-0' 
          : 'opacity-0 scale-95 translate-x-4 pointer-events-none'
      }`}
    >
      <div className="bg-[#111111] rounded-lg shadow-lg border border-[#1C1C1E] p-3 max-w-4xl mx-auto max-h-[55vh] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#1C1C1E] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#4A4A4A] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-[#6A6A6A]">
        
        {/* Top Row: Actions */}
        <div className="flex items-center justify-end gap-2 mb-3">
          {/* Checkpoint Toggle */}
          <button
            onClick={() => updateLeadCheckpoint && updateLeadCheckpoint(lead.leadId, !lead.checkpoint)}
            className={`p-1.5 rounded transition-colors ${
              lead.checkpoint 
                ? 'text-[#FFD60A] bg-[#FFD60A]/10 hover:bg-[#FFD60A]/20' 
                : 'text-[#8E8E93] hover:text-[#FFD60A] hover:bg-[#1C1C1E]'
            }`}
            title={lead.checkpoint ? 'Remove checkpoint' : 'Mark as checkpoint'}
          >
            <svg className="w-4 h-4" fill={lead.checkpoint ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          {buckets.length > 1 && (
            <BucketSelector
              buckets={buckets}
              currentBucketId={currentBucketId}
              onBucketChange={moveLeadToBucket}
              leadId={lead.leadId}
              className="flex items-center"
            />
          )}
          <button
            onClick={handleDeleteClick}
            className="p-1.5 text-[#FF3B30] hover:text-[#FF1D18] hover:bg-[#1C1C1E] rounded transition-colors"
            title="Delete lead"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Platform Tabs - At the top */}
        <div className="mb-4">
          <div className="flex items-end gap-3 mb-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-[#1C1C1E] [&::-webkit-scrollbar-thumb]:bg-[#4A4A4A] [&::-webkit-scrollbar-thumb]:rounded-full">
            {platforms.map((platform) => {
              const reachedOut = lead[platform.reachedOutField] || false;
              const isActive = activeTab === platform.key;
              const hasUrl = lead[platform.urlField];
              
              return (
                <div key={platform.key} className="relative flex-shrink-0 group flex flex-col items-center">
                  <button
                    onClick={() => {
                      if (hasUrl) {
                        setActiveTab(platform.key);
                      }
                    }}
                    disabled={!hasUrl}
                    className={`${getPlatformButtonClass(platform.key, isActive)} ${!hasUrl ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    title={hasUrl ? platform.name : `${platform.name} (No URL)`}
                  >
                    {getPlatformIcon(platform.icon)}
                  </button>
                  {/* Active tab underline */}
                  {isActive && hasUrl && (
                    <div className="w-full h-0.5 bg-[#007AFF] mt-1 rounded-full" />
                  )}
                  {/* Toggle Reached Out Button - Small tick on top right */}
                  {hasUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReachedOutToggle(platform.key);
                      }}
                      className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all z-10 shadow-lg ${
                        reachedOut 
                          ? 'bg-yellow-400 hover:bg-yellow-500 opacity-100' 
                          : 'bg-[#2D2D2F] hover:bg-[#3D3D3F] opacity-80 hover:opacity-100'
                      }`}
                      title={reachedOut ? 'Mark as not reached out' : 'Mark as reached out'}
                    >
                      {reachedOut ? (
                        <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tab Content - Only show if platform has URL */}
          {currentPlatform && lead[currentPlatform.urlField] && (
            <div className="bg-[#1C1C1E] rounded-md p-3">
              {/* URL Display */}
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8E8E93]">URL:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyUrl(currentUrl)}
                      className={`p-1 rounded transition-colors ${
                        copiedUrl === currentUrl 
                          ? 'text-[#00D09C] bg-[#00D09C]/10' 
                          : 'text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#2D2D2F]'
                      }`}
                      title={copiedUrl === currentUrl ? 'Copied!' : 'Copy URL'}
                    >
                      {copiedUrl === currentUrl ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleLinkClick(currentUrl, currentPlatform.key === 'email')}
                      className="p-1 text-[#8E8E93] hover:text-[#FFFFFF] hover:bg-[#2D2D2F] rounded transition-colors"
                      title="Open in browser"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                </div>
                {currentUrl ? (
                  <button
                    onClick={() => handleLinkClick(currentUrl, currentPlatform.key === 'email')}
                    className="text-[#007AFF] hover:text-[#0056CC] truncate cursor-pointer transition-colors text-xs text-left w-full mt-1"
                    title="Click to open"
                  >
                    {currentUrl.replace('https://', '').replace('http://', '').replace('mailto:', '')}
                  </button>
                ) : (
                  <span className="text-xs text-[#4A4A4A] italic mt-1">No URL available</span>
                )}
              </div>

              {/* Status Display/Edit */}
              <div className="mt-2">
                {isEditingStatus ? (
                  <div className="bg-[#2D2D2F] rounded-md p-2">
                    <input
                      type="text"
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value)}
                      onKeyDown={handleStatusKeyPress}
                      className="w-full px-2 py-1.5 text-xs bg-[#1C1C1E] border border-[#007AFF] rounded text-[#E5E5E7] focus:outline-none mb-2"
                      placeholder="Enter custom status..."
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {['cold message', 'first follow up', 'second follow up', 'meeting', 'closed'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setEditedStatus(status)}
                          className="px-2 py-0.5 text-xs bg-[#1C1C1E] text-[#8E8E93] hover:bg-[#007AFF] hover:text-white rounded-full capitalize transition-colors"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={handleStatusCancel} className="px-2 py-1 text-xs bg-[#1C1C1E] text-[#E5E5E7] hover:bg-[#2D2D2F] rounded">Cancel</button>
                      <button onClick={handleStatusSave} className="px-2 py-1 text-xs bg-[#007AFF] text-white hover:bg-[#0056CC] rounded">Save</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8E8E93]">Status:</span>
                    <button
                      onClick={handleStatusEdit}
                      className={`px-3 py-1 text-xs font-medium rounded-full capitalize cursor-pointer hover:opacity-80 ${getStatusColor(currentStatus)}`}
                    >
                      {currentStatus}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Company and Context - At the bottom */}
        <div className="space-y-2 mt-4">
          {/* Company Row */}
          <div className="flex items-center h-8 bg-[#1C1C1E] rounded-md px-2">
            <svg className="w-4 h-4 text-[#8E8E93] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs text-[#8E8E93] ml-2 w-16">Company</span>
            {lead.companyName ? (
              <span className="text-xs text-[#E5E5E7] truncate">{lead.companyName}</span>
            ) : (
              <span className="text-xs text-[#4A4A4A] italic">No data</span>
            )}
          </div>

          {/* Context Section */}
          <div className="bg-[#1C1C1E] rounded-md px-2 py-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-[#8E8E93] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="text-xs text-[#8E8E93] ml-2">Context</span>
              </div>
              {!isEditingContext && (
                <button onClick={handleContextEdit} className="p-0.5 text-[#8E8E93] hover:text-white">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            {isEditingContext ? (
              <div className="space-y-2">
                <textarea
                  value={editedContext}
                  onChange={(e) => setEditedContext(e.target.value)}
                  onKeyDown={handleContextKeyPress}
                  className="w-full h-20 px-2 py-1.5 text-xs bg-[#2D2D2F] border border-[#007AFF] rounded text-[#E5E5E7] focus:outline-none resize-none"
                  placeholder="Add context about this lead..."
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button onClick={handleContextCancel} className="px-2 py-1 text-xs bg-[#2D2D2F] text-[#E5E5E7] hover:bg-[#3D3D3F] rounded">Cancel</button>
                  <button onClick={handleContextSave} className="px-2 py-1 text-xs bg-[#007AFF] text-white hover:bg-[#0056CC] rounded">Save</button>
                </div>
              </div>
            ) : (
              <div className="text-xs min-h-[36px] cursor-pointer" onClick={handleContextEdit}>
                {lead.context ? (
                  <span className="text-[#E5E5E7]">{lead.context}</span>
                ) : (
                  <span className="text-[#4A4A4A] italic">No data - click to add</span>
                )}
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
