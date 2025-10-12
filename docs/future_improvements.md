# Future Improvements

Collected during manual regression on 2025-09-08.

## Data Model & Persistence
- Remove legacy `tasks` array from persisted `mechanicHoursData` for cleanliness and potential footprint reduction.
- On load, perform a lightweight normalization pass (strip unknown keys, ensure jobs, scheduledJobs arrays exist).
- Consider adding a data version field for future migrations.

## Timer / UX
- Show seconds for durations under 1 minute (currently displays 0m, confusing in recent list).
- Provide a quick "Resume last job" button when no active timer.
- Autosave notes debounce to reduce frequent state writes.

## Jobs
- Add job description or tags field for richer context (optional text area) and future filtering.
- Provide sorting toggle (name, hours, amount) instead of fixed name/closedAt ordering.

## Scheduling
- Add recurrence (e.g., weekly) for common maintenance tasks.
- Color indicators in calendar for overdue vs today vs future (distinct styles / legend).
- Inline quick add on calendar day cell (FAB or + icon) rather than only top button.
- Drag-and-drop to move scheduled jobs to a different date.

## Entries
- Bulk edit or bulk delete selected entries.
- Show associated Job name explicitly as a badge.
- Add export filtered entries to CSV from Entries tab.

## Invoicing
- Allow tax/discount lines and custom footer notes.
- Support multiple currency/locale formatting based on client profile.
- Keep a persisted invoices collection (with immutable snapshot of line items) for historical referencing.
- Add PDF generation directly (jsPDF or browser print styling improvements) with a more official layout.

## Validation & Errors
- Contextual inline validation instead of alert popups for missing form data.
- Prevent scheduling a job in the past (except when intentionally testing) with a toggle/override rather than unconditional allowance.

## Performance
- Memoize heavy derived calculations: entries totals, jobStats. (Currently acceptable, but may degrade with thousands of entries.)
- Lazy load large lists with virtual scrolling in Entries when count grows.

## Accessibility
- Add ARIA labels to icon-only buttons (e.g., ✓, 💵) for screen readers.
- Ensure focus outline styling visible in dark theme.

## Testing Enhancements
- Add unit tests for dataService (formatting, calculations, parseLocalDate) and integration tests for invoice finalize flow.
- Snapshot test for invoice print HTML template to detect regressions.

## Offline & Backup
- Implement periodic automatic JSON backup download or prompt.
- Add (future) Google Drive OAuth flow and backup scheduler.

## Security / Integrity
- Simple checksum or hash for localStorage blob to detect manual tampering and optionally repair.

## UI/Design
- Dark/light theme toggle.
- Consistent icon set (replace emoji with vector icons).
- Responsive grid improvements on larger screens (two-column layout for Dashboard).

## Analytics / Insights
- Add weekly/monthly summary charts (hours per client, revenue per job).

## Internationalization (i18n)
- Externalize strings to a messages file for translation readiness.

## Dev Tooling
- ESLint + Prettier config enforcement and pre-commit hook.
- Add TypeScript migration plan (start with data types and props interfaces).

