import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import HoverComponent from '../common/components/HoverComponent';
import { themeColors } from '../common/utils/colors';
import { setChatInterfaceVisible } from '../../store/slices/uiVisibilitySlice';
import { fetchBuckets } from '../../../store/thunks/bucketsThunks';
import { createLead } from '../../../store/thunks/leadsThunks';
import { setBuckets } from '../../../store/slices/bucketsSlice';
import { addTeamLeadFromImage, getAllTeams, getAllTeamBuckets, addImageToCollectiveSession, processCollectiveSession, deleteCollectiveSession } from '../../../services/leadflowService';
import { fetchAllTeams } from '../../../store/thunks/teamsThunks';
import { fetchTeamBuckets } from '../../../store/thunks/teamBucketsThunks';
import { setViewMode, setSelectedTeamId } from '../../../store/slices/teamsSlice';
import { getClerkToken } from '../../../utils/clerkTokenProvider';

const ActionBar = () => {
  const dispatch = useDispatch();
  const chatInterfaceVisible = useSelector((state) => state.uiVisibility.chatInterfaceVisible);
  const floatingWidgetPosition = useSelector((state) => state.floatingWidget.position);
  const { viewMode, selectedTeamId } = useSelector((state) => state.teams || { viewMode: 'customer', selectedTeamId: null });
  const reduxTeams = useSelector((state) => state.teams?.teams || []);
  
  // Read buckets directly from Redux based on view mode - no filtering needed
  const bucketsState = viewMode === 'team' && selectedTeamId
    ? useSelector((state) => state.buckets?.teams[selectedTeamId] || { buckets: [], loading: false, error: null })
    : useSelector((state) => state.buckets?.personal || { buckets: [], loading: false, error: null });
  
  const buckets = bucketsState.buckets || [];
  
  const [selectedOption, setSelectedOption] = useState('Select Option');
  const [selectedBucketId, setSelectedBucketId] = useState(null);
  const [currentBucketIndex, setCurrentBucketIndex] = useState(0);
  const [screenshotStatus, setScreenshotStatus] = useState('ready'); // 'ready', 'processing', 'success'
  const [globalShortcutFeedback, setGlobalShortcutFeedback] = useState(false);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, processing: 0, completed: 0, failed: 0 });
  
  // Local state for buckets to ensure they're always available
  const [localBuckets, setLocalBuckets] = useState([]);
  const [bucketNames, setBucketNames] = useState([]);
  const [bucketIds, setBucketIds] = useState([]);
  
  // Local state for teams and view mode
  const [localViewMode, setLocalViewMode] = useState('customer'); // 'customer' or 'team'
  const [localSelectedTeamId, setLocalSelectedTeamId] = useState(null);
  const [localTeams, setLocalTeams] = useState([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [selectedTeamName, setSelectedTeamName] = useState('Select Team');
  
  // Refs to store current bucket state for event handlers (to avoid closure issues)
  const localBucketsRef = useRef([]);
  const bucketNamesRef = useRef([]);
  const bucketIdsRef = useRef([]);
  const selectedOptionRef = useRef('Select Option');
  const selectedBucketIdRef = useRef(null);
  const currentBucketIndexRef = useRef(0);
  
  // Refs for team state
  const localTeamsRef = useRef([]);
  const selectedTeamIdRef = useRef(null);
  const currentTeamIndexRef = useRef(0);
  const selectedTeamNameRef = useRef('Select Team');
  
  // Ref for dynamic width calculation
  const barContentRef = useRef(null);
  const [dynamicBarWidth, setDynamicBarWidth] = useState(160);
  
  // Ref to track if we've attempted to load buckets on mount
  const hasLoadedBucketsRef = useRef(false);
  
  // State for metrics bar visibility with localStorage persistence
  const [metricsBarVisible, setMetricsBarVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('metricsBarVisible');
      return saved === 'true';
    } catch (error) {
      console.error('Error reading metricsBarVisible from localStorage:', error);
      return false;
    }
  });
  
  // Multi-image capture mode state with localStorage persistence
  const [captureMode, setCaptureMode] = useState(() => {
    try {
      const saved = localStorage.getItem('actionBar_captureMode');
      return saved === 'multiple' ? 'multiple' : 'single';
    } catch (error) {
      console.error('Error reading captureMode from localStorage:', error);
      return 'single';
    }
  });
  const [collectedImages, setCollectedImages] = useState(() => {
    try {
      const saved = localStorage.getItem('actionBar_collectedImages');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (error) {
      console.error('Error reading collectedImages from localStorage:', error);
      return [];
    }
  });
  const MAX_COLLECTED_IMAGES = 15;
  
  // Get actionBarCollapsed state
  const actionBarCollapsed = useSelector((state) => state.uiVisibility.actionBarCollapsed);

  // Queue status listener and token sync
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onQueueStatusUpdate) {
      const handleQueueStatusUpdate = (status) => {
        setQueueStatus(status);
        console.log('Queue status updated:', status);
      };
      
      window.electronAPI.onQueueStatusUpdate(handleQueueStatusUpdate);
      
      // Get initial status
      if (window.electronAPI.getQueueStatus) {
        window.electronAPI.getQueueStatus().then(setQueueStatus);
      }
      
      // Sync token to main process periodically and on mount
      const syncToken = async () => {
        try {
          const token = await getClerkToken();
          if (token && window.electronAPI && window.electronAPI.setQueueToken) {
            await window.electronAPI.setQueueToken(token);
            console.log('Queue token synced to main process');
          }
        } catch (error) {
          console.error('Error syncing queue token:', error);
        }
      };
      
      // Sync immediately and then every 5 minutes
      syncToken();
      const tokenSyncInterval = setInterval(syncToken, 5 * 60 * 1000); // 5 minutes
      
      return () => {
        if (window.electronAPI && window.electronAPI.removeQueueStatusListener) {
          window.electronAPI.removeQueueStatusListener();
        }
        clearInterval(tokenSyncInterval);
      };
    }
  }, []);
  
  // Refs for capture mode to avoid closure issues in event handlers
  const captureModeRef = useRef(captureMode);
  const localViewModeRef = useRef('customer');
  const collectedImagesRef = useRef(collectedImages);
  
  // Persist captureMode to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('actionBar_captureMode', captureMode);
      captureModeRef.current = captureMode;
    } catch (error) {
      console.error('Error saving captureMode to localStorage:', error);
    }
  }, [captureMode]);
  
  // Persist collectedImages to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('actionBar_collectedImages', JSON.stringify(collectedImages));
      collectedImagesRef.current = collectedImages;
    } catch (error) {
      console.error('Error saving collectedImages to localStorage:', error);
    }
  }, [collectedImages]);
  
  const position = floatingWidgetPosition || { x: 1200, y: 20 };
  const isNearRightEdge = position.x > window.innerWidth - (dynamicBarWidth + 50);
  const safeLeft = isNearRightEdge ?
    Math.max(10, position.x - dynamicBarWidth - 20) :
    Math.min(window.innerWidth - dynamicBarWidth - 10, position.x + 60);

  // Debug logging
  console.log('ActionBar current buckets (Redux):', buckets, 'localBuckets:', localBuckets, 'currentBucketIndex:', currentBucketIndex, 'hasLoaded:', hasLoadedBucketsRef.current);

  // Event handler function (moved outside useEffect for testability)
  const onBucketsUpdated = (event, data) => {
    console.log('ActionBar received IPC event:', event, data);
    try {
      if (!data) {
        console.warn('ActionBar: No data in IPC event');
        return;
      }
      const { eventName, payload } = data;
      console.log('ActionBar: Parsed eventName:', eventName, 'payload:', payload);
      
      if (eventName === 'buckets-updated' && payload && Array.isArray(payload)) {
        console.log('ActionBar: Updating buckets with:', payload);
        // Determine context based on current view mode
        const context = localViewMode === 'team' && localSelectedTeamId ? localSelectedTeamId : 'personal';
        dispatch(setBuckets(payload, context, true));
      } else if (eventName === 'screenshot-image-captured' && payload) {
        console.log('ActionBar: Screenshot image captured event received!');
        handleScreenshotImageCaptured(payload);
      } else if (eventName === 'screenshot-processing' && payload) {
        console.log('ActionBar: Global screenshot processing - updating UI state');
        setScreenshotStatus('processing');
        setGlobalShortcutFeedback(true);
        console.log('ActionBar: UI state updated to processing');
      } else if (eventName === 'screenshot-taken' && payload && payload.success) {
        console.log('ActionBar: Global screenshot taken successfully - updating UI state');
        console.log('ActionBar: Received image data for processing:', {
          hasImageData: !!payload.imageData,
          resolution: payload.resolution,
          filePath: payload.filePath
        });
        
        // Process the image data in the overlay
        if (payload.imageData) {
          processScreenshotInOverlay(payload.imageData, payload.resolution);
        }
        
        setScreenshotStatus('success');
        setGlobalShortcutFeedback(true);
        console.log('ActionBar: UI state updated to success');
        // Show success feedback for 2.5 seconds, then reset (same as button click)
        setTimeout(() => {
          console.log('ActionBar: Resetting UI state to ready after success');
          setScreenshotStatus('ready');
          setGlobalShortcutFeedback(false);
        }, 2500);
      } else if (eventName === 'screenshot-taken' && payload && payload.success) {
        console.log('ActionBar: Screenshot taken successfully - processing image data');
        console.log('ActionBar: Received image data for processing:', {
          hasImageData: !!payload.imageData,
          resolution: payload.resolution,
          filePath: payload.filePath
        });
        
        // Set status to success for button clicks, but keep ready for global shortcuts
        setScreenshotStatus('success');
        
        // Process the image data in the overlay
        if (payload.imageData) {
          processScreenshotInOverlay(payload.imageData, payload.resolution);
        }
        
        // Reset to ready after 2 seconds
        setTimeout(() => {
          setScreenshotStatus('ready');
        }, 2000);
      } else if (eventName === 'screenshot-error' && payload && !payload.success) {
        console.log('ActionBar: Global screenshot failed:', payload.error);
        // Show user-friendly error message for permission issues
        if (payload.permissionDenied) {
          const errorMsg = payload.error || 'Screen recording permission is required. Please grant permission in System Preferences > Security & Privacy > Screen Recording.';
          alert(errorMsg);
          console.error('Screenshot permission denied:', errorMsg);
        }
        setScreenshotStatus('ready');
        setGlobalShortcutFeedback(false);
      } else if (eventName === 'validate-screenshot-request' && payload) {
        console.log('ActionBar: Screenshot validation request received from:', payload.source);
        handleScreenshotValidation(payload.source);
      } else {
        console.log('ActionBar: Ignoring event:', eventName);
      }
    } catch (err) {
      console.error('Error applying IPC event payload:', err);
    }
  };

  // Function to show lead processing feedback through floating widget animations
  const showLeadProcessingFeedback = (status, responseData) => {
    console.log('🎨 Showing lead processing feedback:', status, responseData);
    
    // Note: State changes removed - only button click flow manages visual state
    // This function now only handles floating widget communication
    
    // Send feedback to floating widget if it exists
    try {
      if (window && window.electronAPI && window.electronAPI.sendToWidget) {
        window.electronAPI.sendToWidget('lead-processing-feedback', {
          status: status,
          data: responseData,
          timestamp: new Date().toISOString()
        });
        console.log('📤 Sent lead processing feedback to floating widget');
      } else if (window && window.widgetAPI && window.widgetAPI.sendToMain) {
        // If we're in the widget context, send to main
        window.widgetAPI.sendToMain('lead-processing-feedback', {
          status: status,
          data: responseData,
          timestamp: new Date().toISOString()
        });
        console.log('📤 Sent lead processing feedback to main window');
      }
    } catch (error) {
      console.warn('⚠️ Could not send feedback to floating widget:', error);
    }
  };

  // Function to convert base64 image to File and add lead
  const addLeadFromScreenshot = async (imageDataUrl, bucketId, screenshotInfo) => {
    try {
      console.log('🔄 Converting image data to File object...');
      console.log('📸 Image Data URL info:', {
        hasData: !!imageDataUrl,
        length: imageDataUrl?.length || 0,
        startsWithData: imageDataUrl?.startsWith('data:') || false,
        hasBase64: imageDataUrl?.includes('base64,') || false
      });
      
      // Validate imageDataUrl
      if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
        console.error('❌ Invalid imageDataUrl format:', imageDataUrl?.substring(0, 50));
        throw new Error('Invalid image data URL format');
      }
      
      // Convert base64 data URL to Blob directly (avoid CSP issues with fetch on data URLs)
      const base64Data = imageDataUrl.split(',')[1]; // Remove data:image/png;base64, prefix
      
      if (!base64Data || base64Data.length === 0) {
        console.error('❌ No base64 data found in imageDataUrl');
        throw new Error('No base64 data found in image URL');
      }
      
      console.log('📊 Base64 data length:', base64Data.length);
      
      const binaryString = atob(base64Data); // Decode base64
      const bytes = new Uint8Array(binaryString.length);
      
      // Convert binary string to byte array
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob from byte array
      const blob = new Blob([bytes], { type: 'image/png' });
      console.log('📦 Blob created:', {
        size: blob.size,
        sizeInKB: (blob.size / 1024).toFixed(2) + ' KB',
        type: blob.type
      });
      
      // Validate blob is not empty
      if (blob.size === 0) {
        console.error('❌ Blob is empty! Cannot send to server.');
        throw new Error('Image blob is empty - cannot send to server');
      }
      
      // Create a proper filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${timestamp}.png`;
      
      // Create File object
      const imageFile = new File([blob], filename, { type: 'image/png' });
      
      console.log('✅ Image File created:', {
        name: imageFile.name,
        size: imageFile.size,
        sizeInKB: (imageFile.size / 1024).toFixed(2) + ' KB',
        type: imageFile.type,
        bucketId: bucketId
      });
      
      // Final validation before sending
      if (imageFile.size === 0) {
        console.error('❌ Image file size is 0! Cannot send to server.');
        throw new Error('Image file is empty - cannot send to server');
      }
      
      console.log('📤 Using new two-step collective session flow with file size:', imageFile.size, 'bytes');
      
      // Check if we're in team mode (use local state for reliability)
      const currentTeamId = localSelectedTeamId || selectedTeamIdRef.current || selectedTeamId;
      if (localViewMode === 'team' && currentTeamId) {
        // Use team-specific lead creation (still uses old flow for now)
        console.log('👥 Team mode detected, using team lead creation', { teamId: currentTeamId, bucketId });
        const result = await addTeamLeadFromImage(imageFile, currentTeamId, bucketId);
        
        console.log('📥 AddTeamLead API Response received:', result);
        
        if (result && result.status_code === 202) {
          console.log('🎉 Team lead processing initiated successfully!');
          const successMessage = result.content?.message || 'Team lead created successfully!';
          showLeadProcessingFeedback('success', result.content);
        } else {
          console.error('❌ Failed to create team lead:', result);
          const errorMessage = result?.content?.detail || 'Failed to create team lead';
          showLeadProcessingFeedback('error', { message: errorMessage });
        }
      } else {
        // NEW: Use async queue system - save to temp folder and return immediately
        // Pass base64 directly to main process for non-blocking conversion
        console.log('📤 Saving image to queue for background processing...');
        
        // Sync token before saving to queue (non-blocking, fire and forget)
        getClerkToken().then(token => {
          if (token && window.electronAPI && window.electronAPI.setQueueToken) {
            window.electronAPI.setQueueToken(token);
          }
        }).catch(err => console.warn('Token sync error:', err));
        
        // Save to queue via IPC using base64 (conversion happens in main process, non-blocking)
        // Show immediate feedback first (don't wait for queue operation)
        showLeadProcessingFeedback('success', { 
          message: 'Image queued for processing'
        });
        
        // Queue in background (fire and forget)
        if (window.electronAPI && typeof window.electronAPI.saveImageToQueueFromBase64 === 'function') {
          const queuePromise = window.electronAPI.saveImageToQueueFromBase64(imageDataUrl, bucketId, {
            source: 'screenshot',
            timestamp: new Date().toISOString()
          });
          
          // Only call .then() if it returns a promise
          if (queuePromise && typeof queuePromise.then === 'function') {
            queuePromise.then(result => {
              if (result && result.success) {
                console.log('✅ Image saved to queue successfully', { sessionId: result.sessionId });
              } else {
                console.error('❌ Failed to save image to queue:', result);
                const errorMessage = result?.error || 'Failed to queue image';
                showLeadProcessingFeedback('error', { message: errorMessage });
              }
            }).catch(error => {
              console.error('❌ Error saving image to queue:', error);
              showLeadProcessingFeedback('error', { message: error.message || 'Failed to queue image' });
            });
          }
        } else {
          console.error('❌ electronAPI.saveImageToQueueFromBase64 not available');
          showLeadProcessingFeedback('error', { message: 'Queue system not available' });
        }
      }
      
    } catch (error) {
      console.error('💥 Error in addLeadFromScreenshot:', error);
      console.error('💥 Error stack:', error.stack);
      console.error('💥 Error name:', error.name);
      console.error('💥 Error message:', error.message);
      
      let userFriendlyMessage = 'Unknown error occurred';
      
      if (error.message.includes('Failed to fetch')) {
        userFriendlyMessage = 'Network error - could not connect to server';
      } else if (error.message.includes('NetworkError')) {
        userFriendlyMessage = 'Network error - check your connection';
      } else if (error.message.includes('timeout')) {
        userFriendlyMessage = 'Request timeout - server took too long to respond';
      } else {
        userFriendlyMessage = error.message;
      }
      
      // Show error animation on floating widget
      showLeadProcessingFeedback('error', { message: userFriendlyMessage });
    }
  };

  // Function to handle detailed screenshot image captured event
  const handleScreenshotImageCaptured = (payload) => {
    console.log('=== SCREENSHOT IMAGE CAPTURED EVENT ===');
    console.log('📸 Screenshot Image Data Details:');
    
    // Log image blob information
    if (payload.imageBlob) {
      console.log('🖼️ Image Blob Information:', {
        size: payload.imageBlob.size,
        sizeInKB: (payload.imageBlob.size / 1024).toFixed(2) + ' KB',
        sizeInMB: (payload.imageBlob.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: payload.imageBlob.type,
        timestamp: payload.imageBlob.timestamp,
        base64Length: payload.imageBlob.base64Length
      });
    }
    
    // Log image resolution and file info
    console.log('📐 Image Properties:', {
      resolution: payload.resolution,
      filePath: payload.filePath,
      captureMethod: payload.captureMethod,
      hasImageData: !!payload.imageDataUrl,
      imageDataUrlLength: payload.imageDataUrl ? payload.imageDataUrl.length : 0
    });
    
    // Log current bucket information using refs (to avoid closure issues)
    const currentBuckets = localBucketsRef.current;
    const currentBucketNames = bucketNamesRef.current;
    const currentBucketIds = bucketIdsRef.current;
    const currentSelectedOption = selectedOptionRef.current;
    const currentSelectedBucketId = selectedBucketIdRef.current;
    
    console.log('🪣 Current Buckets Information:');
    console.log('Total Buckets (Redux):', buckets ? buckets.length : 0);
    console.log('Total Buckets (Local State):', localBuckets.length);
    console.log('Total Buckets (Ref - Current):', currentBuckets.length);
    console.log('Bucket Names Array (Ref):', currentBucketNames);
    console.log('Bucket IDs Array (Ref):', currentBucketIds);
    
    if (currentBuckets && currentBuckets.length > 0) {
      console.log('📋 Bucket List (from refs - current values):');
      currentBuckets.forEach((bucket, index) => {
        console.log(`  ${index + 1}. Name: "${bucket.name}" | ID: ${bucket.id}`);
      });
      
      // Also log as a table for better readability
      console.table(currentBuckets.map(bucket => ({
        'Bucket Name': bucket.name,
        'Bucket ID': bucket.id
      })));
      
      // Log individual arrays
      console.log('📝 Bucket Names (Current):', currentBucketNames);
      console.log('🔢 Bucket IDs (Current):', currentBucketIds);
    } else {
      console.log('⚠️ No buckets available in current refs');
      console.log('🔍 Fallback check - Local State Buckets:', localBuckets);
      console.log('🔍 Fallback check - Redux Buckets:', buckets);
    }
    
    // Log selected bucket information
    console.log('🎯 Currently Selected:', {
      selectedOptionState: selectedOption,
      selectedOptionRef: currentSelectedOption,
      selectedBucketIdState: selectedBucketId,
      selectedBucketIdRef: currentSelectedBucketId,
      isValidSelection: currentSelectedOption && currentSelectedOption !== 'Select Option'
    });
    
    if (currentSelectedOption && currentSelectedOption !== 'Select Option') {
      const selectedBucket = currentBuckets.find(b => b.name === currentSelectedOption);
      if (selectedBucket) {
        console.log('✅ Selected Bucket Details (from current refs):', {
          name: selectedBucket.name,
          id: selectedBucket.id,
          matchesStoredId: selectedBucket.id === currentSelectedBucketId
        });
      } else {
        console.log('❌ Selected bucket not found in current bucket refs');
        console.log('🔍 Searching in local state buckets...');
        const localBucket = localBuckets.find(b => b.name === currentSelectedOption);
        if (localBucket) {
          console.log('✅ Found in local state buckets:', {
            name: localBucket.name,
            id: localBucket.id
          });
        } else {
          console.log('❌ Not found in local state buckets either');
        }
      }
    }
    
    console.log('=== END SCREENSHOT IMAGE CAPTURED EVENT ===');
    
    // Check capture mode - handle differently for single vs multiple (use refs to avoid closure issues)
    const currentCaptureMode = captureModeRef.current;
    const currentViewMode = localViewModeRef.current;
    console.log('🔍 Capture mode check:', { currentCaptureMode, currentViewMode });
    
    if (currentCaptureMode === 'multiple' && currentViewMode === 'customer') {
      // Multiple mode: just add image to collection, don't process
      if (payload.imageDataUrl) {
        console.log('🖼️ Multiple mode: Adding image to collection...');
        addImageToCollection(payload.imageDataUrl);
      }
    } else {
      // Single mode: Convert image data to File and add lead (original behavior)
      if (payload.imageDataUrl && currentSelectedBucketId) {
        console.log('🚀 Starting lead creation process...');
        console.log('📋 Lead Creation Details:', {
          bucketId: currentSelectedBucketId,
          bucketName: currentSelectedOption,
          imageSize: payload.imageBlob?.size,
          captureMethod: payload.captureMethod,
          resolution: payload.resolution
        });
        addLeadFromScreenshot(payload.imageDataUrl, currentSelectedBucketId, payload);
      } else {
        console.log('⚠️ Cannot create lead - missing image data or bucket ID:', {
          hasImageData: !!payload.imageDataUrl,
          bucketId: currentSelectedBucketId,
          selectedOption: currentSelectedOption
        });
      }
    }
    
    // Also call the existing processing function for any additional processing
    if (payload.imageDataUrl) {
      processScreenshotInOverlay(payload.imageDataUrl, payload.resolution);
    }
  };

  // Function to process screenshot image data in the overlay
  const processScreenshotInOverlay = (imageData, resolution) => {
    console.log('ActionBar: Processing screenshot in overlay', {
      imageSize: imageData ? imageData.length : 'No image data',
      resolution
    });
    
    try {
      // Create an image element to work with the screenshot
      const img = new Image();
      img.onload = () => {
        console.log('ActionBar: Image loaded successfully for processing', {
          width: img.width,
          height: img.height
        });
        
        // Here you can add your image processing logic
        // For example:
        // - Create a canvas to draw the image
        // - Apply filters or overlays
        // - Extract specific regions
        // - Perform OCR or object detection
        // - Add annotations or highlights
        
        // Example: Create a canvas for processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Example processing: Add a semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 122, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // You can now use the processed canvas data
        const processedImageData = canvas.toDataURL('image/png');
        console.log('ActionBar: Image processing completed');
        
        // Store processed image or trigger further actions
        // For example, you could dispatch an action to store the processed image
        // or send it back to the main process for saving
        
      };
      img.onerror = (error) => {
        console.error('ActionBar: Failed to load image for processing:', error);
      };
      img.src = imageData;
      
    } catch (error) {
      console.error('ActionBar: Error processing screenshot image:', error);
    }
  };

  // Function to handle screenshot validation requests
  const handleScreenshotValidation = async (source) => {
    console.log('ActionBar: Validating screenshot request from:', source);
    console.log('ActionBar: Current validation state:', {
      selectedOption,
      selectedBucketId,
      currentBucketIndex,
      currentBucketIndexRef: currentBucketIndexRef.current,
      bucketsLength: buckets ? buckets.length : 'null/undefined',
      localBucketsLength: localBuckets.length,
      buckets: buckets,
      localBuckets: localBuckets
    });
    
    // Check if a valid option is selected
    if (!selectedOption || selectedOption === 'Select Option') {
      console.log('ActionBar: No valid option selected, attempting auto-selection');
      
      // Wait a moment and try to fetch fresh buckets if needed
      let availableBuckets = localBuckets.length > 0 ? localBuckets : buckets;
      if (!availableBuckets || availableBuckets.length === 0) {
        console.log('ActionBar: Buckets not loaded, attempting to fetch fresh buckets');
        try {
          const bucketsResult = await dispatch(fetchBuckets());
          if (fetchBuckets.fulfilled.match(bucketsResult)) {
            console.log('ActionBar: Fresh buckets fetched:', bucketsResult.payload);
            availableBuckets = bucketsResult.payload;
          }
        } catch (error) {
          console.error('ActionBar: Failed to fetch fresh buckets:', error);
        }
      }
      
      // Auto-select bucket if available - use current index if valid, otherwise first bucket
      if (availableBuckets && availableBuckets.length > 0) {
        // Use current bucket index if it's valid, otherwise use first bucket
        const targetIndex = (currentBucketIndexRef.current < availableBuckets.length) ? 
                           currentBucketIndexRef.current : 0;
        const targetBucket = availableBuckets[targetIndex];
        
        console.log('ActionBar: Auto-selection logic:', {
          currentBucketIndexRef: currentBucketIndexRef.current,
          availableBucketsLength: availableBuckets.length,
          targetIndex,
          targetBucket: targetBucket ? { name: targetBucket.name, id: targetBucket.id } : 'null'
        });
        
        setSelectedOption(targetBucket.name);
        setSelectedBucketId(targetBucket.id);
        setCurrentBucketIndex(targetIndex);
        selectedOptionRef.current = targetBucket.name;
        selectedBucketIdRef.current = targetBucket.id;
        currentBucketIndexRef.current = targetIndex;
        
        console.log('ActionBar: Auto-selected option:', targetBucket.name, 'with ID:', targetBucket.id, 'at index:', targetIndex);
        
        // Show brief feedback that option was auto-selected
        setGlobalShortcutFeedback(true);
        setTimeout(() => setGlobalShortcutFeedback(false), 1500);
        
        // Proceed with screenshot after a brief delay to show the selection
        setTimeout(async () => {
          console.log('ActionBar: Proceeding with screenshot after auto-selection');
          await proceedWithValidatedScreenshot(source);
        }, 500);
      } else {
        console.log('ActionBar: No buckets available even after fresh fetch, cannot take screenshot');
        console.log('ActionBar: Final bucket state:', availableBuckets);
        // Show error feedback
        alert('Please wait for buckets to load before taking a screenshot.');
        return;
      }
    } else {
      console.log('ActionBar: Valid option already selected, proceeding with screenshot');
      await proceedWithValidatedScreenshot(source);
    }
  };

  // Function to proceed with screenshot after validation
  const proceedWithValidatedScreenshot = async (source) => {
    try {
      let screenshotAPI = null;
      if (window && window.electronAPI && window.electronAPI.proceedWithScreenshot) {
        screenshotAPI = window.electronAPI;
      } else if (window && window.widgetAPI && window.widgetAPI.proceedWithScreenshot) {
        screenshotAPI = window.widgetAPI;
      }
      
      if (screenshotAPI) {
        console.log('ActionBar: Calling proceedWithScreenshot for source:', source);
        const result = await screenshotAPI.proceedWithScreenshot(source);
        console.log('ActionBar: Screenshot validation result:', result);
      } else {
        console.error('ActionBar: Screenshot API not available for validation');
      }
    } catch (error) {
      console.error('ActionBar: Error proceeding with validated screenshot:', error);
    }
  };

  // Debug function to test screenshot events (exposed to window for console testing)
  window.testScreenshotEvent = (eventName, payload) => {
    console.log('Testing screenshot event:', eventName, payload);
    const mockEvent = {};
    const mockData = { eventName, payload };
    onBucketsUpdated(mockEvent, mockData);
  };

  // Load personal buckets function (defined early for use in mount effect)
  const loadPersonalBuckets = async (force = false) => {
    // Skip if we've already loaded and have buckets, and not forcing
    if (hasLoadedBucketsRef.current && !force && (buckets.length > 0 || localBuckets.length > 0)) {
      console.log('ActionBar: Buckets already loaded and available, skipping...');
      return;
    }
    
    // Prevent duplicate simultaneous calls
    if (hasLoadedBucketsRef.current && !force) {
      console.log('ActionBar: Load already in progress, skipping duplicate call...');
      return;
    }
    
    try {
      console.log('ActionBar: Loading personal buckets...', { 
        force, 
        hasLoaded: hasLoadedBucketsRef.current,
        bucketsCount: buckets.length,
        localBucketsCount: localBuckets.length
      });
      hasLoadedBucketsRef.current = true;
      const result = await dispatch(fetchBuckets());
      if (fetchBuckets.fulfilled.match(result)) {
        console.log('ActionBar: Personal buckets loaded successfully:', result.payload);
        // Keep flag as true since we successfully loaded
      } else {
        console.warn('ActionBar: Failed to load personal buckets:', result);
        // Reset flag on failure so we can retry after a delay
        setTimeout(() => {
          hasLoadedBucketsRef.current = false;
        }, 2000);
      }
    } catch (error) {
      console.error('ActionBar: Error loading personal buckets:', error);
      // Reset flag on error so we can retry after a delay
      setTimeout(() => {
        hasLoadedBucketsRef.current = false;
      }, 2000);
    }
  };

  // Initialize view mode from Redux and load initial data on mount
  useEffect(() => {
    console.log('ActionBar: Component mounted, initializing...');
    
    // Initialize from Redux state if available
    if (viewMode) {
      setLocalViewMode(viewMode);
    } else {
      // Default to customer mode
      setLocalViewMode('customer');
    }
    
    if (selectedTeamId) {
      setLocalSelectedTeamId(selectedTeamId);
    }
    
    // Always load personal buckets on mount (default view)
    // This ensures buckets are available immediately when the app loads
    // Try immediate load first, then retry with delay if needed
    console.log('ActionBar: Mount effect running, attempting immediate load...');
    loadPersonalBuckets();
    
    // Also set a delayed retry in case the immediate call doesn't work
    const loadTimer = setTimeout(() => {
      // Only retry if we still don't have buckets
      if (buckets.length === 0 && localBuckets.length === 0) {
        console.log('ActionBar: Mount retry timer fired, loading buckets...');
        loadPersonalBuckets(true); // Force retry
      }
    }, 500);
    
    return () => {
      clearTimeout(loadTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Also load buckets when component becomes visible (in case it was conditionally rendered)
  // This handles the case where the component mounts but buckets aren't loaded yet
  useEffect(() => {
    // Check if we have buckets, if not, load them
    // Only load if we're in customer mode and haven't loaded yet
    if (localViewMode === 'customer' && !hasLoadedBucketsRef.current) {
      // Small delay to ensure component is fully mounted
      const checkTimer = setTimeout(() => {
        if (buckets.length === 0 && localBuckets.length === 0) {
          console.log('ActionBar: Component visible but no buckets, loading...');
          loadPersonalBuckets();
        }
      }, 150);
      return () => clearTimeout(checkTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localViewMode]);

  // Load data based on view mode changes (after initial mount)
  useEffect(() => {
    // Skip if this is the initial mount (handled by the mount effect above)
    if (localViewMode === 'customer') {
      // Only reload if we don't have buckets (to avoid unnecessary calls on mount)
      if (buckets.length === 0 && localBuckets.length === 0 && !hasLoadedBucketsRef.current) {
        console.log('ActionBar: No buckets in view mode change, loading...');
        loadPersonalBuckets();
      }
    } else if (localViewMode === 'team') {
      // Only load teams if we don't have them locally or in Redux
      if (localTeams.length === 0 && reduxTeams.length === 0) {
        loadTeams();
      } else if (reduxTeams.length > 0 && localTeams.length === 0) {
        // Use Redux teams if available - filter out invalid teams
        const validTeams = reduxTeams.filter(team => {
          const teamId = team.teamId || team.id;
          const teamName = team.teamName || team.name;
          return teamId && teamName && teamName.trim() !== '';
        });
        setLocalTeams(validTeams);
        localTeamsRef.current = validTeams;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localViewMode]);

  // Additional safeguard: Load buckets when Redux store is ready but buckets are empty
  // This handles cases where the component mounts before Redux is fully initialized
  useEffect(() => {
    // This effect runs whenever buckets change in Redux
    // If buckets are empty and we're in customer mode, try to load
    if (localViewMode === 'customer' && buckets.length === 0 && localBuckets.length === 0) {
      console.log('ActionBar: Redux buckets empty, checking if we should load...', {
        hasLoaded: hasLoadedBucketsRef.current
      });
      
      // Only load if we haven't loaded yet, or if it's been a while (retry case)
      if (!hasLoadedBucketsRef.current) {
        const loadTimer = setTimeout(() => {
          console.log('ActionBar: Triggering load from Redux safeguard...');
          loadPersonalBuckets();
        }, 300);
        return () => clearTimeout(loadTimer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets.length, localBuckets.length, localViewMode]);

  // Sync teams from Redux
  useEffect(() => {
    if (reduxTeams.length > 0 && localViewMode === 'team') {
      // Filter out teams without valid names to prevent jitter
      const validTeams = reduxTeams.filter(team => {
        const teamId = team.teamId || team.id;
        const teamName = team.teamName || team.name;
        return teamId && teamName && teamName.trim() !== '';
      });
      
      setLocalTeams(validTeams);
      localTeamsRef.current = validTeams;
      
      // If we have a selected team ID but no local selection, find and select it
      if (selectedTeamId && !localSelectedTeamId) {
        const team = validTeams.find(t => (t.teamId || t.id) === selectedTeamId);
        if (team) {
          const teamName = team.teamName || team.name;
          if (teamName && teamName.trim() !== '') {
            setLocalSelectedTeamId(selectedTeamId);
            setSelectedTeamName(teamName);
            const teamIndex = validTeams.findIndex(t => (t.teamId || t.id) === selectedTeamId);
            if (teamIndex !== -1) {
              setCurrentTeamIndex(teamIndex);
              currentTeamIndexRef.current = teamIndex;
            }
            selectedTeamIdRef.current = selectedTeamId;
            selectedTeamNameRef.current = teamName;
            loadTeamBuckets(selectedTeamId);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxTeams, localViewMode, selectedTeamId, localSelectedTeamId]);

  useEffect(() => {
    // Setup IPC listeners with retry logic
    const setupIpcListeners = () => {
      console.log('ActionBar: Attempting to setup IPC listeners');
      console.log('ActionBar: Available APIs:', {
        electronAPI: !!window.electronAPI,
        electronAPIOnEventFromMain: !!(window.electronAPI && window.electronAPI.onEventFromMain),
        widgetAPI: !!window.widgetAPI,
        widgetAPIOnEventFromMain: !!(window.widgetAPI && window.widgetAPI.onEventFromMain)
      });

      if (window && window.electronAPI && window.electronAPI.onEventFromMain) {
        console.log('ActionBar: Setting up IPC listener via electronAPI');
        try {
          window.electronAPI.onEventFromMain(onBucketsUpdated);
          console.log('ActionBar: electronAPI listener setup successful');
        } catch (error) {
          console.error('ActionBar: Error setting up electronAPI listener:', error);
        }
      } else if (window && window.widgetAPI && window.widgetAPI.onEventFromMain) {
        console.log('ActionBar: Setting up IPC listener via widgetAPI');
        try {
          window.widgetAPI.onEventFromMain(onBucketsUpdated);
          console.log('ActionBar: widgetAPI listener setup successful');
        } catch (error) {
          console.error('ActionBar: Error setting up widgetAPI listener:', error);
        }
      } else {
        console.warn('ActionBar: No IPC API available. electronAPI:', !!window.electronAPI, 'widgetAPI:', !!window.widgetAPI);
        // Retry after a short delay
        setTimeout(setupIpcListeners, 100);
      }
    };

    // Initial setup
    setupIpcListeners();
    
    // Cleanup function
    return () => {
      if (window && window.electronAPI && window.electronAPI.removeAllListeners) {
        try { 
          console.log('ActionBar: Cleaning up electronAPI IPC listeners');
          window.electronAPI.removeAllListeners('eventFromMain'); 
        } catch (e) {
          console.warn('ActionBar: Error cleaning up electronAPI listeners:', e);
        }
      }
      if (window && window.widgetAPI && window.widgetAPI.removeAllListeners) {
        try { 
          console.log('ActionBar: Cleaning up widgetAPI IPC listeners');
          window.widgetAPI.removeAllListeners('eventFromMain'); 
        } catch (e) {
          console.warn('ActionBar: Error cleaning up widgetAPI listeners:', e);
        }
      }
    };
  }, [dispatch]);

  // Keep collectedImages ref in sync with state
  useEffect(() => {
    collectedImagesRef.current = collectedImages;
  }, [collectedImages]);

  // Cleanup collective session on app close/unload - runs once on mount
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If we have collected images, delete the session (use ref to get current value)
      if (collectedImagesRef.current.length > 0) {
        console.log('ActionBar: App closing with collected images, cleaning up...');
        // Use sendBeacon for reliable cleanup on unload (fire-and-forget)
        deleteCollectiveSession().catch(err => {
          console.error('ActionBar: Error cleaning up collective session on unload:', err);
        });
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also cleanup on component unmount if there are images (use ref)
      if (collectedImagesRef.current.length > 0) {
        console.log('ActionBar: Component unmounting with collected images, cleaning up...');
        deleteCollectiveSession().catch(err => {
          console.error('ActionBar: Error cleaning up collective session on unmount:', err);
        });
      }
    };
  }, []); // Empty dependency - only run on mount/unmount

  // Sync local bucket state with Redux state
  useEffect(() => {
    if (buckets && Array.isArray(buckets)) {
      // Use buckets directly from Redux - already filtered by context
      const filteredBuckets = buckets;
      
      console.log('ActionBar: Syncing local bucket state with Redux:', {
        allBuckets: buckets.length,
        filteredBuckets: filteredBuckets.length,
        viewMode: localViewMode,
        teamId: localSelectedTeamId
      });
      
      const names = filteredBuckets.map(bucket => bucket.name || bucket.bucketName);
      const ids = filteredBuckets.map(bucket => bucket.id || bucket.bucketId);
      
      setLocalBuckets(filteredBuckets);
      setBucketNames(names);
      setBucketIds(ids);
      
      // Update refs for event handlers
      localBucketsRef.current = filteredBuckets;
      bucketNamesRef.current = names;
      bucketIdsRef.current = ids;
      
      console.log('ActionBar: Local bucket state and refs updated:', {
        totalBuckets: filteredBuckets.length,
        bucketNames: names,
        bucketIds: ids
      });
      
      // Set first bucket as default when buckets are loaded and no option is selected
      if (filteredBuckets.length > 0 && selectedOption === 'Select Option') {
        const firstBucket = filteredBuckets[0];
        const bucketName = firstBucket.name || firstBucket.bucketName;
        const bucketId = firstBucket.id || firstBucket.bucketId;
        setSelectedOption(bucketName);
        setSelectedBucketId(bucketId);
        setCurrentBucketIndex(0);
        selectedOptionRef.current = bucketName;
        selectedBucketIdRef.current = bucketId;
        currentBucketIndexRef.current = 0;
        console.log('ActionBar: Set default selection to:', bucketName, 'with ID:', bucketId, 'at index 0');
      } else if (filteredBuckets.length === 0) {
        // Clear selection if no buckets available
        setSelectedOption('Select Option');
        setSelectedBucketId(null);
        selectedOptionRef.current = 'Select Option';
        selectedBucketIdRef.current = null;
      }
    } else {
      console.log('ActionBar: Clearing local bucket state - no buckets available');
      setLocalBuckets([]);
      setBucketNames([]);
      setBucketIds([]);
      localBucketsRef.current = [];
      bucketNamesRef.current = [];
      bucketIdsRef.current = [];
    }
  }, [buckets, selectedOption, localViewMode, localSelectedTeamId]);

  // Keep captureMode ref in sync with state
  useEffect(() => {
    captureModeRef.current = captureMode;
    console.log('ActionBar: captureMode ref updated to:', captureMode);
  }, [captureMode]);

  // Keep localViewMode ref in sync with state  
  useEffect(() => {
    localViewModeRef.current = localViewMode;
    console.log('ActionBar: localViewMode ref updated to:', localViewMode);
  }, [localViewMode]);


  // Navigation functions for bucket selection
  const handlePreviousBucket = () => {
    if (localBuckets.length === 0) return;
    
    const newIndex = currentBucketIndex > 0 ? currentBucketIndex - 1 : localBuckets.length - 1;
    setCurrentBucketIndex(newIndex);
    currentBucketIndexRef.current = newIndex;
    
    const selectedBucket = localBuckets[newIndex];
    if (selectedBucket) {
      const bucketName = selectedBucket.name || selectedBucket.bucketName || 'Unnamed Bucket';
      const bucketId = selectedBucket.id || selectedBucket.bucketId;
      setSelectedOption(bucketName);
      setSelectedBucketId(bucketId);
      selectedOptionRef.current = bucketName;
      selectedBucketIdRef.current = bucketId;
      console.log('ActionBar: Previous bucket selected:', {
        name: bucketName,
        id: bucketId,
        index: newIndex
      });
    }
  };

  const handleNextBucket = () => {
    if (localBuckets.length === 0) return;
    
    const newIndex = currentBucketIndex < localBuckets.length - 1 ? currentBucketIndex + 1 : 0;
    setCurrentBucketIndex(newIndex);
    currentBucketIndexRef.current = newIndex;
    
    const selectedBucket = localBuckets[newIndex];
    if (selectedBucket) {
      const bucketName = selectedBucket.name || selectedBucket.bucketName || 'Unnamed Bucket';
      const bucketId = selectedBucket.id || selectedBucket.bucketId;
      setSelectedOption(bucketName);
      setSelectedBucketId(bucketId);
      selectedOptionRef.current = bucketName;
      selectedBucketIdRef.current = bucketId;
      console.log('ActionBar: Next bucket selected:', {
        name: bucketName,
        id: bucketId,
        index: newIndex
      });
    }
  };

  // Navigation functions for team selection
  const handlePreviousTeam = () => {
    if (localTeams.length === 0) return;
    
    const newIndex = currentTeamIndex > 0 ? currentTeamIndex - 1 : localTeams.length - 1;
    const selectedTeam = localTeams[newIndex];
    
    // Only proceed if team exists and has a valid name
    if (!selectedTeam) return;
    
    const teamId = selectedTeam.teamId || selectedTeam.id;
    const teamName = selectedTeam.teamName || selectedTeam.name;
    
    // Prevent jitter: Don't update if team name is missing or invalid
    if (!teamId || !teamName || teamName.trim() === '') {
      console.log('ActionBar: Skipping team switch - invalid team data:', { teamId, teamName });
      return;
    }
    
    setCurrentTeamIndex(newIndex);
    currentTeamIndexRef.current = newIndex;
    setLocalSelectedTeamId(teamId);
    setSelectedTeamName(teamName);
    selectedTeamIdRef.current = teamId;
    selectedTeamNameRef.current = teamName;
    
    // Update Redux state
    dispatch(setSelectedTeamId(teamId));
    
    // Fetch team buckets
    loadTeamBuckets(teamId);
    
    console.log('ActionBar: Previous team selected:', {
      name: teamName,
      id: teamId,
      index: newIndex
    });
  };

  const handleNextTeam = () => {
    if (localTeams.length === 0) return;
    
    const newIndex = currentTeamIndex < localTeams.length - 1 ? currentTeamIndex + 1 : 0;
    const selectedTeam = localTeams[newIndex];
    
    // Only proceed if team exists and has a valid name
    if (!selectedTeam) return;
    
    const teamId = selectedTeam.teamId || selectedTeam.id;
    const teamName = selectedTeam.teamName || selectedTeam.name;
    
    // Prevent jitter: Don't update if team name is missing or invalid
    if (!teamId || !teamName || teamName.trim() === '') {
      console.log('ActionBar: Skipping team switch - invalid team data:', { teamId, teamName });
      return;
    }
    
    setCurrentTeamIndex(newIndex);
    currentTeamIndexRef.current = newIndex;
    setLocalSelectedTeamId(teamId);
    setSelectedTeamName(teamName);
    selectedTeamIdRef.current = teamId;
    selectedTeamNameRef.current = teamName;
    
    // Update Redux state
    dispatch(setSelectedTeamId(teamId));
    
    // Fetch team buckets
    loadTeamBuckets(teamId);
    
    console.log('ActionBar: Next team selected:', {
      name: teamName,
      id: teamId,
      index: newIndex
    });
  };

  // Handle view mode toggle
  const handleViewModeToggle = (mode) => {
    if (mode === localViewMode) return;
    
    setLocalViewMode(mode);
    dispatch(setViewMode(mode));
    
    if (mode === 'customer') {
      // Switch to personal mode - fetch personal buckets
      setLocalSelectedTeamId(null);
      setSelectedTeamName('Select Team');
      selectedTeamIdRef.current = null;
      selectedTeamNameRef.current = 'Select Team';
      dispatch(setSelectedTeamId(null));
      loadPersonalBuckets();
    } else {
      // Switch to team mode - fetch teams
      loadTeams();
    }
  };


  // Load teams
  const loadTeams = async () => {
    try {
      // First try using thunk (which uses service with auth)
      const result = await dispatch(fetchAllTeams());
      if (fetchAllTeams.fulfilled.match(result)) {
        const teams = result.payload || [];
        // Filter out teams without valid names to prevent jitter
        const validTeams = teams.filter(team => {
          const teamId = team.teamId || team.id;
          const teamName = team.teamName || team.name;
          return teamId && teamName && teamName.trim() !== '';
        });
        
        setLocalTeams(validTeams);
        localTeamsRef.current = validTeams;
        
        // Auto-select first team if available
        if (validTeams.length > 0) {
          const firstTeam = validTeams[0];
          const teamId = firstTeam.teamId || firstTeam.id;
          const teamName = firstTeam.teamName || firstTeam.name;
          setLocalSelectedTeamId(teamId);
          setSelectedTeamName(teamName);
          setCurrentTeamIndex(0);
          selectedTeamIdRef.current = teamId;
          selectedTeamNameRef.current = teamName;
          currentTeamIndexRef.current = 0;
          dispatch(setSelectedTeamId(teamId));
          loadTeamBuckets(teamId);
        }
        console.log('ActionBar: Teams loaded:', teams);
      } else {
        // Fallback: direct API call with token
        const token = await getClerkToken();
        if (!token) {
          console.error('ActionBar: No token available for fetching teams');
          return;
        }
        
        const teams = await getAllTeams();
        if (Array.isArray(teams)) {
          // Filter out teams without valid names to prevent jitter
          const validTeams = teams.filter(team => {
            const teamId = team.teamId || team.id;
            const teamName = team.teamName || team.name;
            return teamId && teamName && teamName.trim() !== '';
          });
          
          setLocalTeams(validTeams);
          localTeamsRef.current = validTeams;
          dispatch(fetchAllTeams()); // Update Redux
          
          if (validTeams.length > 0) {
            const firstTeam = validTeams[0];
            const teamId = firstTeam.teamId || firstTeam.id;
            const teamName = firstTeam.teamName || firstTeam.name;
            setLocalSelectedTeamId(teamId);
            setSelectedTeamName(teamName);
            setCurrentTeamIndex(0);
            selectedTeamIdRef.current = teamId;
            selectedTeamNameRef.current = teamName;
            currentTeamIndexRef.current = 0;
            dispatch(setSelectedTeamId(teamId));
            loadTeamBuckets(teamId);
          }
        }
      }
    } catch (error) {
      console.error('ActionBar: Error loading teams:', error);
      // Fallback to Redux state if available (will be handled by useEffect)
    }
  };

  // Load team buckets
  const loadTeamBuckets = async (teamId) => {
    if (!teamId) return;
    
    try {
      // First try using thunk
      const result = await dispatch(fetchTeamBuckets(teamId));
      if (fetchTeamBuckets.fulfilled.match(result)) {
        console.log('ActionBar: Team buckets loaded:', result.payload);
      } else {
        // Fallback: direct API call
        const token = await getClerkToken();
        if (!token) {
          console.error('ActionBar: No token available for fetching team buckets');
          return;
        }
        
        const buckets = await getAllTeamBuckets(teamId);
        if (Array.isArray(buckets)) {
          // Normalize buckets
          const normalizedBuckets = buckets.map(bucket => ({
            bucketId: bucket.bucketId || bucket.id || bucket.bucket_id,
            bucketName: bucket.bucketName || bucket.name || bucket.bucket_name || '',
            teamId: bucket.teamId || bucket.team_id || teamId,
            customerId: null,
            id: bucket.bucketId || bucket.id || bucket.bucket_id,
            name: bucket.bucketName || bucket.name || bucket.bucket_name || ''
          }));
          
          dispatch(setBuckets(normalizedBuckets, teamId, true));
          dispatch(fetchTeamBuckets(teamId)); // Update Redux via thunk
        }
      }
    } catch (error) {
      console.error('ActionBar: Error loading team buckets:', error);
      // Fallback to Redux state if available (will be handled by useEffect)
    }
  };

  // Handle processing multiple collected images
  const handleProcessMultipleImages = async () => {
    if (collectedImages.length === 0) {
      console.log('ActionBar: No images to process');
      return;
    }
    
    console.log('ActionBar: Queueing multiple images for processing...', { count: collectedImages.length });
    setScreenshotStatus('processing');
    
    try {
      const currentBucketId = selectedBucketIdRef.current || selectedBucketId;
      if (!currentBucketId) {
        alert('Please select a bucket before processing');
        setScreenshotStatus('ready');
        if (window.forceClickThroughRestore) window.forceClickThroughRestore();
        return;
      }
      
      // Sync token before saving to queue
      const token = await getClerkToken();
      if (token && window.electronAPI && window.electronAPI.setQueueToken) {
        await window.electronAPI.setQueueToken(token);
      }
      
      // Generate a single sessionId for all images in this batch
      const batchSessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Save all images to queue with the same sessionId
      if (window.electronAPI && window.electronAPI.saveImageToQueue) {
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < collectedImages.length; i++) {
          const image = collectedImages[i];
          try {
            // Convert base64 to ArrayBuffer
            const base64Data = image.imageData || image.base64Thumbnail;
            if (!base64Data) continue;
            
            const base64Part = base64Data.split(',')[1] || base64Data;
            const binaryString = atob(base64Part);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }
            
            const result = await window.electronAPI.saveImageToQueue(bytes, currentBucketId, {
              source: 'collective',
              timestamp: new Date().toISOString(),
              sessionId: batchSessionId, // Use same sessionId for all images
              imageIndex: i,
              imageCount: collectedImages.length
            });
            
            if (result && result.success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            console.error('ActionBar: Error queueing image:', error);
            failCount++;
          }
        }
        
        // Clear collected images immediately
        setCollectedImages([]);
        
        if (successCount > 0) {
          console.log(`ActionBar: ${successCount} images queued successfully`);
          showLeadProcessingFeedback('success', { 
            message: `${successCount} image${successCount > 1 ? 's' : ''} queued for processing` 
          });
          setScreenshotStatus('success');
          setTimeout(() => setScreenshotStatus('ready'), 2500);
        } else {
          console.error('ActionBar: Failed to queue images');
          showLeadProcessingFeedback('error', { message: 'Failed to queue images' });
          setScreenshotStatus('ready');
        }
      } else {
        console.error('ActionBar: Queue system not available');
        showLeadProcessingFeedback('error', { message: 'Queue system not available' });
        setScreenshotStatus('ready');
      }
      
      // Restore click-through after processing
      if (window.forceClickThroughRestore) window.forceClickThroughRestore();
    } catch (error) {
      console.error('ActionBar: Error processing multiple images:', error);
      showLeadProcessingFeedback('error', { message: error.message });
      setScreenshotStatus('ready');
      if (window.forceClickThroughRestore) window.forceClickThroughRestore();
    }
  };

  // Handle canceling/deleting collected images
  const handleCancelMultipleImages = async () => {
    console.log('ActionBar: Canceling multiple images...');
    
    try {
      const deleteResult = await deleteCollectiveSession();
      console.log('ActionBar: Delete result:', deleteResult);
      
      // Clear collected images regardless of API result
      setCollectedImages([]);
      console.log('ActionBar: Collected images cleared');
    } catch (error) {
      console.error('ActionBar: Error deleting collective session:', error);
      // Still clear local images even if API fails
      setCollectedImages([]);
    }
    
    // Restore click-through after cancel
    if (window.forceClickThroughRestore) window.forceClickThroughRestore();
  };

  // Add image to collection in multiple mode
  const addImageToCollection = async (imageDataUrl) => {
    if (collectedImages.length >= MAX_COLLECTED_IMAGES) {
      console.log('ActionBar: Max images reached, cannot add more');
      return false;
    }
    
    try {
      // Just add to local collection for preview - actual processing happens when user clicks process
      const newImage = {
        id: `img-${Date.now()}`,
        base64Thumbnail: imageDataUrl,
        timestamp: Date.now(),
        imageData: imageDataUrl // Store full image data for later processing
      };
      setCollectedImages(prev => [...prev, newImage]);
      console.log('ActionBar: Image added to collection', { count: collectedImages.length + 1 });
      return true;
    } catch (error) {
      console.error('ActionBar: Error adding image to collection:', error);
      return false;
    }
  };

    // Capture screenshot and save locally
  const handleActionButton = async () => {
    console.log(`ActionBar: Action button clicked with option: ${selectedOption}`);
    console.log('ActionBar: Button click state:', {
      selectedOption,
      selectedBucketId,
      bucketsLength: buckets ? buckets.length : 'null/undefined',
      localBucketsLength: localBuckets.length,
      buckets: buckets,
      localBuckets: localBuckets
    });
    
    // Check if screenshot process is already active
    if (screenshotStatus === 'processing') {
      console.log('ActionBar: Screenshot already in progress, ignoring button click');
      alert('Screenshot is already in progress. Please wait for it to complete.');
      return;
    }
    
    // Check if a valid option is selected
    if (!selectedOption || selectedOption === 'Select Option') {
      console.log('ActionBar: No valid option selected from button, auto-selecting first available option');
      
      // Auto-select bucket if available - use current index if valid, otherwise first bucket
      const availableBucketsForButton = localBuckets.length > 0 ? localBuckets : buckets;
      if (availableBucketsForButton && availableBucketsForButton.length > 0) {
        // Use current bucket index if it's valid, otherwise use first bucket
        const targetIndex = (currentBucketIndexRef.current < availableBucketsForButton.length) ? 
                           currentBucketIndexRef.current : 0;
        const targetBucket = availableBucketsForButton[targetIndex];
        
        console.log('ActionBar: Button auto-selection logic:', {
          currentBucketIndexRef: currentBucketIndexRef.current,
          availableBucketsLength: availableBucketsForButton.length,
          targetIndex,
          targetBucket: targetBucket ? { name: targetBucket.name, id: targetBucket.id } : 'null'
        });
        
        setSelectedOption(targetBucket.name);
        setSelectedBucketId(targetBucket.id);
        setCurrentBucketIndex(targetIndex);
        selectedOptionRef.current = targetBucket.name;
        selectedBucketIdRef.current = targetBucket.id;
        currentBucketIndexRef.current = targetIndex;
        console.log('ActionBar: Auto-selected option from button click:', targetBucket.name, 'with ID:', targetBucket.id, 'at index:', targetIndex);
        
        // Continue with screenshot after auto-selection
        setTimeout(() => {
          handleActionButton(); // Recursive call after auto-selection
        }, 100);
        return;
      } else {
        console.log('ActionBar: No buckets available for button click, cannot take screenshot');
        console.log('ActionBar: Button click final bucket state - Redux:', buckets, 'Local:', localBuckets);
        alert('Please wait for buckets to load before taking a screenshot.');
        return;
      }
    }
    
    // Set status to processing (red)
    setScreenshotStatus('processing');
    
    // Try both electronAPI and widgetAPI for screenshot functionality
    let screenshotAPI = null;
    if (window && window.electronAPI && window.electronAPI.captureAndSaveScreenshot) {
      screenshotAPI = window.electronAPI;
      console.log('Using electronAPI for screenshot');
    } else if (window && window.widgetAPI && window.widgetAPI.captureAndSaveScreenshot) {
      screenshotAPI = window.widgetAPI;
      console.log('Using widgetAPI for screenshot');
    }
    
    if (screenshotAPI) {
      try {
        const result = await screenshotAPI.captureAndSaveScreenshot();
        console.log('Screenshot captured and saved successfully.', result);
        
        // Check for permission errors
        if (!result.success && result.permissionDenied) {
          const errorMsg = result.error || 'Screen recording permission is required. Please grant permission in System Preferences > Security & Privacy > Screen Recording.';
          alert(errorMsg);
          console.error('Screenshot permission denied:', errorMsg);
          setScreenshotStatus('ready');
          return;
        }
        
        // Process the image data directly from the IPC response
        if (result.success && result.imageData) {
          console.log('ActionBar: Processing image data from button click');
          
          // Restore click-through after screenshot (immediate)
          if (window.forceClickThroughRestore) {
            window.forceClickThroughRestore();
          }
          
          // Process screenshot (non-blocking, doesn't return a promise)
          processScreenshotInOverlay(result.imageData, result.resolution);
          
          // Reset status to ready immediately (queuing happens in background)
          // This allows user to take next screenshot quickly
          setScreenshotStatus('ready');
        } else if (!result.success) {
          // Handle other errors
          const errorMsg = result.error || 'Failed to capture screenshot';
          console.error('Screenshot capture failed:', errorMsg);
          alert(`Screenshot failed: ${errorMsg}`);
          setScreenshotStatus('ready');
          // Restore click-through on error
          if (window.forceClickThroughRestore) {
            window.forceClickThroughRestore();
          }
        }
        
      } catch (err) {
        console.error('Failed to capture or save screenshot:', err);
        const errorMsg = err.message || 'An unexpected error occurred while capturing screenshot';
        alert(`Screenshot error: ${errorMsg}`);
        
        // Restore click-through on error
        if (window.forceClickThroughRestore) {
          window.forceClickThroughRestore();
        }
        
        // On error, reset to ready after a short delay
        setTimeout(() => {
          setScreenshotStatus('ready');
        }, 1000);
      }
    } else {
      console.error('Screenshot functionality is not available. electronAPI:', !!window.electronAPI, 'widgetAPI:', !!window.widgetAPI);
      alert('Screenshot functionality is not available.');
      
      // Restore click-through
      if (window.forceClickThroughRestore) {
        window.forceClickThroughRestore();
      }
      
      // Reset status to ready
      setScreenshotStatus('ready');
    }
  };

  // Update current bucket when buckets change
  useEffect(() => {
    if (localBuckets.length > 0 && currentBucketIndex >= localBuckets.length) {
      // Reset to first bucket if current index is out of bounds
      setCurrentBucketIndex(0);
      currentBucketIndexRef.current = 0;
      
      const firstBucket = localBuckets[0];
      if (firstBucket) {
        const bucketName = firstBucket.name || firstBucket.bucketName;
        const bucketId = firstBucket.id || firstBucket.bucketId;
        setSelectedOption(bucketName);
        setSelectedBucketId(bucketId);
        selectedOptionRef.current = bucketName;
        selectedBucketIdRef.current = bucketId;
      }
    }
  }, [localBuckets, currentBucketIndex]);

  // Calculate dynamic width based on content
  useEffect(() => {
    const updateWidth = () => {
      if (barContentRef.current) {
        const width = barContentRef.current.offsetWidth;
        setDynamicBarWidth(Math.max(160, width + 20)); // Add padding, minimum 160px
      }
    };
    
    // Update width after render
    setTimeout(updateWidth, 0);
    
    // Also update on window resize
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [localViewMode, localTeams.length, localBuckets.length, selectedTeamName, selectedOption, localSelectedTeamId]);

  return (
    <HoverComponent>
      {/* Add CSS animation for pulsing effect and slide-in animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          @keyframes slideInOut {
            0% {
              transform: translateY(-20px);
              opacity: 0;
            }
            10%, 90% {
              transform: translateY(0);
              opacity: 1;
            }
            100% {
              transform: translateY(-20px);
              opacity: 0;
            }
          }
          .global-shortcut-feedback {
            animation: slideInOut 2s ease-in-out;
          }
        `}
      </style>
      
      {/* Global Shortcut Feedback Notification */}
      {globalShortcutFeedback }
      <div style={{
        position: 'fixed',
        left: safeLeft,
        top: position.y + 15,
        transform: 'translateX(0)',
        opacity: 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 10002,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'auto',
        width: 'fit-content',
        height: 'fit-content'
      }}>
        {/* Arrow pointing to widget */}
        <div style={{
          width: 0,
          height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderRight: isNearRightEdge ? 'none' : '5px solid rgba(0, 0, 0, 0.9)',
          borderLeft: isNearRightEdge ? '5px solid rgba(0, 0, 0, 0.9)' : 'none',
          marginRight: isNearRightEdge ? '0' : '-1px',
          marginLeft: isNearRightEdge ? '-1px' : '0',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
        }} />

         {/* Action bar background */}
         <div 
           ref={barContentRef}
           style={{
             background: themeColors.primaryBackground,
             backdropFilter: 'blur(10px)',
             borderRadius: '8px',
             padding: '8px',
             display: 'flex',
             alignItems: 'center',
             gap: '8px',
             boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
             border: `1px solid ${themeColors.borderColor}`,
             minWidth: '160px',
             position: 'relative'
           }}
         >
           {/* Personal/Team Toggle */}
           <div style={{
             display: 'flex',
             background: themeColors.surfaceBackground,
             borderRadius: '6px',
             padding: '4px',
             border: `1px solid ${themeColors.borderColor}`,
             gap: '4px'
           }}>
            <button
              onClick={() => handleViewModeToggle('customer')}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: '400',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: localViewMode === 'customer' ? themeColors.primaryBlue : 'transparent',
                color: localViewMode === 'customer' ? '#FFFFFF' : themeColors.secondaryText,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (localViewMode !== 'customer') {
                  e.target.style.background = themeColors.hoverBackground;
                }
              }}
              onMouseLeave={(e) => {
                if (localViewMode !== 'customer') {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              Personal
            </button>
            <button
              onClick={() => handleViewModeToggle('team')}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: '400',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: localViewMode === 'team' ? themeColors.primaryBlue : 'transparent',
                color: localViewMode === 'team' ? '#FFFFFF' : themeColors.secondaryText,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (localViewMode !== 'team') {
                  e.target.style.background = themeColors.hoverBackground;
                }
              }}
              onMouseLeave={(e) => {
                if (localViewMode !== 'team') {
                  e.target.style.background = 'transparent';
                }
              }}
            >
              Team
            </button>
           </div>

          {/* Single/Multiple Mode Toggle - Only visible in Personal mode */}
          {localViewMode === 'customer' && (
            <div style={{
              display: 'flex',
              background: themeColors.surfaceBackground,
              borderRadius: '6px',
              padding: '4px',
              border: `1px solid ${themeColors.borderColor}`,
              gap: '4px'
            }}>
              <button
                onClick={() => setCaptureMode('single')}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: '400',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: captureMode === 'single' ? themeColors.primaryBlue : 'transparent',
                  color: captureMode === 'single' ? '#FFFFFF' : themeColors.secondaryText,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (captureMode !== 'single') {
                    e.target.style.background = themeColors.hoverBackground;
                  }
                }}
                onMouseLeave={(e) => {
                  if (captureMode !== 'single') {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                Single
              </button>
              <button
                onClick={() => setCaptureMode('multiple')}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: '400',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: captureMode === 'multiple' ? themeColors.primaryBlue : 'transparent',
                  color: captureMode === 'multiple' ? '#FFFFFF' : themeColors.secondaryText,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (captureMode !== 'multiple') {
                    e.target.style.background = themeColors.hoverBackground;
                  }
                }}
                onMouseLeave={(e) => {
                  if (captureMode !== 'multiple') {
                    e.target.style.background = 'transparent';
                  }
                }}
              >
                Multiple
              </button>
            </div>
          )}

          {/* Team Selection (only visible in team mode and when teams are available) */}
          {localViewMode === 'team' && localTeams.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Team Label */}
                <span style={{
                  color: themeColors.secondaryText,
                  fontSize: '10px',
                  fontWeight: '400',
                  whiteSpace: 'nowrap'
                }}>
                  Team:
                </span>
                
                {/* Current Team Name Display */}
                <div style={{
                  background: themeColors.surfaceBackground,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: themeColors.primaryText,
                  fontSize: '10px',
                  fontWeight: '400',
                  textAlign: 'center',
                  minWidth: '60px',
                  maxWidth: '120px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {selectedTeamName || 'Select Team'}
                </div>

                {/* Team Counter Display */}
                <div style={{
                  background: themeColors.surfaceBackground,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  padding: '4px 6px',
                  color: themeColors.secondaryText,
                  fontSize: '8px',
                  fontWeight: '500',
                  textAlign: 'center',
                  minWidth: '35px'
                }}>
                  {`${currentTeamIndex + 1}/${localTeams.length}`}
                </div>
              </div>
              
              {/* Navigation Buttons Below */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <button
                  onClick={handlePreviousTeam}
                  style={{
                    background: themeColors.surfaceBackground,
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '3px',
                    padding: '2px 6px',
                    color: themeColors.primaryText,
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '18px',
                    minWidth: '40px',
                    fontWeight: '500'
                  }}
                  title="Previous team"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15,18 9,12 15,6"></polyline>
                  </svg>
                </button>
                <button
                  onClick={handleNextTeam}
                  style={{
                    background: themeColors.surfaceBackground,
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '3px',
                    padding: '2px 6px',
                    color: themeColors.primaryText,
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '18px',
                    minWidth: '40px',
                    fontWeight: '500'
                  }}
                  title="Next team"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9,18 15,12 9,6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Bucket Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Bucket Label */}
              <span style={{
                color: themeColors.secondaryText,
                fontSize: '10px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>
                Bucket:
              </span>
              
              {/* Current Bucket Name Display */}
              <div style={{
                background: localBuckets.length === 0 ? '#6B7280' : themeColors.surfaceBackground,
                border: `1px solid ${localBuckets.length === 0 ? '#6B7280' : themeColors.borderColor}`,
                borderRadius: '4px',
                padding: '4px 8px',
                color: localBuckets.length === 0 ? '#9CA3AF' : themeColors.primaryText,
                fontSize: '10px',
                fontWeight: '400',
                textAlign: 'center',
                minWidth: '60px',
                maxWidth: '120px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                opacity: localBuckets.length === 0 ? 0.5 : 1
              }}>
                {selectedOption}
              </div>

              {/* Counter Display */}
              <div style={{
                background: themeColors.surfaceBackground,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '4px',
                padding: '4px 6px',
                color: themeColors.secondaryText,
                fontSize: '8px',
                fontWeight: '500',
                textAlign: 'center',
                minWidth: '35px'
              }}>
                {localBuckets.length > 0 ? `${currentBucketIndex + 1}/${localBuckets.length}` : '0/0'}
              </div>
            </div>
            
            {/* Navigation Buttons Below */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <button
                onClick={handlePreviousBucket}
                disabled={localBuckets.length === 0}
                style={{
                  background: localBuckets.length === 0 ? '#6B7280' : themeColors.surfaceBackground,
                  border: `1px solid ${localBuckets.length === 0 ? '#6B7280' : themeColors.borderColor}`,
                  borderRadius: '3px',
                  padding: '2px 6px',
                  color: localBuckets.length === 0 ? '#9CA3AF' : themeColors.primaryText,
                  fontSize: '11px',
                  cursor: localBuckets.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '18px',
                  minWidth: '40px',
                  fontWeight: '500',
                  opacity: localBuckets.length === 0 ? 0.5 : 1
                }}
                title="Previous bucket"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <button
                onClick={handleNextBucket}
                disabled={localBuckets.length === 0}
                style={{
                  background: localBuckets.length === 0 ? '#6B7280' : themeColors.surfaceBackground,
                  border: `1px solid ${localBuckets.length === 0 ? '#6B7280' : themeColors.borderColor}`,
                  borderRadius: '3px',
                  padding: '2px 6px',
                  color: localBuckets.length === 0 ? '#9CA3AF' : themeColors.primaryText,
                  fontSize: '11px',
                  cursor: localBuckets.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '18px',
                  minWidth: '40px',
                  fontWeight: '500',
                  opacity: localBuckets.length === 0 ? 0.5 : 1
                }}
                title="Next bucket"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
          </div>

          {/* Action Button with Status Indicator */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Status Circle */}
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: screenshotStatus === 'ready' ? '#6B7280' : 
                         screenshotStatus === 'processing' ? '#EF4444' : '#10B981',
              marginBottom: '4px',
              transition: 'background-color 0.3s ease',
              boxShadow: screenshotStatus === 'processing' ? '0 0 8px rgba(239, 68, 68, 0.6)' : 
                         screenshotStatus === 'success' ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
              animation: screenshotStatus === 'processing' ? 'pulse 1s infinite' : 'none'
            }} />

            <button
              onClick={handleActionButton}
              disabled={screenshotStatus === 'processing' || !selectedOption || selectedOption === 'Select Option' || (captureMode === 'multiple' && collectedImages.length >= MAX_COLLECTED_IMAGES)}
              style={{
                background: (screenshotStatus === 'processing' || !selectedOption || selectedOption === 'Select Option' || (captureMode === 'multiple' && collectedImages.length >= MAX_COLLECTED_IMAGES)) ? '#6B7280' : themeColors.primaryBlue,
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                color: themeColors.primaryText,
                fontSize: '12px',
                fontWeight: '600',
                cursor: (screenshotStatus === 'processing' || !selectedOption || selectedOption === 'Select Option' || (captureMode === 'multiple' && collectedImages.length >= MAX_COLLECTED_IMAGES)) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                opacity: (screenshotStatus === 'processing' || !selectedOption || selectedOption === 'Select Option' || (captureMode === 'multiple' && collectedImages.length >= MAX_COLLECTED_IMAGES)) ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                const isDisabled = screenshotStatus === 'processing' || !selectedOption || selectedOption === 'Select Option' || (captureMode === 'multiple' && collectedImages.length >= MAX_COLLECTED_IMAGES);
                if (!isDisabled) {
                  e.target.style.background = '#0056CC';
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                const isDisabled = screenshotStatus === 'processing' || !selectedOption || selectedOption === 'Select Option' || (captureMode === 'multiple' && collectedImages.length >= MAX_COLLECTED_IMAGES);
                if (!isDisabled) {
                  e.target.style.background = themeColors.primaryBlue;
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {screenshotStatus === 'processing' ? 'Taking...' : (captureMode === 'multiple' && collectedImages.length >= MAX_COLLECTED_IMAGES) ? 'Max' : 'Add'}
            </button>
          </div>

          {/* Metrics Toggle Button - Only show in personal mode */}
          {localViewMode === 'customer' && (
            <button
              onClick={() => {
                const newVisibility = !metricsBarVisible;
                setMetricsBarVisible(newVisibility);
                try {
                  localStorage.setItem('metricsBarVisible', newVisibility.toString());
                  // Dispatch custom event to notify MetricBar
                  window.dispatchEvent(new CustomEvent('metricsBarVisibilityChanged', { 
                    detail: { visible: newVisibility } 
                  }));
                } catch (error) {
                  console.error('Error saving metricsBarVisible to localStorage:', error);
                }
              }}
              style={{
                background: themeColors.surfaceBackground,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '6px',
                padding: '6px 10px',
                color: themeColors.primaryText,
                fontSize: '10px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                minWidth: '80px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = themeColors.hoverBackground;
                e.target.style.borderColor = themeColors.primaryBlue;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = themeColors.surfaceBackground;
                e.target.style.borderColor = themeColors.borderColor;
              }}
              title={metricsBarVisible ? "Hide metrics" : "Show metrics"}
            >
              {metricsBarVisible ? 'Hide Metrics' : 'Show Metrics'}
            </button>
          )}
        </div>

        {/* Multi-Image Preview Panel - Only visible in multiple mode with images when NOT collapsed */}
        {captureMode === 'multiple' && localViewMode === 'customer' && !actionBarCollapsed && (
          <HoverComponent style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: themeColors.primaryBackground,
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
            border: `1px solid ${themeColors.borderColor}`,
            minWidth: '200px'
          }}>
            {/* Header with count and actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: collectedImages.length > 0 ? '8px' : '0'
            }}>
              <span style={{
                color: themeColors.secondaryText,
                fontSize: '10px',
                fontWeight: '500'
              }}>
                Images: {collectedImages.length}/{MAX_COLLECTED_IMAGES}
              </span>
              
              {collectedImages.length > 0 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={handleProcessMultipleImages}
                    style={{
                      background: '#10B981',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#10B981';
                    }}
                  >
                    Process
                  </button>
                  <button
                    onClick={handleCancelMultipleImages}
                    style={{
                      background: '#EF4444',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#DC2626';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#EF4444';
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            {/* Scrollable image thumbnails */}
            {collectedImages.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'thin',
                scrollbarColor: `${themeColors.borderColor} transparent`
              }}>
                <style>
                  {`
                    .multi-image-scroll::-webkit-scrollbar {
                      height: 6px;
                    }
                    .multi-image-scroll::-webkit-scrollbar-track {
                      background: transparent;
                      border-radius: 3px;
                    }
                    .multi-image-scroll::-webkit-scrollbar-thumb {
                      background: ${themeColors.borderColor};
                      border-radius: 3px;
                    }
                    .multi-image-scroll::-webkit-scrollbar-thumb:hover {
                      background: ${themeColors.secondaryText};
                    }
                  `}
                </style>
                <div className="multi-image-scroll" style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  paddingBottom: '4px'
                }}>
                  {collectedImages.map((img, index) => (
                    <div
                      key={img.id}
                      style={{
                        flexShrink: 0,
                        width: '60px',
                        height: '40px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: `1px solid ${themeColors.borderColor}`,
                        position: 'relative'
                      }}
                    >
                      <img
                        src={img.base64Thumbnail}
                        alt={`Screenshot ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <span style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: '8px',
                        padding: '1px 3px',
                        borderRadius: '2px'
                      }}>
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {collectedImages.length === 0 && (
              <div style={{
                color: themeColors.secondaryText,
                fontSize: '10px',
                textAlign: 'center',
                padding: '8px 0'
              }}>
                Take screenshots to collect images
              </div>
            )}
          </HoverComponent>
        )}
      </div>


    </HoverComponent>
  );
};

export default ActionBar;
