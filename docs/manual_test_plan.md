# Mechanic Hours Application Manual Test Plan

Version: 2025-09-08
Scope: Full functional regression via Playwright MCP (manual scripted interactions) without automated test runner.

## 1. Environment & Persistence
- Launch app (dev server). Verify no console errors.
- First load localStorage structure keys exist: clients, entries, scheduledJobs, jobs, active.
- Refresh page: data persists.
- Hard reload (cache clear) still loads data.

## 2. (Removed) Legacy Migration
- No migration path required; fresh data uses jobs directly.

## 3. Clients Management
- Add client with name, contact, rate.
- Validation: empty name blocked; negative rate blocked.
- Edit existing client: change name and rate persists after refresh.
- Delete client: related entries removed.
- Currency formatting ($xx.xx/hour) displays correctly.

## 4. Timer / Time Tracking
- Attempt start with no client or job: gets alert.
- Start timer selecting client + new job name.
- Verify job auto-created (Jobs tab) if new.
- Elapsed timer increments each second.
- Add notes during active timer: notes persisted in entry.
- Stop timer: entry gains end timestamp; appears in Recent Activity (Timer & Home tabs).
- Start second entry using existing open job via dropdown; confirm no duplicate job created.
- Resume with different job while another entry is active is blocked (must stop first).

## 5. Jobs Management
- Open Jobs list shows created jobs (open state).
- Close job: moves to Closed list, shows closed date.
- Reopen job: returns to Open list.
- Metrics hours & amount reflect sum of related completed entries; verify rounding (two entries w/ known durations).
- Invoice button navigates to Invoice tab with job context (mode=job, job preselected) and only that job's entries.

## 6. Scheduling
- Create scheduled job using existing job.
- Create scheduled job with new job name (auto-creates job and associates jobId).
- Required field validation (client, job, date) enforced.
- Calendar month navigation works (Prev/Next updates grid).
- Day cell with >2 jobs shows "+N more" indicator.
- Clicking day with jobs opens modal listing jobs sorted by time.
- Start job from modal: timer starts (Timer tab shows running with job info); modal closes.
- Mark scheduled job complete from list: disappears from Schedule and Home weekly list.
- Delete scheduled job: removed.
- Overdue vs Today badges display correctly (manipulate system date or schedule past/today dates).

## 7. Dashboard (Home)
- Weekly count matches number of non-completed scheduled jobs in current week.
- Recent Jobs count matches recent entries displayed.
- Outstanding shows currency total for all uninvoiced, completed entries; updates after creating invoice (see Invoicing).
- Start timer from today's scheduled job (▶️) navigates to Timer.

## 8. Entries Management
- List shows only completed entries.
- Filter by client: only that client's entries show.
- Filter by date: only matching date entries show.
- Search across client name, task name, notes works (case-insensitive).
- Toggle Show invoiced: hides invoiced entries when off.
- Edit entry: change times, notes; durations & amount recalc.
- Invalid edit validations (end before start, future times) block update.
- Delete entry removes from lists and totals.
- Undo invoiced removes invoiced badge and re-includes in outstanding totals.
- Totals at top recalc with filters applied.

## 9. Invoicing (Client Mode)
- Select client + date range containing completed entries; generate invoice.
- Draft shows all entries not already invoiced within range.
- Line item details: date, task, notes, hours (2 decimals), rate, amount.
- Select All / Clear All toggles selection states & totals.
- Deselect some items: totals update accordingly.
- Finalize invoices: selected entries flagged invoiced; badge appears in Entries tab.
- Back navigation clears draft state.
- CSV export downloads file with headers + TOTAL row; numeric formatting (two decimals).
- Print opens new window with invoice layout.

## 10. Invoicing (Job Mode)
- From Jobs tab invoice button: Invoice tab opens in Job mode, job pre-selected, only entries for job listed.
- Close Job checkbox available before finalize when job mode & job open.
- Finalize with Close Job enabled: job moves to Closed Jobs list; entries marked invoiced.
- Finalize without Close Job: job remains open.
- Attempt to create job invoice with no entries in range: alert shown.

## 11. Job / Entry Consistency
- Creating entries via timer adds jobId and taskName consistent with selected/created job name.
- Scheduled job start also includes jobId linking to same job metrics.
- Closing a job removes it from job dropdowns (Timer & Schedule add form).
- Reopening job returns it to dropdowns.

## 12. Data Formatting & Utilities
- Duration display increments (Timer) matches formatDuration logic (e.g., 1h 05m, 45m).
- Amount calculations consistent: hours * client rate; verify with known rate & 30m (0.5h) entry.
- formatDate outputs 'Mon DD, YYYY' style; formatTime HH:MM 12-hour with leading zeros.

## 13. Persistence & Refresh Scenarios
- After multiple operations (clients, jobs, entries, invoicing), refresh page: all states persist (except invoice draft & invoiceContext which reset intentionally).
- After closing job and refreshing, job stays closed.

## 14. Edge Cases
- Starting timer right after scheduling new job: job present in Timer dropdown.
- Start timer with job name differing only by case from existing job: reuses existing job (no duplicate case variant).
- Attempt invoice generation when all candidate entries already invoiced: alert and no draft created.
- Delete client whose entries were invoiced: entries removed; Outstanding recalculates.
- Import/export (if UI present elsewhere) – N/A (not exposed in current tabs, skip).

## 15. Accessibility & UI Smoke
- All primary actions accessible via buttons with discernible text/emoji.
- No uncaught errors in console during full flow.
- Layout responsive (narrow viewport: nav icons available and tabs switch correctly).

## 16. Performance (Manual Observation)
- Switching tabs instant (no perceivable lag with <100 entries).
- Timer tick does not freeze UI.

## 17. PWA / Offline (Basic)
- App loads with service worker registered (if configured); offline reload after first load still serves UI (basic check in DevTools).

---

## Execution Tracking Template
| Section | Status | Notes |
|---------|--------|-------|
| Env & Persistence | | |
| (Legacy Migration N/A) | N/A | Removed feature |
| Clients | | |
| Timer | | |
| Jobs | | |
| Scheduling | In Progress | Date offset fix + centralized parse + start guard; retest pending |
| Dashboard | Updated | Local date parsing fix applied |
| Entries | | |
| Invoicing Client | | |
| Invoicing Job | | |
| Consistency | Updated | Client deletion cascade & scheduled start auto-complete verified pending retest |
| Formatting | | |
| Persistence Refresh | | |
| Edge Cases | | |
| Accessibility/UI | | |
| Performance | | |
| PWA/Offline | | |

Fill the table while manually driving Playwright MCP interactions.
