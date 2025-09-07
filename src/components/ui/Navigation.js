import React from 'react';

/**
 * Bottom Navigation Component
 * Reference: www.context7.com for mobile navigation patterns
 */
const Navigation = ({ tabs, activeTab, onTabChange }) => {
  return (
    <nav className="nav-bar">
      <div className="nav-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-tab ${
              activeTab === tab.id ? 'nav-tab-active' : ''
            }`}
            aria-label={tab.label}
          >
            <div className="nav-tab-content">
              <span className="nav-tab-icon">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
