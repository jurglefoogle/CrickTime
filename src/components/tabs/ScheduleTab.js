import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dataService } from '../../utils/dataService';

/**
 * Schedule Tab Component
 * Allows creating and managing scheduled jobs with calendar view
 */
const ScheduleTab = ({ appData, updateAppData, onNavigate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    taskName: '',
    scheduledDate: '',
    scheduledTime: '',
    estimatedHours: '',
    notes: ''
  });

  // Get current date for calendar
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Calendar navigation state
  const [viewDate, setViewDate] = useState(new Date(currentYear, currentMonth, 1));

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add new scheduled job
  const handleAddScheduledJob = () => {
    if (!formData.clientId || !formData.taskName || !formData.scheduledDate) {
      alert('Please fill in all required fields');
      return;
    }

    const newJob = {
      id: dataService.generateId(),
      clientId: formData.clientId,
      taskName: formData.taskName,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime || '09:00',
      estimatedHours: parseFloat(formData.estimatedHours) || 1,
      notes: formData.notes,
      createdAt: Date.now(),
      completed: false
    };

    updateAppData({
      scheduledJobs: [...(appData.scheduledJobs || []), newJob]
    });

    // Reset form
    setFormData({
      clientId: '',
      taskName: '',
      scheduledDate: '',
      scheduledTime: '',
      estimatedHours: '',
      notes: ''
    });
    setShowAddForm(false);
  };

  // Delete scheduled job
  const deleteScheduledJob = (jobId) => {
    if (window.confirm('Are you sure you want to delete this scheduled job?')) {
      updateAppData({
        scheduledJobs: appData.scheduledJobs.filter(job => job.id !== jobId)
      });
    }
  };

  // Complete scheduled job (mark as done without starting timer)
  const completeScheduledJob = (jobId) => {
    updateAppData({
      scheduledJobs: appData.scheduledJobs.map(job =>
        job.id === jobId ? { ...job, completed: true } : job
      )
    });
  };

  // Get calendar data
  const getCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 42 days (6 weeks) for calendar grid
    for (let i = 0; i < 42; i++) {
      const dateString = currentDate.toISOString().split('T')[0];
      const jobsForDay = (appData.scheduledJobs || []).filter(job => 
        job.scheduledDate === dateString && !job.completed
      );
      
      days.push({
        date: new Date(currentDate),
        dateString,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === now.toDateString(),
        jobs: jobsForDay
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Navigate calendar months
  const navigateMonth = (direction) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + direction);
    setViewDate(newDate);
  };

  // Format today's date for default input
  const todayString = now.toISOString().split('T')[0];

  const calendarDays = getCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Modal state for day details
  const [modalDay, setModalDay] = useState(null); // { dateString, jobs: [] }

  const startJobFromSchedule = (job) => {
    // Create a new active entry based on scheduled job
    const newEntry = {
      id: dataService.generateId(),
      clientId: job.clientId,
      taskName: job.taskName,
      start: Date.now(),
      end: null,
      notes: job.notes || '',
      scheduledJobId: job.id
    };
    updateAppData({
      entries: [...appData.entries, newEntry],
      active: { entryId: newEntry.id }
    });
    setModalDay(null);
    onNavigate && onNavigate('timer');
  };

  const closeModal = () => setModalDay(null);

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <Card>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-200">Schedule</h2>
          <Button onClick={() => setShowAddForm(true)}>
            + Schedule Job
          </Button>
        </div>
      </Card>

      {/* Add Job Form */}
      {showAddForm && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Schedule New Job</h3>
          <div className="space-y-4">
            <Select
              label="Client *"
              value={formData.clientId}
              onChange={(e) => handleInputChange('clientId', e.target.value)}
              options={[
                { value: '', label: 'Select Client' },
                ...appData.clients.map(client => ({
                  value: client.id,
                  label: client.name
                }))
              ]}
            />

            <Input
              label="Task Description *"
              value={formData.taskName}
              onChange={(e) => handleInputChange('taskName', e.target.value)}
              placeholder="Describe the work to be done"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date *"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                min={todayString}
              />

              <Input
                label="Time"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                placeholder="09:00"
              />
            </div>

            <Input
              label="Estimated Hours"
              type="number"
              min="0.25"
              step="0.25"
              value={formData.estimatedHours}
              onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
              placeholder="1"
            />

            <Input
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional details or special instructions"
            />

            <div className="flex gap-3">
              <Button onClick={handleAddScheduledJob}>
                Schedule Job
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Calendar View */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="secondary" 
            size="small"
            onClick={() => navigateMonth(-1)}
          >
            ‹ Prev
          </Button>
          <h3 className="text-lg font-semibold text-gray-200">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h3>
          <Button 
            variant="secondary" 
            size="small"
            onClick={() => navigateMonth(1)}
          >
            Next ›
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`cursor-pointer min-h-[80px] p-1 border border-gray-600 rounded transition-colors ${
                day.isCurrentMonth ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 hover:bg-gray-800'
              } ${day.isToday ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => { if (day.jobs.length > 0) setModalDay(day); }}
              title={day.jobs.length ? `${day.jobs.length} scheduled job(s)` : 'No jobs'}
            >
              <div className={`text-sm ${
                day.isCurrentMonth ? 'text-gray-200' : 'text-gray-500'
              }`}>
                {day.date.getDate()}
              </div>
              
              {day.jobs.length > 0 && (
                <div className="space-y-1 mt-1">
                  {day.jobs.slice(0, 2).map(job => {
                    const client = appData.clients.find(c => c.id === job.clientId);
                    return (
                      <div
                        key={job.id}
                        className="text-xs p-1 rounded bg-red-600 text-white truncate"
                        title={`${client?.name} - ${job.taskName}`}
                      >
                        {job.scheduledTime} {client?.name}
                      </div>
                    );
                  })}
                  {day.jobs.length > 2 && (
                    <div className="text-xs text-gray-400">
                      +{day.jobs.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

  {/* Upcoming Jobs List */}
      <Card>
        <h3 className="text-lg font-semibold mb-3 text-gray-200">This Week's Schedule</h3>
        
        {(!appData.scheduledJobs || appData.scheduledJobs.filter(job => !job.completed).length === 0) ? (
          <div className="text-center py-4 text-gray-400">
            No scheduled jobs
          </div>
        ) : (
          <div className="space-y-2">
            {appData.scheduledJobs
              .filter(job => !job.completed)
              .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
              .map(job => {
                const client = appData.clients.find(c => c.id === job.clientId);
                const jobDate = new Date(job.scheduledDate);
                const isOverdue = jobDate < now;
                const isToday = jobDate.toDateString() === now.toDateString();
                
                return (
                  <div
                    key={job.id}
                    className="individual-job-card"
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
                        {(isOverdue || isToday) && (
                          <div className="job-status">
                            {isOverdue && <span className="status-overdue">Overdue</span>}
                            {isToday && <span className="status-today">Today</span>}
                          </div>
                        )}
                      </div>
                      
                      <div className="job-actions">
                        <Button
                          size="small"
                          variant="primary"
                          onClick={() => completeScheduledJob(job.id)}
                          title="Mark as complete"
                        >
                          ✓
                        </Button>
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => deleteScheduledJob(job.id)}
                          title="Delete job"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>
      {/* Modal for day jobs */}
      {modalDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 animate-fade-in-up">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-100">{new Date(modalDay.date).toLocaleDateString(undefined,{weekday:'long', month:'short', day:'numeric'})}</h3>
              <Button variant="secondary" size="small" onClick={closeModal}>✕</Button>
            </div>
            {modalDay.jobs.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">No jobs scheduled</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {modalDay.jobs.sort((a,b)=>a.scheduledTime.localeCompare(b.scheduledTime)).map(job => {
                  const client = appData.clients.find(c => c.id === job.clientId);
                  return (
                    <div key={job.id} className="individual-job-card" style={{marginBottom:0}}>
                      <div className="job-card-content">
                        <div className="job-main-info">
                          <div className="job-title">{job.taskName}</div>
                          <div className="job-time">{job.scheduledTime}{job.estimatedHours && ` • ${job.estimatedHours}h`}</div>
                          <div className="job-client">{client?.name || 'Unknown Client'}</div>
                          {job.notes && <div className="job-notes">{job.notes}</div>}
                        </div>
                        <div className="job-actions">
                          <Button size="small" variant="primary" onClick={() => startJobFromSchedule(job)} title="Start job">
                            ▶️
                          </Button>
                          <Button size="small" variant="secondary" onClick={() => completeScheduledJob(job.id)} title="Mark complete">✓</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button variant="secondary" size="small" onClick={closeModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTab;
