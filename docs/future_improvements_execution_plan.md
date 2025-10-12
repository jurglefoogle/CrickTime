# Future Improvements Execution Plan

Date: 2025-09-08
Author: Execution Plan Draft
Scope: Structured roadmap translating conceptual improvements into actionable epics, milestones, and implementation details. Includes new sections for Parts & Expenses on Jobs and Invoice feature enhancements.

## Guiding Principles
1. Data Integrity First: Introduce schema versioning before expanding data model.
2. Incremental Delivery: Ship small vertical slices (UI + persistence + invoice integration) per feature.
3. Backward Compatibility: Migration layer upgrades stored localStorage safely.
4. Observability & Testability: Add unit tests alongside new utilities.
5. Accessibility & Performance baked into each increment.

## High-Level Milestones
| Milestone | Focus | Target Outcomes |
|-----------|-------|-----------------|
| M1 | Data Versioning & Core Refactors | Schema version field, migration harness, persisted invoices collection scaffold |
| M2 | Parts & Expenses (Phase 1) | Add part/expense line item model; attach to jobs; surface in job view |
| M3 | Invoice Enhancements (Phase 1) | Auto date-range suggestion, include parts/expenses in draft invoice, selectable line grouping |
| M4 | Scheduling & Calendar UX | Past-date control (done), recurrence groundwork, color legend, drag & drop placeholder |
| M5 | Performance & Testing | dataService unit tests, virtualization hook for large entries, memoization pass |
| M6 | Accessibility & Validation | Inline validation system, keyboard nav & focus outlines, replace alerts |
| M7 | Parts & Expenses (Phase 2) | Inventory-style quick add, cost vs price margin reporting, expense categories |
| M8 | Invoice Enhancements (Phase 2) | Tax/discount lines, PDF export styling revamp, persisted invoice history viewer |
| M9 | Analytics & Reporting | Hour/revenue charts, per-client summary, export summaries |
| M10 | Theming & Internationalization | Light theme, string externalization, currency localization |

## Epic Detail

### Epic: M1 Data Versioning & Persisted Invoices
Goal: Prepare platform for additive features (parts, taxes, recurring schedule) without brittle ad-hoc migrations.

Tasks:
- Add `schemaVersion` to root stored object (start at 2).
- Introduce `migrations.js` with ordered migration functions.
- Persisted invoices: new array `invoices[]` capturing finalized invoice snapshot (metadata + immutable line items + totals + createdAt + optional job reference).
- Refactor invoice finalize: after marking entries invoiced, push snapshot to `invoices`.
- Add lightweight retrieval UI stub (Invoice History section listing invoiceNumber, client, total, date).

Data Shape Additions:
```
{
  schemaVersion: 2,
  invoices: [
    {
      id: string,
      invoiceNumber: string,
      clientId: string,
      jobId?: string,
      dateRange: { start: string, end: string },
      generatedAt: number,
      lineItems: [{ entryId?: string, kind: 'time'|'part'|'expense', description: string, hours?: number, rate?: number, quantity?: number, unitCost?: number, unitPrice?: number, amount: number }],
      subtotal: number,
      taxTotal?: number,
      discountTotal?: number,
      total: number,
      notes?: string
    }
  ]
}
```

Acceptance Criteria:
- Existing users upgraded with no data loss.
- New finalized invoices appear in history.
- Unit test: migration adds missing fields when schemaVersion absent.

### Epic: M2 Parts & Expenses (Phase 1)
Goal: Allow adding non-labor charges (parts & miscellaneous expenses) to a job so they can appear on invoices.

Initial Scope (Phase 1):
- Data model extension: Add `jobCharges[]` collection OR embed under each job as `charges: []` (choose central collection for easier invoice queries). Proposed: `charges: [{ id, jobId, clientId, kind: 'part'|'expense', description, quantity, unitCost, unitPrice, createdAt }]`.
- UI: On Jobs detail card (or expandable panel) a simple list + "+ Add Charge" button.
- Entry Form: Not coupled yet (no automatic part capture—manual only in Phase 1).
- Pricing: unitPrice optional; if missing, default equals unitCost; amount = quantity * unitPrice.
- Validation: quantity > 0, costs >= 0.

Phase 1 Invoice Integration:
- When generating invoice (client or job mode), gather all uninvoiced charges (no link yet to entry) within date range (filter by createdAt).
- Present charges as separate selectable line items with kind badge.
- Finalize marks them `invoiced: true` on each charge object.

Data Shape (charges):
```
charges: [
  { id, jobId, clientId, kind, description, quantity, unitCost, unitPrice, amountCached, createdAt, invoiced?: boolean }
]
```
Cache `amountCached` at creation for simpler historical invoice snapshots (defensive against later price edits).

Acceptance Criteria:
- User can add part and expense lines to a job.
- Charges appear in invoice draft (filtered by date & uninvoiced).
- Selecting & finalizing marks charges invoiced and they disappear from a fresh draft.

### Epic: M3 Invoice Enhancements (Phase 1)
Focus Items:
1. Auto date range suggestion: earliest uninvoiced entry/charge → today.
2. Combined line item model for UI (time + charges) with type icons (⏱, 🧩 for part, 🧾 for expense).
3. Totals block includes Subtotal (labor + charges) before tax/discount (still future).
4. Option to group invoice by Job (nested headings) when in Client mode with multiple jobs.

Acceptance Criteria:
- Generating invoice pre-fills start date as earliest uninvoiced for selected client/job.
- Draft list merges charges and time seamlessly.
- Unit test coverage for date-range helper.

### Epic: M4 Scheduling & Calendar UX
Incremental after parts baseline.
- Recurrence data proposal: `recurringTemplates[]` with pattern (weekly, intervalDays, weekdays[]). Generate concrete scheduledJobs for next N weeks on save.
- Color legend component (status chips with legend above calendar).
- Drag & drop placeholder architecture (abstract reorder API; implement later).

### Epic: M5 Performance & Testing
- Memoize jobStats & heavy sorts.
- Add `formatDuration` tests (edge: <1s, 4s, 59s, 60s, 61s).
- Virtualization: create `useVirtualList` hook for large entries (>500 rows) progressive rendering.

### Epic: M6 Accessibility & Validation
- Replace alert() with inline error banner + field-level messaging component.
- Keyboard: stat tiles & calendar cells focusable; Enter opens modal.
- ARIA: role descriptions for invoice line items (`role="row"`).

### Epic: M7 Parts & Expenses (Phase 2)
Enhancements:
- Margin reporting: show cost vs price & profit.
- Expense categories (enum: shipping, disposal, diagnostic, other).
- Bulk add (paste CSV style: description, qty, cost, price).
- Attach photo/receipt URL (optional field) for expenses.

### Epic: M8 Invoice Enhancements (Phase 2)
- Tax engine (single rate per client initially) + discount (%) or flat.
- PDF export using print stylesheet OR jsPDF/React-PDF.
- Persisted footer template (settings object) editable in UI.
- Resend/Reprint historical invoice from history view.

### Epic: M9 Analytics & Reporting
- Aggregate hours per client (last 30 / 90 days).
- Revenue breakdown: labor vs parts vs expenses.
- Simple chart components (canvas or lightweight SVG lib).

### Epic: M10 Theming & Internationalization
- `theme` field with stored preference; CSS variables toggle.
- Externalize strings to JSON; currency locale switch per client.

## Cross-Cutting Utility Additions
- Helper: `getEarliestUninvoicedDate(clientId, jobId?)` scanning entries + charges.
- Helper: `collectInvoiceCandidates({clientId, jobId, start, end})` returning unified list.
- Migration step adding `charges: []`, `invoices: []`, `schemaVersion`.

## Incremental Data Migrations
| Version | Changes |
|---------|---------|
| 2 | Add schemaVersion, invoices[], charges[] |
| 3 | Add recurringTemplates[], job.charges? (if pivot) |
| 4 | Add tax/discount fields to persisted invoice snapshots |

Migration Strategy:
1. Read stored object; if no schemaVersion treat as v1.
2. Apply sequential migration functions until latest.
3. Save once after transformations to minimize writes.
4. Defensive: unknown top-level keys preserved (future-proof) unless explicitly deprecated.

## Testing Strategy
- Unit: data migrations, amount calculations, invoice candidate merger.
- Integration (Playwright or Cypress in future): Create job + charges + invoice finalize, verify snapshot persisted.
- Snapshot test for print HTML & PDF template.

## Risk & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss in migration | High | Dry-run migration in memory; only persist after success |
| Performance degrade with charges added | Medium | Index charges by clientId/jobId in memory map on load |
| Invoice line explosion (hundreds) | Medium | Virtualize invoice draft list |
| User confusion with date auto-fill | Low | Provide tooltip explaining auto-selected range |

## Rollout Order (Detailed Sprint Cuts)
1. Sprint 1 (M1 subset): schemaVersion + invoices[] + history UI stub.
2. Sprint 2: charges[] model + add charge UI + invoice inclusion.
3. Sprint 3: auto date-range + unified invoice line renderer.
4. Sprint 4: recurrence + legend + color coding.
5. Sprint 5: memoization + unit tests + virtualization hook.
6. Sprint 6: inline validation & a11y passes.
7. Sprint 7: margin reporting + expense categories.
8. Sprint 8: tax/discount + PDF export + footer template.
9. Sprint 9: analytics charts.
10. Sprint 10: theming + i18n groundwork.

## Parts & Expenses UI Sketch (Phase 1)
Components:
- JobChargesPanel (nested inside job card or modal): list + add form.
- AddChargeForm fields: kind (part|expense), description, quantity (default 1), unitCost, unitPrice (prefill = unitCost), Add button.
- ChargeRow: shows description, qty x price, amount, [🗑 delete].

State Integration:
- `appData.charges` array.
- updateAppData merges new charges; charge deletion sets a soft-deleted flag or removes (removal acceptable in Phase 1, snapshot safety handled by persisted invoices later).

Invoice Draft Merge:
- Collect time entries + charges where: not invoiced, within dateRange, clientId matches, and (jobId matches if job mode).
- Map charges to line items: `kind: 'part' | 'expense'` with `hours` omitted, amount = quantity * unitPrice.

## Invoice Enhancements UI Sketch (Phase 1)
- Above date selectors: badge "Suggested Range: {earliestUninvoiced} → Today" with "Apply" link.
- Line item list shows icon & category: ⏱ (time), 🧩 (part), 🧾 (expense).
- Totals: Labor Subtotal, Parts/Expenses Subtotal (if present), Grand Total.

## Inline Validation Framework (Preview)
Create `useFormErrors()` hook returning `{errors, setError(field,msg), clearError(field)}`; Input and Select display message area below field; replace alerts gradually.

## Metrics / Analytics Data Sources (Future)
- Derive aggregates on demand; avoid storing duplicated rollups initially.
- Potential caching layer later if performance flags.

## Definition of Done (Per Epic)
- Code + minimal tests + updated docs + manual checklist.
- No added ESLint errors, a11y smoke test passes.
- Data migration (if any) idempotent.

## Immediate Next Actions
1. Implement schemaVersion + migrations harness.
2. Scaffold invoices[] persistence & history read-only list.
3. Add charges[] model & JobChargesPanel.
4. Integrate charges into invoice generation + finalize flow.
5. Implement auto date-range suggestion helper.

---
This plan can be iterated; adjustments welcome based on user feedback or scope shifts.

## Epic M2: Parts & Expenses

### Phase 1 (Implemented - Schema v3)
Status: DONE (schemaVersion=3 migration applied)
Delivered:
- Added `charges` top-level collection with fields: id, jobId, clientId, kind(part|expense), description, quantity, unitCost, unitPrice, amountCached, createdAt, invoiced.
- Migration to v3 ensures legacy data gains empty charges array.
- Jobs tab: expandable charges panel per open job (add, list, delete pre-invoice).
- Invoice generation: line items now include uninvoiced charges filtered by client/job/date range.
- Invoice finalization: marks included charges `invoiced: true` and snapshots them alongside time entries.
- UI affordances: 💲 toggle button, charge kind icon (🧩 part / 🧾 expense), validation guards (description, qty>0, non-negative costs/prices).
 - Snapshot enrichment: charge line items persisted with `kind`, `chargeType`, `quantity`, `unitCost`, `unitPrice` for future margin/tax calculations.
 - Refinement: Added explicit client selector for adding charges when job has no completed entries to reliably set `clientId` (enables invoicing charges-only jobs).

### Phase 1 QA Checklist (to execute)
- Add part charge (qty 2, cost=10, leave price blank -> price=cost) => amount 20.
- Add expense charge (qty 1, cost 5, price 8) => amount 8.
- Delete a non-invoiced charge works.
- Generate invoice covering created charges + time entries; charges appear with quantity x price formatting.
- Deselect a charge line item -> not marked invoiced after finalize.
- Finalize invoice -> selected charge records now `invoiced:true`; UI no longer allows deletion of invoiced charges (button hidden).
- Data reload (hard refresh) preserves charges & invoice snapshot (migration stable).
 - Charges-only job can be invoiced (no time entries) using client selector; appears in job-mode dropdown and generates invoice line.

### Phase 2 (In Progress / Partial Delivery)
Delivered:
- Inline editing (qty, cost, price, description, category) with recalculated cached amount.
- Margin % badge per line.
- Expense categories selectable & persisted.
- Bulk CSV add parser (description,qty,cost,price,kind,category).
- Per-job subtotal and charges-only job invoicing supported.

Deferred / Next Iteration:
- Inline validation (replace alerts) -> Epic M6.
- Invoice view labor vs charges subtotal split -> M3/M8.
- Automated tests for edits & bulk import -> M5 testing wave.

Updated Metrics Targets:
- Edit cycle (open -> save) < 7s.
- Bulk import success rate >= 80% of valid lines first pass.
- Snapshot immutability preserved after edits (manual spot check; to automate later).
