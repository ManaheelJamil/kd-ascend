# KD Ascend — Dashboard UI guide

**For:** anyone adding or changing screens in `kd-ascend-admin`.

**Design source:** Figma “Hireloop (Copy)” admin frames. Tokens and shared components live in `src/app/globals.css` and `src/components/ui.tsx`.

**Golden rule:** Reuse existing layout, table, modal, and toast patterns before inventing new markup. Copy **Users**, **Jobs**, or **Payment** list pages as templates.

---

## 1. Design tokens

Defined in `globals.css` `@theme` — use Tailwind classes, not hard-coded hex in new code:

| Token | Tailwind | Use |
|--------|----------|-----|
| Brand orange | `text-brand`, `bg-brand` | Primary actions, focus rings, accents |
| Ink / muted | `text-ink`, `text-muted` | Body vs secondary text |
| Page bg | `bg-page` | App background, table header row |
| Borders | `border-line`, `border-field` | Cards vs inputs |
| Success / danger | `text-success`, `text-danger`, `bg-*` | Badges, destructive confirms |
| Navy | `text-navy` | Blacklisted / penalty accents |
| Radius | `rounded-card` (17.5px), `rounded-control` (13.5px) | Cards vs inputs/buttons |
| Shadow | `shadow-brand` | Primary button default |

**Typography:** Prefer the `ui` object from `ui.tsx` (`ui.pageHeading`, `ui.tableHead`, `ui.toolbarControl`, etc.) so sizes stay consistent.

**Class merging:** Always `cn(...)` from `ui.tsx` (tailwind-merge aware).

---

## 2. App shell & page layout

```
Admin layout: Sidebar (260px) + Header + main content
```

- `src/app/(admin)/layout.tsx` wraps authenticated routes with `ToastProvider`, `UsersDataProvider`, `FullPageSpinner` while auth loads.
- Main padding: `px-4 pt-5 pb-12 sm:px-5 md:pt-[27px] md:pr-[49px] md:pl-[27px]`.

**Every list/management page:**

1. `PageShell` — vertical stack, `gap-[27px]` (detail pages: `variant="detail"`, `gap-6 md:gap-[27px]`).
2. `PageTitle` — title + optional subtitle; primary action in `children` (right), e.g. “Add User”.
3. Optional `ErrorNote` for subscription/load errors.
4. Optional **stat tiles** row (see §5).
5. `Card` for toolbar + table (usually `pad="default"`).

**Detail pages:** `DetailPageHeader` or back link + `PageShell variant="detail"` + `Card pad="lg"` sections.

---

## 3. Reference list page (copy this structure)

**Canonical:** `src/app/(admin)/users/UsersManagement.tsx`  
**Same pattern:** `jobs/page.tsx`, `payment/page.tsx`, `corporates/page.tsx`

| Block | Pattern |
|--------|---------|
| Stat tiles | Grid `grid-cols-2 … xl:grid-cols-5`, clickable filters, active tile `border-brand` |
| Toolbar | Inside `Card`: search (`ui.toolbarControl`, Search icon `left-[18px]`, clear **X** when value set), filter dropdown, Export button |
| Table | Dedicated `*Table.tsx` component inside the card |
| Loading | `Spinner` in card or `FullPageSpinner` for whole page |
| Empty | Short centered `text-muted` in table **or** `PickerEmpty` in bordered box (see §7) |

**Search:** `ToolbarSearch` in `ui.tsx` or inline input matching Users toolbar classes.

**Filter popover:** `relative` wrapper + `filterRef` + `mousedown` outside to close; menu aligned under filter button.

**Export CSV:** Client-side `Blob` + hidden `<a download>`; filename `kd-ascend-<entity>-YYYY-MM-DD.csv`. Toast on success when UX calls for it (payment, job applications).

---

## 4. Data tables (`UsersTable` / `PaymentsTable` / `JobApplicationsTable`)

**Desktop (`md:block`):**

- `table-fixed`, `min-w-[960px]` (or similar), `border-collapse`.
- Header row: `h-16 border-b border-line bg-page`, headers `ui.tableHead`.
- Body rows: **`h-[69px]`**, `hover:bg-page`, `cursor-pointer` if row navigates.
- Primary cell text: `text-[15.8px] font-medium text-ink`.
- Secondary columns: `text-[13.5px] text-muted`, often `px-1.5`.
- **Checkbox column:** first header/cell `pl-[51px]`; checkbox `absolute left-[19px]` in header; `size-5 rounded border-[#d9d9d9]`.
- **Sortable columns:** `<button>` in `<th>`, toggle dir; chevron `ChevronDown` rotated when active.
- **Actions column:** `text-right`, `pr-[18px]`; icon buttons **`size-[31px]`** `rounded-control` (not full `IconButton` size-9 on tables).
- **Stop propagation** on checkbox, status controls, and action buttons when row has `onClick`.

**Mobile (`md:hidden`):**

- `<ul className="divide-y divide-line">` — cards, not table.
- Row: `active:bg-page`, tap → detail route.
- Checkbox + stacked fields; actions in footer with `stopPropagation`.

**Status on lists:**

- Users: **read-only** `StatusBadge` (no inline status dropdown on list).
- Jobs/corporates: status pickers/badges in `JobBits` / corporate components — status **changes go through confirm modal** (§6).

**Column config:** Top-of-file `COLUMNS` array with `key`, `label`, `className` width hints.

---

## 5. Stat tiles

Shared visual (copy from Users or Payment):

```tsx
className={cn(
  'flex h-[92px] flex-col justify-center gap-1.5 rounded-card border bg-white px-4 text-left transition hover:border-brand/40 sm:h-[110px] sm:gap-2 sm:px-6',
  active ? 'border-brand' : 'border-line',
)}
```

Label: `text-[13.5px] text-muted`. Value: `text-[22px]–[27px] font-bold` with semantic tone (`text-success`, `text-danger`, `text-brand`, etc.).

---

## 6. Modals & confirmations

**Base:** `Modal` + `ModalClose` from `ui.tsx`.

- Overlay: `fixed inset-0 z-50 bg-black/40`, click backdrop to close.
- Panel: default `max-w-[514px] rounded-card bg-white shadow-2xl` (override `className` for wider forms, e.g. `max-w-[519px]`).
- Padding: **`p-5 sm:p-8`** for confirm dialogs.
- Escape key + body scroll lock built into `Modal`.

**Confirm dialog layout** (Users, Jobs, Corporates — keep identical):

1. **Header row:** `flex items-start gap-[13px]`
2. **Icon circle:** `size-[54px] rounded-full`
   - Destructive: `bg-[#ffe2e2] text-danger`
   - Success: `bg-[#dcfce7] text-success`
   - Neutral/brand (job status): `bg-brand/10 text-brand`
3. **Title:** `ui.sectionTitle`; **subtitle:** `ui.sectionLead`
4. **Body:** `mt-[17px] text-lg text-muted` — entity name in `<b className="font-semibold text-ink">`
5. **Inline error:** `text-sm text-danger` under body (failed submit)
6. **Footer:** `mt-6 flex gap-3` — primary `Button size="lg" flex-1` + `Button variant="outline" size="lg"` Cancel

**Where dialogs live:**

| Module | File |
|--------|------|
| Users (blacklist, delete, reject, …) | `src/components/UserDialogs.tsx` |
| Jobs, applications, job/corporate/user status | `src/components/JobDialogs.tsx` |
| Corporate delete / edit section | `src/components/CorporateBits.tsx` |
| Job delete | `src/components/JobBits.tsx` |
| Application CSV picker | `src/components/JobApplicationsDownloadModal.tsx` |

**When to confirm:** Destructive or hard-to-reverse actions (delete, blacklist, reject, application delete, job/corporate status change). Inline edits on forms use Save on the form, not a second modal unless product says so.

**Busy state:** `Button` `loading={busy}`; disable double-submit.

**Reset on open:** `useEffect` when `open` → clear error and form fields (`UserDialogs`, `JobDialogs`).

---

## 7. Empty states

**Simple list (no rows):** one line in table/mobile list — `py-12 text-center text-[15px] text-muted`.

**Rich empty (pickers / applications):** export **`PickerEmpty`** from `CorporateBlacklistUsers.tsx`:

- Wrapped in bordered container (e.g. `rounded-card border border-line bg-page/50`).
- **Do not render table `<thead>`** when there are zero rows (see `JobApplicationsTable`).

Props: `icon` (lucide), `title`, optional `detail`.

---

## 8. Toasts

- Provider: `ToastProvider` in admin layout — use **`useToast()`** from `src/components/Toast.tsx`.
- API: `toast.success(message)` | `toast.error(message)`.
- Auto-dismiss ~3.2s; bottom-right stack `z-[200]`.

**When to toast:**

| Pattern | Example |
|---------|---------|
| After successful **write** the user cares about | Blacklist, delete user, job/corporate status, payment status, CSV export |
| **Failures** on async actions | `toast.error` + keep modal open or show `ErrorNote` |
| Confirm modal completed **inside** dialog | `UserDialogs` `useAction` calls `toast.success` then closes |
| Confirm modal + parent handler | e.g. `JobApplicationsTable` toasts after `onConfirm`; `JobApplicationConfirmDialog` does **not** toast itself |
| Status change via confirm | Toast on **page** after API succeeds (`jobs/page.tsx`, `corporates/page.tsx`) |

**Messages:** Short, past tense, include entity name or id when helpful — e.g. `"Sarah Johnson blacklisted successfully."`, `"Job status updated to Open."`

**Do not** toast on every keystroke or navigation.

---

## 9. Buttons & forms

**`Button` variants:** `primary` (default), `outline`, `ghost`, `danger`, `success`, `navy`, `soft`.

**Sizes:** table actions `sm` (`h-[31px]`); modal confirms `lg`; page CTAs default `md` or `primary` with icon `size-[18px]`.

**Forms:** `Field` wrapper + `TextInput` / `TextArea` / `Select` / `DateInput`. Inputs use `control` + `controlHeight` (`h-[52px]`). Cancel on long forms: `ui.formCancel` + `variant="outline"`.

**Icons:** [lucide-react](https://lucide.dev); stroke ~1.8–2.5; list/table actions typically `size-[18px]`.

---

## 10. Status badges & pickers

- **Users (account):** `StatusBadge` — pill `h-[27px] rounded-full px-[11px] text-[13.5px]`; colors in `ui.tsx` `BADGE` map.
- **Jobs / corporates:** `JobStatusBadge`, corporate status labels — follow `JobBits` / corporate list styling (pills + chevron select where status is editable with confirm).

Labels for users come from `STATUS_LABEL` in `src/lib/format.ts` — do not duplicate strings.

---

## 11. Detail / profile layouts

**User detail** (`users/[uid]/page.tsx`):

- Two-column on xl: main cards + sidebar summary card.
- `SectionCard` pattern: title row + edit affordance.
- `InfoRow` for label/value pairs with optional lucide icon `text-brand`.
- `Avatar` gradient `from-brand to-brand-light`.

**Alerts:** bordered `rounded-card border … px-5 py-4` with `CircleAlert` for state banners (rejected, blacklisted, incomplete).

---

## 12. File & component checklist (new feature)

- [ ] Page uses `PageShell` + `PageTitle`
- [ ] List page matches Users toolbar + `Card` + table component split
- [ ] Table has mobile list + desktop table, row height 69px, sort/checkbox rules
- [ ] Destructive actions use `Modal` confirm pattern (§6)
- [ ] Success/error feedback via toast (§8) or `ErrorNote` for load errors
- [ ] Empty state: plain text or `PickerEmpty`
- [ ] Types/labels from `lib/format` or domain lib — no magic strings for status
- [ ] `'use client'` only where needed; data hooks in page or table
- [ ] No new colors outside theme tokens without design sign-off

---

## 13. Quick file index

| Concern | File |
|---------|------|
| Tokens, Modal, Button, Card, `ui.*` | `src/components/ui.tsx` |
| Theme CSS | `src/app/globals.css` |
| Toasts | `src/components/Toast.tsx` |
| List table reference | `src/components/UsersTable.tsx`, `PaymentsTable.tsx` |
| List page reference | `src/app/(admin)/users/UsersManagement.tsx` |
| User modals + toast in dialog | `src/components/UserDialogs.tsx` |
| Job/corp confirms | `src/components/JobDialogs.tsx` |
| Empty state block | `PickerEmpty` in `CorporateBlacklistUsers.tsx` |
| Layout / toast provider | `src/app/(admin)/layout.tsx` |

---

## 14. Related docs

- Remaining functional work (Jobs/Applications Firebase): `REMAINING_FUNCTIONAL_WORK.md`
- Env, deploy, account statuses: `README.md`