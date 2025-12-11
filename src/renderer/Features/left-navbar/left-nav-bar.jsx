import React from 'react';

const LeftNavBar = ({ activeTab, onTabChange, viewMode, selectedTeamId }) => {
    // Base tabs
    const allTabs = [
        { id: 'buckets', label: 'Buckets', icon: '🗂️' },
        { id: 'leads', label: 'Leads', icon: '👥' },
        { id: 'metrics', label: 'Metrics', icon: '📊' },
        { id: 'team', label: 'Team', icon: '👥' }
    ];

    // Filter tabs based on view mode and team selection
    let tabs = [];
    if (viewMode === 'team' && selectedTeamId) {
        // In team mode with selected team: show all tabs including Team (but not metrics)
        tabs = allTabs.filter(tab => tab.id !== 'metrics');
    } else if (viewMode === 'team' && !selectedTeamId) {
        // In team mode but no team selected: show no tabs (team selection page)
        tabs = [];
    } else {
        // In customer mode: show buckets, leads, and metrics (not team)
        tabs = allTabs.filter(tab => tab.id !== 'team');
    }

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