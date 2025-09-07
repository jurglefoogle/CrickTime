import React, { useState } from 'react';
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
  const [invoiceData, setInvoiceData] = useState(null);

  // Get client options
  const clientOptions = appData.clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  // Generate invoice data
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
      
      const entryDate = new Date(entry.start);
      return entryDate >= start && entryDate <= end;
    });

    if (clientEntries.length === 0) {
      alert('No entries found for the selected client and date range');
      return;
    }

    // Create invoice data
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

    const totalHours = lineItems.reduce((sum, item) => sum + item.hours, 0);
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

    const invoice = {
      client,
      dateRange: {
        start: dataService.formatDate(start),
        end: dataService.formatDate(end)
      },
      lineItems,
      totals: {
        hours: totalHours,
        amount: totalAmount
      },
      generatedDate: dataService.formatDate(new Date()),
      invoiceNumber: `INV-${Date.now()}`
    };

    setInvoiceData(invoice);
  };

  // Export invoice as CSV
  const exportCSV = () => {
    if (!invoiceData) return;

    const headers = ['Date', 'Task', 'Notes', 'Hours', 'Rate', 'Amount'];
    const rows = invoiceData.lineItems.map(item => [
      item.date,
      item.task,
      item.notes,
      item.hours.toFixed(2),
      item.rate.toFixed(2),
      item.amount.toFixed(2)
    ]);

    // Add totals row
    rows.push(['', '', 'TOTAL', invoiceData.totals.hours.toFixed(2), '', invoiceData.totals.amount.toFixed(2)]);

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
    const printContent = generatePrintHTML(invoiceData);
    
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
          {/* Generated Invoice */}
          <Card>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary-600">INVOICE</h2>
                <p className="text-gray-600">Mechanic Hours Time Tracking</p>
              </div>
              <Button variant="secondary" onClick={clearInvoice}>
                ← Back
              </Button>
            </div>
            
            {/* Invoice Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
                <div className="text-lg font-semibold">{invoiceData.client.name}</div>
                {invoiceData.client.contact && (
                  <div className="text-gray-600">{invoiceData.client.contact}</div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Invoice Details:</h3>
                <div><strong>Invoice #:</strong> {invoiceData.invoiceNumber}</div>
                <div><strong>Date:</strong> {invoiceData.generatedDate}</div>
                <div><strong>Period:</strong> {invoiceData.dateRange.start} - {invoiceData.dateRange.end}</div>
              </div>
            </div>
            
            {/* Line Items */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Task</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Notes</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Hours</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Rate</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.lineItems.map(item => (
                    <tr key={item.id}>
                      <td className="border border-gray-300 px-4 py-2">{item.date}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.task}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">{item.notes}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.hours.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{dataService.formatCurrency(item.rate)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-medium">{dataService.formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 px-4 py-2" colSpan="3">TOTAL</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{invoiceData.totals.hours.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                    <td className="border border-gray-300 px-4 py-2 text-right text-lg">{dataService.formatCurrency(invoiceData.totals.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={printInvoice} className="flex-1">
                🖨️ Print Invoice
              </Button>
              <Button variant="secondary" onClick={exportCSV} className="flex-1">
                📊 Export CSV
              </Button>
            </div>
            
            <div className="text-center mt-6 text-sm text-gray-500">
              Generated by Mechanic Hours - www.context7.com
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
