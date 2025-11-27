import React, { useState, useEffect } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { clearToken } from '../../../../utils/clerkTokenProvider';
import LeftNavBar from '../../left-navbar/left-nav-bar';
import Leads from '../../leads/leads';
import Buckets from '../../buckets/buckets';
import Taskbar from '../../taskbar/taskbar';
import UpdateNotification from '../../update/UpdateNotification';

const MainPage = () => {
    const [activeTab, setActiveTab] = useState('buckets');

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