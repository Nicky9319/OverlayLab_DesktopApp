import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import Taskbar from '../taskbar/taskbar';
import overlayLabIcon from '../../assets/icon.png';
import leadflowLogo from '../../assets/leadflow_logo.png';

const Dashboard = () => {
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState('leadflow'); // 'leadflow' or 'settings'
    const [isRecorded, setIsRecorded] = useState(false);
    const [originalIsRecorded, setOriginalIsRecorded] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Load settings on component mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                if (window.electronAPI && window.electronAPI.getOverlayRecordable) {
                    const value = await window.electronAPI.getOverlayRecordable();
                    setIsRecorded(value);
                    setOriginalIsRecorded(value);
                }
            } catch (error) {
                console.error('Failed to load overlay recordable setting:', error);
            }
        };
        loadSettings();
    }, []);

    // Check for unsaved changes
    useEffect(() => {
        setHasUnsavedChanges(isRecorded !== originalIsRecorded);
    }, [isRecorded, originalIsRecorded]);

    const handleLeadflowClick = () => {
        navigate('/leadflow');
    };

    const handleSettingsClick = () => {
        setCurrentView('settings');
    };

    const handleLeadflowViewClick = () => {
        setCurrentView('leadflow');
    };

    const handleToggleChange = (e) => {
        setIsRecorded(e.target.checked);
    };

    const handleSave = async () => {
        try {
            if (window.electronAPI && window.electronAPI.setOverlayRecordable) {
                await window.electronAPI.setOverlayRecordable(isRecorded);
                setOriginalIsRecorded(isRecorded);
                setHasUnsavedChanges(false);
            }
        } catch (error) {
            console.error('Failed to save overlay recordable setting:', error);
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
                alignItems: 'center', // center children (including the inner div) in this whole right side div
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

                <div style={{
                    backgroundColor: '#1C1C1E',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px'
                }}>
                    <p style={{
                        fontSize: '14px',
                        color: '#8E8E93',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                        Changes will take effect after restarting the application.
                    </p>
                </div>

                {hasUnsavedChanges && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: 'auto',
                        paddingTop: '24px'
                    }}>
                        <button
                            onClick={handleSave}
                            style={{
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
                            Save Changes
                        </button>
                    </div>
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
                </div>

                {/* Right Content Area */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    backgroundColor: '#000000'
                }}>
                    {currentView === 'leadflow' ? renderLeadflowView() : renderSettingsView()}
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
        </div>
    );
};

export default Dashboard;
