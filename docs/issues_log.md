# Issues Log

3. Schedule weekly list date displayed one day earlier due to UTC parsing (e.g., 2025-09-08 showed as Sep 7). Fixed by introducing parseLocalDate helper and replacing new Date(string) usage and sorting logic in ScheduleTab. (Resolved)
4. Dashboard (HomeTab) schedule list potentially affected by same UTC shift and new entries started from schedule missing jobId linkage; added parseLocalDate & ensured jobId passed when starting job. (Resolved)
5. Enhancement: Starting a scheduled job did not auto-complete/remove it from schedule. Updated ScheduleTab to mark scheduled job completed when started and added startedAt timestamp. (Resolved)
6. Enhancement: Deleting a client now also removes that client's scheduled jobs and clears active timer if tied to that client. (Resolved)
7. Refactor: Centralized local date parsing via dataService.parseLocalDate in ScheduleTab and added guard preventing starting a scheduled job when a timer is already active. (Resolved)
Date: 2025-09-08

| ID | Category | Description | Status | Fix Summary | Verified |
|----|----------|-------------|--------|-------------|----------|
| 1 | Jobs Creation | Timer start did not create associated job record (Jobs tab empty) after legacy migration removal | Fixed | Added atomic job creation in `TimerTab.startTimer`; added integrity repair in `JobsTab` | Pending |
| 2 | React Warnings | Missing dependency in `EntriesTab` useMemo causing ESLint warning | Fixed | Added `showInvoiced` to dependency array | Pending |

## Details

1. Jobs Creation Failure
   - Observed: After creating first time entry (Pump Overhaul) no job appeared under Open Jobs.
   - Cause: Removal of legacy migration/backfill eliminated implicit job creation; `TimerTab` previously created job only when no selectedJobId but we removed job update due to separate call ordering.
   - Resolution: Rewrote `startTimer` to build `nextJobs` array and include it in a single `updateAppData` call. Added `JobsTab` integrity repair to recover any entries lacking valid job references.

Further issues will be appended below as manual test execution proceeds.

### New Issues Logged 2025-09-08 (Manual Regression Continued)

| ID | Category | Description | Status | Fix Summary | Verified |
|----|----------|-------------|--------|-------------|----------|
| 3 | Data Model | Legacy `tasks` array still persisted in storage despite removal from model | Fixed | Cleanup added in loadData/saveData & App init sanitation | Pending |
| 4 | UX (Timer) | Very short session shows `0m` (no seconds) confusing in Recent Activity | Fixed | formatDuration shows <5s / Ns / <1m for sub-minute | Pending |
| 5 | Invoice UX | Job invoice generation date range confusion (selected week excluded earlier valid date until manual change) | Open | Offer preset: earliest uninvoiced -> today & auto-suggest for job mode | No |
| 6 | Accessibility | Icon-only buttons lack aria-label/title consistently (some have title, not all) | Fixed | Aria-labels added to all icon-only buttons & stat tiles | Pending |
| 7 | Calendar UX | Overdue highlighting requires allowing past dates; need user-facing control rather than silent allowance | Fixed | Added explicit checkbox 'Allow past date scheduling' gating submit | Pending |

| 8 | Invoicing Charges | Cannot invoice charges-only job (no time entries) because job selector filtered by entries only and clientId inference failed | Fixed | Expanded job selector logic to include jobs with uninvoiced charges; added client selector fallback in charges panel | Pending |
| 9 | Mobile Print | Invoice printing fails on mobile devices with "error printing page" message due to popup blocker restrictions | Fixed | Added iframe fallback method for mobile devices; enhanced error handling with user-friendly messages | Pending |

