import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, reload, type FirebaseAuthTypes } from '@react-native-firebase/auth';
import { onSnapshot, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { auth } from '../firebase';
import { getRememberMe, signOut } from '../services/authService';
import { isOnboardingComplete, markSubmitted, userRef, type UserDoc } from '../services/userService';
import { isDevEmailOtp, isDevOtp, writeDevFlag, type DevFlags } from '../services/devOtp';

type AuthContextValue = {
  /** True until Firebase has restored (or cleared) the session. */
  initializing: boolean;
  user: FirebaseAuthTypes.User | null;
  profile: UserDoc | null;
  /** True once the Firestore profile for the signed-in user has been read at least once. */
  profileLoaded: boolean;
  /**
   * While locked, the navigator keeps the current screens even if the auth state changes.
   * Used by flows that sign in or finish onboarding but must show a final screen/modal first.
   */
  routingLocked: boolean;
  lockRouting: () => void;
  unlockRouting: () => void;
  /** Test OTP mode: marks phone/email as verified on this device only. */
  markDevVerified: (kind: keyof DevFlags) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const snapshotExists = (snap: { exists: boolean | (() => boolean) }) =>
  typeof snap.exists === 'function' ? snap.exists() : snap.exists;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [routingLocked, setRoutingLocked] = useState(false);
  const firstEvent = useRef(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (next) => {
      if (firstEvent.current) {
        firstEvent.current = false;
        // Cold start: honour an unticked "Remember me" from the last login.
        if (next && !(await getRememberMe())) {
          await signOut();
          return; // the listener fires again with null
        }
        // Cold start: the saved session may belong to an account that was deleted or
        // disabled in the Firebase console. Check with the server and sign out if so.
        if (next) {
          try {
            await reload(next);
          } catch (e) {
            const code = (e as { code?: string })?.code ?? '';
            if (
              ['auth/user-not-found', 'auth/user-disabled', 'auth/user-token-expired', 'auth/invalid-user-token'].includes(
                code,
              )
            ) {
              await signOut();
              return;
            }
            // Offline etc.: keep the session and carry on.
          }
        }
      }
      setUser(next);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Live profile document for the signed-in user.
  useEffect(() => {
    setProfile(null);
    setProfileLoaded(false);
    if (!user) return;

    let createTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onSnapshot(
      userRef(user.uid),
      // Metadata changes too, so we hear when the server confirms the cached result.
      { includeMetadataChanges: true },
      (snap) => {
        if (snapshotExists(snap)) {
          clearTimeout(createTimer);
          setProfile(snap.data() as UserDoc);
          setProfileLoaded(true);
          return;
        }
        // After a fresh install the local cache is empty, so the first snapshot can say "missing"
        // for an account that exists. Wait for the server's answer instead of treating it as new.
        if ((snap as { metadata?: { fromCache?: boolean } }).metadata?.fromCache) return;
        // Sign-up writes the document right after creating the account. If it is still
        // missing after a moment (e.g. sign-up was interrupted), create a minimal one.
        clearTimeout(createTimer);
        createTimer = setTimeout(() => {
          setDoc(
            userRef(user.uid),
            {
              uid: user.uid,
              email: user.email ?? '',
              phone: user.phoneNumber ?? '',
              phoneVerified: false,
              emailVerified: false,
              onboardingStep: 'personal',
              status: 'incomplete',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ).catch((e) => __DEV__ && console.warn('Could not create user doc', e));
        }, 3000);
      },
      (error) => {
        if (__DEV__) console.warn('Profile listener error', error);
        setProfileLoaded(true);
      },
    );
    return () => {
      clearTimeout(createTimer);
      unsubscribe();
    };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Profile fully filled in but never sent for review (e.g. the last step was interrupted):
  // send it now, so the user waits for approval instead of redoing onboarding.
  const submittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.status !== 'incomplete' && profile.status !== undefined) return;
    if (!isOnboardingComplete(profile) || submittedFor.current === user.uid) return;
    submittedFor.current = user.uid;
    markSubmitted(user.uid).catch((e) => __DEV__ && console.warn('Could not submit for review', e));
  }, [user, profile]);

  const lockRouting = useCallback(() => setRoutingLocked(true), []);
  const unlockRouting = useCallback(() => setRoutingLocked(false), []);
  const markDevVerified = useCallback(
    async (kind: keyof DevFlags) => {
      if (!user) return;
      await writeDevFlag(user.uid, kind); // the profile listener picks up the change
    },
    [user?.uid], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // In test OTP mode, the testVerification flags saved in Firestore count as verified.
  const effectiveProfile = useMemo(() => {
    if (!profile) return null;
    if (!isDevOtp()) return profile;
    const t = profile.testVerification ?? {};
    return {
      ...profile,
      phoneVerified: profile.phoneVerified || !!t.phone,
      emailVerified: profile.emailVerified || (isDevEmailOtp() && !!t.email),
    };
  }, [profile]);

  const value = useMemo(
    () => ({
      initializing,
      user,
      profile: effectiveProfile,
      profileLoaded,
      routingLocked,
      lockRouting,
      unlockRouting,
      markDevVerified,
    }),
    [initializing, user, effectiveProfile, profileLoaded, routingLocked, lockRouting, unlockRouting, markDevVerified],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
