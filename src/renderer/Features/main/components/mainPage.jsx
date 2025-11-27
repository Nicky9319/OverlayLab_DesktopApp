import React, { useState, useEffect, useRef } from 'react';
import { UserButton, useAuth } from '@clerk/clerk-react';
import { clearToken, setCustomerId } from '../../../../utils/clerkTokenProvider';
import { authenticateCustomerId } from '../../../../services/authService';
import LeftNavBar from '../../left-navbar/left-nav-bar';
import Leads from '../../leads/leads';
import Buckets from '../../buckets/buckets';
import Taskbar from '../../taskbar/taskbar';
import UpdateNotification from '../../update/UpdateNotification';

const MainPage = () => {
    const [activeTab, setActiveTab] = useState('buckets');
    const { isSignedIn, isLoaded, getToken } = useAuth();
    const hasAuthenticatedBackend = useRef(false);
    const authenticationAttempts = useRef(0);
    const maxRetries = 5;

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
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

    const renderActiveComponent = () => {
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
                    <h1 className="page-title">Lead Flow</h1>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        marginLeft: 'auto'
                    }}>
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
                <div className="content-wrapper">
                    {renderActiveComponent()}
                </div>
            </div>
            <UpdateNotification />
        </div>
    );
};

export default MainPage;