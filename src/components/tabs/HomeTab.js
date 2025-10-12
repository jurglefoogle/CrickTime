import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { dataService } from '../../utils/dataService';

/**
 * Home/Dashboard Tab Component
 * Shows weekly schedule, recent entries, and outstanding invoices
 */
const HomeTab = ({ appData, updateAppData, onNavigate }) => {
  // Get current date info
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)

  // Helper to parse stored YYYY-MM-DD in local time (avoid UTC shift)
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [y,m,d] = dateStr.split('-').map(Number);
    return new Date(y, m-1, d, 0,0,0,0);
  };

  // Get scheduled jobs for this week using local date parsing
  const thisWeekScheduled = (appData.scheduledJobs || []).filter(job => {
    if (job.completed) return false; // hide completed
    const jobDate = parseLocalDate(job.scheduledDate);
    return jobDate >= startOfWeek && jobDate <= endOfWeek;
  });

  // Get recent completed entries (last 5)
  const recentEntries = appData.entries
    .filter(entry => entry.end)
    .sort((a, b) => b.end - a.end)
    .slice(0, 5);

  // Calculate outstanding invoices (entries without invoices)
  const outstandingEntries = appData.entries.filter(entry => entry.end && !entry.invoiced);
  const outstandingAmount = dataService.calculateTotalAmount(outstandingEntries, appData.clients);

  // Start timer from scheduled job
  const startFromSchedule = (scheduledJob) => {
    const newEntry = {
      id: dataService.generateId(),
      clientId: scheduledJob.clientId,
      taskName: scheduledJob.taskName,
      jobId: scheduledJob.jobId, // ensure linkage for invoicing & stats
      start: Date.now(),
      end: null,
      notes: scheduledJob.notes || '',
      scheduledJobId: scheduledJob.id
    };
    const updatedScheduled = (appData.scheduledJobs||[]).map(j => j.id === scheduledJob.id ? { ...j, completed: true, startedAt: Date.now() } : j);
    updateAppData({
      entries: [...appData.entries, newEntry],
      active: { entryId: newEntry.id },
      scheduledJobs: updatedScheduled
    });

    // Navigate to timer tab
    onNavigate('timer');
  };

  // Get days of the week for schedule display
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }

  return (
    <div className="tab-content">
      {/* Quick Stats */}
      <Card>
        <h2 className="page-title">Dashboard</h2>
        <div className="stats-grid">
          <div className="stat-item stat-click" onClick={() => onNavigate('schedule')} title="Go to schedule" role="button" tabIndex={0} aria-label="Navigate to schedule tab">
            <div className="stat-value stat-value-primary">
              {thisWeekScheduled.length}
            </div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="stat-item stat-click" onClick={() => onNavigate('entries')} title="View recent entries" role="button" tabIndex={0} aria-label="Navigate to entries tab">
            <div className="stat-value stat-value-secondary">
              {recentEntries.length}
            </div>
            <div className="stat-label">Recent Jobs</div>
          </div>
          <div className="stat-item stat-click" onClick={() => onNavigate('invoice')} title="Create invoice for outstanding" role="button" tabIndex={0} aria-label="Navigate to invoice tab">
            <div className="stat-value stat-value-success">
              {dataService.formatCurrency(outstandingAmount)}
            </div>
            <div className="stat-label">Outstanding</div>
          </div>
        </div>
      </Card>

      {/* This Week's Schedule */}
      <Card>
        <div className="card-header">
          <h3 className="card-title">This Week's Schedule</h3>
          <Button 
            variant="secondary" 
            size="small"
            onClick={() => onNavigate('schedule')}
            aria-label="Add scheduled job"
          >
            + Add Job
          </Button>
        </div>
        
        {thisWeekScheduled.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">No jobs scheduled this week</p>
          </div>
        ) : (
          <div className="home-schedule-container">
            {thisWeekScheduled
              .sort((a, b) => parseLocalDate(a.scheduledDate) - parseLocalDate(b.scheduledDate))
              .map(job => {
                const client = appData.clients.find(c => c.id === job.clientId);
                const jobDate = parseLocalDate(job.scheduledDate);
                const isToday = jobDate.toDateString() === now.toDateString();
                
                return (
                  <div key={job.id} className="individual-job-card home-job-card">
                    <div className="job-card-content" style={{alignItems:'center'}}>
                      <div className="job-main-info">
                        <div className="job-title">{job.taskName}</div>
                        <div className="schedule-compact-row">
                          <span className="job-time">{jobDate.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric'})}</span>
                          <span className="schedule-meta-divider">•</span>
                          <span className="job-time">{job.scheduledTime}</span>
                          {job.estimatedHours && (<><span className="schedule-meta-divider">•</span><span>{job.estimatedHours}h</span></>)}
                          <span className="schedule-meta-divider">•</span>
                          <span className="job-client">{client?.name || 'Unknown Client'}</span>
                          {isToday && (<span className="job-status"><span className="status-today">Today</span></span>)}
                        </div>
                        {job.notes && (<div className="job-notes" title={job.notes}>{job.notes}</div>)}
                      </div>
                      <div className="job-actions">
                        {isToday && (
                          <Button size="small" variant="primary" onClick={() => startFromSchedule(job)} title="Start timer for this job" aria-label={`Start timer for scheduled job ${job.taskName}`}>▶️</Button>
                        )}
                        <Button size="small" variant="secondary" onClick={() => onNavigate('schedule')} title="View in schedule" aria-label={`View ${job.taskName} in schedule`}>📅</Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card>
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <Button 
            variant="secondary" 
            size="small"
            onClick={() => onNavigate('entries')}
          >
            View All
          </Button>
        </div>
        
        {recentEntries.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">No recent activity</p>
          </div>
        ) : (
          <div className="activity-list">
            {recentEntries.map(entry => {
              const client = appData.clients.find(c => c.id === entry.clientId);
              const duration = entry.end - entry.start;
              
              return (
                <div key={entry.id} className="activity-item activity-item-success">
                  <div className="activity-main">
                    {client?.name} - {entry.taskName || 'Unknown Task'}
                  </div>
                  <div className="activity-meta">
                    {dataService.formatDate(entry.start)} • {dataService.formatDuration(duration)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

  {/* Removed Outstanding Work & Quick Actions per requirements */}
    </div>
  );
};

export default HomeTab;
