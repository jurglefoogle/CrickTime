import React, { useState } from 'react';
import './App.css';

// Tab Components
import HomeTab from './components/tabs/HomeTab';
import TimerTab from './components/tabs/TimerTab';
import ScheduleTab from './components/tabs/ScheduleTab';
import ClientsTab from './components/tabs/ClientsTab';
import EntriesTab from './components/tabs/EntriesTab';
import InvoiceTab from './components/tabs/InvoiceTab';
import JobsTab from './components/tabs/JobsTab';
import MileageTab from './components/tabs/MileageTab';
import ProfileTab from './components/tabs/ProfileTab';

// UI Components
import Navigation from './components/ui/Navigation';
import HamburgerMenu from './components/ui/HamburgerMenu';

// Hooks
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  // Active tab state
  const [activeTab, setActiveTab] = useState('home');
  
  // Main application data state
  const [appData, setAppData] = useLocalStorage('mechanicHoursData', {
    schemaVersion: 5,
    clients: [],
    entries: [],
    scheduledJobs: [],
    jobs: [],
    invoices: [],
    charges: [],
    mileageTrips: [],
    settings: {},
    active: null
  });

  // One-time legacy cleanup for any persisted 'tasks' key
  if (appData.tasks) {
    const { tasks, ...rest } = appData;
    // Write back sanitized data once
    // eslint-disable-next-line no-console
    console.info('Sanitizing legacy tasks key from persisted data');
    setAppData(rest);
  }

  // Ephemeral invoice context (not persisted inside appData)
  const [invoiceContext, setInvoiceContext] = useState(null); // { jobId?: string }

  // Legacy migration removed: new installations start with explicit jobs model only.

  // Update app data function
  const updateAppData = (newData) => {
    setAppData(prevData => ({ ...prevData, ...newData }));
  };

  // Navigation tabs configuration
  // Icon assets (fallback to emoji if image not found by build tooling)
  const homeIcon = process.env.PUBLIC_URL + '/icons/Home.PNG';
  const timerIcon = process.env.PUBLIC_URL + '/icons/TimeTracking.PNG';
  const invoiceIcon = process.env.PUBLIC_URL + '/icons/Invoice.PNG';
  const jobsIcon = process.env.PUBLIC_URL + '/icons/TimeTracking.PNG';
  const mileageIcon = process.env.PUBLIC_URL + '/icons/TimeTracking.PNG'; // reusing until dedicated icon

  // Bottom navigation tabs (main features)
  const tabs = [
    { id: 'home', label: 'Home', img: homeIcon, icon: '🏠' },
    { id: 'timer', label: 'Timer', img: timerIcon, icon: '⏱️' },
    { id: 'jobs', label: 'Jobs', img: jobsIcon, icon: '🧰' },
    { id: 'mileage', label: 'Mileage', img: mileageIcon, icon: '🚗' },
    { id: 'invoice', label: 'Invoice', img: invoiceIcon, icon: '📄' }
  ];

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <HamburgerMenu onNavigate={setActiveTab} activeTab={activeTab} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
          <img 
            src={process.env.PUBLIC_URL + '/icons/CrickTimeLogo.png'} 
            alt="Crick Time Logo" 
            style={{ height: '40px', width: '40px', objectFit: 'contain' }}
          />
          <h1 className="header-title">Crick Time</h1>
        </div>
        <div style={{ width: '48px' }}></div> {/* Spacer for centering */}
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
            onNavigate={setActiveTab}
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
        {activeTab === 'jobs' && (
          <JobsTab
            appData={appData}
            updateAppData={updateAppData}
            onNavigate={setActiveTab}
            onInvoiceJob={(jobId) => { setInvoiceContext({ jobId }); setActiveTab('invoice'); }}
          />
        )}
        {activeTab === 'mileage' && (
          <MileageTab 
            appData={appData} 
            updateAppData={updateAppData} 
          />
        )}
        {activeTab === 'invoice' && (
          <InvoiceTab 
            appData={appData} 
            updateAppData={updateAppData}
            invoiceContext={invoiceContext}
            clearInvoiceContext={() => setInvoiceContext(null)}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab 
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
