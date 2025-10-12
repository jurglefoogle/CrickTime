import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { dataService } from '../../utils/dataService';

/**
 * Clients Tab Component
 * Reference: www.context7.com for CRUD interface patterns
 */
const ClientsTab = ({ appData, updateAppData }) => {
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Form states
  const [clientForm, setClientForm] = useState({
    name: '',
    contact: '',
    rate: ''
  });

  // Reset forms
  const resetClientForm = () => {
    setClientForm({ name: '', contact: '', rate: '' });
    setEditingClient(null);
    setShowAddClient(false);
  };

  // Handle client form submission
  const handleClientSubmit = (e) => {
    e.preventDefault();
    
    if (!clientForm.name.trim()) {
      alert('Client name is required');
      return;
    }

    const rate = parseFloat(clientForm.rate);
    if (isNaN(rate) || rate < 0) {
      alert('Please enter a valid hourly rate');
      return;
    }

    if (editingClient) {
      // Update existing client
      const updatedClients = appData.clients.map(client => 
        client.id === editingClient.id 
          ? { ...client, ...clientForm, rate }
          : client
      );
      updateAppData({ clients: updatedClients });
    } else {
      // Add new client
      const newClient = {
        id: dataService.generateId(),
        name: clientForm.name.trim(),
        contact: clientForm.contact.trim(),
        rate
      };
      updateAppData({ clients: [...appData.clients, newClient] });
    }

    resetClientForm();
  };

  // Delete client
  const deleteClient = (clientId) => {
    if (window.confirm('Are you sure you want to delete this client? All associated entries will also be deleted.')) {
      const updatedClients = appData.clients.filter(c => c.id !== clientId);
      const updatedEntries = appData.entries.filter(e => e.clientId !== clientId);
      const updatedScheduled = (appData.scheduledJobs||[]).filter(j => j.clientId !== clientId);
      const activeEntryId = appData.active?.entryId;
      const activeEntry = activeEntryId ? appData.entries.find(e => e.id === activeEntryId) : null;
      const active = activeEntry && activeEntry.clientId === clientId ? null : appData.active;
      updateAppData({
        clients: updatedClients,
        entries: updatedEntries,
        scheduledJobs: updatedScheduled,
        active
      });
    }
  };

  // Start editing client
  const startEditingClient = (client) => {
    setClientForm({
      name: client.name,
      contact: client.contact,
      rate: client.rate.toString()
    });
    setEditingClient(client);
    setShowAddClient(true);
  };

  return (
    <div className="space-y-6">
      {/* Clients Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Clients</h2>
          <Button 
            onClick={() => setShowAddClient(true)}
            size="small"
          >
            ➕ Add Client
          </Button>
        </div>

        {/* Add/Edit Client Form */}
        {showAddClient && (
          <Card className="mb-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>
            <form onSubmit={handleClientSubmit}>
              <Input
                label="Client Name"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder="Enter client name"
                required
              />
              
              <Input
                label="Contact Info"
                value={clientForm.contact}
                onChange={(e) => setClientForm({ ...clientForm, contact: e.target.value })}
                placeholder="Email, phone, or address"
              />
              
              <Input
                label="Hourly Rate ($)"
                type="number"
                step="0.01"
                min="0"
                value={clientForm.rate}
                onChange={(e) => setClientForm({ ...clientForm, rate: e.target.value })}
                placeholder="95.00"
                required
              />
              
              <div className="flex space-x-3">
                <Button type="submit" className="flex-1">
                  {editingClient ? 'Update Client' : 'Add Client'}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={resetClientForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Clients List */}
        {appData.clients.length === 0 ? (
          <Card>
            <div className="text-center py-6 text-gray-600">
              No clients added yet. Add your first client to get started!
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {appData.clients.map(client => {
              return (
                <Card key={client.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{client.name}</h3>
                      {client.contact && (
                        <p className="text-gray-600 text-sm">{client.contact}</p>
                      )}
                      <p className="text-primary-600 font-medium">
                        {dataService.formatCurrency(client.rate)}/hour
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => startEditingClient(client)}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => deleteClient(client.id)}
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
      </div>
    </div>
  );
};

export default ClientsTab;
