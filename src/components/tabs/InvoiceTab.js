import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dataService } from '../../utils/dataService';

/**
 * Invoice Tab Component
 * Reference: www.context7.com for invoice generation patterns
 */
const InvoiceTab = ({ appData, updateAppData }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceData, setInvoiceData] = useState(null); // holds draft or finalized invoice meta & all candidate line items
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [finalized, setFinalized] = useState(false);

  // Get client options
  const clientOptions = appData.clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  // Generate draft invoice data (does NOT mark entries invoiced yet)
  const generateInvoice = () => {
    if (!selectedClient || !startDate || !endDate) {
      alert('Please select a client and date range');
      return;
    }

    const client = appData.clients.find(c => c.id === selectedClient);
    if (!client) {
      alert('Selected client not found');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end date

    if (start > end) {
      alert('Start date must be before end date');
      return;
    }

    // Get entries for the client and date range
    const clientEntries = appData.entries.filter(entry => {
      if (!entry.end || entry.clientId !== selectedClient) return false;
      if (entry.invoiced) return false; // skip already invoiced
      
      const entryDate = new Date(entry.start);
      return entryDate >= start && entryDate <= end;
    });

    if (clientEntries.length === 0) {
      alert('No entries found for the selected client and date range');
      return;
    }

  // Create candidate line items (all initially selected)
  const lineItems = clientEntries.map(entry => {
      const taskName = entry.taskName || 'Unknown Task';
      const duration = entry.end - entry.start;
      const hours = dataService.durationToHours(duration);
      const amount = hours * client.rate;

      return {
        id: entry.id,
        date: dataService.formatDate(entry.start),
        task: taskName,
        notes: entry.notes || '',
        hours: hours,
        rate: client.rate,
        amount: amount
      };
    });

    const invoice = {
      client,
      dateRange: {
        start: dataService.formatDate(start),
        end: dataService.formatDate(end)
      },
      lineItems,
      generatedDate: dataService.formatDate(new Date()),
      invoiceNumber: `INV-${Date.now()}`
    };

    setInvoiceData(invoice);
    setSelectedIds(new Set(lineItems.map(li => li.id)));
    setFinalized(false);
  };

  // Toggle selection of a line item
  const toggleLineItem = (id) => {
    if (finalized) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!invoiceData || finalized) return;
    setSelectedIds(new Set(invoiceData.lineItems.map(li => li.id)));
  };

  const clearAll = () => {
    if (finalized) return;
    setSelectedIds(new Set());
  };

  // Compute totals from selected items
  const selectedLineItems = useMemo(() => {
    if (!invoiceData) return [];
    return invoiceData.lineItems.filter(li => selectedIds.has(li.id));
  }, [invoiceData, selectedIds]);

  const computedTotals = useMemo(() => {
    const hours = selectedLineItems.reduce((s, i) => s + i.hours, 0);
    const amount = selectedLineItems.reduce((s, i) => s + i.amount, 0);
    return { hours, amount };
  }, [selectedLineItems]);

  // Finalize invoice: mark selected entries as invoiced
  const finalizeInvoice = () => {
    if (!invoiceData) return;
    if (selectedIds.size === 0) {
      alert('Select at least one line item to finalize the invoice.');
      return;
    }
    const updatedEntries = appData.entries.map(e =>
      selectedIds.has(e.id) ? { ...e, invoiced: true } : e
    );
    updateAppData({ entries: updatedEntries });
    setFinalized(true);
  };

  // Export invoice as CSV
  const exportCSV = () => {
    if (!invoiceData) return;

    const headers = ['Date', 'Task', 'Notes', 'Hours', 'Rate', 'Amount'];
    const rows = selectedLineItems.map(item => [
      item.date,
      item.task,
      item.notes,
      item.hours.toFixed(2),
      item.rate.toFixed(2),
      item.amount.toFixed(2)
    ]);

    // Add totals row
    rows.push(['', '', 'TOTAL', computedTotals.hours.toFixed(2), '', computedTotals.amount.toFixed(2)]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceData.client.name}-${invoiceData.dateRange.start}-to-${invoiceData.dateRange.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print invoice
  const printInvoice = () => {
    if (!invoiceData) return;

    const printWindow = window.open('', '_blank');
    const printContent = generatePrintHTML({ ...invoiceData, lineItems: selectedLineItems, totals: computedTotals });
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Generate HTML for printing
  const generatePrintHTML = (invoice) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice - ${invoice.client.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #2563eb; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .client-info h3, .invoice-details h3 { margin-top: 0; color: #374151; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f9fafb; font-weight: bold; }
        .amount { text-align: right; }
        .totals { font-weight: bold; background-color: #f3f4f6; }
        .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 14px; }
        @media print {
            body { margin: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="invoice-title">INVOICE</div>
        <div style="margin-top: 10px; color: #6b7280;">Mechanic Hours Time Tracking</div>
    </div>
    
    <div class="invoice-info">
        <div class="client-info">
            <h3>Bill To:</h3>
            <div><strong>${invoice.client.name}</strong></div>
            ${invoice.client.contact ? `<div>${invoice.client.contact}</div>` : ''}
        </div>
        
        <div class="invoice-details">
            <h3>Invoice Details:</h3>
            <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
            <div><strong>Date:</strong> ${invoice.generatedDate}</div>
            <div><strong>Period:</strong> ${invoice.dateRange.start} - ${invoice.dateRange.end}</div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Task</th>
                <th>Notes</th>
                <th>Hours</th>
                <th>Rate</th>
                <th class="amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.lineItems.map(item => `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.task}</td>
                    <td>${item.notes}</td>
                    <td>${item.hours.toFixed(2)}</td>
                    <td>${dataService.formatCurrency(item.rate)}</td>
                    <td class="amount">${dataService.formatCurrency(item.amount)}</td>
                </tr>
            `).join('')}
      <tr class="totals">
        <td colspan="3">TOTAL</td>
        <td><strong>${invoice.totals.hours.toFixed(2)}</strong></td>
        <td></td>
        <td class="amount"><strong>${dataService.formatCurrency(invoice.totals.amount)}</strong></td>
      </tr>
        </tbody>
    </table>
    
    <div class="footer">
        <p>Generated by Mechanic Hours - www.context7.com</p>
        <p>Thank you for your business!</p>
    </div>
</body>
</html>
    `;
  };

  // Clear invoice
  const clearInvoice = () => {
    setInvoiceData(null);
    setSelectedClient('');
    setStartDate('');
    setEndDate('');
    setSelectedIds(new Set());
    setFinalized(false);
  };

  // Set quick date ranges
  const setThisWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    
    setStartDate(startOfWeek.toISOString().slice(0, 10));
    setEndDate(now.toISOString().slice(0, 10));
  };

  const setThisMonth = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    setStartDate(startOfMonth.toISOString().slice(0, 10));
    setEndDate(now.toISOString().slice(0, 10));
  };

  const setLastMonth = () => {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    setStartDate(startOfLastMonth.toISOString().slice(0, 10));
    setEndDate(endOfLastMonth.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
  {!invoiceData ? (
        <>
          {/* Invoice Generation Form */}
          <Card>
            <h2 className="text-xl font-bold mb-4">Generate Invoice</h2>
            
            <Select
              label="Client"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              options={clientOptions}
              placeholder="Select a client"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            {/* Quick Date Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button variant="secondary" size="small" onClick={setThisWeek}>
                This Week
              </Button>
              <Button variant="secondary" size="small" onClick={setThisMonth}>
                This Month
              </Button>
              <Button variant="secondary" size="small" onClick={setLastMonth}>
                Last Month
              </Button>
            </div>
            
            <Button 
              onClick={generateInvoice}
              className="w-full"
              disabled={!selectedClient || !startDate || !endDate}
            >
              📄 Generate Invoice
            </Button>
          </Card>

          {/* Summary Statistics */}
          {appData.clients.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary-600">
                    {appData.clients.length}
                  </div>
                  <div className="text-sm text-gray-600">Active Clients</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {appData.entries.filter(e => e.end).length}
                  </div>
                  <div className="text-sm text-gray-600">Completed Entries</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {dataService.calculateTotalHours(appData.entries.filter(e => e.end)).toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Total Hours</div>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <>
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Invoice</h2>
                <p className="text-sm text-gray-500">{invoiceData.invoiceNumber}{!finalized && ' (Draft)'}</p>
                <p className="text-xs text-gray-500">{invoiceData.dateRange.start} - {invoiceData.dateRange.end}</p>
              </div>
              <Button variant="secondary" size="small" onClick={clearInvoice}>Back</Button>
            </div>
            <div className="mb-4">
              <div className="font-semibold">{invoiceData.client.name}</div>
              {invoiceData.client.contact && <div className="text-xs text-gray-400">{invoiceData.client.contact}</div>}
            </div>

            {!finalized && (
              <div className="flex flex-wrap gap-2 mb-3">
                <Button size="small" variant="secondary" onClick={selectAll}>Select All</Button>
                <Button size="small" variant="secondary" onClick={clearAll}>Clear All</Button>
                <Button size="small" onClick={finalizeInvoice} disabled={selectedIds.size === 0}>Finalize & Mark Invoiced</Button>
              </div>
            )}

            {finalized && (
              <div className="mb-2 text-xs text-green-600 font-medium">Finalized • {selectedIds.size} items marked invoiced</div>
            )}
            <div className="activity-list">
              {invoiceData.lineItems.map(item => {
                const checked = selectedIds.has(item.id);
                const disabled = finalized;
                return (
                <div key={item.id} className={`individual-job-card ${!checked ? 'opacity-50' : ''}`} style={{position:'relative'}}>
                  {!finalized && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLineItem(item.id)}
                      style={{position:'absolute', top:6, left:6, width:16, height:16}}
                      disabled={disabled}
                      title="Include in invoice"
                    />
                  )}
                  <div className="job-card-content">
                    <div className="job-main-info">
                      <div className="job-title">{item.task}</div>
                      <div className="job-time">{item.date} • {item.hours.toFixed(2)}h @ {dataService.formatCurrency(item.rate)}</div>
                      {item.notes && <div className="job-notes">{item.notes}</div>}
                    </div>
                    <div className="job-actions" style={{alignItems:'flex-end'}}>
                      <div className="stat-value stat-value-success" style={{fontSize:'0.85rem'}}>{dataService.formatCurrency(item.amount)}</div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
            <div className="separator" />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Hours</span>
              <span>{computedTotals.hours.toFixed(2)}h</span>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-2">
              <span>Total Amount</span>
              <span>{dataService.formatCurrency(computedTotals.amount)}</span>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={printInvoice} className="flex-1" size="small">Print</Button>
              <Button variant="secondary" onClick={exportCSV} className="flex-1" size="small">CSV</Button>
            </div>
          </Card>
        </>
      )}
      
      {/* Help Text */}
      {appData.entries.filter(e => e.end).length === 0 && (
        <Card>
          <div className="text-center py-6 text-gray-600">
            <p className="mb-2">No completed time entries found.</p>
            <p>Start tracking time to generate invoices!</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InvoiceTab;
