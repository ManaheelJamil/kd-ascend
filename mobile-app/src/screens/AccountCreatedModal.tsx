import React, { useState } from 'react';
import ResultModal from '../components/ResultModal';
import { signOut } from '../services/authService';

/**
 * Shown after "Submit Application".
 * "Go To Login" signs the new user out and unlocks routing, so the app lands on the Login screen.
 * After they log in, the navigator sends them to the account status screen (waiting for approval)
 * or to Home once an admin has approved them.
 */
export default function AccountCreatedModal({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  const goToLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } catch {
      // Even if sign-out fails, carry on — the navigator still routes by account status.
    } finally {
      setBusy(false);
      onDone();
    }
  };

  return (
    <ResultModal
      visible={visible}
      title="Account Created"
      message="Your account has been created successfully and will now be reviewed by our team. Log in to check your approval status."
      buttonLabel="Go To Login"
      onPress={goToLogin}
    />
  );
}
