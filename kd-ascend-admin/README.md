# KD Ascend — Admin Dashboard

Next.js 15 + Tailwind CSS 4 + Firebase. Built from the "Hireloop (Copy)" Figma admin frames.

What it does

- **Dashboard** – user totals, sign-ups per month, users by status, recent sign-ups.
- **Users** – every user from the app (live), search, status filter, CSV export, pending-approval list.
- **User details** – contact, personal, documents, payout; **Approve / Reject**, **Blacklist / Remove from Blacklist**, edit details, review documents.
- **Add User** – creates the login and profile; the user is approved straight away and can sign in to the app.
- The mobile app only lets **approved** users in. Pending, rejected and blacklisted users see a status screen, and changes apply instantly.

Corporates, Jobs, Payment and Setting are in the sidebar as "coming soon" pages.

---

## 1. Firebase connection

Already set: the dashboard uses the project's existing Web App config (see `src/lib/firebase.ts`). You only need `.env.local` to point it at a different Firebase project.

<details><summary>Using another project</summary>


1. Open https://console.firebase.google.com → project **mobile-auth**.
2. Gear icon → **Project settings** → **General** → *Your apps* → **Add app** → the **</>** (Web) icon.
3. Nickname: `KD Ascend Admin` → **Register app** (no Hosting needed).
4. You'll see a `firebaseConfig = { apiKey: …, appId: … }` block. Keep it open.
5. In this folder, copy `.env.local.example` to `.env.local` and paste the values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mobile-auth-a2081.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mobile-auth-a2081
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

</details>

## 2. Publish the new security rules (one time)

The rules live in the mobile project: `firestore.rules`.

Firebase console → **Firestore Database** → **Rules** → replace everything with the contents of `firestore.rules` → **Publish**.

(When Storage is enabled later, do the same with `storage.rules` under **Storage → Rules**.)

## 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The first time, the login page shows **"Create the first admin"**. Use it once to make your admin account; after that the setup page is locked by the rules. To add more admins later, add a document in Firestore → `admins` whose ID is that person's Auth UID (fields: `name`, `email`).

## 4. Put it online (optional)

Deploy to Vercel: import the folder, add the same `NEXT_PUBLIC_…` values as Environment Variables, deploy. Then add the Vercel domain in Firebase → Authentication → Settings → **Authorized domains**.

---

## Account status (shared with the app)

| `status` in Firestore | Dashboard label | App |
|---|---|---|
| `incomplete` | Incomplete | still signing up |
| `under_review` | Pending | "Waiting for Approval" screen |
| `approved` | Active | full access |
| `rejected` | Rejected | "Application Not Approved" + reason |
| `blacklisted` | Blacklisted | "Account Blocked" + reason |

Users can't change their own status — only admins can (enforced by `firestore.rules`).

## Notes

- Documents uploaded in test mode (before Firebase Storage is set up) only have their details saved. The document viewer says so; real files show once Storage is enabled (Blaze plan).
- Job summary, recent jobs and earnings on the user page show zero until the Jobs module exists.
