# `development` branch: testing build

This branch holds the full mobile app. Features that are **not** in the FOR_TESTING list
are commented out (not deleted), so testers see only what is in scope.

## Switched ON (in scope)

- Splash screen and auto-restore of the saved login
- Login (show/hide password, Remember Me, error messages)
- Sign Up (email, phone, password, Terms & Privacy checkbox, validation)
- Phone verification (SMS code, resend after 30 s, 30-minute lock after 5 wrong codes, 10-minute expiry)
- Email verification (same rules)
- Forgot Password (email or phone, Via Email / Via SMS, reset code, 24-hour reset link,
  Create New Password, success popup, sign-out on other devices, "password changed" email)
- Onboarding: Personal Information, Identity Verification, Payout Method (PayNow / Bank Transfer),
  "Account Created" popup, resume where the user left off
- Account status screens: Waiting for Approval, Not Approved, Blocked, full access once approved,
  live status changes
- Resubmit after Blocked / Rejected (needed by the admin "fields the user must fix" feature)
- Email notifications
- Logout (Home → Account tab → Logout)

## Switched OFF (commented out)

Search for `DEV BRANCH` to find every change.

| What | Where |
| --- | --- |
| Account → Edit Profile | `src/screens/EditProfileScreen.tsx` (whole file) |
| Account → Identity Documents | `src/screens/IdentityDocumentsScreen.tsx` (whole file) |
| Account → Upload Document | `src/screens/UploadDocumentScreen.tsx` (whole file) |
| Account menu rows (Edit Profile, Identity Documents, Payment Details, Notification Settings, Help & Support) | `src/screens/AccountScreen.tsx`: only the profile card and Logout remain |
| Screen registrations for the above | `src/navigation/RootNavigator.tsx`, `src/navigation/types.ts` |
| Edit Profile / Upload Document save helpers | `src/services/userService.ts` |

`PaymentDetailsScreen.tsx` stays because the Resubmit flow uses it when an admin asks a
blocked or rejected user to fix their payout details. `DOCUMENT_TYPES` was moved to
`src/data/options.ts` for the same reason.

## Bringing a feature back

Uncomment the file or lines marked `DEV BRANCH`, or merge `main` into this branch.
