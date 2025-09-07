import React, { useState } from 'react';
import './App.css';

// Tab Components
import HomeTab from './components/tabs/HomeTab';
import TimerTab from './components/tabs/TimerTab';
import ScheduleTab from './components/tabs/ScheduleTab';
import ClientsTab from './components/tabs/ClientsTab';
import EntriesTab from './components/tabs/EntriesTab';
import InvoiceTab from './components/tabs/InvoiceTab';

// UI Components
import Navigation from './components/ui/Navigation';

// Hooks
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  // Active tab state
  const [activeTab, setActiveTab] = useState('home');
  
  // Main application data state
  const [appData, setAppData] = useLocalStorage('mechanicHoursData', {
    clients: [],
    tasks: [],
    entries: [],
    scheduledJobs: [],
    active: null
  });

  // Update app data function
  const updateAppData = (newData) => {
    setAppData(prevData => ({ ...prevData, ...newData }));
  };

  // Navigation tabs configuration
  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'timer', label: 'Timer', icon: '⏱️' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'clients', label: 'Clients', icon: '👥' },
    { id: 'entries', label: 'Entries', icon: '📋' },
    { id: 'invoice', label: 'Invoice', icon: '📄' }
  ];

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="header-title">Mechanic Hours</h1>
        <p className="header-subtitle">Time Tracking & Invoicing</p>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'home' && (
          <HomeTab 
            appData={appData} 
            updateAppData={updateAppData}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'timer' && (
          <TimerTab 
            appData={appData} 
            updateAppData={updateAppData} 
          />
        )}
        {activeTab === 'schedule' && (
          <ScheduleTab 
            appData={appData} 
            updateAppData={updateAppData} 
          />
        )}
        {activeTab === 'clients' && (
          <ClientsTab 
            appData={appData} 
            updateAppData={updateAppData} 
          />
        )}
        {activeTab === 'entries' && (
          <EntriesTab 
            appData={appData} 
            updateAppData={updateAppData} 
          />
        )}
        {activeTab === 'invoice' && (
          <InvoiceTab 
            appData={appData} 
            updateAppData={updateAppData} 
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navigation 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

export default App;
