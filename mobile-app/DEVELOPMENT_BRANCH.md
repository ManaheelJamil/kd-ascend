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

## Added since

- Jobs: Home job list, Search, Filters, Job Detail, Apply, My Bookings, booking page, Cancel Booking
- Earnings: summary card, transaction history (Pending / Processing / Paid / Deducted), filters, Export Payslip
- Notifications: bell with unread dot, Notifications list (built live from bookings, payments and profile)
- Account: Edit Profile, Identity Documents (front + back), Upload Document, Payment Details,
  Notification Settings, Help & Support (FAQ), Contact Admin, Report an Issue

## Switched OFF (commented out)

Nothing at the moment: the Account section is back on.

## Bringing a feature back

Uncomment the file or lines marked `DEV BRANCH`, or merge `main` into this branch.
