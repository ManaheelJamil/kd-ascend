# Remaining functional work (Firebase)

**For:** engineer already on KD Ascend Firebase / admin.

**Scope:** Make **Jobs** and **job applications** persist and update live. **Payment** stays on the in-memory stub in `src/lib/payments.ts` — no Firestore work for payment in this pass.

**UI is done.** Only replace the two placeholder libs (and rules/indexes) so refresh and second sessions see the same data.

---

## 1. What we shipped (admin UI — needs Firestore)

| Area | Routes / components | Data today |
|------|---------------------|------------|
| Jobs list | `app/(admin)/jobs/page.tsx` | `subscribeJobs`, `updateJobStatus` → **memory** (`jobs.ts`) |
| Job create/edit | `jobs/new`, `jobs/[id]/edit`, `JobForm.tsx` | `createJob`, `updateJob`, `getJob` |
| Job detail | `jobs/[id]/page.tsx` | `getJob`, status confirm → `JobStatusConfirmDialog` |
| Delete job | `JobBits.tsx` | `deleteJob` |
| Applications tab | `JobApplicationsTable.tsx` | `getJobApplications`, `setApplicationStatus`, `removeJobApplication` |
| Add applicant | `JobAddApplicantModal.tsx` | `addJobApplication`, `findApplicationTimeConflict` + live **users** + **corporate blacklist** (Firestore) |
| CSV export | `JobApplicationsDownloadModal.tsx` | reads same application rows + job fields |
| Corp. job counts | corporate detail overview | `activeJobs` / `completedJobs` on `corporates` — UI expects updates when jobs exist |
| Users list tweaks | `UsersTable`, `UserDialogs` | **Already Firestore** (`users`, `admins`) — no new collections |

**Still placeholder on user profile:** `users/[uid]/page.tsx` job summary (“0 jobs”) — optional follow-up once applications have `userUid`.

---

## 2. Code to implement (keep the public API)

Mirror `src/lib/corporates.ts` (collection + `onSnapshot` + writes).

### `src/lib/jobs.ts`

Keep exports/types: `Job`, `JobInput`, `JobStatus`, `JOB_STATUSES`, `jobStatusLabel`, `emptyJobInput`, `jobToInput`, `getJob`, `getAllJobs`, `subscribeJobs`, `createJob`, `updateJob`, `updateJobStatus`, `deleteJob`.

**Today:** dummy array + fake `subscribeJobs` timeout.

**Target:**

- Collection `jobs/{jobId}` (auto id).
- `subscribeJobs` → `onSnapshot` on `jobs`, sort e.g. by `createdAt` desc.
- `jobId` display code `JOB-####` → use existing `counters/jobId` pattern (rules already allow `counters/*` for admins).
- On create/update/status/delete: optional but UI-friendly — bump `corporates/{corporateId}.activeJobs` / `completedJobs` (define: e.g. `open`|`filled` vs `closed`).

`getJob` / `getAllJobs`: job detail and **time-conflict** logic still call these; either keep one-shot `getDocs` or refactor `jobApplications.ts` to query Firestore directly for conflicts (preferred at scale).

### `src/lib/jobApplications.ts`

Keep exports/types: `JobApplication`, `ApplicationStatus`, `applicationStatusLabel`, `getJobApplications`, `applicationStats`, `findApplicationTimeConflict`, `addJobApplication`, `setApplicationStatus`, `removeJobApplication`, `AddApplicantInput`.

**Storage:** `jobs/{jobId}/applications/{applicationId}` (or top-level `applications` with `jobId` — subcollection matches job-centric UI).

**Add `subscribeJobApplications(jobId, onData, onError)`** and use it in `JobApplicationsTable` + job detail counts (today everything re-reads memory; after refresh applications are empty unless subscribed).

**Field map** (same as `JobApplication` type):

| Field | Notes |
|--------|--------|
| `userUid` | Real Firestore user id — **required** for new rows (conflict checks ignore seed rows with empty `userUid`) |
| `uid` | Member/display code (`kdUserId` / `memberId` / short uid from picker) |
| `name`, `email`, `phone` | Snapshot when added |
| `status` | `pending` \| `approved` \| `rejected` |
| `doneBefore` | Shown in table/CSV; new rows default `'00'` — can later = count of user’s past approved gigs |

---

## 3. Business rules (must match current TS — implement in lib or rules)

All in `jobApplications.ts` + `JobAddApplicantModal.tsx` today; preserve on Firestore:

1. **Add applicant:** only users with `status === 'approved'` (modal uses live `users`).
2. **Global blacklist:** `status === 'blacklisted'` → blocked (user doc).
3. **Corporate blacklist:** `corporates/{job.corporateId}/blacklistedUsers/{uid}` → blocked (already Firestore; **rules must allow read** — see §4).
4. **Duplicate on same job:** same `userUid`, or same email (case-insensitive), or same member `uid` string.
5. **Schedule conflict:** same `eventDate` and overlapping `eventTime` on **another** job where this user has application `pending` or `approved`. Parser: `src/lib/jobSchedule.ts` (`9:00 AM – 5:00 PM` style).
6. **Approve / reject / delete:** confirm modals already wired; just persist `status` or delete doc.
7. **CSV:** no API change — exports whatever is in the subscribed list.

---

## 4. Firestore rules (`mobile-app/firestore.rules`)

**Required fixes:**

1. **Corporate blacklist** — UI already writes here; nested rule missing today:

```javascript
match /corporates/{corporateId} {
  allow read, write: if isAdmin();

  match /blacklistedUsers/{userUid} {
    allow read, write: if isAdmin();
  }
}
```

2. **Jobs + applications** (admin-only for this milestone):

```javascript
match /jobs/{jobId} {
  allow read, write: if isAdmin();

  match /applications/{applicationId} {
    allow read, write: if isAdmin();
  }
}
```

Mobile job browse / self-apply = later; don’t widen rules until product says so.

**Out of scope:** `paymentTransactions` — payment module stays mock.

---

## 5. Indexes you’ll likely need

Firestore will prompt with console links. Plan for:

- Collection group **`applications`**: `userUid` + `status` (time-conflict scan across jobs).
- **`jobs`**: filters on list page (`status`, dates) if you query server-side.

---

## 6. Done when

- [ ] Create/edit job survives browser refresh; second admin sees it live.
- [ ] Add applicant from real `users` survives refresh; blacklist + conflict errors still work.
- [ ] Approve/reject/delete application persists; empty state when none.
- [ ] Job status change + delete job persist (confirm modals unchanged).
- [ ] Corporate blacklist tab still works (rules fix).
- [ ] CSV download still works on live data.
- [ ] Payment page still works on dummy data (unchanged).

---

## 7. File pointer

| Replace / extend | Reference pattern |
|------------------|-------------------|
| `src/lib/jobs.ts` | `src/lib/corporates.ts` |
| `src/lib/jobApplications.ts` | `src/lib/corporateBlacklist.ts` (subcollection) |
| Rules | `mobile-app/firestore.rules` |

**Do not touch** `src/lib/payments.ts` for this task.

**UI standards** (layout, tables, modals, toasts): see `DASHBOARD_UI_GUIDE.md`.