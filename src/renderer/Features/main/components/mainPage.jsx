import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserButton, useAuth } from '@clerk/clerk-react';
import { useSelector, useDispatch } from 'react-redux';
import { clearToken, setCustomerId } from '../../../../utils/clerkTokenProvider';
import { authenticateCustomerId } from '../../../../services/authService';
import { fetchAllTeams } from '../../../../store/thunks/teamsThunks';
import { setSelectedTeamId } from '../../../../store/slices/teamsSlice';
import LeftNavBar from '../../left-navbar/left-nav-bar';
import Leads from '../../leads/leads';
import Buckets from '../../buckets/buckets';
import Taskbar from '../../taskbar/taskbar';
import PersonalTeamToggle from '../../common/components/PersonalTeamToggle';
import TeamSelection from '../../teams/components/TeamSelection';

const MainPage = () => {
    const [activeTab, setActiveTab] = useState('buckets');
    const { isSignedIn, isLoaded, getToken } = useAuth();
    const hasAuthenticatedBackend = useRef(false);
    const authenticationAttempts = useRef(0);
    const maxRetries = 5;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { viewMode, selectedTeamId, teams } = useSelector((state) => state.teams);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
    };

    const handleBackToDashboard = () => {
        navigate('/');
    };

    const handleBackToTeamSelection = () => {
        dispatch(setSelectedTeamId(null));
    };

    // Expose clearToken globally for UserButton callback
    useEffect(() => {
        window.clearToken = clearToken;
        return () => {
            delete window.clearToken;
        };
    }, []);

    // Authenticate with backend when user is signed in
    useEffect(() => {
        // Only run if Clerk is loaded, user is signed in, and we haven't authenticated yet
        if (!isLoaded || !isSignedIn || hasAuthenticatedBackend.current) {
            return;
        }

        // Prevent too many retry attempts
        if (authenticationAttempts.current >= maxRetries) {
            console.warn('MainPage: Max authentication retry attempts reached');
            return;
        }

        const authenticateWithBackend = async () => {
            try {
                authenticationAttempts.current += 1;
                console.log(`MainPage: Starting backend authentication (attempt ${authenticationAttempts.current})...`);
                
                // Get Clerk token directly from useAuth hook
                if (!getToken) {
                    console.warn('MainPage: getToken function not available yet, will retry...');
                    // Retry after a short delay
                    setTimeout(() => {
                        if (!hasAuthenticatedBackend.current && authenticationAttempts.current < maxRetries) {
                            authenticateWithBackend();
                        }
                    }, 1000);
                    return;
                }

                const token = await getToken();
                
                if (!token) {
                    console.warn('MainPage: No Clerk token available for backend authentication, will retry...');
                    // Retry after a short delay
                    setTimeout(() => {
                        if (!hasAuthenticatedBackend.current && authenticationAttempts.current < maxRetries) {
                            authenticateWithBackend();
                        }
                    }, 1000);
                    return;
                }

                console.log('MainPage: Calling backend authenticate_customer_id endpoint...');
                
                // Call backend authentication endpoint
                const response = await authenticateCustomerId(token);
                
                if (response && response.authenticated) {
                    console.log('MainPage: Backend authentication successful', {
                        customerId: response.customerId,
                        message: response.message
                    });
                    // Store customerId for use in API calls
                    if (response.customerId) {
                        setCustomerId(response.customerId);
                        console.log('MainPage: CustomerId stored:', response.customerId);
                    }
                    hasAuthenticatedBackend.current = true;
                } else {
                    console.error('MainPage: Backend authentication failed - user not authenticated', response);
                }
            } catch (error) {
                // Don't block UI if backend auth fails - log error but continue
                console.error('MainPage: Backend authentication error:', error);
                
                // Retry on certain errors (network issues, service unavailable)
                if (error.message && (
                    error.message.includes('unavailable') || 
                    error.message.includes('network') ||
                    error.message.includes('fetch')
                )) {
                    console.log('MainPage: Retrying backend authentication due to network/service error...');
                    setTimeout(() => {
                        if (!hasAuthenticatedBackend.current && authenticationAttempts.current < maxRetries) {
                            authenticateWithBackend();
                        }
                    }, 2000);
                }
                // User can still use the app, but some features might not work
            }
        };

        // Small delay to ensure everything is initialized
        const timeoutId = setTimeout(() => {
            authenticateWithBackend();
        }, 500);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [isLoaded, isSignedIn, getToken]);

    // Fetch teams when switching to team mode
    useEffect(() => {
        if (viewMode === 'team') {
            dispatch(fetchAllTeams());
        }
    }, [dispatch, viewMode]);

    const renderActiveComponent = () => {
        // Show team selection page if in team mode and no team is selected
        if (viewMode === 'team' && !selectedTeamId) {
            return <TeamSelection />;
        }

        // Otherwise show normal content (buckets/leads)
        switch (activeTab) {
            case 'leads':
                return <Leads />;
            case 'buckets':
            default:
                return <Buckets />;
        }
    };

    return (
        <div className="main-container">
            <Taskbar />
            <LeftNavBar activeTab={activeTab} onTabChange={handleTabChange} />
            <div className="content-area">
                <header className="page-header">
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <button
                            onClick={handleBackToDashboard}
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: '500',
                                backgroundColor: '#1C1C1E',
                                color: '#FFFFFF',
                                border: '1px solid #2D2D2F',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s, border-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#2D2D2F';
                                e.target.style.borderColor = '#007AFF';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#1C1C1E';
                                e.target.style.borderColor = '#2D2D2F';
                            }}
                        >
                            <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                            >
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Back to Dashboard
                        </button>
                        <h1 className="page-title">Lead Flow</h1>
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '12px',
                        marginLeft: 'auto'
                    }}>
                        <PersonalTeamToggle />
                        <UserButton 
                            appearance={{
                                elements: {
                                    avatarBox: {
                                        width: '32px',
                                        height: '32px'
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
                                        display: 'none' // Hide footer if not needed
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
                </header>
                
                {/* Team Navigation Bar - shown only when team is selected */}
                {viewMode === 'team' && selectedTeamId && (
                    <div style={{
                        padding: '16px 24px',
                        backgroundColor: '#000000',
                        borderBottom: '1px solid #1C1C1E',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <button
                            onClick={handleBackToTeamSelection}
                            style={{
                                padding: '8px 12px',
                                fontSize: '14px',
                                fontWeight: '500',
                                backgroundColor: '#1C1C1E',
                                color: '#FFFFFF',
                                border: '1px solid #2D2D2F',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s, border-color 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#2D2D2F';
                                e.target.style.borderColor = '#007AFF';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#1C1C1E';
                                e.target.style.borderColor = '#2D2D2F';
                            }}
                            title="Back to Teams"
                        >
                            <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2"
                            >
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: '400',
                            color: '#8E8E93',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span>Team:</span>
                            <span style={{ color: '#FFFFFF', fontWeight: '500' }}>
                                {teams.find(t => (t.teamId || t.id) === selectedTeamId)?.teamName || 'Team'}
                            </span>
                        </div>
                    </div>
                )}
                
                <div className="content-wrapper">
                    {renderActiveComponent()}
                </div>
            </div>
        </div>
    );
};

export default MainPage;