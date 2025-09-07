import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register service worker for PWA functionality
// Reference: www.context7.com for PWA best practices
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates every time the app loads
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, refresh the page
                console.log('SW: New content available, refreshing...');
                window.location.reload();
              }
            });
          }
        });
        
        // Check for updates immediately
        registration.update();
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
  
  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      console.log('SW: Service worker updated, refreshing...');
      window.location.reload();
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
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
