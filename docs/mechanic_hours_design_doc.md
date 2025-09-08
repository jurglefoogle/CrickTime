# Mechanic Hours --- Design Document

## Overview

Mechanic Hours is a mobile-friendly application designed for independent
mechanics and small workshops. It enables users to easily track billable
hours worked on machinery for repeat customers, and to generate invoices
from those hours. The system emphasizes simplicity, offline-first usage,
and mobile accessibility.

------------------------------------------------------------------------

## Objectives

-   Provide a **simple, mobile-first interface** to log time spent on
    customer jobs.
-   Support **repeat customers** with multiple ongoing tasks.
-   Allow **start/stop timers** for work sessions as well as manual
    edits.
-   Enable users to **review past entries** and **generate invoices**.
-   Ensure **offline capability** with local data persistence.
-   Export or print invoices for billing purposes.
-   Offer **Google Drive integration** for free cloud backup of data and
    invoices.

------------------------------------------------------------------------

## Core Features

### 1. Client Management

-   Add and manage clients with fields: `Name`, `Contact Info`, and
    `Hourly Rate`.
-   Associate tasks with specific clients.
-   Persist client data locally.

### 2. Task Management

-   Create tasks per client (e.g., "Hydraulic Pump Repair").
-   View all tasks linked to a client.
-   Reuse tasks for multiple time entries.

### 3. Time Tracking

-   Start/stop a single active timer.
-   Record optional notes for each session.
-   Automatically calculate elapsed hours.
-   Manual edit of notes or times after stopping.
-   Prevent overlapping timers.

### 4. Entries Log

-   Daily view of completed entries.
-   Search and filter by client, task, or notes.
-   Edit or delete entries.
-   Show formatted duration and timestamps.

### 5. Invoicing

-   Generate invoices for a specific client and date range.
-   List line items (task, date, notes, hours, rate, amount).
-   Calculate totals based on hourly rates.
-   Export invoices as CSV or PDF.
-   Print invoices (with browser print-to-PDF support).
-   **Push invoices directly to Google Drive** for safe storage and easy
    sharing.

### 6. Data Storage

-   Offline-first using **localStorage** (MVP).
-   Future option: IndexedDB or cloud sync (Firebase/Supabase).
-   **Google Drive Export:**
    -   Backups: `/MechanicHours/backups/backup-YYYY-MM-DD.json`
    -   Invoices:
        `/MechanicHours/invoices/invoice-ClientName-YYYY-MM-DD.pdf`
    -   Uses Google Drive API with OAuth2, requesting only `drive.file`
        permission.

### 7. User Experience (UX)

-   Tabbed navigation: **Timer**, **Clients**, **Entries**, **Invoice**.
-   Clean, minimal design optimized for small screens.
-   Quick access to start/stop timers.
-   Consistent styling across components.

------------------------------------------------------------------------

## Technical Design

### Architecture

-   **Frontend:** React (with Hooks).
-   **UI Styling:** TailwindCSS utilities and lightweight custom CSS.
-   **Data Storage:** localStorage (JSON blob). Extendable to
    IndexedDB/cloud.
-   **Export:** CSV/PDF generation, Google Drive upload, and browser
    print functionality.
-   **Deployment:** Progressive Web App (PWA) for installability on
    mobile devices.

### Data Model

``` json
{
  "clients": [
    { "id": "c1", "name": "ABC Corp", "contact": "abc@example.com", "rate": 95 }
  ],
  "tasks": [
    { "id": "t1", "clientId": "c1", "title": "Hydraulic Pump Repair" }
  ],
  "entries": [
    { "id": "e1", "clientId": "c1", "taskId": "t1", "start": 1680000000000, "end": 1680003600000, "notes": "Replaced filter" }
  ],
  "active": { "entryId": "e2" }
}
```

### Component Layout

1.  **App** --- main navigation & state management.
2.  **TimerTab** --- start/stop timer, view active session.
3.  **ClientsTab** --- add/manage clients and tasks.
4.  **EntriesTab** --- list of entries, filters, edits.
5.  **InvoiceTab** --- generate/export/print invoices, push to Drive.
6.  **UI Primitives** --- Card, Button, Select, Input.

------------------------------------------------------------------------

## Hosting & Storage Plan

### Hosting

-   **Netlify** or **Vercel** free tiers.
-   Provides HTTPS, CDN, and optional custom domain.
-   Zero cost and minimal setup.

### Storage Options

-   **Local-only (default):** Data stays in browser localStorage.
-   **Google Drive Export:**
    -   Backups exported manually or on-demand.
    -   Invoices saved directly to Drive.
    -   Requires one-time Google sign-in and OAuth2 consent.

------------------------------------------------------------------------

## Future Enhancements

-   **Cloud Sync**: multi-device support with Firebase/Supabase.
-   **Attachments**: add photos or documents to entries.
-   **Parts & Materials**: track parts alongside hours.
-   **Reports & Analytics**: summarize hours by week/month.
-   **User Accounts**: secure login for multiple mechanics.
-   **Notifications**: reminders for active timers.

------------------------------------------------------------------------

## PWA & Local Backup Implementation (Added Sept 2025)

The application now supports installability as a Progressive Web App and manual
local backup/import of data.

### PWA

- `manifest.json` updated with 192x192 & 512x512 maskable icons.
- `beforeinstallprompt` captured; call `window._showInstallPrompt()` from a UI button
    (future enhancement) to trigger install.
- Service worker uses a network-first strategy with dynamic cache version.

### Local Data Export / Import

Global helper functions exposed in `index.js`:

- `window.exportLocalData()` → Downloads `cricktime-backup-YYYY-MM-DD.json` containing the
    serialized `appData` localStorage blob.
- `window.importLocalData(file)` → Restores from a user-selected JSON backup file and reloads.

Usage example (in DevTools console):

```js
exportLocalData(); // triggers download
// To import: create an <input type="file" onchange="importLocalData(this.files[0])" /> in DOM or call manually.
```

### Next Steps

- Add an in-app Settings screen with buttons: Install App, Export Backup, Import Backup.
- Provide visual feedback when a newer service worker version is available (toast instead of auto reload).
- Optional offline fallback page route if navigation fails.

------------------------------------------------------------------------

## Success Criteria

-   A mechanic can:
    1.  Add a new client with an hourly rate.
    2.  Start/stop a timer for a task.
    3.  Review and edit today's entries.
    4.  Generate an invoice for a week's work.
    5.  Export or print that invoice.
    6.  Backup data and invoices to Google Drive.
-   All actions can be performed **offline from a mobile device**, with
    optional Drive export online.

------------------------------------------------------------------------

## Conclusion

Mechanic Hours will provide a straightforward, offline-capable,
mobile-first solution for tracking billable hours and creating invoices.
By integrating Google Drive for free cloud backup, it ensures mechanics
never lose their data or invoices, while keeping the entire platform
zero-cost and easy to set up.
