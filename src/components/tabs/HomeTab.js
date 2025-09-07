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

  // Get scheduled jobs for this week
  const thisWeekScheduled = appData.scheduledJobs?.filter(job => {
    const jobDate = new Date(job.scheduledDate);
    return jobDate >= startOfWeek && jobDate <= endOfWeek;
  }) || [];

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
      start: Date.now(),
      end: null,
      notes: scheduledJob.notes || '',
      scheduledJobId: scheduledJob.id
    };

    updateAppData({
      entries: [...appData.entries, newEntry],
      active: { entryId: newEntry.id }
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
          <div className="stat-item">
            <div className="stat-value stat-value-primary">
              {thisWeekScheduled.length}
            </div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="stat-item">
            <div className="stat-value stat-value-secondary">
              {recentEntries.length}
            </div>
            <div className="stat-label">Recent Jobs</div>
          </div>
          <div className="stat-item">
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
              .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
              .map(job => {
                const client = appData.clients.find(c => c.id === job.clientId);
                const jobDate = new Date(job.scheduledDate);
                const isToday = jobDate.toDateString() === now.toDateString();
                
                return (
                  <div
                    key={job.id}
                    className="individual-job-card home-job-card"
                  >
                    <div className="job-card-content">
                      <div className="job-main-info">
                        <div className="job-title">
                          {job.taskName}
                        </div>
                        <div className="job-time">
                          {jobDate.toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric'
                          })} • {job.scheduledTime}
                          {job.estimatedHours && ` • ${job.estimatedHours}h`}
                        </div>
                        <div className="job-client">
                          {client?.name || 'Unknown Client'}
                        </div>
                        {job.notes && (
                          <div className="job-notes">
                            {job.notes}
                          </div>
                        )}
                        {isToday && (
                          <div className="job-status">
                            <span className="status-today">Today</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="job-actions">
                        {isToday && (
                          <Button
                            size="small"
                            variant="primary"
                            onClick={() => startFromSchedule(job)}
                            title="Start timer for this job"
                          >
                            ▶️
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => onNavigate('schedule')}
                          title="View in schedule"
                        >
                          📅
                        </Button>
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

      {/* Outstanding Invoices */}
      {outstandingAmount > 0 && (
        <Card>
          <div className="card-header-horizontal">
            <div>
              <h3 className="card-title">Outstanding Work</h3>
              <p className="card-subtitle">
                {outstandingEntries.length} completed jobs not yet invoiced
              </p>
            </div>
            <div className="outstanding-amount">
              <div className="outstanding-total">
                {dataService.formatCurrency(outstandingAmount)}
              </div>
              <Button 
                variant="secondary" 
                size="small"
                onClick={() => onNavigate('invoice')}
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <h3 className="card-title">Quick Actions</h3>
        <div className="quick-actions">
          <Button onClick={() => onNavigate('timer')}>
            ⏱️ Start Timer
          </Button>
          <Button onClick={() => onNavigate('schedule')} variant="secondary">
            📅 Schedule Job
          </Button>
          <Button onClick={() => onNavigate('clients')} variant="secondary">
            👥 Add Client
          </Button>
          <Button onClick={() => onNavigate('invoice')} variant="secondary">
            📄 Create Invoice
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default HomeTab;
