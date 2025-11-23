import React, { useState } from 'react';

/**
 * Hamburger Menu Component
 * Slide-out menu for secondary navigation items
 */
const HamburgerMenu = ({ onNavigate, activeTab }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'entries', label: 'Entries', icon: '📋' },
    { id: 'profile', label: 'Profile', icon: '⚙️' }
  ];

  const handleMenuClick = (tabId) => {
    onNavigate(tabId);
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Hamburger Button */}
      <button 
        className="hamburger-button" 
        onClick={toggleMenu}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <div className="hamburger-icon">
          <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${isOpen ? 'open' : ''}`}></span>
        </div>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="menu-overlay" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Menu */}
      <nav className={`slide-menu ${isOpen ? 'slide-menu-open' : ''}`}>
        <div className="slide-menu-header">
          <h2 className="slide-menu-title">Menu</h2>
          <button 
            className="slide-menu-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <ul className="slide-menu-list">
          {menuItems.map(item => (
            <li key={item.id} className="slide-menu-item">
              <button
                className={`slide-menu-button ${activeTab === item.id ? 'slide-menu-button-active' : ''}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <span className="slide-menu-icon">{item.icon}</span>
                <span className="slide-menu-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="slide-menu-footer">
          <div className="slide-menu-version">Crick Time v1.0</div>
        </div>
      </nav>
    </>
  );
};

export default HamburgerMenu;
