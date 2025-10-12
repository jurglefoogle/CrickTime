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

// UI Components
import Navigation from './components/ui/Navigation';

// Hooks
import { useLocalStorage } from './hooks/useLocalStorage';

function App() {
  // Active tab state
  const [activeTab, setActiveTab] = useState('home');
  
  // Main application data state
  const [appData, setAppData] = useLocalStorage('mechanicHoursData', {
    schemaVersion: 3,
    clients: [],
    entries: [],
    scheduledJobs: [],
    jobs: [],
    invoices: [],
    charges: [],
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
  const scheduleIcon = process.env.PUBLIC_URL + '/icons/Schedule.PNG';
  const clientsIcon = process.env.PUBLIC_URL + '/icons/Clients.PNG';
  const entriesIcon = process.env.PUBLIC_URL + '/icons/TimeTracking.PNG'; // reusing until dedicated icon
  const invoiceIcon = process.env.PUBLIC_URL + '/icons/Invoice.PNG';
  const jobsIcon = process.env.PUBLIC_URL + '/icons/TimeTracking.PNG';

  const tabs = [
    { id: 'home', label: 'Home', img: homeIcon, icon: '🏠' },
    { id: 'timer', label: 'Timer', img: timerIcon, icon: '⏱️' },
    { id: 'schedule', label: 'Schedule', img: scheduleIcon, icon: '📅' },
    { id: 'clients', label: 'Clients', img: clientsIcon, icon: '👥' },
  { id: 'entries', label: 'Entries', img: entriesIcon, icon: '📋' },
  { id: 'jobs', label: 'Jobs', img: jobsIcon, icon: '🧰' },
    { id: 'invoice', label: 'Invoice', img: invoiceIcon, icon: '📄' }
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
        {activeTab === 'invoice' && (
          <InvoiceTab 
            appData={appData} 
            updateAppData={updateAppData}
            invoiceContext={invoiceContext}
            clearInvoiceContext={() => setInvoiceContext(null)}
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
