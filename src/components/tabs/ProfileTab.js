import React, { useState, useEffect, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { dataService } from '../../utils/dataService';
import { cloudBackupService } from '../../utils/cloudBackupService';

/**
 * Profile Tab Component
 * User settings, preferences, and data management
 */
const ProfileTab = ({ appData, updateAppData }) => {
  const [businessName, setBusinessName] = useState(
    appData.settings?.businessName || ''
  );
  const [defaultRate, setDefaultRate] = useState(
    appData.settings?.defaultRate || ''
  );
  const [mileageRate, setMileageRate] = useState(
    appData.settings?.mileageRate || 0.67
  );
  const [autoBackup, setAutoBackup] = useState(
    appData.settings?.autoBackup || false
  );

  // Cloud backup state
  const [cloudBackups, setCloudBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [cloudAvailable, setCloudAvailable] = useState(false);

  // Check if cloud backup is available
  useEffect(() => {
    setCloudAvailable(cloudBackupService.isAvailable());
  }, []);

  // Load cloud backups
  const loadCloudBackups = useCallback(async () => {
    setLoadingBackups(true);
    const result = await cloudBackupService.listBackups();
    if (result.success) {
      setCloudBackups(result.backups);
    } else {
      console.error('Failed to load backups:', result.error);
    }
    setLoadingBackups(false);
  }, []);

  // Cloud backup
  const handleCloudBackup = useCallback(async (isAuto = false) => {
    setBackupStatus(isAuto ? 'Auto-backing up...' : 'Backing up to cloud...');
    const result = await cloudBackupService.uploadBackup(appData);
    
    if (result.success) {
      setBackupStatus(isAuto ? '✓ Auto-backup complete' : '✓ Backup uploaded successfully!');
      loadCloudBackups(); // Refresh list
      if (!isAuto) {
        setTimeout(() => setBackupStatus(''), 3000);
      }
    } else {
      setBackupStatus(`❌ Backup failed: ${result.error}`);
      setTimeout(() => setBackupStatus(''), 5000);
    }
  }, [appData, loadCloudBackups]);

  // Load cloud backups on mount
  useEffect(() => {
    if (cloudAvailable) {
      loadCloudBackups();
    }
  }, [cloudAvailable, loadCloudBackups]);

  // Auto-backup when data changes (if enabled)
  useEffect(() => {
    if (autoBackup && cloudAvailable && appData.entries?.length > 0) {
      const lastBackupTime = localStorage.getItem('lastAutoBackupTime');
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      // Only auto-backup once per hour
      if (!lastBackupTime || now - parseInt(lastBackupTime) > oneHour) {
        handleCloudBackup(true);
        localStorage.setItem('lastAutoBackupTime', now.toString());
      }
    }
  }, [appData, autoBackup, cloudAvailable, handleCloudBackup]);

  // Save settings
  const saveSettings = () => {
    const settings = {
      businessName: businessName.trim(),
      defaultRate: defaultRate ? parseFloat(defaultRate) : null,
      mileageRate: parseFloat(mileageRate),
      autoBackup
    };

    updateAppData({ settings });
    alert('Settings saved successfully!');
  };

  // Restore from cloud backup
  const handleCloudRestore = async (filename) => {
    if (!window.confirm(`Restore from backup: ${filename}?\n\nThis will replace all current data.`)) {
      return;
    }

    setBackupStatus('Restoring from cloud...');
    const result = await cloudBackupService.downloadBackup(filename);
    
    if (result.success) {
      updateAppData(result.data);
      setBackupStatus('✓ Data restored successfully!');
      setTimeout(() => {
        alert('Data restored! Refreshing...');
        window.location.reload();
      }, 1000);
    } else {
      setBackupStatus(`❌ Restore failed: ${result.error}`);
      setTimeout(() => setBackupStatus(''), 5000);
    }
  };

  // Delete cloud backup
  const handleDeleteCloudBackup = async (filename) => {
    if (!window.confirm(`Delete backup: ${filename}?`)) {
      return;
    }

    const result = await cloudBackupService.deleteBackup(filename);
    if (result.success) {
      setBackupStatus('✓ Backup deleted');
      loadCloudBackups();
      setTimeout(() => setBackupStatus(''), 2000);
    } else {
      setBackupStatus(`❌ Delete failed: ${result.error}`);
      setTimeout(() => setBackupStatus(''), 5000);
    }
  };

  // Export data
  const handleExport = () => {
    const jsonData = dataService.exportData(appData);
    if (!jsonData) {
      alert('Error exporting data');
      return;
    }

    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cricktime-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import data
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = dataService.importData(e.target.result);
        if (!importedData) {
          alert('Invalid backup file format');
          return;
        }

        if (window.confirm('This will replace all current data. Are you sure?')) {
          updateAppData(importedData);
          alert('Data imported successfully! Refreshing...');
          window.location.reload();
        }
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  // Clear all data
  const handleClearData = () => {
    const confirmText = 'DELETE ALL DATA';
    const userInput = window.prompt(
      `This will permanently delete all your data!\n\nType "${confirmText}" to confirm:`
    );

    if (userInput === confirmText) {
      localStorage.clear();
      alert('All data cleared. Refreshing...');
      window.location.reload();
    } else if (userInput !== null) {
      alert('Deletion cancelled - text did not match');
    }
  };

  // Calculate statistics
  const totalClients = appData.clients?.length || 0;
  const totalJobs = appData.jobs?.length || 0;
  const totalEntries = appData.entries?.filter(e => e.end)?.length || 0;
  const totalTrips = appData.mileageTrips?.filter(t => t.endTime)?.length || 0;

  const totalHours = dataService.calculateTotalHours(
    appData.entries?.filter(e => e.end) || []
  );

  const totalMileage = (appData.mileageTrips || [])
    .filter(t => t.endTime)
    .reduce((sum, trip) => sum + (trip.distance || 0), 0);

  return (
    <div className="tab-content">
      {/* App Info */}
      <Card>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <img 
            src={process.env.PUBLIC_URL + '/icons/CrickTimeLogo.png'} 
            alt="Crick Time Logo" 
            style={{ height: '60px', width: '60px', objectFit: 'contain', marginBottom: '12px' }}
          />
          <h2 className="page-title" style={{ marginBottom: '4px' }}>Crick Time</h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Time Tracking & Invoicing</p>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '8px' }}>Version 1.1.0</p>
        </div>
      </Card>

      {/* Statistics */}
      <Card>
        <h3 className="card-title">📊 Your Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value stat-value-primary">{totalClients}</div>
            <div className="stat-label">Clients</div>
          </div>
          <div className="stat-item">
            <div className="stat-value stat-value-secondary">{totalJobs}</div>
            <div className="stat-label">Jobs</div>
          </div>
          <div className="stat-item">
            <div className="stat-value stat-value-success">{totalEntries}</div>
            <div className="stat-label">Entries</div>
          </div>
        </div>
        <div className="stats-grid" style={{ marginTop: '12px' }}>
          <div className="stat-item">
            <div className="stat-value">{totalHours.toFixed(1)}h</div>
            <div className="stat-label">Total Hours</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{totalTrips}</div>
            <div className="stat-label">Trips</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{dataService.formatMileage(totalMileage)}</div>
            <div className="stat-label">Miles Driven</div>
          </div>
        </div>
      </Card>

      {/* Settings */}
      <Card>
        <h3 className="card-title">⚙️ Settings</h3>
        
        <div className="form-group">
          <div className="input-group">
            <label className="input-label">Business Name</label>
            <input
              type="text"
              className="input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your Business Name"
            />
            <div className="text-xs text-gray-500 mt-1">
              Used on invoices and reports
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Default Hourly Rate ($)</label>
            <input
              type="number"
              className="input"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            <div className="text-xs text-gray-500 mt-1">
              Default rate for new clients
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Mileage Rate ($ per mile)</label>
            <input
              type="number"
              className="input"
              value={mileageRate}
              onChange={(e) => setMileageRate(e.target.value)}
              placeholder="0.67"
              step="0.01"
              min="0"
            />
            <div className="text-xs text-gray-500 mt-1">
              IRS standard rate: $0.67/mile (2024-2025)
            </div>
          </div>

          {cloudAvailable && (
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Enable Auto-Backup to Cloud</span>
              </label>
              <div className="text-xs text-gray-500 mt-1">
                Automatically backup your data to Azure every hour
              </div>
            </div>
          )}

          <Button onClick={saveSettings} size="large">
            💾 Save Settings
          </Button>
        </div>
      </Card>

      {/* Cloud Backup */}
      {cloudAvailable && (
        <Card>
          <h3 className="card-title">☁️ Cloud Backup</h3>
          
          {backupStatus && (
            <div style={{ 
              padding: '12px', 
              marginBottom: '16px', 
              borderRadius: '6px',
              backgroundColor: backupStatus.includes('❌') ? '#fee2e2' : '#d1fae5',
              color: backupStatus.includes('❌') ? '#dc2626' : '#065f46',
              fontSize: '14px'
            }}>
              {backupStatus}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button 
              variant="primary" 
              size="large"
              onClick={() => handleCloudBackup(false)}
              style={{ width: '100%' }}
            >
              ☁️ Backup to Cloud Now
            </Button>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                  Available Backups
                </h4>
                <Button 
                  variant="secondary" 
                  size="small"
                  onClick={loadCloudBackups}
                  disabled={loadingBackups}
                >
                  {loadingBackups ? '...' : '🔄'}
                </Button>
              </div>

              {cloudBackups.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '24px', 
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  {loadingBackups ? 'Loading backups...' : 'No cloud backups found'}
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {cloudBackups.map((backup, index) => (
                    <div 
                      key={backup.filename}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        backgroundColor: index === 0 ? '#f0f9ff' : '#fff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                            {new Date(backup.lastModified).toLocaleString()}
                            {index === 0 && (
                              <span style={{ 
                                marginLeft: '8px', 
                                fontSize: '11px', 
                                color: '#0284c7',
                                fontWeight: '600'
                              }}>
                                LATEST
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            Size: {(backup.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleCloudRestore(backup.filename)}
                            style={{ fontSize: '11px', padding: '4px 12px' }}
                          >
                            Restore
                          </Button>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleDeleteCloudBackup(backup.filename)}
                            style={{ 
                              fontSize: '11px', 
                              padding: '4px 12px',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626'
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Data Management */}
      <Card>
        <h3 className="card-title">💾 Data Management</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <Button 
              variant="secondary" 
              size="large"
              onClick={handleExport}
              style={{ width: '100%' }}
            >
              📥 Export Data (Backup)
            </Button>
            <div className="text-xs text-gray-500 mt-2" style={{ textAlign: 'center' }}>
              Download all your data as JSON file
            </div>
          </div>

          <div>
            <label htmlFor="import-file" style={{ width: '100%', display: 'block' }}>
              <Button 
                variant="secondary" 
                size="large"
                style={{ width: '100%', cursor: 'pointer' }}
                as="span"
              >
                📤 Import Data (Restore)
              </Button>
            </label>
            <input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
            <div className="text-xs text-gray-500 mt-2" style={{ textAlign: 'center' }}>
              Restore from a backup file
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '16px' }}>
            <Button 
              variant="secondary"
              size="large"
              onClick={handleClearData}
              style={{ width: '100%', backgroundColor: '#fee2e2', color: '#dc2626' }}
            >
              🗑️ Clear All Data
            </Button>
            <div className="text-xs text-gray-500 mt-2" style={{ textAlign: 'center', color: '#ef4444' }}>
              ⚠️ Warning: This cannot be undone!
            </div>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card>
        <h3 className="card-title">ℹ️ About</h3>
        <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>Crick Time</strong> is a time tracking and invoicing application 
            designed for mechanics, contractors, and service professionals.
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>Features:</strong>
          </p>
          <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
            <li>Time tracking with timer</li>
            <li>Client and job management</li>
            <li>GPS-based mileage tracking</li>
            <li>Invoice generation</li>
            <li>Schedule management</li>
            <li>Local data storage (no cloud required)</li>
          </ul>
          <p style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
            All data is stored locally on your device for privacy and offline access.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ProfileTab;
