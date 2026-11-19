> **Update (Nov 2026):** Jobs, applications and payments now use Firestore with real-time listeners
> (`src/lib/live.ts`, `jobs.ts`, `jobApplications.ts`, `payments.ts`), and the rules below are in
> `mobile-app/firestore.rules`. Still open: the mobile app's Jobs screens (apply / `cancelJobApplication`).

# Remaining functional work (Firebase)

**For:** engineer already on KD Ascend Firebase / admin (+ mobile cancel hook).

**UI is done.** Replace in-memory libs with Firestore, rules, and indexes so refresh and second sessions see the same data. **Keep the public TypeScript APIs** exported from the libs below unless noted.

---

## Overview

| Area | Lib today | Firestore target |
|------|-----------|------------------|
| Jobs | `src/lib/jobs.ts` (memory) | `jobs/{jobId}` |
| Applications | `src/lib/jobApplications.ts` (memory) | `jobs/{jobId}/applications/{applicationId}` |
| Payments | `src/lib/payments.ts` (memory) | `paymentTransactions/{paymentId}` (name flexible) |
| Users / corporates / admins | Already Firestore | No change |

**Recommended order:** (1) jobs + applications + rules, (2) payments + hooks on job close and app cancel, (3) mobile `cancelJobApplication`.

---

## 1. Admin UI map (what to wire)

### Jobs & applications

| Area | Routes / components | Lib calls |
|------|---------------------|-----------|
| Jobs list | `jobs/page.tsx` | `subscribeJobs`, `updateJobStatus` → confirm `JobStatusConfirmDialog` |
| Job create/edit | `jobs/new`, `jobs/[id]/edit`, `JobForm.tsx` | `createJob`, `updateJob` |
| Job detail | `jobs/[id]/page.tsx` | `getJob`, `updateJobStatus` (toast includes payout count when closing) |
| Delete job | `JobBits.tsx` | `deleteJob` |
| Applications tab | `JobApplicationsTable.tsx` | `getJobApplications` → prefer **`subscribeJobApplications`** |
| Add applicant | `JobAddApplicantModal.tsx` | `addJobApplication`, `findApplicationTimeConflict` + Firestore **users** + corporate blacklist |
| CSV export | `JobApplicationsDownloadModal.tsx` | subscribed application rows |

### Payments (no manual “create payment”)

| Area | Routes / components | Lib calls |
|------|---------------------|-----------|
| List | `payment/page.tsx` | `syncLateCancelPenalties` on mount, **`subscribePaymentTransactions`** (replace `getPaymentTransactions` + one-shot sync), `updatePaymentStatus` → `PaymentStatusConfirmDialog` |
| Edit | `payment/[id]/edit/page.tsx` | `getPayment`, `savePayment` (update only) |
| Checkout | `payment/[id]/checkout/page.tsx` | `completePayment`, receipt download |
| `/payment/new` | redirects to list | — |

**Still placeholder:** `users/[uid]/page.tsx` job summary counts — optional once applications use real `userUid`.

---

## 2. `src/lib/jobs.ts`

**Keep exports:** `Job`, `JobInput`, `JobStatus`, `JOB_STATUSES`, `jobStatusLabel`, `emptyJobInput`, `jobToInput`, `getJob`, `getAllJobs`, `subscribeJobs`, `createJob`, `updateJob`, `updateJobStatus`, `deleteJob`, `JobStatusUpdateResult`, `jobClosePayoutToast`.

**Target collection:** `jobs/{jobId}` (auto id). Display `jobId` via `counters/jobId` (same pattern as corporates).

**Job status → payouts (must preserve):** When status transitions **to `closed`** (via `updateJobStatus` or `updateJob`), call `createPayoutsForClosedJob` from `payments.ts` (today: dynamic import to avoid cycles). On failure, **revert** job status and surface error. Return `{ createdPayouts: number }` for UI toast.

**Corporate counts (optional):** Bump `corporates/{id}.activeJobs` / `completedJobs` on status changes.

Mirror `src/lib/corporates.ts` for `subscribeJobs` + writes.

---

## 3. `src/lib/jobApplications.ts`

**Keep exports:** `JobApplication`, `ApplicationStatus`, `applicationStatusLabel`, `getJobApplications`, **`subscribeJobApplications`** (add; use in table + job detail counts), `applicationStats`, `findApplicationTimeConflict`, `addJobApplication`, `setApplicationStatus`, `removeJobApplication`, **`cancelJobApplication`**, `AddApplicantInput`.

**Storage:** subcollection `jobs/{jobId}/applications/{applicationId}`.

### Field map

| Field | Notes |
|--------|--------|
| `userUid` | Firestore user id — **required** for new rows |
| `uid` | Member/display code |
| `name`, `email`, `phone` | Snapshot when added |
| `status` | `pending` \| `approved` \| `rejected` \| **`cancelled`** |
| `doneBefore` | Display count in table/CSV |
| **`cancelledAt`** | ISO timestamp when member cancels from app (penalty rule below) |

### Business rules (preserve in lib or Cloud Function)

1. Add applicant: user `status === 'approved'`; global/corporate blacklist; duplicate + schedule conflict (`jobSchedule.ts` overlap on `pending`/`approved` on other jobs).
2. Approve / reject / delete: confirm modals in UI; persist.
3. **`cancelJobApplication(jobId, applicationId, cancelledAt?)`** — set `status: 'cancelled'`, `cancelledAt`, then call `ensureLateCancelPenalty` (payments). **Mobile** should call the same write path (client or callable).

---

## 4. `src/lib/payments.ts`

**Keep exports:** types, `paymentTotals`, `validatePaymentInput`, `savePayment` (update only — no manual create), `completePayment`, `updatePaymentStatus`, `getPayment`, `getPaymentTransactions` or replace with **`subscribePaymentTransactions`**, `createPayoutsForClosedJob`, `ensureLateCancelPenalty`, `syncLateCancelPenalties`, `findPaymentForApplication`, `LATE_CANCEL_PENALTY_AMOUNT` (50), helpers (`paymentDetailHref`, receipt download, etc.).

**Today:** in-memory `store[]` (no seed rows). Rows only appear from automation below.

### When rows are created (no admin “add payment”)

| Trigger | Type | Initial status | Dedup key |
|---------|------|----------------|-----------|
| Job status → **`closed`** | `payout` per **approved** application | `draft` | same `jobId` + `applicationId` + type `payout` |
| Member **`cancelled`** and cancel **&lt; 24h before shift start** | `penalty` ($50 default) | `draft` | same `jobId` + `applicationId` + type `penalty` |

- **Payout prefills:** hours from `assumedHoursFromEventTime`, rate from `parseHourlyRate(job.salary)`, method from `users/{uid}.payout` (`getUserPayoutMethodLabel`).
- **Penalty prefills:** `1 hr × $50`, note text for late cancel; **job status irrelevant**.
- **`syncLateCancelPenalties`:** list page runs this to backfill penalties from existing cancelled applications (safe idempotent scan).

**Late cancel rule:** `isLateJobCancellation(job, cancelledAt)` — compare `cancelledAt` to shift start from `eventStartMs(eventDate, eventTime)` in `jobSchedule.ts`; penalty if cancel is before start and within 24h.

**Admin flow:** draft → edit → verify → `pending` → checkout → `completePayment` → `completed`. Table status changes use **`PaymentStatusConfirmDialog`** (`JobDialogs.tsx`).

### Suggested Firestore document (`paymentTransactions/{id}`)

| Field | Type | Notes |
|--------|------|--------|
| `txnId` | string | `TXN####` — use `counters/paymentTxn` or similar |
| `applicationId` | string? | Link to application doc |
| `userUid`, `userName`, `userEmail` | string | |
| `jobId` | string | Internal job doc id |
| `jobIdLabel` | string | Display `JOB-####` |
| `type` | string | `payout` \| `penalty` |
| `amount` | number | Final after hours/rate/bonus/deduction |
| `method` | string | `Bank Transfer` \| `PayNow` |
| `status` | string | `draft` \| `pending` \| `completed` \| `failed` |
| `lastUpdate` | string or timestamp | yyyy-mm-dd in UI today |
| `assumedHours`, `hourlyRate`, `adjustedHours`, `bonus`, `deduction`, `note` | numbers/string | Same as `PaymentInput` |

**Writes:** Prefer **transaction** when closing a job (status + batch payout creates) and when cancelling an application (application update + optional penalty doc).

**Implement `subscribePaymentTransactions`** on the collection sorted by `lastUpdate` desc (or `createdAt`); payment list page should subscribe instead of only `useState(getPaymentTransactions())`.

---

## 5. Firestore rules (`mobile-app/firestore.rules`)

### Corporates (unchanged — ensure nested blacklist exists)

```javascript
match /corporates/{corporateId} {
  allow read, write: if isAdmin();

  match /blacklistedUsers/{userUid} {
    allow read, write: if isAdmin();
  }
}
```

### Jobs + applications (admin for this milestone)

```javascript
match /jobs/{jobId} {
  allow read, write: if isAdmin();

  match /applications/{applicationId} {
    allow read, write: if isAdmin();
  }
}
```

Later: member read/apply and **`cancelJobApplication`** may need `allow update` on own application doc only.

### Payments (admin-only for now)

```javascript
match /paymentTransactions/{paymentId} {
  allow read, write: if isAdmin();
}
```

Mobile “my payouts” = later; don’t widen until product says so.

---

## 6. Indexes

Firestore console will prompt. Plan for:

- Collection group **`applications`**: `userUid` + `status` (conflict scan).
- **`jobs`**: list filters (`status`, `eventDate`) if server-side.
- **`paymentTransactions`**: `jobId` + `applicationId` + `type` (dedup), list sort `lastUpdate` desc, filters on `status` / `type`.

---

## 7. Done when

### Jobs & applications

- [ ] Create/edit job survives refresh; `subscribeJobs` updates list live.
- [ ] Applications subscribe on job detail; add/approve/reject/delete/cancel persist.
- [ ] Time conflict + blacklist rules still match TS.
- [ ] Closing job from list or detail persists and returns payout count toast (Firestore creates payout drafts).

### Payments

- [ ] Payment list survives refresh; live subscribe.
- [ ] Close job → draft **payout** rows for approved apps (idempotent).
- [ ] Cancel application &lt; 24h before shift → draft **penalty** row (idempotent); works while job still **open**.
- [ ] Edit / verify / checkout / complete + table status change with confirm modal persist.
- [ ] No route creates payments manually (`savePayment` requires existing id).

### Mobile (follow-up)

- [ ] App calls `cancelJobApplication` (or equivalent Firestore write) with `cancelledAt` when user cancels a booked shift.

---

## 8. File pointer

| Replace / extend | Reference pattern |
|------------------|-------------------|
| `src/lib/jobs.ts` | `src/lib/corporates.ts` |
| `src/lib/jobApplications.ts` | subcollection reads/writes like `corporateBlacklist.ts` |
| `src/lib/payments.ts` | `corporates.ts` + hooks called from jobs/applications |
| Rules | `mobile-app/firestore.rules` |

**UI standards:** `DASHBOARD_UI_GUIDE.md` (tables, confirm modals, payment summary actions in `PaymentBits.tsx`).

---

## 9. Cycles / imports

- `jobs.ts` → dynamic `import('./payments')` on close (keep when moving to Firestore).
- `jobApplications.ts` → dynamic `import('./payments')` on cancel.
- `payments.ts` imports `getJobApplications`, `getAllJobs`, `users` (payout method) — avoid `jobs.ts` importing `payments` at module top level.