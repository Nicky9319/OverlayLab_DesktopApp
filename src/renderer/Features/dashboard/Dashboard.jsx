import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import Taskbar from '../taskbar/taskbar';
import overlayLabIcon from '../../assets/icon.png';
import leadflowLogo from '../../assets/leadflow_logo.png';
import airtypeLogo from '../../assets/airtype_logo.png';
import clipvaultLogo from '../../assets/clipvault_logo.png';

const Dashboard = () => {
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState('leadflow'); // 'leadflow', 'airtype', 'clipvault', or 'settings'
    const [isRecorded, setIsRecorded] = useState(false);
    const [originalIsRecorded, setOriginalIsRecorded] = useState(false);
    const [airtypeAutoPaste, setAirtypeAutoPaste] = useState(false);
    const [originalAirtypeAutoPaste, setOriginalAirtypeAutoPaste] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [comingSoonFeature, setComingSoonFeature] = useState(null); // 'airtype' or 'clipvault'

    // Load settings on component mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                if (window.electronAPI && window.electronAPI.getOverlayRecordable) {
                    const value = await window.electronAPI.getOverlayRecordable();
                    setIsRecorded(value);
                    setOriginalIsRecorded(value);
                }
                if (window.electronAPI && window.electronAPI.getAirtypeAutoPaste) {
                    const value = await window.electronAPI.getAirtypeAutoPaste();
                    setAirtypeAutoPaste(value);
                    setOriginalAirtypeAutoPaste(value);
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };
        loadSettings();
    }, []);

    // Check for unsaved changes
    useEffect(() => {
        setHasUnsavedChanges(
            isRecorded !== originalIsRecorded || 
            airtypeAutoPaste !== originalAirtypeAutoPaste
        );
    }, [isRecorded, originalIsRecorded, airtypeAutoPaste, originalAirtypeAutoPaste]);

    const handleLeadflowClick = () => {
        navigate('/leadflow');
    };

    const handleSettingsClick = () => {
        setCurrentView('settings');
    };

    const handleLeadflowViewClick = () => {
        setCurrentView('leadflow');
    };

    const handleAirtypeViewClick = () => {
        setCurrentView('airtype');
    };

    const handleAirtypeClick = () => {
        setComingSoonFeature('airtype');
        setShowComingSoon(true);
    };

    const handleClipVaultViewClick = () => {
        setCurrentView('clipvault');
    };

    const handleClipVaultClick = () => {
        setComingSoonFeature('clipvault');
        setShowComingSoon(true);
    };

    const handleCloseComingSoon = () => {
        setShowComingSoon(false);
        setComingSoonFeature(null);
    };

    const handleToggleChange = (e) => {
        setIsRecorded(e.target.checked);
    };

    const handleAirtypeAutoPasteToggle = (e) => {
        setAirtypeAutoPaste(e.target.checked);
    };

    const handleSave = async () => {
        try {
            if (window.electronAPI && window.electronAPI.setOverlayRecordable) {
                await window.electronAPI.setOverlayRecordable(isRecorded);
                setOriginalIsRecorded(isRecorded);
            }
            if (window.electronAPI && window.electronAPI.setAirtypeAutoPaste) {
                await window.electronAPI.setAirtypeAutoPaste(airtypeAutoPaste);
                setOriginalAirtypeAutoPaste(airtypeAutoPaste);
            }
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    };

    const handleSaveAndRestart = async () => {
        try {
            if (window.electronAPI && window.electronAPI.setOverlayRecordable) {
                await window.electronAPI.setOverlayRecordable(isRecorded);
                setOriginalIsRecorded(isRecorded);
            }
            if (window.electronAPI && window.electronAPI.setAirtypeAutoPaste) {
                await window.electronAPI.setAirtypeAutoPaste(airtypeAutoPaste);
                setOriginalAirtypeAutoPaste(airtypeAutoPaste);
            }
            setHasUnsavedChanges(false);
            
            // Restart the app
            if (window.electronAPI.restartApp) {
                await window.electronAPI.restartApp();
            }
        } catch (error) {
            console.error('Failed to save and restart:', error);
        }
    };

    const renderLeadflowView = () => {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                height: '100%',
                gap: '24px',
                width: '100%'
            }}>
                <div style={{
                    maxWidth: '600px',
                    width: '100%',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <img 
                        src={leadflowLogo} 
                        alt="Leadflow Logo" 
                        style={{
                            maxWidth: '300px',
                            width: '100%',
                            height: 'auto',
                            marginBottom: '32px',
                            objectFit: 'contain',
                            display: 'block',
                            marginLeft: 'auto',
                            marginRight: 'auto'
                        }}
                    />
                    <p style={{
                        fontSize: '16px',
                        color: '#8E8E93',
                        lineHeight: '1.6',
                        marginBottom: '32px'
                    }}>
                        Leadflow is your comprehensive lead management system. Organize your leads into buckets, 
                        track their progress, and manage your sales pipeline efficiently. Access your dashboard 
                        to view and manage all your leads in one place.
                    </p>
                    <button
                        onClick={handleLeadflowClick}
                        style={{
                            padding: '16px 32px',
                            fontSize: '18px',
                            fontWeight: '600',
                            backgroundColor: '#007AFF',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#0056CC';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#007AFF';
                        }}
                    >
                        Open Leadflow Dashboard
                    </button>
                </div>
            </div>
        );
    };

    const renderAirtypeView = () => {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                height: '100%',
                gap: '24px',
                width: '100%'
            }}>
                <div style={{
                    maxWidth: '600px',
                    width: '100%',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <img 
                        src={airtypeLogo} 
                        alt="AirType Logo" 
                        style={{
                            maxWidth: '300px',
                            width: '100%',
                            height: 'auto',
                            marginBottom: '32px',
                            objectFit: 'contain',
                            display: 'block',
                            marginLeft: 'auto',
                            marginRight: 'auto'
                        }}
                    />
                    <p style={{
                        fontSize: '16px',
                        color: '#8E8E93',
                        lineHeight: '1.6',
                        marginBottom: '32px'
                    }}>
                        AirType listens to your voice, converts it to text, and types it wherever your cursor is positioned. 
                        Perfect for hands-free typing across any application.
                    </p>
                    <button
                        onClick={handleAirtypeClick}
                        style={{
                            padding: '16px 32px',
                            fontSize: '18px',
                            fontWeight: '600',
                            backgroundColor: '#007AFF',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#0056CC';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#007AFF';
                        }}
                    >
                        Start AirType
                    </button>
                </div>
            </div>
        );
    };

    const renderClipVaultView = () => {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                height: '100%',
                gap: '24px',
                width: '100%'
            }}>
                <div style={{
                    maxWidth: '600px',
                    width: '100%',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <img 
                        src={clipvaultLogo} 
                        alt="Clip Vault Logo" 
                        style={{
                            maxWidth: '300px',
                            width: '100%',
                            height: 'auto',
                            marginBottom: '32px',
                            objectFit: 'contain',
                            display: 'block',
                            marginLeft: 'auto',
                            marginRight: 'auto'
                        }}
                    />
                    <p style={{
                        fontSize: '16px',
                        color: '#8E8E93',
                        lineHeight: '1.6',
                        marginBottom: '32px'
                    }}>
                        Clip Vault helps you organize and store information by creating classes or buckets. Paste text or images and classify them into categories for easy retrieval, review, and relationship tracking.
                    </p>
                    <button
                        onClick={handleClipVaultClick}
                        style={{
                            padding: '16px 32px',
                            fontSize: '18px',
                            fontWeight: '600',
                            backgroundColor: '#007AFF',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#0056CC';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#007AFF';
                        }}
                    >
                        Open Clip Vault
                    </button>
                </div>
            </div>
        );
    };

    const renderSettingsView = () => {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '40px',
                height: '100%',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <h2 style={{
                    fontSize: '28px',
                    fontWeight: '600',
                    color: '#FFFFFF',
                    marginBottom: '32px'
                }}>
                    Settings
                </h2>

                <div style={{
                    backgroundColor: '#1C1C1E',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                        <div>
                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#FFFFFF',
                                marginBottom: '4px'
                            }}>
                                Allow Overlay to be Recorded
                            </h3>
                            <p style={{
                                fontSize: '14px',
                                color: '#8E8E93',
                                margin: 0
                            }}>
                                When enabled, the overlay window can be captured by screen recording software.
                            </p>
                        </div>
                        <label style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '52px',
                            height: '32px'
                        }}>
                            <input
                                type="checkbox"
                                checked={isRecorded}
                                onChange={handleToggleChange}
                                style={{
                                    opacity: 0,
                                    width: 0,
                                    height: 0
                                }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: isRecorded ? '#007AFF' : '#2D2D2F',
                                transition: '0.3s',
                                borderRadius: '16px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '""',
                                    height: '24px',
                                    width: '24px',
                                    left: '4px',
                                    bottom: '4px',
                                    backgroundColor: '#FFFFFF',
                                    transition: '0.3s',
                                    borderRadius: '50%',
                                    transform: isRecorded ? 'translateX(20px)' : 'translateX(0)'
                                }} />
                            </span>
                        </label>
                    </div>
                </div>

                {/* AirType Auto-Paste Setting */}
                <div style={{
                    backgroundColor: '#1C1C1E',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                        <div>
                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#FFFFFF',
                                marginBottom: '4px'
                            }}>
                                AirType Auto-Paste
                            </h3>
                            <p style={{
                                fontSize: '14px',
                                color: '#8E8E93',
                                margin: 0
                            }}>
                                When enabled, transcribed text will automatically paste at cursor position. The text modal and copy button will be hidden.
                            </p>
                        </div>
                        <label style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '52px',
                            height: '32px'
                        }}>
                            <input
                                type="checkbox"
                                checked={airtypeAutoPaste}
                                onChange={handleAirtypeAutoPasteToggle}
                                style={{
                                    opacity: 0,
                                    width: 0,
                                    height: 0
                                }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: airtypeAutoPaste ? '#007AFF' : '#2D2D2F',
                                transition: '0.3s',
                                borderRadius: '16px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '""',
                                    height: '24px',
                                    width: '24px',
                                    left: '4px',
                                    bottom: '4px',
                                    backgroundColor: '#FFFFFF',
                                    transition: '0.3s',
                                    borderRadius: '50%',
                                    transform: airtypeAutoPaste ? 'translateX(20px)' : 'translateX(0)'
                                }} />
                            </span>
                        </label>
                    </div>
                </div>

                {hasUnsavedChanges && (
                    <>
                        <div style={{
                            backgroundColor: '#1C1C1E',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            marginBottom: '20px'
                        }}>
                            <p style={{
                                fontSize: '13px',
                                color: '#8E8E93',
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4M12 8h.01" />
                                </svg>
                                Changes will take effect after restarting the application.
                            </p>
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px',
                            marginTop: 'auto',
                            paddingTop: '20px'
                        }}>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    backgroundColor: 'transparent',
                                    color: '#8E8E93',
                                    border: '1px solid #1C1C1E',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#1C1C1E';
                                    e.target.style.borderColor = '#2D2D2F';
                                    e.target.style.color = '#FFFFFF';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.borderColor = '#1C1C1E';
                                    e.target.style.color = '#8E8E93';
                                }}
                            >
                                Save
                            </button>
                            <button
                                onClick={handleSaveAndRestart}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    backgroundColor: '#007AFF',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#0056CC';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = '#007AFF';
                                }}
                            >
                                Save & Restart
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="main-container" style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column'
        }}>
            <Taskbar />
            <div style={{
                flex: 1,
                display: 'flex',
                marginTop: '40px' // Account for taskbar
            }}>
                {/* Left Sidebar */}
                <div style={{
                    width: '200px',
                    backgroundColor: '#000000',
                    borderRight: '1px solid #1C1C1E',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px 0'
                }}>
                    <div
                        onClick={handleLeadflowViewClick}
                        style={{
                            padding: '16px 20px',
                            cursor: 'pointer',
                            backgroundColor: currentView === 'leadflow' ? '#1C1C1E' : 'transparent',
                            borderLeft: currentView === 'leadflow' ? '3px solid #007AFF' : '3px solid transparent',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            if (currentView !== 'leadflow') {
                                e.currentTarget.style.backgroundColor = '#0A0A0A';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentView !== 'leadflow') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        {/* Background logo */}
                        
                        {/* Small icon before text */}
                        <img 
                            src={leadflowLogo} 
                            alt="Leadflow" 
                            style={{
                                width: '36px',
                                height: '36px',
                                objectFit: 'contain',
                                zIndex: 1,
                                flexShrink: 0
                            }}
                        />
                        <span style={{
                            fontSize: '16px',
                            fontWeight: currentView === 'leadflow' ? '600' : '400',
                            color: '#FFFFFF',
                            zIndex: 1,
                            position: 'relative'
                        }}>
                            Leadflow
                        </span>
                    </div>
                    <div
                        onClick={handleAirtypeViewClick}
                        style={{
                            padding: '16px 20px',
                            cursor: 'pointer',
                            backgroundColor: currentView === 'airtype' ? '#1C1C1E' : 'transparent',
                            borderLeft: currentView === 'airtype' ? '3px solid #007AFF' : '3px solid transparent',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            if (currentView !== 'airtype') {
                                e.currentTarget.style.backgroundColor = '#0A0A0A';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentView !== 'airtype') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        {/* Small icon before text */}
                        <img 
                            src={airtypeLogo} 
                            alt="AirType" 
                            style={{
                                width: '36px',
                                height: '36px',
                                objectFit: 'contain',
                                zIndex: 1,
                                flexShrink: 0
                            }}
                        />
                        <span style={{
                            fontSize: '16px',
                            fontWeight: currentView === 'airtype' ? '600' : '400',
                            color: '#FFFFFF',
                            zIndex: 1,
                            position: 'relative'
                        }}>
                            AirType
                        </span>
                    </div>
                    <div
                        onClick={handleClipVaultViewClick}
                        style={{
                            padding: '16px 20px',
                            cursor: 'pointer',
                            backgroundColor: currentView === 'clipvault' ? '#1C1C1E' : 'transparent',
                            borderLeft: currentView === 'clipvault' ? '3px solid #007AFF' : '3px solid transparent',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            if (currentView !== 'clipvault') {
                                e.currentTarget.style.backgroundColor = '#0A0A0A';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentView !== 'clipvault') {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        {/* Small icon before text */}
                        <img 
                            src={clipvaultLogo} 
                            alt="Clip Vault" 
                            style={{
                                width: '36px',
                                height: '36px',
                                objectFit: 'contain',
                                zIndex: 1,
                                flexShrink: 0
                            }}
                        />
                        <span style={{
                            fontSize: '16px',
                            fontWeight: currentView === 'clipvault' ? '600' : '400',
                            color: '#FFFFFF',
                            zIndex: 1,
                            position: 'relative'
                        }}>
                            Clip Vault
                        </span>
                    </div>
                </div>

                {/* Right Content Area */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    backgroundColor: '#000000'
                }}>
                    {currentView === 'leadflow' && renderLeadflowView()}
                    {currentView === 'airtype' && renderAirtypeView()}
                    {currentView === 'clipvault' && renderClipVaultView()}
                    {currentView === 'settings' && renderSettingsView()}
                </div>
            </div>
            
            {/* Bottom left - Logo and User buttons */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 10
            }}>
                <button
                    onClick={handleSettingsClick}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: currentView === 'settings' ? '#007AFF' : 'transparent',
                        border: currentView === 'settings' ? 'none' : '1px solid #1C1C1E',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        padding: '4px',
                        overflow: 'hidden',
                        transform: 'scale(1)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.2)';
                        e.currentTarget.style.backgroundColor = currentView === 'settings' ? '#0056CC' : '#1C1C1E';
                        e.currentTarget.style.borderColor = currentView === 'settings' ? '#0056CC' : '#007AFF';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = currentView === 'settings' ? '#007AFF' : 'transparent';
                        e.currentTarget.style.borderColor = currentView === 'settings' ? '#007AFF' : '#1C1C1E';
                    }}
                    title="Settings"
                >
                    <img 
                        src={overlayLabIcon} 
                        alt="OverlayLab Logo" 
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            borderRadius: '4px'
                        }}
                    />
                </button>
                <UserButton 
                    appearance={{
                        elements: {
                            avatarBox: {
                                width: '40px',
                                height: '40px'
                            },
                            userButtonPopoverCard: {
                                backgroundColor: '#000000',
                                borderColor: '#1C1C1E',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                            },
                            userButtonPopoverActionButton: {
                                color: '#FFFFFF',
                                '&:hover': {
                                    backgroundColor: '#1C1C1E'
                                }
                            },
                            userButtonPopoverActionButtonText: {
                                color: '#FFFFFF'
                            },
                            userButtonPopoverActionButtonIcon: {
                                color: '#007AFF'
                            },
                            userButtonPopoverFooter: {
                                display: 'none'
                            }
                        },
                        variables: {
                            colorBackground: '#000000',
                            colorText: '#FFFFFF',
                            colorPrimary: '#007AFF',
                            colorDanger: '#FF3B30'
                        }
                    }}
                />
            </div>

            {/* Coming Soon Modal */}
            {showComingSoon && (
                <div
                    onClick={handleCloseComingSoon}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#1C1C1E',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                            border: '1px solid #2D2D2F'
                        }}
                    >
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: '600',
                            color: '#FFFFFF',
                            marginBottom: '16px',
                            textAlign: 'center'
                        }}>
                            Coming Soon
                        </h2>
                        <p style={{
                            fontSize: '16px',
                            color: '#8E8E93',
                            lineHeight: '1.6',
                            marginBottom: '24px',
                            textAlign: 'center'
                        }}>
                            {comingSoonFeature === 'airtype' 
                                ? 'AirType is currently under development. This feature will allow you to convert your voice to text and type it wherever your cursor is positioned.'
                                : 'Clip Vault is currently under development. This feature will help you organize and store information by creating classes or buckets. Paste text or images and classify them into categories for easy retrieval, review, and relationship tracking.'
                            }
                        </p>
                        <button
                            onClick={handleCloseComingSoon}
                            style={{
                                width: '100%',
                                padding: '12px 24px',
                                fontSize: '16px',
                                fontWeight: '600',
                                backgroundColor: '#007AFF',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#0056CC';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#007AFF';
                            }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
