import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { themeColors } from '../common/utils/colors';
import { sendAudioChunk } from '../../../services/airtypeService';
import HoverComponent from '../common/components/HoverComponent';

const AirtypeOverlay = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 75, y: window.innerHeight / 2 - 50 });
  const [isVisible, setIsVisible] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0); // For visual feedback
  const [isDetectingVoice, setIsDetectingVoice] = useState(false);
  const [autoPasteEnabled, setAutoPasteEnabled] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const widgetRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const sessionIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const currentOverlayType = useSelector((state) => state.overlayType.currentOverlayType);

  // Detect platform for shortcut display
  const isMac = navigator.platform.toUpperCase().includes('MAC') || 
                (window.process && window.process.platform === 'darwin');
  const shortcutKey = isMac ? 'Option+1' : 'Ctrl+1';

  // Load auto-paste setting
  useEffect(() => {
    const loadAutoPasteSetting = async () => {
      try {
        if (window.widgetAPI && window.widgetAPI.getAirtypeAutoPaste) {
          const value = await window.widgetAPI.getAirtypeAutoPaste();
          setAutoPasteEnabled(value);
        } else if (window.electronAPI && window.electronAPI.getAirtypeAutoPaste) {
          const value = await window.electronAPI.getAirtypeAutoPaste();
          setAutoPasteEnabled(value);
        }
      } catch (error) {
        console.error('Failed to load auto-paste setting:', error);
      }
    };
    loadAutoPasteSetting();

    // Listen for setting changes
    const checkSetting = setInterval(() => {
      loadAutoPasteSetting();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkSetting);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  // Listen for keyboard shortcut from main process
  useEffect(() => {
    const handleEventFromMain = (event, data) => {
      if (data && data.eventName === 'airtype:startRecording') {
        if (!isRecording && !isProcessing) {
          startRecording();
        }
      } else if (data && data.eventName === 'airtype:stopRecording') {
        if (isRecording) {
          stopRecording();
        }
      } else if (data && data.eventName === 'airtype:toggleRecording') {
        if (isRecording) {
          stopRecording();
        } else if (!isProcessing) {
          startRecording();
        }
      }
    };

    // Detect platform
    const isMac = navigator.platform.toUpperCase().includes('MAC') || 
                  (window.process && window.process.platform === 'darwin');

    // Listen for keyboard shortcut (Ctrl+1 on Windows, Option+1 on macOS) in overlay window
    const handleKeyDown = (e) => {
      // Only handle if AirType overlay is active
      if (currentOverlayType !== 'airtype') return;
      
      // Check for Ctrl+1 on Windows or Option+1 on macOS
      if ((e.ctrlKey || (isMac && e.altKey)) && e.key === '1') {
        e.preventDefault();
        e.stopPropagation();
        
        if (isRecording) {
          stopRecording();
        } else if (!isProcessing) {
          startRecording();
        }
      }
    };

    // Setup IPC listeners
    if (window.widgetAPI && window.widgetAPI.onEventFromMain) {
      window.widgetAPI.onEventFromMain(handleEventFromMain);
    }

    // Setup keyboard listener
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      if (window.widgetAPI && window.widgetAPI.removeAllListeners) {
        window.widgetAPI.removeAllListeners('eventFromMain');
      }
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isRecording, isProcessing, currentOverlayType]);

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      
      // Disable click-through when recording starts
      if (window.widgetAPI && window.widgetAPI.disableClickThrough) {
        window.widgetAPI.disableClickThrough();
      }
      
      // Generate unique session ID
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      // Setup audio analysis for visual feedback
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        // Start monitoring audio levels
        const startMonitoring = () => {
          const monitorAudio = () => {
            if (!analyserRef.current) {
              animationFrameRef.current = null;
              return;
            }
            
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
            
            setAudioLevel(normalizedLevel);
            
            // Detect voice (threshold can be adjusted)
            const voiceThreshold = 0.1;
            setIsDetectingVoice(normalizedLevel > voiceThreshold);
            
            animationFrameRef.current = requestAnimationFrame(monitorAudio);
          };
          
          monitorAudio();
        };
        
        // Start monitoring after a brief delay to ensure state is set
        setTimeout(startMonitoring, 50);
      } catch (audioAnalysisError) {
        console.warn('Audio analysis not available:', audioAnalysisError);
      }
      
      // Create MediaRecorder with WebM format
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      // Fallback to default if WebM not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.warn('WebM not supported, using default format');
        options.mimeType = '';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data available event - send chunks in real-time
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send chunk to server immediately for streaming
          try {
            await sendAudioChunk(event.data, sessionIdRef.current, false);
          } catch (chunkError) {
            console.warn('Error sending audio chunk:', chunkError);
            // Continue recording even if chunk send fails
          }
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        await processRecording();
      };
      
      // Start recording with small timeslice for real-time streaming
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      console.log('Recording started with session:', sessionIdRef.current);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setIsRecording(false);
      
      // Re-enable click-through on error
      if (window.widgetAPI && window.widgetAPI.enableClickThrough) {
        window.widgetAPI.enableClickThrough();
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsDetectingVoice(false);
      setAudioLevel(0);
      
      // Stop audio analysis
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Re-enable click-through when recording stops
      if (window.widgetAPI && window.widgetAPI.enableClickThrough) {
        window.widgetAPI.enableClickThrough();
      }
      
      console.log('Recording stopped');
    }
  };

  const processRecording = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Send final chunk to trigger transcription
      if (sessionIdRef.current) {
        // Get the last chunk or create an empty one to signal end
        const finalChunk = audioChunksRef.current.length > 0 
          ? audioChunksRef.current[audioChunksRef.current.length - 1]
          : new Blob([], { type: 'audio/webm' });
        
        console.log('Sending final chunk for transcription, session:', sessionIdRef.current);
        
        // Send final chunk
        const result = await sendAudioChunk(finalChunk, sessionIdRef.current, true);
        
        if (result.status_code === 200 && result.content.success) {
          const transcription = result.content.transcription || '';
          console.log('[AirType Overlay] Transcription successful');
          console.log('[AirType Overlay] Transcribed text:', transcription);
          
          // If auto-paste is enabled, trigger paste event to main process
          if (autoPasteEnabled) {
            console.log('[AirType Overlay] Auto-paste is enabled, triggering paste event to main process...');
            console.log('[AirType Overlay] Text to paste:', transcription);
            
            if (window.widgetAPI && window.widgetAPI.pasteText) {
              console.log('[AirType Overlay] Calling widgetAPI.pasteText() to send IPC event to main process...');
              
              window.widgetAPI.pasteText(transcription)
                .then((result) => {
                  console.log('[AirType Overlay] ✓ Paste event completed successfully');
                  console.log('[AirType Overlay] Main process response:', result);
                  
                  if (result && result.success) {
                    console.log('[AirType Overlay] ✓ Text was pasted at cursor position');
                    // Show brief success feedback
                    setTranscribedText(''); // Clear text since we're not showing modal
                    setError(null);
                  } else {
                    console.warn('[AirType Overlay] Paste event returned but may have failed:', result);
                    setError(result?.error || 'Failed to paste text');
                    // Show text in case paste failed
                    setTranscribedText(transcription);
                  }
                })
                .catch(err => {
                  console.error('[AirType Overlay] ✗ Error triggering paste event to main process:', err);
                  console.error('[AirType Overlay] Error details:', err.message, err.stack);
                  setError('Failed to paste text: ' + (err.message || 'Unknown error'));
                  // Show text in case paste failed
                  setTranscribedText(transcription);
                });
            } else {
              console.error('[AirType Overlay] ✗ widgetAPI.pasteText is not available');
              console.error('[AirType Overlay] Available APIs:', Object.keys(window.widgetAPI || {}));
              // Fallback: show text if paste API not available
              setTranscribedText(transcription);
            }
          } else {
            console.log('[AirType Overlay] Auto-paste is disabled, showing text in modal');
            // Show text in modal
            setTranscribedText(transcription);
          }
        } else {
          throw new Error(result.content.error || 'Transcription failed');
        }
      } else {
        throw new Error('No active recording session');
      }
    } catch (err) {
      console.error('Error processing recording:', err);
      setError(err.message || 'Failed to transcribe audio');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
      sessionIdRef.current = null;
    }
  };

  const handleCopy = () => {
    if (transcribedText) {
      navigator.clipboard.writeText(transcribedText).then(() => {
        console.log('Text copied to clipboard');
        // Show brief feedback
        const originalText = transcribedText;
        setTranscribedText('Copied to clipboard!');
        setTimeout(() => {
          setTranscribedText(originalText);
        }, 1000);
      }).catch(err => {
        console.error('Failed to copy text:', err);
        setError('Failed to copy text');
      });
    }
  };

  const handleCloseText = () => {
    // Only close the text modal, not the entire widget
    setTranscribedText('');
    setError(null);
  };

  // Drag functionality
  const handleMouseDown = (e) => {
    // Only prevent dragging if clicking on buttons or links
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('[role="button"]')) {
      return;
    }
    
    // Allow dragging from anywhere on the widget (including the mic icon area)
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    e.preventDefault(); // Prevent text selection while dragging
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const widgetWidth = autoPasteEnabled ? 70 : 300;
    const widgetHeight = autoPasteEnabled ? 70 : (transcribedText && !autoPasteEnabled ? 200 : 120);
    
    const maxX = window.innerWidth - widgetWidth;
    const maxY = window.innerHeight - widgetHeight;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));
    
    setPosition({ x: clampedX, y: clampedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!isVisible) {
    return null;
  }

  return (
    <HoverComponent>
      <div
        ref={widgetRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: autoPasteEnabled ? '70px' : '300px',
          minHeight: autoPasteEnabled ? '70px' : (transcribedText && !autoPasteEnabled ? '200px' : '120px'),
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: autoPasteEnabled ? '50%' : '16px',
          border: `1px solid ${themeColors.borderColor}`,
          padding: autoPasteEnabled ? '0' : '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          pointerEvents: 'auto',
          transition: 'all 0.3s ease',
        }}
        onMouseDown={handleMouseDown}
      >
      {/* Close button - only show when text is displayed and auto-paste is disabled */}
      {transcribedText && !isProcessing && !autoPasteEnabled && (
        <button
          onClick={handleCloseText}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            color: themeColors.mutedText,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            lineHeight: '1',
            padding: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = themeColors.primaryText;
            e.currentTarget.style.backgroundColor = themeColors.hoverBackground;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = themeColors.mutedText;
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>
      )}

       {/* Drag indicator - small dots icon */}
       <div
         style={{
           position: 'absolute',
           bottom: '4px',
           left: '4px',
           width: '18px',
           height: '18px',
           borderRadius: '50%',
           backgroundColor: isDragging ? 'rgba(0, 122, 255, 0.3)' : 'rgba(128, 128, 128, 0.3)',
           border: `1px solid ${isDragging ? 'rgba(0, 122, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           zIndex: 1001,
           pointerEvents: 'none',
           opacity: isDragging ? 1 : 0.8,
           transition: 'all 0.2s ease',
           boxShadow: isDragging ? '0 2px 6px rgba(0, 122, 255, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.3)',
         }}
         title={isDragging ? "Dragging..." : "Drag to move"}
       >
         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <circle cx="5" cy="5" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
           <circle cx="12" cy="5" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
           <circle cx="19" cy="5" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
           <circle cx="5" cy="12" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
           <circle cx="12" cy="12" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
           <circle cx="19" cy="12" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
           <circle cx="5" cy="19" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
           <circle cx="12" cy="19" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
           <circle cx="19" cy="19" r="1.5" fill={isDragging ? themeColors.primaryBlue : themeColors.mutedText} />
         </svg>
       </div>

       {/* Status indicator badge - shows recording/processing/ready state */}
       {autoPasteEnabled && (
         <div
           style={{
             position: 'absolute',
             top: '-8px',
             right: '-8px',
             width: '20px',
             height: '20px',
             borderRadius: '50%',
             backgroundColor: isRecording 
               ? (isDetectingVoice ? themeColors.errorRed : themeColors.warningOrange)
               : isProcessing 
               ? themeColors.warningOrange 
               : themeColors.primaryBlue,
             border: `2px solid ${themeColors.primaryBackground}`,
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             zIndex: 1001,
             boxShadow: isRecording 
               ? `0 2px 8px ${isDetectingVoice ? themeColors.errorRed + '80' : themeColors.warningOrange + '80'}`
               : isProcessing
               ? `0 2px 8px ${themeColors.warningOrange + '80'}`
               : '0 2px 8px rgba(0, 122, 255, 0.4)',
             animation: isRecording ? 'pulse 1.5s infinite' : 'none',
             transition: 'all 0.3s ease',
           }}
           title={
             isRecording 
               ? (isDetectingVoice ? "Recording - Voice detected" : "Recording...")
               : isProcessing 
               ? "Processing transcription..."
               : "Ready to record"
           }
         >
           {isRecording ? (
             // Recording indicator - small circle
             <div
               style={{
                 width: '8px',
                 height: '8px',
                 borderRadius: '50%',
                 backgroundColor: themeColors.primaryText,
               }}
             />
           ) : isProcessing ? (
             // Processing indicator - spinner
             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <circle cx="12" cy="12" r="10" stroke={themeColors.primaryText} strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="15.708" opacity="0.3" />
               <circle cx="12" cy="12" r="10" stroke={themeColors.primaryText} strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="7.854" opacity="0.6">
                 <animateTransform
                   attributeName="transform"
                   type="rotate"
                   from="0 12 12"
                   to="360 12 12"
                   dur="1s"
                   repeatCount="indefinite"
                 />
               </circle>
             </svg>
           ) : (
             // Ready indicator - checkmark
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill={themeColors.primaryText} />
             </svg>
           )}
         </div>
       )}

      {/* Recording indicator / Mic button */}
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: isRecording 
            ? (isDetectingVoice ? themeColors.errorRed : themeColors.warningOrange)
            : isProcessing 
            ? themeColors.warningOrange 
            : themeColors.tertiaryBackground,
          border: `2px solid ${isRecording ? (isDetectingVoice ? themeColors.errorRed : themeColors.warningOrange) : themeColors.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: autoPasteEnabled ? '0' : '12px',
          transition: 'all 0.1s ease',
          animation: isRecording ? 'pulse 1.5s infinite' : 'none',
          transform: isRecording && isDetectingVoice ? `scale(${1 + audioLevel * 0.2})` : 'scale(1)',
          boxShadow: isRecording && isDetectingVoice 
            ? `0 0 ${20 + audioLevel * 30}px ${themeColors.errorRed}40`
            : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          @keyframes ripple {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0.8;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0;
            }
          }
          @keyframes pulseInner {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.6;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.3;
            }
          }
        `}</style>
        
        {/* Microphone Icon */}
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ zIndex: 2, position: 'relative', pointerEvents: 'none' }}
        >
          <path
            d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
            fill={themeColors.primaryText}
          />
          <path
            d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z"
            fill={themeColors.primaryText}
          />
          <path
            d="M11 22H13V19H11V22Z"
            fill={themeColors.primaryText}
          />
        </svg>
        
        {/* Visual disturbances inside circle when voice detected */}
        {isRecording && isDetectingVoice && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}>
            {/* Animated ripples */}
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${20 + audioLevel * 40 + i * 15}%`,
                  height: `${20 + audioLevel * 40 + i * 15}%`,
                  borderRadius: '50%',
                  border: `2px solid ${themeColors.errorRed}`,
                  opacity: 0.6 - (i * 0.2) - (audioLevel * 0.3),
                  animation: `ripple ${1.5 + i * 0.3}s infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
            {/* Inner pulse */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${30 + audioLevel * 30}%`,
                height: `${30 + audioLevel * 30}%`,
                borderRadius: '50%',
                backgroundColor: `${themeColors.errorRed}${Math.floor(audioLevel * 100).toString(16).padStart(2, '0')}`,
                animation: 'pulseInner 0.5s infinite',
              }}
            />
          </div>
        )}
      </div>

      {/* Status text - hide when auto-paste enabled */}
      {!autoPasteEnabled && (
        <div
          style={{
            color: isRecording && isDetectingVoice ? themeColors.errorRed : themeColors.mutedText,
            fontSize: '12px',
            marginBottom: '12px',
            textAlign: 'center',
            fontWeight: isRecording && isDetectingVoice ? '600' : '400',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        >
          {isRecording 
            ? (isDetectingVoice 
                ? `🎤 Listening... (Press ${shortcutKey} to stop)` 
                : `Recording... (Press ${shortcutKey} to stop)`)
            : isProcessing 
            ? 'Processing...' 
            : `Press ${shortcutKey} to record`}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            color: themeColors.errorRed,
            fontSize: '12px',
            marginBottom: '12px',
            textAlign: 'center',
            padding: '8px',
            backgroundColor: 'rgba(255, 59, 48, 0.1)',
            borderRadius: '8px',
            width: '100%',
            pointerEvents: 'auto',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        >
          {error}
        </div>
      )}

      {/* Transcribed text - only show when auto-paste is disabled */}
      {transcribedText && !isProcessing && !autoPasteEnabled && (
        <>
          <div
            style={{
              width: '100%',
              minHeight: '60px',
              maxHeight: '120px',
              overflowY: 'auto',
              backgroundColor: themeColors.surfaceBackground,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
              color: themeColors.primaryText,
              fontSize: '14px',
              lineHeight: '1.5',
              wordWrap: 'break-word',
              pointerEvents: 'auto',
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
          >
            {transcribedText}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: themeColors.primaryBlue,
              border: 'none',
              borderRadius: '6px',
              color: themeColors.primaryText,
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056CC';
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeColors.primaryBlue;
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Copy
          </button>
        </>
      )}
      </div>
    </HoverComponent>
  );
};

export default AirtypeOverlay;
