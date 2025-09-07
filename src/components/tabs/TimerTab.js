import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { dataService } from '../../utils/dataService';

/**
 * Timer Tab Component
 * Reference: www.context7.com for timer implementation patterns
 */
const TimerTab = ({ appData, updateAppData }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [taskName, setTaskName] = useState('');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Update current time every second when timer is active
  useEffect(() => {
    let interval;
    if (isTimerActive) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  // Check if there's an active timer on mount
  useEffect(() => {
    if (appData.active) {
      const activeEntry = appData.entries.find(e => e.id === appData.active.entryId);
      if (activeEntry && !activeEntry.end) {
        setIsTimerActive(true);
        setSelectedClient(activeEntry.clientId);
        setTaskName(activeEntry.taskName || '');
        setNotes(activeEntry.notes || '');
      }
    }
  }, [appData.active, appData.entries]);

  // Get client options for select
  const clientOptions = appData.clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  // Calculate elapsed time for active timer
  const getElapsedTime = () => {
    if (!isTimerActive || !appData.active) return 0;
    
    const activeEntry = appData.entries.find(e => e.id === appData.active.entryId);
    if (!activeEntry) return 0;
    
    return currentTime - activeEntry.start;
  };

  // Start timer
  const startTimer = () => {
    if (!selectedClient || !taskName.trim()) {
      alert('Please select a client and enter a task name before starting the timer.');
      return;
    }

    const newEntry = {
      id: dataService.generateId(),
      clientId: selectedClient,
      taskName: taskName.trim(),
      start: Date.now(),
      end: null,
      notes: notes
    };

    updateAppData({
      entries: [...appData.entries, newEntry],
      active: { entryId: newEntry.id }
    });

    setIsTimerActive(true);
  };

  // Stop timer
  const stopTimer = () => {
    if (!appData.active) return;

    const updatedEntries = appData.entries.map(entry => {
      if (entry.id === appData.active.entryId) {
        return {
          ...entry,
          end: Date.now(),
          notes: notes
        };
      }
      return entry;
    });

    updateAppData({
      entries: updatedEntries,
      active: null
    });

    setIsTimerActive(false);
    setNotes('');
    setTaskName('');
  };

  // Update notes for active timer
  const updateNotes = (newNotes) => {
    setNotes(newNotes);
    
    if (isTimerActive && appData.active) {
      const updatedEntries = appData.entries.map(entry => {
        if (entry.id === appData.active.entryId) {
          return { ...entry, notes: newNotes };
        }
        return entry;
      });
      
      updateAppData({ entries: updatedEntries });
    }
  };

  return (
    <div className="tab-content">
      {/* Timer Display */}
      <Card>
        <div className="timer-section">
          <div className={`timer-display ${isTimerActive ? 'timer-active' : ''}`}>
            {dataService.formatDuration(getElapsedTime())}
          </div>
          
          {isTimerActive && (
            <div className="timer-start-time">
              Timer started at {dataService.formatTime(
                appData.entries.find(e => e.id === appData.active?.entryId)?.start
              )}
            </div>
          )}
          
          <div className="timer-controls">
            {!isTimerActive ? (
              <Button 
                onClick={startTimer}
                className="btn-start"
                size="large"
              >
                ▶️ START
              </Button>
            ) : (
              <Button 
                onClick={stopTimer}
                className="btn-stop"
                size="large"
              >
                ⏹️ STOP
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Work Details */}
      <Card>
        <h3 className="card-title">Work Details</h3>
        
        <div className="form-group">
          <div className="input-group">
            <label className="input-label">Client</label>
            <select
              className="select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              disabled={isTimerActive}
            >
              <option value="">Select a client</option>
              {clientOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Task</label>
            <input
              type="text"
              className="input"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g., Engine Repair"
              disabled={isTimerActive}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Notes</label>
            <textarea
              className="input"
              rows="2"
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Add notes..."
            />
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      {appData.clients.length === 0 && (
        <Card>
          <div className="empty-state">
            <p className="empty-state-text">
              Add clients to start tracking time
            </p>
            <Button variant="secondary" size="small">
              Add Client
            </Button>
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      {appData.entries.length > 0 && (
        <Card>
          <h3 className="card-title">Recent Activity</h3>
          <div className="activity-list">
            {appData.entries
              .filter(entry => entry.end) // Only completed entries
              .slice(-3) // Last 3 entries
              .reverse() // Most recent first
              .map(entry => {
                const client = appData.clients.find(c => c.id === entry.clientId);
                const duration = entry.end - entry.start;
                
                return (
                  <div key={entry.id} className="activity-item">
                    <div className="activity-main">
                      {client?.name} - {entry.taskName || 'Unknown Task'}
                    </div>
                    <div className="activity-meta">
                      {dataService.formatDate(entry.start)} • {dataService.formatDuration(duration)}
                    </div>
                    {entry.notes && (
                      <div className="activity-notes">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default TimerTab;
