import React from 'react';

const LeftNavBar = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'buckets', label: 'Buckets', icon: '🗂️' },
        { id: 'leads', label: 'Leads', icon: '👥' }
    ];

    return (
        <div className="left-nav-container">
            <div className="nav-tabs">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <span className="tab-icon">{tab.icon}</span>
                        <span className="tab-label">{tab.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LeftNavBar;