import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dataService } from '../../utils/dataService';

/**
 * Entries Tab Component
 * Reference: www.context7.com for data table patterns
 */
const EntriesTab = ({ appData, updateAppData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showInvoiced, setShowInvoiced] = useState(true);

  // Form state for editing entries
  const [editForm, setEditForm] = useState({
    notes: '',
    startTime: '',
    endTime: '',
    startDate: '',
    endDate: ''
  });

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    let filtered = appData.entries.filter(entry => entry.end); // Only completed entries

    if (!showInvoiced) {
      filtered = filtered.filter(e => !e.invoiced);
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => {
        const client = appData.clients.find(c => c.id === entry.clientId);
        const taskName = entry.taskName || '';
        
        return (
          client?.name.toLowerCase().includes(searchLower) ||
          taskName.toLowerCase().includes(searchLower) ||
          (entry.notes && entry.notes.toLowerCase().includes(searchLower))
        );
      });
    }

    // Client filter
    if (filterClient) {
      filtered = filtered.filter(entry => entry.clientId === filterClient);
    }

    // Date filter
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      const filterDateStr = filterDateObj.toDateString();
      filtered = filtered.filter(entry => {
        const entryDateStr = new Date(entry.start).toDateString();
        return entryDateStr === filterDateStr;
      });
    }

    // Sort by start time (newest first)
    return filtered.sort((a, b) => b.start - a.start);
  }, [appData.entries, appData.clients, searchTerm, filterClient, filterDate]);

  // Get client options for filter
  const clientOptions = appData.clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  // Calculate totals for filtered entries
  const totals = useMemo(() => {
    const totalHours = dataService.calculateTotalHours(filteredEntries);
    const totalAmount = dataService.calculateTotalAmount(filteredEntries, appData.clients);
    
    return { totalHours, totalAmount };
  }, [filteredEntries, appData.clients]);

  // Start editing an entry
  const startEditingEntry = (entry) => {
    const startDate = new Date(entry.start);
    const endDate = new Date(entry.end);
    
    setEditForm({
      notes: entry.notes || '',
      startTime: startDate.toTimeString().slice(0, 5), // HH:MM format
      endTime: endDate.toTimeString().slice(0, 5),
      startDate: startDate.toISOString().slice(0, 10), // YYYY-MM-DD format
      endDate: endDate.toISOString().slice(0, 10)
    });
    
    setEditingEntry(entry);
    setShowEditForm(true);
  };

  // Handle edit form submission
  const handleEditSubmit = (e) => {
    e.preventDefault();
    
    try {
      // Parse dates and times
      const startDateTime = new Date(`${editForm.startDate}T${editForm.startTime}`);
      const endDateTime = new Date(`${editForm.endDate}T${editForm.endTime}`);
      
      // Validation
      if (startDateTime >= endDateTime) {
        alert('End time must be after start time');
        return;
      }
      
      if (startDateTime > Date.now() || endDateTime > Date.now()) {
        alert('Times cannot be in the future');
        return;
      }
      
      // Update the entry
      const updatedEntries = appData.entries.map(entry =>
        entry.id === editingEntry.id
          ? {
              ...entry,
              start: startDateTime.getTime(),
              end: endDateTime.getTime(),
              notes: editForm.notes.trim()
            }
          : entry
      );
      
      updateAppData({ entries: updatedEntries });
      cancelEdit();
    } catch (error) {
      alert('Invalid date or time format');
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingEntry(null);
    setShowEditForm(false);
    setEditForm({
      notes: '',
      startTime: '',
      endTime: '',
      startDate: '',
      endDate: ''
    });
  };

  // Delete entry
  const deleteEntry = (entryId) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      const updatedEntries = appData.entries.filter(e => e.id !== entryId);
      updateAppData({ entries: updatedEntries });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterClient('');
    setFilterDate('');
    setShowInvoiced(true);
  };

  // Undo invoiced flag
  const undoInvoiced = (entryId) => {
    const updatedEntries = appData.entries.map(e =>
      e.id === entryId ? { ...e, invoiced: false } : e
    );
    updateAppData({ entries: updatedEntries });
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-600">
              {totals.totalHours.toFixed(1)}h
            </div>
            <div className="text-sm text-gray-600">Total Hours</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {dataService.formatCurrency(totals.totalAmount)}
            </div>
            <div className="text-sm text-gray-600">Total Amount</div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
  <h3 className="text-lg font-semibold mb-4">Filters</h3>
        
        <div className="space-y-3">
          <Input
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client, task, or notes..."
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Filter by Client"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              options={clientOptions}
              placeholder="All clients"
            />
            
            <Input
              label="Filter by Date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              id="toggleInvoiced"
              type="checkbox"
              checked={showInvoiced}
              onChange={() => setShowInvoiced(v => !v)}
            />
            <label htmlFor="toggleInvoiced" className="select-none">Show invoiced entries</label>
          </div>
          
          <Button 
            variant="secondary" 
            size="small" 
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Edit Form */}
      {showEditForm && editingEntry && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Edit Entry</h3>
          <form onSubmit={handleEditSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                required
              />
              
              <Input
                label="Start Time"
                type="time"
                value={editForm.startTime}
                onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                required
              />
              
              <Input
                label="End Date"
                type="date"
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                required
              />
              
              <Input
                label="End Time"
                type="time"
                value={editForm.endTime}
                onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                required
              />
            </div>
            
            <Input
              label="Notes"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Add notes..."
            />
            
            <div className="flex space-x-3">
              <Button type="submit" className="flex-1">
                Update Entry
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={cancelEdit}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <Card>
          <div className="text-center py-6 text-gray-600">
            {appData.entries.filter(e => e.end).length === 0 
              ? 'No completed entries yet. Start tracking time to see entries here!'
              : 'No entries match your current filters.'
            }
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => {
            const client = appData.clients.find(c => c.id === entry.clientId);
            const taskName = entry.taskName || 'Unknown Task';
            const duration = entry.end - entry.start;
            const hours = dataService.durationToHours(duration);
            const amount = client ? hours * client.rate : 0;
            
            return (
              <Card key={entry.id}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold">{client?.name}</h3>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-700">{taskName}</span>
                      {entry.invoiced && (
                        <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 font-medium">Invoiced</span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        📅 {dataService.formatDate(entry.start)}
                      </div>
                      <div>
                        ⏰ {dataService.formatTime(entry.start)} - {dataService.formatTime(entry.end)}
                      </div>
                      <div>
                        ⏱️ {dataService.formatDuration(duration)} ({hours.toFixed(2)}h)
                      </div>
                      {client && (
                        <div className="font-medium text-green-600">
                          💰 {dataService.formatCurrency(amount)}
                        </div>
                      )}
                    </div>
                    
                    {entry.notes && (
                      <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        📝 {entry.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    {entry.invoiced && (
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => undoInvoiced(entry.id)}
                        title="Undo invoiced"
                      >↩️</Button>
                    )}
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => startEditingEntry(entry)}
                    >
                      ✏️
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => deleteEntry(entry.id)}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Show total count */}
      {filteredEntries.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredEntries.length} of {appData.entries.filter(e => e.end).length} entries
        </div>
      )}
    </div>
  );
};

export default EntriesTab;
