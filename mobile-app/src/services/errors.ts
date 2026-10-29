const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 8 characters',
  'auth/too-many-requests': 'Too many attempts. Please wait a while and try again.',
  'auth/network-request-failed': 'No internet connection. Please try again.',
  'auth/invalid-phone-number': 'Please enter a valid phone number.',
  'auth/missing-phone-number': 'Please enter a valid phone number.',
  'auth/invalid-verification-code': 'Incorrect Code. Please Try Again',
  'auth/invalid-verification-id': 'This code has expired. Please request a new one.',
  'auth/session-expired': 'This code has expired. Please request a new one.',
  'auth/code-expired': 'This code has expired. Please request a new one.',
  'auth/credential-already-in-use': 'This phone number is already linked to another account.',
  'auth/account-exists-with-different-credential': 'This phone number is already linked to another account.',
  'auth/provider-already-linked': 'A phone number is already linked to this account.',
  'auth/billing-not-enabled': 'SMS codes aren’t enabled yet (Firebase Blaze plan needed). Please try again later.',
  'auth/operation-not-allowed': 'SMS codes can only be sent to Pakistan (+92) and Singapore (+65) numbers right now.',
  'auth/missing-client-identifier': 'This app is not authorised for phone sign-in yet (check SHA keys in Firebase).',
  'auth/invalid-app-credential': 'Phone verification failed on this device. Please try again.',
  'auth/sms-timeout': 'We couldn’t send the SMS code. Please check your number and try again in a minute.',
  'auth/quota-exceeded': 'We can’t send more SMS right now. Please try again later.',
  'auth/app-not-authorized': 'This app is not authorised for phone sign-in yet (check SHA keys in Firebase).',
  'auth/requires-recent-login': 'For your security, please verify again and retry.',
  'not-found': 'No account found with this email or phone number.',
  unavailable: 'Service unavailable. Check your connection and try again.',
  'deadline-exceeded': 'The request timed out. Please try again.',
  unauthenticated: 'Your session has ended. Please sign in again.',
};

/**
 * True when a callable Cloud Function isn't deployed yet (Firebase answers NOT_FOUND).
 * Our own "No account found" errors also use not-found, so those are told apart by message.
 */
export function isFunctionMissing(e: unknown): boolean {
  const msg = String((e as { message?: unknown })?.message ?? '');
  return errorCode(e) === 'not-found' && !/no account/i.test(msg);
}

export const SERVER_NOT_READY =
  'This step needs the app’s server functions, which aren’t set up yet. Please try again later.';

export function errorCode(e: unknown): string {
  const code = (e as { code?: unknown })?.code;
  if (typeof code !== 'string') return '';
  return code.replace(/^functions\//, '');
}

export function friendlyError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = errorCode(e);
  if (isFunctionMissing(e)) return SERVER_NOT_READY;
  if (MESSAGES[code]) return MESSAGES[code];
  const msg = (e as { message?: unknown })?.message;
  // Callable functions send user-facing messages for HttpsErrors.
  if (code && !code.startsWith('auth/') && typeof msg === 'string' && msg && msg !== code) return msg;
  if (typeof msg === 'string' && /BILLING_NOT_ENABLED/i.test(msg)) return MESSAGES['auth/billing-not-enabled'];
  if (__DEV__) console.warn('[friendlyError]', code, e);
  // Show the Firebase code for unexpected auth errors so testers can report it.
  return code.startsWith('auth/') ? `${fallback} (${code})` : fallback;
}
