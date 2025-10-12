import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register service worker for PWA functionality only in production.
// In development, attempt to unregister to avoid stale-cache issues.
// Reference: www.context7.com for PWA best practices
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  // Capture deferred install prompt
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window._showInstallPrompt = async () => {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return choice.outcome === 'accepted';
    };
    console.log('PWA: beforeinstallprompt captured');
  });

  window.addEventListener('load', () => {
    const basePath = window.location.pathname.includes('/CrickTime/') ? '/CrickTime' : '';
    navigator.serviceWorker.register(`${basePath}/sw.js`)
      .then((registration) => {
        console.log('SW registered:', registration.scope);
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('SW: New version available (will activate on next load)');
              }
            });
          }
        });
      })
      .catch(err => console.log('SW registration failed:', err));
  });
  
  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
  console.log('SW: Update message received');
    } else if (event.data && event.data.type === 'CACHE_CLEARED') {
      console.log('SW: Cache cleared successfully');
    }
  });
  
  // Add global function for clearing cache (useful for debugging)
  window.clearAppCache = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      console.log('SW: Cache clear requested');
    } else {
      console.log('SW: No service worker controller available');
    }
  };

  // Local backup/export utilities
  window.exportLocalData = () => {
    try {
      const raw = localStorage.getItem('appData');
      if (!raw) {
        alert('No data to export');
        return;
      }
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0,10);
      a.download = `cricktime-backup-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
      alert('Export failed');
    }
  };

  window.importLocalData = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object') throw new Error('Invalid');
        localStorage.setItem('appData', JSON.stringify(parsed));
        alert('Data imported. Reloading...');
        window.location.reload();
      } catch (err) {
        console.error('Import failed', err);
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };
} else if ('serviceWorker' in navigator) {
  // Development: proactively unregister any existing service workers on load
  window.addEventListener('load', async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      // After unregister, a hard reload ensures no SW control
      // Note: not forcing reload here to avoid loops; user can hard refresh if needed.
      console.log('SW (dev): Unregistered all service workers');
    } catch (e) {
      console.log('SW (dev): Unregister failed or none present');
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
