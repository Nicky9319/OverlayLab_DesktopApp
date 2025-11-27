import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import Taskbar from '../taskbar/taskbar';

const Dashboard = () => {
    const navigate = useNavigate();

    const handleLeadflowClick = () => {
        navigate('/leadflow');
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px'
            }}>
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
                    Leadflow
                </button>
            </div>
            
            {/* Bottom left - User symbol */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 10
            }}>
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

