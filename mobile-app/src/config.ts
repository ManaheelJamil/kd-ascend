export const config = {
  appName: 'KD Ascend',

  /** Must match the region the Cloud Functions are deployed to (functions/src/index.ts). */
  functionsRegion: 'asia-southeast1',

  /**
   * Email codes & password reset run on the admin dashboard's server (free, on Vercel)
   * instead of Firebase Cloud Functions (which need the Blaze plan).
   * Set this to your dashboard's address, e.g. 'https://kd-ascend-admin.vercel.app'.
   * Set to '' to use Firebase Cloud Functions instead.
   */
  apiBaseUrl: 'https://kd-ascend.vercel.app' as string,

  /**
   * Prefix used when someone types a local number without "+".
   * "+92" for Pakistan. Use "+65" for Singapore, etc.
   * A leading 0 is dropped first, so "03468919142" becomes "+92 3468919142" with "+92".
   */
  defaultCountryCode: '+92',

  /**
   * TEST OTP MODE: phone and email verification accept this code and nothing is sent.
   * Set to null for real SMS codes via Firebase Phone Auth (Pakistan +92 and Singapore +65).
   * Also active in APKs you share with testers.
   * ⚠️ BEFORE PUBLISHING: set to null to use real SMS / email codes.
   */
  devOtpCode: '123456' as string | null,

  /**
   * false = email verification sends a REAL code to the inbox (via apiBaseUrl).
   * true  = email also accepts the test code above and nothing is sent.
   * The phone (SMS) step keeps using the test code while devOtpCode is set.
   */
  devEmailOtp: false,

  /**
   * TEST MODE (also in shared test APKs): pre-fills the NRIC with the value in
   * src/data/devTestData.ts. While Firebase Storage isn't set up, a chosen ID /
   * bank-statement file is recorded (name, type, size) without the file itself.
   * ⚠️ BEFORE PUBLISHING: set to false.
   */
  devPrefill: true,

  otpLength: 6,
  resendCooldownSeconds: 30,
  /** Wrong codes allowed before the 30-minute lockout (phone codes are counted on device; email codes on the server). */
  maxCodeAttempts: 5,
  lockoutMinutes: 30,

  maxUploadBytes: 50 * 1024 * 1024,
  splashMinMs: 1200,

  /** Shown as "Contact Support" to rejected / blocked users. Leave empty to hide the button. */
  supportEmail: '' as string,

  termsUrl: 'https://example.com/terms',
  privacyUrl: 'https://example.com/privacy',
} as const;
