import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dataService } from '../../utils/dataService';
import { jsPDF } from 'jspdf';

/**
 * Invoice Tab Component
 * Reference: www.context7.com for invoice generation patterns
 */
const InvoiceTab = ({ appData, updateAppData, invoiceContext, clearInvoiceContext }) => {
  const [selectedClient, setSelectedClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoiceData, setInvoiceData] = useState(null); // holds draft or finalized invoice meta & all candidate line items
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [finalized, setFinalized] = useState(false);
  const [mode, setMode] = useState(invoiceContext?.jobId ? 'job' : 'client'); // 'client' | 'job'
  const [selectedJobId, setSelectedJobId] = useState(invoiceContext?.jobId || '');
  const [closeJobOnFinalize, setCloseJobOnFinalize] = useState(false);

  // Get client options
  const clientOptions = appData.clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  // Generate draft invoice data (does NOT mark entries/charges invoiced yet)
  const generateInvoice = () => {
    if (!selectedClient || !startDate || !endDate) {
      alert('Please select a client and date range');
      return;
    }

    if (mode === 'job' && !selectedJobId) {
      alert('Select a job for Job mode');
      return;
    }

    const client = appData.clients.find(c => c.id === selectedClient);
    if (!client) {
      alert('Selected client not found');
      return;
    }

  const start = dataService.parseLocalDate(startDate) || new Date(startDate);
  const end = dataService.parseLocalDate(endDate) || new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end date

    if (start > end) {
      alert('Start date must be before end date');
      return;
    }

    // Get entries for the client and date range
    const clientEntries = appData.entries.filter(entry => {
      if (!entry.end || entry.clientId !== selectedClient) return false;
      if (entry.invoiced) return false; // skip already invoiced
      if (mode === 'job' && entry.jobId !== selectedJobId) return false;
      
      const entryDate = new Date(entry.start);
      return entryDate >= start && entryDate <= end;
    });

    // Get charges for client within date range
    const clientCharges = (appData.charges||[]).filter(ch => {
      if (ch.invoiced) return false;
      if (ch.clientId !== selectedClient) return false;
      if (mode === 'job' && ch.jobId !== selectedJobId) return false;
      const chDate = new Date(ch.createdAt);
      return chDate >= start && chDate <= end;
    });

    if (clientEntries.length === 0 && clientCharges.length === 0) {
      alert('No billable entries or charges found for the selected criteria');
      return;
    }

  // Create candidate line items (all initially selected)
  const timeLineItems = clientEntries.map(entry => {
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

    const chargeLineItems = clientCharges.map(ch => ({
      id: ch.id,
      kind: 'charge',
      chargeType: ch.kind,
      date: dataService.formatDate(ch.createdAt),
      task: ch.description,
      notes: '',
      hours: 0,
  rate: ch.unitPrice,
      quantity: ch.quantity,
  unitCost: ch.unitCost,
      amount: ch.amountCached
    }));

    const lineItems = [...timeLineItems, ...chargeLineItems];

    const jobMeta = mode === 'job' ? (appData.jobs || []).find(j => j.id === selectedJobId) : null;
    const invoice = {
      client,
      dateRange: {
        start: dataService.formatDate(start),
        end: dataService.formatDate(end)
      },
      lineItems,
      job: jobMeta ? { id: jobMeta.id, name: jobMeta.name } : null,
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

  // Finalize invoice: mark selected entries as invoiced & persist snapshot history
  const finalizeInvoice = () => {
    if (!invoiceData) return;
    if (selectedIds.size === 0) {
      alert('Select at least one line item to finalize the invoice.');
      return;
    }
  const updatedEntries = appData.entries.map(e => selectedIds.has(e.id) ? { ...e, invoiced: true } : e);
  const updatedCharges = (appData.charges||[]).map(c => selectedIds.has(c.id) ? { ...c, invoiced: true } : c);
    const snapshot = {
      id: dataService.generateId(),
      invoiceNumber: invoiceData.invoiceNumber,
      clientId: invoiceData.client.id,
      jobId: invoiceData.job?.id || null,
      dateRange: invoiceData.dateRange,
      generatedAt: Date.now(),
      lineItems: selectedLineItems.map(li => ({
        id: li.id,
  kind: li.kind || 'time',
  chargeType: li.chargeType,
        date: li.date,
        task: li.task,
        notes: li.notes,
        hours: li.hours,
        rate: li.rate,
  quantity: li.quantity,
  unitCost: li.unitCost,
        amount: li.amount
      })),
      subtotal: computedTotals.amount,
      total: computedTotals.amount
    };
  let patch = { entries: updatedEntries, charges: updatedCharges, invoices: [...(appData.invoices||[]), snapshot] };
    if (closeJobOnFinalize && invoiceData.job) {
      const updatedJobs = (appData.jobs || []).map(j => j.id === invoiceData.job.id ? { ...j, closed: true, closedAt: Date.now() } : j);
      patch.jobs = updatedJobs;
    }
    updateAppData(patch);
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

  // Export invoice as PDF
  const exportPDF = () => {
    if (!invoiceData) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // Helper function to check if we need a new page
      const checkPageBreak = (heightNeeded) => {
        if (yPos + heightNeeded > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Add logo
      try {
        const logoUrl = `${window.location.origin}${process.env.PUBLIC_URL || ''}/icons/CrickTimeLogo.png`;
        const img = new Image();
        img.src = logoUrl;
        
        // Add logo at top center (we'll continue synchronously, logo will appear if it loads)
        doc.addImage(img, 'PNG', pageWidth / 2 - 15, yPos, 30, 20);
      } catch (logoError) {
        console.log('Logo not loaded, continuing without it');
      }
      
      yPos += 25;

      // Company Header
      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38); // Red color
      doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Crick's Automotive and Equipment LLC", margin, yPos);
      yPos += 5;
      doc.text('Okarche Ok 73762', margin, yPos);
      yPos += 5;
      doc.text('(580) 791-0135', margin, yPos);
      yPos += 10;

      // Invoice Details (right-aligned)
      doc.setFontSize(9);
      doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, pageWidth - margin, yPos - 20, { align: 'right' });
      doc.text(`Date: ${invoiceData.generatedDate}`, pageWidth - margin, yPos - 15, { align: 'right' });
      doc.text(`Period: ${invoiceData.dateRange.start} - ${invoiceData.dateRange.end}`, pageWidth - margin, yPos - 10, { align: 'right' });

      // Bill To Section
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('BILL TO:', margin, yPos);
      yPos += 6;
      doc.setFontSize(11);
      doc.text(invoiceData.client.name, margin, yPos);
      yPos += 5;
      if (invoiceData.client.contact) {
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(invoiceData.client.contact, margin, yPos);
        yPos += 5;
      }
      yPos += 5;

      // Line separator
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Table Header - Changed to black text on white background
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'S'); // Just border, no fill
      doc.setTextColor(0, 0, 0); // Black text
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      
      const colWidths = {
        date: 25,
        task: 60,
        notes: 45,
        hours: 20,
        rate: 20,
        amount: 25
      };
      
      let xPos = margin + 2;
      doc.text('Date', xPos, yPos);
      xPos += colWidths.date;
      doc.text('Task', xPos, yPos);
      xPos += colWidths.task;
      doc.text('Notes', xPos, yPos);
      xPos += colWidths.notes;
      doc.text('Hours', xPos, yPos);
      xPos += colWidths.hours;
      doc.text('Rate', xPos, yPos);
      xPos += colWidths.rate;
      doc.text('Amount', xPos, yPos);
      yPos += 8;

      // Table Rows
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      selectedLineItems.forEach((item, index) => {
        checkPageBreak(10);
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
        }

        xPos = margin + 2;
        doc.text(item.date, xPos, yPos);
        xPos += colWidths.date;
        
        // Truncate long task names
        const taskText = item.task.length > 30 ? item.task.substring(0, 27) + '...' : item.task;
        doc.text(taskText, xPos, yPos);
        xPos += colWidths.task;
        
        // Truncate long notes
        const notesText = item.notes.length > 20 ? item.notes.substring(0, 17) + '...' : item.notes;
        doc.text(notesText, xPos, yPos);
        xPos += colWidths.notes;
        
        doc.text(item.hours.toFixed(2), xPos, yPos);
        xPos += colWidths.hours;
        doc.text(dataService.formatCurrency(item.rate), xPos, yPos);
        xPos += colWidths.rate;
        doc.text(dataService.formatCurrency(item.amount), xPos, yPos);
        
        yPos += 8;
      });

      yPos += 5;

      // Totals Section
      checkPageBreak(30);
      doc.setDrawColor(220, 38, 38);
      doc.line(pageWidth - margin - 60, yPos, pageWidth - margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Total Hours:', pageWidth - margin - 60, yPos);
      doc.text(`${computedTotals.hours.toFixed(2)} hrs`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 8;

      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.text('TOTAL DUE:', pageWidth - margin - 60, yPos);
      doc.text(dataService.formatCurrency(computedTotals.amount), pageWidth - margin, yPos, { align: 'right' });
      
      // Footer
      yPos = pageHeight - 30;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;
      doc.setTextColor(220, 38, 38);
      doc.setFont(undefined, 'bold');
      doc.text('All invoices are due within 30 days of Invoice date.', pageWidth / 2, yPos, { align: 'center' });

      // Save the PDF
      const filename = `invoice-${invoiceData.client.name}-${invoiceData.dateRange.start}-to-${invoiceData.dateRange.end}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Unable to generate PDF. Please try the CSV export option.');
    }
  };

  // Print invoice
  const printInvoice = () => {
    if (!invoiceData) return;

    const printContent = generatePrintHTML({ ...invoiceData, lineItems: selectedLineItems, totals: computedTotals });
    
    const printWindow = window.open('', '_blank');
    
    // Check if window.open was blocked
    if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
      alert('Popup blocked. Please allow popups for this site to print invoices, or use the CSV export option.');
      return;
    }
    
    try {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Give the window time to load content before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          try {
            printWindow.print();
          } catch (error) {
            console.error('Print error:', error);
            alert('Unable to complete print. You can manually print from the preview window, or use the CSV export option.');
          }
        }, 250);
      };
      
      // Fallback if onload doesn't fire (common on mobile)
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.focus();
          try {
            printWindow.print();
          } catch (error) {
            console.error('Print fallback error:', error);
            // Don't show alert here as user already has the window open
          }
        }
      }, 500);
      
    } catch (error) {
      console.error('Print window error:', error);
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      alert('Unable to open print window. Please try the CSV export option.');
    }
  };

  // Generate HTML for printing
  const generatePrintHTML = (invoice) => {
    const base = process.env.PUBLIC_URL || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const logoUrl = `${origin}${base}/icons/CrickTimeLogo.png`;
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice - ${invoice.client.name}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 40px;
            color: #1f2937;
            background: #fff;
        }
        .invoice-container { max-width: 900px; margin: 0 auto; }
        
        /* Top header section - Business | Logo | Invoice Details */
        .top-header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 32px;
            align-items: center;
            padding-bottom: 24px;
            border-bottom: 3px solid #dc2626;
            margin-bottom: 32px;
        }
        
        .business-info {
            text-align: left;
            font-size: 13px;
            line-height: 1.6;
        }
        .business-info .company-name {
            font-size: 16px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 8px;
        }
        .business-info div { color: #4b5563; }
        
        .logo-center {
            text-align: center;
        }
        .logo {
            max-height: 100px;
            max-width: 180px;
            object-fit: contain;
        }
        .logo-hidden {
            display: none;
        }
        
        .invoice-info {
            text-align: right;
            font-size: 13px;
            line-height: 1.6;
        }
        .invoice-info .invoice-title {
            font-size: 32px;
            font-weight: 700;
            color: #dc2626;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        .invoice-info div { color: #4b5563; }
        .invoice-info strong { color: #1f2937; }
        
        /* Bill To section */
        .bill-to-section {
            background: #f9fafb;
            padding: 20px 24px;
            border-radius: 8px;
            margin-bottom: 32px;
            border-left: 4px solid #dc2626;
        }
        .bill-to-section h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .bill-to-section .client-name {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }
        .bill-to-section .client-contact {
            font-size: 14px;
            color: #6b7280;
        }
        
        /* Invoice table */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 13px;
        }
        thead {
            background: #1f2937;
            color: white;
        }
        th {
            padding: 14px 12px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            color: #374151;
        }
        tbody tr:hover {
            background: #f9fafb;
        }
        .amount {
            text-align: right;
            font-weight: 500;
        }
        
        /* Totals section */
        .totals-section {
            margin-top: 24px;
            display: flex;
            justify-content: flex-end;
        }
        .totals-box {
            min-width: 320px;
            background: #1f2937;
            color: white;
            padding: 20px 24px;
            border-radius: 8px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
        }
        .totals-row.total {
            border-top: 2px solid #dc2626;
            margin-top: 8px;
            padding-top: 12px;
            font-size: 18px;
            font-weight: 700;
        }
        
        /* Footer */
        .footer {
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
        }
        .footer p {
            margin: 8px 0;
            font-size: 13px;
            color: #6b7280;
        }
        .terms {
            font-weight: 600;
            color: #dc2626;
            font-size: 14px;
            margin-top: 16px;
        }
        
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
            tbody tr:hover { background: transparent; }
        }
    </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Top Header: Business Info | Logo | Invoice Details -->
    <div class="top-header">
      <!-- Left: Business Info -->
      <div class="business-info">
        <div class="company-name">Crick's Automotive and Equipment LLC</div>
        <div>Okarche Ok 73762</div>
        <div>(580) 791-0135</div>
      </div>
      
      <!-- Center: Logo -->
      <div class="logo-center">
        <img class="logo" src="${logoUrl}" alt="Company Logo" onerror="this.classList.add('logo-hidden')" loading="eager" />
      </div>
      
      <!-- Right: Invoice Info -->
      <div class="invoice-info">
        <div class="invoice-title">INVOICE</div>
        <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
        <div><strong>Date:</strong> ${invoice.generatedDate}</div>
        <div><strong>Period:</strong> ${invoice.dateRange.start} - ${invoice.dateRange.end}</div>
      </div>
    </div>
    
    <!-- Bill To Section -->
    <div class="bill-to-section">
      <h3>Bill To</h3>
      <div class="client-name">${invoice.client.name}</div>
      ${invoice.client.contact ? `<div class="client-contact">${invoice.client.contact}</div>` : ''}
    </div>
    
    <!-- Invoice Line Items Table -->
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Task</th>
          <th>Notes</th>
          <th style="text-align:center">Hours</th>
          <th style="text-align:right">Rate</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems.map(item => `
          <tr>
            <td>${item.date}</td>
            <td><strong>${item.task}</strong></td>
            <td>${item.notes}</td>
            <td style="text-align:center">${item.hours.toFixed(2)}</td>
            <td style="text-align:right">${dataService.formatCurrency(item.rate)}</td>
            <td class="amount">${dataService.formatCurrency(item.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- Totals Section -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row">
          <span>Total Hours:</span>
          <span>${invoice.totals.hours.toFixed(2)} hrs</span>
        </div>
        <div class="totals-row total">
          <span>TOTAL DUE:</span>
          <span>${dataService.formatCurrency(invoice.totals.amount)}</span>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>Thank you for your business!</p>
      <p class="terms">All invoices are due within 30 days of Invoice date.</p>
      <p style="margin-top:16px; color:#9ca3af; font-size:12px;">Generated by Mechanic Hours</p>
    </div>  </div>
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
    setSelectedJobId('');
    setMode('client');
    setCloseJobOnFinalize(false);
    clearInvoiceContext && clearInvoiceContext();
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

            <div className="flex gap-2 mb-3">
              <Button size="small" variant={mode==='client'?'primary':'secondary'} onClick={()=>setMode('client')} aria-label="Invoice by client">By Client</Button>
              <Button size="small" variant={mode==='job'?'primary':'secondary'} onClick={()=>setMode('job')} aria-label="Invoice by job">By Job</Button>
            </div>
            
            <Select
              label="Client"
              value={selectedClient}
              onChange={(e) => { setSelectedClient(e.target.value); if(mode==='job') setSelectedJobId(''); }}
              options={clientOptions}
              placeholder="Select a client"
            />

      {mode === 'job' && selectedClient && (
              <div className="mb-3">
                <label className="input-label">Job</label>
                <select
                  className="select"
                  value={selectedJobId}
                  onChange={(e)=>setSelectedJobId(e.target.value)}
                >
                  <option value="">-- Select Job --</option>
                  {(appData.jobs||[])
                    .filter(j=>!j.closed)
        .filter(j=> {
          const hasBillableEntries = (appData.entries||[]).some(e=>e.jobId===j.id && e.clientId===selectedClient && e.end && !e.invoiced);
          const hasBillableCharges = (appData.charges||[]).some(c=>c.jobId===j.id && c.clientId===selectedClient && !c.invoiced);
          return hasBillableEntries || hasBillableCharges;
        })
                    .sort((a,b)=>a.name.localeCompare(b.name))
                    .map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                </select>
              </div>
            )}
            
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
              <Button variant="secondary" size="small" onClick={setThisWeek} aria-label="Set date range to this week">
                This Week
              </Button>
              <Button variant="secondary" size="small" onClick={setThisMonth} aria-label="Set date range to this month">
                This Month
              </Button>
              <Button variant="secondary" size="small" onClick={setLastMonth} aria-label="Set date range to last month">
                Last Month
              </Button>
            </div>
            
            <Button 
              onClick={generateInvoice}
              className="w-full"
              disabled={!selectedClient || !startDate || !endDate || (mode==='job' && !selectedJobId)}
            >
              📄 Generate {mode==='job' ? 'Job' : 'Client'} Invoice
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
          {/* Invoice History Stub */}
          { (appData.invoices && appData.invoices.length > 0) && (
            <Card>
              <h3 className="text-lg font-semibold mb-3">Invoice History</h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {appData.invoices.slice().sort((a,b)=>b.generatedAt - a.generatedAt).map(inv => {
                  const client = appData.clients.find(c=>c.id===inv.clientId);
                  return (
                    <div key={inv.id} className="individual-job-card" style={{marginBottom:0}}>
                      <div className="job-card-content" style={{alignItems:'center'}}>
                        <div className="job-main-info">
                          <div className="job-title">{inv.invoiceNumber}</div>
                          <div className="schedule-compact-row">
                            <span className="job-time">{inv.dateRange.start} → {inv.dateRange.end}</span>
                            <span className="schedule-meta-divider">•</span>
                            <span className="job-client">{client?.name || 'Unknown Client'}</span>
                            <span className="schedule-meta-divider">•</span>
                            <span className="job-time">{dataService.formatCurrency(inv.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                <p className="text-sm text-gray-500">{invoiceData.invoiceNumber}{!finalized && ' (Draft)'} {invoiceData.job && <span className="ml-1 px-1 rounded bg-blue-600 text-white text-xs">Job: {invoiceData.job.name}</span>}</p>
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
                <Button size="small" variant="secondary" onClick={selectAll} aria-label="Select all line items">Select All</Button>
                <Button size="small" variant="secondary" onClick={clearAll} aria-label="Clear all line items">Clear All</Button>
                <Button size="small" onClick={finalizeInvoice} disabled={selectedIds.size === 0} aria-label="Finalize invoice and mark entries invoiced">Finalize & Mark Invoiced</Button>
                {invoiceData.job && (
                  <label className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                    <input type="checkbox" checked={closeJobOnFinalize} onChange={()=>setCloseJobOnFinalize(v=>!v)} /> Close Job
                  </label>
                )}
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
                      {item.kind === 'charge' ? (
                        <div className="job-time">{item.date} • {item.quantity} x {dataService.formatCurrency(item.rate)}</div>
                      ) : (
                        <div className="job-time">{item.date} • {item.hours.toFixed(2)}h @ {dataService.formatCurrency(item.rate)}</div>
                      )}
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
            <div className="flex gap-2 mt-4 justify-center">
              <Button onClick={exportPDF} size="small" aria-label="Save invoice as PDF">📄 Save PDF</Button>
              <Button onClick={printInvoice} size="small" variant="secondary" aria-label="Print invoice">Print</Button>
              <Button variant="secondary" onClick={exportCSV} size="small" aria-label="Export invoice CSV">CSV</Button>
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
