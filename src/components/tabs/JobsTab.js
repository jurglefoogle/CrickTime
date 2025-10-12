import React, { useMemo, useEffect, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { dataService } from '../../utils/dataService';

/**
 * Jobs Tab
 * Shows open & closed jobs with ability to close and invoice.
 */
const JobsTab = ({ appData, updateAppData, onNavigate, onInvoiceJob }) => {
  const jobs = appData.jobs || [];
  const charges = appData.charges || [];
  const [expandedChargesJobId, setExpandedChargesJobId] = useState(null);
  const [chargeForm, setChargeForm] = useState({ kind:'part', description:'', quantity:'1', unitCost:'', unitPrice:'', clientId:'', category:'' });
  const [editingChargeId, setEditingChargeId] = useState(null);
  const [editDraft, setEditDraft] = useState(null); // { id, description, quantity, unitCost, unitPrice, category }
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');
  useEffect(() => {
    const entries = appData.entries || [];
    const currentJobs = appData.jobs || [];
    const missingJobEntries = entries.filter(e => e.taskName && (!e.jobId || !currentJobs.find(j => j.id === e.jobId)));
    if (!missingJobEntries.length) return;
    const additions = [];
    const updates = [];
    missingJobEntries.forEach(e => {
      const name = e.taskName.trim();
      let job = currentJobs.find(j => j.name.toLowerCase() === name.toLowerCase());
      if (!job) {
        job = { id: dataService.generateId(), name, closed: false, createdAt: Date.now() };
        additions.push(job);
      }
      if (!e.jobId) updates.push({ entryId: e.id, jobId: job.id });
    });
    if (additions.length || updates.length) {
      const updatedJobs = [...currentJobs, ...additions];
      const updatedEntries = entries.map(e => {
        const upd = updates.find(u => u.entryId === e.id);
        return upd ? { ...e, jobId: upd.jobId } : e;
      });
      updateAppData({ jobs: updatedJobs, entries: updatedEntries });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Legacy auto-derivation removed.

  const openJobs = jobs.filter(j => !j.closed);
  const closedJobs = jobs.filter(j => j.closed);

  // Aggregate metrics for jobs
  const jobStats = useMemo(() => {
    const map = {};
    (appData.entries || []).forEach(e => {
      const jobId = e.jobId;
      if (!jobId) return;
      if (!map[jobId]) map[jobId] = { hours: 0, amount: 0 };
      if (e.end) {
        const client = appData.clients.find(c => c.id === e.clientId);
        const hours = dataService.durationToHours(e.end - e.start);
        map[jobId].hours += hours;
        map[jobId].amount += client ? hours * client.rate : 0;
      }
    });
    return map;
  }, [appData.entries, appData.clients]);

  const closeJob = (job) => {
    if (!window.confirm(`Close job "${job.name}"? It will be hidden from selection.`)) return;
    updateAppData({ jobs: jobs.map(j => j.id === job.id ? { ...j, closed: true, closedAt: Date.now() } : j) });
  };

  const reopenJob = (job) => {
    updateAppData({ jobs: jobs.map(j => j.id === job.id ? { ...j, closed: false, closedAt: null } : j) });
  };

  // ---- Charges Helpers (Phase 1 Parts & Expenses) ----
  const chargesForJob = (jobId) => charges.filter(c => c.jobId === jobId);

  const addCharge = (job) => {
    const desc = chargeForm.description.trim();
    if (!desc) { alert('Description required'); return; }
    const qty = parseFloat(chargeForm.quantity)||0; if (qty<=0){ alert('Quantity must be > 0'); return; }
    const unitCost = parseFloat(chargeForm.unitCost)||0; if (unitCost<0){ alert('Unit cost >= 0'); return; }
    const unitPrice = chargeForm.unitPrice ? parseFloat(chargeForm.unitPrice) : unitCost;
    if (unitPrice < 0) { alert('Unit price >= 0'); return; }
    const amountCached = qty * unitPrice;
    // Determine client: prefer explicit selection on form if present
    const inferredClientId = (appData.entries.find(e=>e.jobId===job.id)?.clientId) || chargeForm.clientId || (appData.clients[0]?.id)||'';
    if (!inferredClientId) { alert('Select a client for this charge.'); return; }
    const newCharge = {
      id: dataService.generateId(),
      jobId: job.id,
      clientId: inferredClientId,
      kind: chargeForm.kind,
      description: desc,
      quantity: qty,
      unitCost,
      unitPrice,
  category: chargeForm.kind === 'expense' ? (chargeForm.category || 'other') : undefined,
      amountCached,
      createdAt: Date.now(),
      invoiced: false
    };
    updateAppData({ charges: [...charges, newCharge] });
    setChargeForm({ kind:'part', description:'', quantity:'1', unitCost:'', unitPrice:'', clientId: chargeForm.clientId||'' });
  };

  const deleteCharge = (chargeId) => {
    if (!window.confirm('Delete this charge?')) return;
    updateAppData({ charges: charges.filter(c => c.id !== chargeId) });
  };
  const beginEdit = (charge) => {
    if (charge.invoiced) return;
    setEditingChargeId(charge.id);
    setEditDraft({ ...charge, quantity: String(charge.quantity), unitCost: String(charge.unitCost), unitPrice: String(charge.unitPrice), description: charge.description, category: charge.category || '' });
  };

  const cancelEdit = () => {
    setEditingChargeId(null);
    setEditDraft(null);
  };

  const saveEdit = () => {
    if (!editDraft) return;
    const desc = editDraft.description.trim(); if (!desc) { alert('Description required'); return; }
    const qty = parseFloat(editDraft.quantity)||0; if (qty<=0){ alert('Qty > 0'); return; }
    const unitCost = parseFloat(editDraft.unitCost)||0; if (unitCost<0){ alert('Cost >=0'); return; }
    const unitPrice = parseFloat(editDraft.unitPrice)||0; if (unitPrice<0){ alert('Price >=0'); return; }
    const amountCached = qty * unitPrice;
    const updated = charges.map(c => c.id === editDraft.id ? { ...c, description: desc, quantity: qty, unitCost, unitPrice, amountCached, category: c.kind==='expense' ? (editDraft.category||'other') : undefined } : c);
    updateAppData({ charges: updated });
    cancelEdit();
  };

  const parseBulk = (job) => {
    const lines = bulkText.split(/\r?\n/).map(l=>l.trim()).filter(l=>l);
    if (!lines.length) { alert('No lines to import'); return; }
    const newOnes = [];
    for (const line of lines) {
      // description,qty,cost,price,kind(optional),category(optional)
      const parts = line.split(',').map(p=>p.trim());
      if (parts.length < 4) { continue; }
      let [description, qtyStr, costStr, priceStr, kindStr, catStr] = parts;
      const qty = parseFloat(qtyStr)||0; if (qty<=0) continue;
      const unitCost = parseFloat(costStr)||0; if (unitCost<0) continue;
      const unitPrice = parseFloat(priceStr); const finalPrice = isNaN(unitPrice)?unitCost:unitPrice;
      const kind = (kindStr==='expense' || kindStr==='part') ? kindStr : 'part';
      const category = kind==='expense' ? (catStr || 'other') : undefined;
      const amountCached = qty * finalPrice;
      const inferredClientId = (appData.entries.find(e=>e.jobId===job.id)?.clientId) || chargeForm.clientId || (appData.clients[0]?.id)||'';
      newOnes.push({ id: dataService.generateId(), jobId: job.id, clientId: inferredClientId, kind, description, quantity: qty, unitCost, unitPrice: finalPrice, amountCached, createdAt: Date.now(), invoiced: false, category });
    }
    if (!newOnes.length) { alert('No valid lines parsed'); return; }
    updateAppData({ charges: [...charges, ...newOnes] });
    setBulkText('');
    setShowBulkAdd(false);
  };

  const formatCurrency = (v) => dataService.formatCurrency(v);


  return (
    <div className="tab-content">
      <Card>
        <h2 className="page-title">Jobs</h2>
        <p className="text-xs text-gray-400">Manage open jobs and invoice work per job.</p>
      </Card>

      <Card>
        <div className="card-header">
          <h3 className="card-title">Open Jobs ({openJobs.length})</h3>
        </div>
        {openJobs.length === 0 ? (
          <div className="empty-state"><p className="empty-state-text">No open jobs</p></div>
        ) : (
          <div className="activity-list">
            {openJobs.sort((a,b)=>a.name.localeCompare(b.name)).map(job => {
              const stats = jobStats[job.id] || { hours:0, amount:0 };
              return (
                <div key={job.id} className="individual-job-card" style={{marginBottom:0}}>
                  <div className="job-card-content">
                    <div className="job-main-info">
                      <div className="job-title">{job.name}</div>
                      <div className="job-time">{stats.hours.toFixed(2)}h • {dataService.formatCurrency(stats.amount)}</div>
                      {job.closed && <div className="job-status"><span className="status-overdue">Closed</span></div>}
                    </div>
                    <div className="job-actions">
                      <Button size="small" variant="primary" className="btn-wide" onClick={() => onInvoiceJob(job.id)} title="Invoice job" aria-label={`Generate invoice for job ${job.name}`}>Invoice</Button>
                      <Button size="small" variant="secondary" className="btn-wide" onClick={() => closeJob(job)} title="Close job" aria-label={`Close job ${job.name}`}>Close</Button>
                      <Button size="small" variant="secondary" className="btn-wide" onClick={() => setExpandedChargesJobId(expandedChargesJobId===job.id?null:job.id)} aria-label={`Toggle charges for job ${job.name}`}>{expandedChargesJobId===job.id ? 'Hide Charges' : 'Charges'}</Button>
                    </div>
                  </div>
                  {expandedChargesJobId === job.id && (
                    <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-200">
                      <div className="text-xs font-semibold mb-1">Charges</div>
                                        {/* Client selector if multiple clients or no inferred client */}
                                        {(!appData.entries.some(e=>e.jobId===job.id) && (appData.clients||[]).length > 1) && (
                                          <div className="mb-1">
                                            <select
                                              className="border rounded px-1 py-0.5 text-[11px] w-full"
                                              value={chargeForm.clientId || ''}
                                              onChange={e=>setChargeForm(f=>({...f, clientId: e.target.value}))}
                                              aria-label="Charge client"
                                            >
                                              <option value="">-- Select Client --</option>
                                              {(appData.clients||[]).map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                          </div>
                                        )}
                      {chargesForJob(job.id).length === 0 ? (
                        <div className="text-xs text-gray-500 mb-2">No charges</div>
                      ) : (
                        <div className="space-y-1 mb-2">
                          {chargesForJob(job.id).map(ch => {
                            const isEditing = ch.id === editingChargeId;
                            const margin = ch.unitPrice > 0 ? ((ch.unitPrice - ch.unitCost)/ch.unitPrice)*100 : 0;
                            return (
                              <div key={ch.id} className="bg-white rounded px-2 py-1 border border-gray-200 text-[11px]">
                                {isEditing ? (
                                  <div className="grid grid-cols-12 gap-1 items-center">
                                    <input className="col-span-3 border rounded px-1 py-0.5" value={editDraft.description} onChange={e=>setEditDraft(d=>({...d, description:e.target.value}))} />
                                    <input className="col-span-1 border rounded px-1 py-0.5" type="number" value={editDraft.quantity} onChange={e=>setEditDraft(d=>({...d, quantity:e.target.value}))} />
                                    <input className="col-span-1 border rounded px-1 py-0.5" type="number" value={editDraft.unitCost} onChange={e=>setEditDraft(d=>({...d, unitCost:e.target.value}))} />
                                    <input className="col-span-1 border rounded px-1 py-0.5" type="number" value={editDraft.unitPrice} onChange={e=>setEditDraft(d=>({...d, unitPrice:e.target.value}))} />
                                    {ch.kind==='expense' && (
                                      <select className="col-span-2 border rounded px-1 py-0.5" value={editDraft.category} onChange={e=>setEditDraft(d=>({...d, category:e.target.value}))}>
                                        <option value="">(cat)</option>
                                        <option value="shipping">Shipping</option>
                                        <option value="disposal">Disposal</option>
                                        <option value="diagnostic">Diagnostic</option>
                                        <option value="other">Other</option>
                                      </select>
                                    )}
                                    <div className="col-span-1 text-right font-medium">{formatCurrency((parseFloat(editDraft.quantity)||0)*(parseFloat(editDraft.unitPrice)||0))}</div>
                                    <div className="col-span-2 flex gap-1 justify-end">
                                      <button className="text-green-600 text-xs font-semibold" onClick={saveEdit} aria-label="Save charge edit">Save</button>
                                      <button className="text-gray-500 text-xs" onClick={cancelEdit} aria-label="Cancel edit">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center">
                                    <div className="truncate" title={ch.description}>
                                      {ch.kind === 'part' ? '🧩' : '🧾'} {ch.description} ({ch.quantity} x {dataService.formatCurrency(ch.unitPrice)}){ch.kind==='expense' && ch.category ? ` • ${ch.category}`:''}
                                      <span className="ml-1 text-[10px] text-gray-400">{margin.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{dataService.formatCurrency(ch.amountCached)}</span>
                                      {!ch.invoiced && <>
                                        <button className="text-blue-600 text-xs underline" onClick={()=>beginEdit(ch)} aria-label="Edit charge">Edit</button>
                                        <button className="text-red-500 text-xs underline" onClick={()=>deleteCharge(ch.id)} aria-label="Delete charge">Delete</button>
                                      </>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {/* Per-job totals */}
                          <div className="flex justify-between text-[11px] font-semibold border-t pt-1 mt-1">
                            <span>Charges Total</span>
                            <span>{formatCurrency(chargesForJob(job.id).reduce((s,c)=>s+c.amountCached,0))}</span>
                          </div>
                        </div>
                      )}
                      {/* Bulk Add Toggle */}
                      <div className="mb-2">
                        {!showBulkAdd ? (
                          <button className="text-[10px] text-blue-600 underline" onClick={()=>setShowBulkAdd(true)} aria-label="Show bulk add charges">Bulk Add CSV</button>
                        ) : (
                          <div className="mb-2">
                            <textarea className="w-full border rounded p-1 text-[10px] h-16 mb-1" placeholder="description,qty,cost,price,kind(optional),category(optional)" value={bulkText} onChange={e=>setBulkText(e.target.value)} />
                            <div className="flex gap-2">
                              <button className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded" onClick={()=>parseBulk(job)} aria-label="Import bulk charges">Import</button>
                              <button className="text-[10px] text-gray-600 underline" onClick={()=>{setShowBulkAdd(false); setBulkText('');}} aria-label="Cancel bulk add">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        <select className="border rounded px-1 py-0.5 text-[11px] col-span-1" value={chargeForm.kind} onChange={e=>setChargeForm(f=>({...f, kind:e.target.value}))} aria-label="Charge kind">
                          <option value="part">Part</option>
                          <option value="expense">Expense</option>
                        </select>
                        <input className="border rounded px-1 py-0.5 text-[11px] col-span-2" placeholder="Description" value={chargeForm.description} onChange={e=>setChargeForm(f=>({...f, description:e.target.value}))} />
                        <input className="border rounded px-1 py-0.5 text-[11px]" placeholder="Qty" type="number" min="0.01" step="0.01" value={chargeForm.quantity} onChange={e=>setChargeForm(f=>({...f, quantity:e.target.value}))} />
                        <input className="border rounded px-1 py-0.5 text-[11px]" placeholder="Cost" type="number" min="0" step="0.01" value={chargeForm.unitCost} onChange={e=>setChargeForm(f=>({...f, unitCost:e.target.value}))} />
                        <input className="border rounded px-1 py-0.5 text-[11px] col-span-2" placeholder="Price" type="number" min="0" step="0.01" value={chargeForm.unitPrice} onChange={e=>setChargeForm(f=>({...f, unitPrice:e.target.value}))} />
                        {chargeForm.kind==='expense' && (
                          <select className="border rounded px-1 py-0.5 text-[11px] col-span-1" value={chargeForm.category} onChange={e=>setChargeForm(f=>({...f, category:e.target.value}))} aria-label="Expense category">
                            <option value="">Cat</option>
                            <option value="shipping">Ship</option>
                            <option value="disposal">Disp</option>
                            <option value="diagnostic">Diag</option>
                            <option value="other">Other</option>
                          </select>
                        )}
                        <button className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-0.5 text-[11px] col-span-1" type="button" onClick={()=>addCharge(job)} title="Add charge">Add</button>
                      </div>
                      <div className="text-[10px] text-gray-400">Leave Price empty to use Cost. Amount auto-calculated.</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="card-header">
          <h3 className="card-title">Closed Jobs ({closedJobs.length})</h3>
        </div>
        {closedJobs.length === 0 ? (
          <div className="empty-state"><p className="empty-state-text">No closed jobs</p></div>
        ) : (
          <div className="activity-list">
            {closedJobs.sort((a,b)=>b.closedAt - a.closedAt).map(job => {
              const stats = jobStats[job.id] || { hours:0, amount:0 };
              return (
                <div key={job.id} className="individual-job-card opacity-70" style={{marginBottom:0}}>
                  <div className="job-card-content">
                    <div className="job-main-info">
                      <div className="job-title">{job.name}</div>
                      <div className="job-time">{stats.hours.toFixed(2)}h • {dataService.formatCurrency(stats.amount)}</div>
                      <div className="job-client text-xs text-gray-400">Closed {job.closedAt ? new Date(job.closedAt).toLocaleDateString() : ''}</div>
                    </div>
                    <div className="job-actions">
                      <Button size="small" variant="secondary" className="btn-wide" onClick={() => reopenJob(job)} title="Re-open job" aria-label={`Re-open job ${job.name}`}>Re-open</Button>
                      <Button size="small" variant="primary" className="btn-wide" onClick={() => onInvoiceJob(job.id)} title="Invoice again" aria-label={`Generate another invoice for job ${job.name}`}>Invoice</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default JobsTab;
