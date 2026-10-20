# KD Ascend (Hireloop) — Auth module

React Native (Expo, TypeScript) + Firebase implementation of the **Auth Module** section of the
Figma file *Hireloop (Copy) → MObile App*.

| Figma frame | Screen | What it does |
|---|---|---|
| Splash | `SplashScreen` | Shown while fonts load and Firebase restores the session |
| Login | `LoginScreen` | Email + password, **Remember me**, links to Sign Up / Forgot Password |
| Create Your Account + error screen | `SignUpScreen` | Email, phone, password, confirm, Terms — with the exact error messages from the design |
| Verify (phone) + Incorrect + Locked | `VerifyPhoneScreen` | Firebase SMS code, linked to the new account |
| Verify (email) + Incorrect + Locked | `VerifyEmailScreen` | 6-digit email code (Cloud Function) |
| Forgot Password + channel popup | `ForgotPasswordScreen` | Email or phone → "Via Email / Via SMS" |
| Verify Your Identity | `ResetVerifyScreen` | Code for the reset |
| Create New Password + Successful | `CreateNewPasswordScreen` | New password → "Password Reset Successful" popup |
| Personal info + Birthday | `PersonalInfoScreen` | Step 1 — name, NRIC, gender, nationality, DOB calendar, place of birth, address |
| Verify Your Identity (upload) | `IdentityUploadScreen` | Step 2 — ID upload to Firebase Storage |
| payment method | `PayoutMethodScreen` | Step 3 — PayNow or Bank Transfer |
| Pay now / Bank Transfer + Account Created | `PayNowDetailsScreen`, `BankDetailsScreen` | Payout details → "Account Created" popup → Home |

`HomeScreen` is a placeholder (Home / Job Detail / Notification are outside the auth module).

---

## 1. Download the Figma assets (do this first)

```bash
npm run assets        # = node scripts/fetch-figma-assets.mjs
```

This saves the logo, doodle backgrounds, illustrations and every icon from the Figma file into
`assets/figma/`. **The download links expire around 24 Oct 2026.** After that, export the layers
listed in `scripts/fetch-figma-assets.mjs` from Figma by hand (PNG @3x / SVG, same file names).

## 2. Install

Needs Node 20+, and Android Studio and/or Xcode. This app uses native Firebase modules, so it runs
in a **development build** — Expo Go will not work.

```bash
npm install
npx expo install --fix     # aligns every Expo package to your installed SDK
```

## 3. Firebase project

1. Create a project at <https://console.firebase.google.com> and upgrade it to the **Blaze** plan
   (required for Cloud Functions; the free usage tier still applies).
2. **Authentication → Sign-in method:** enable **Email/Password** and **Phone**.
   Add a test number under *Phone numbers for testing* (e.g. `+65 9123 4567` / `123456`) so you
   can test without real SMS.
3. **Firestore Database:** create it in `asia-southeast1` (Singapore).
4. **Storage:** create the default bucket.
5. **Project settings → Your apps:**
   - **Android** app with package `com.hireloop.app`. Add your **SHA-1 and SHA-256** (phone auth
     will fail without them). After `npx expo prebuild`, get them with
     `cd android && ./gradlew signingReport`. Download `google-services.json` to the project root.
   - **iOS** app with bundle id `com.hireloop.app`. Download `GoogleService-Info.plist` to the
     project root. For real-device SMS, upload an APNs key under *Cloud Messaging*; otherwise iOS
     falls back to a reCAPTCHA screen (handled automatically).

   To use your own ids, change `ios.bundleIdentifier` / `android.package` in `app.json` first.

## 4. Cloud Functions, rules

Firebase Auth has no "email me a 6-digit code" feature, so the email codes (verify email, reset
password via email) run in `functions/`. Mail is sent over SMTP (Gmail App Password works).

```bash
npm install -g firebase-tools
firebase login
firebase use --add                    # pick your project

cd functions
npm install
cp .env.example .env                  # fill in SMTP_USER, MAIL_FROM, optional WEB_API_KEY
firebase functions:secrets:set SMTP_PASS
cd ..

firebase deploy --only functions,firestore:rules,storage
```

The functions deploy to `asia-southeast1`; if you change it, change `functionsRegion` in
`src/config.ts` too.

## 5. Run

```bash
npx expo prebuild
npx expo run:android      # or: npx expo run:ios
```

---

## How the flows work

**Sign up** → account is created with email + password and a `users/{uid}` document →
**Verify phone** (Firebase SMS, the number is *linked* to the account) → **Verify email**
(6-digit code from `sendEmailVerificationCode`) → **Personal info** → **ID upload** →
**Payout** → status becomes `under_review` → "Account Created" → Home.
If someone quits half-way, logging in again resumes at the step they left.

**Forgot password**
- *Via Email* (works with email **or** phone entered): the function emails a code to the
  account's address → correct code returns a 15-minute reset token → new password is set by
  the function and other devices are signed out.
- *Via SMS* (phone number entered): Firebase sends the SMS; confirming it signs in to the linked
  account, the password is changed with `updatePassword`, then the app signs out and shows
  "Password Reset Successful".

**Wrong codes:** 5 wrong attempts lock that code for 30 minutes ("You've entered the wrong code
multiple times…"). Email codes are enforced on the server; SMS codes are counted on the device
on top of Firebase's own throttling. Codes expire after 10 minutes; "Resend Code" unlocks after
30 seconds.

**Remember me:** when unticked, the session is cleared the next time the app is cold-started.

## Configuration — `src/config.ts`

| Setting | Default | Notes |
|---|---|---|
| `defaultCountryCode` | `+65` | Added when a number is typed without `+` (a leading 0 is dropped). Use `+92` for Pakistan. |
| `functionsRegion` | `asia-southeast1` | Must match `functions/src/index.ts` |
| `maxCodeAttempts`, `lockoutMinutes`, `resendCooldownSeconds` | 5, 30, 30 | Client side; server values are at the top of `functions/src/index.ts` |
| `termsUrl`, `privacyUrl` | example.com | Opened from the Sign Up checkbox |

## Data & security

- `users/{uid}`: email, phone, `phoneVerified`, `emailVerified`, `onboardingStep`, `status`,
  `profile`, `identityDocument`, `payout`. Rules (`firestore.rules`) only let the owner read and
  write it, block clients from setting `emailVerified`, only allow `phoneVerified: true` when the
  auth token carries that phone number, and only allow `status` to move `incomplete → under_review`.
- `otp/*` and `resetTokens/*` are server-only. Codes and tokens are stored as SHA-256 hashes.
- Uploads go to `users/{uid}/identity/…` and `users/{uid}/bank-statement/…`, owner-only,
  JPEG/PNG/PDF/MP4 under 50MB (`storage.rules`).
- For production, add Firebase App Check and set `ENFORCE_APP_CHECK = true` in the functions.

## Project layout

```
App.tsx                     fonts, providers
src/navigation/             RootNavigator (routes by auth + onboarding state)
src/context/AuthContext     Firebase session + live user document
src/services/               auth, phone (SMS), otp (email codes), user doc, storage
src/components/             AuthLayout, TextField, Button, OtpInput, VerifyCodeView, Stepper,
                            UploadBox, AppModal, ResultModal, ChannelModal, DatePickerModal, SelectModal
src/screens/                one file per screen
functions/                  Cloud Functions (email codes, password reset)
firestore.rules, storage.rules
scripts/fetch-figma-assets.mjs
```

## Small differences from the Figma

- The status bar and home-indicator bar drawn in the frames are left to the device.
- Typed text is dark (`#060702`) so it reads differently from the grey placeholder.
- Copy fixes: "PDG" → "PDF" on the upload box, "browser jobs" → "browse jobs" on Account Created.
- The calendar adds a year picker (tap the year) so dates of birth are quick to reach.
- The select lists (gender, nationality, place of birth, bank) open a bottom sheet — the design
  shows only the closed field.
- The verification emails use my own template in the app's colours; the Figma "Email Template"
  section wasn't read and can be swapped into `functions/src/email.ts`.
