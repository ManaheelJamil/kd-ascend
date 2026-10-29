import React, { useEffect, useMemo, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { UserDoc } from '../services/userService';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { OnboardingRoute, RootStackParamList } from './types';
import { colors } from '../theme';
import { config } from '../config';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetVerifyScreen from '../screens/ResetVerifyScreen';
import CreateNewPasswordScreen from '../screens/CreateNewPasswordScreen';
import VerifyPhoneScreen from '../screens/VerifyPhoneScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import PersonalInfoScreen from '../screens/PersonalInfoScreen';
import IdentityUploadScreen from '../screens/IdentityUploadScreen';
import PayoutMethodScreen from '../screens/PayoutMethodScreen';
import PayNowDetailsScreen from '../screens/PayNowDetailsScreen';
import BankDetailsScreen from '../screens/BankDetailsScreen';
import HomeScreen from '../screens/HomeScreen';
import AccountStatusScreen from '../screens/AccountStatusScreen';
import AccountScreen from '../screens/AccountScreen';
// DEV BRANCH (Account section off): import EditProfileScreen from '../screens/EditProfileScreen';
// DEV BRANCH (Account section off): import IdentityDocumentsScreen from '../screens/IdentityDocumentsScreen';
// DEV BRANCH (Account section off): import UploadDocumentScreen from '../screens/UploadDocumentScreen';
import PaymentDetailsScreen from '../screens/PaymentDetailsScreen';
import ResubmitScreen from '../screens/ResubmitScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

type Target =
  | { kind: 'splash' }
  | { kind: 'auth' }
  | { kind: 'onboarding'; initial: OnboardingRoute }
  | { kind: 'status' }
  | { kind: 'app' };

/**
 * Where an unfinished account resumes. Uses the data already saved as well as onboardingStep,
 * so a user who signs in again never repeats a step they completed (e.g. Personal Info).
 */
function firstOnboardingRoute(p: UserDoc): OnboardingRoute {
  if (!p.phoneVerified) return 'VerifyPhone';
  if (!p.emailVerified) return 'VerifyEmail';
  if (p.identityDocument || p.onboardingStep === 'payout') return 'PayoutMethod';
  if (p.profile?.fullName || p.onboardingStep === 'identity') return 'IdentityUpload';
  return 'PersonalInfo';
}

function computeTarget(
  initializing: boolean,
  user: FirebaseAuthTypes.User | null,
  profile: UserDoc | null,
  profileLoaded: boolean,
): Target {
  if (initializing) return { kind: 'splash' };
  if (!user) return { kind: 'auth' };
  if (!profileLoaded || !profile) return { kind: 'splash' };
  // Admin decisions win over everything else and apply immediately (the profile is a live listener).
  if (profile.status === 'blacklisted' || profile.status === 'rejected') return { kind: 'status' };
  // Approved by an admin (including accounts the admin created) → straight to Home on every sign-in.
  if (profile.status === 'approved') return { kind: 'app' };
  // Approved before and now re-checking an edited profile / new document: keeps using the app
  // (the Account card shows "Unverified" until an admin approves again).
  // (Not after a resubmission from blocked / rejected: those wait for the admin first.)
  if (profile.status === 'under_review' && profile.approvedAt && !profile.resubmittedFrom) return { kind: 'app' };
  // Finished onboarding and waiting for review → "Waiting for Approval".
  if (profile.status === 'under_review' || (profile.onboardingStep === 'done' && profile.phoneVerified && profile.emailVerified)) {
    return { kind: 'status' };
  }
  return { kind: 'onboarding', initial: firstOnboardingRoute(profile) };
}

const ONBOARDING_SCREENS: Record<OnboardingRoute, React.ComponentType<any>> = {
  VerifyPhone: VerifyPhoneScreen,
  VerifyEmail: VerifyEmailScreen,
  PersonalInfo: PersonalInfoScreen,
  IdentityUpload: IdentityUploadScreen,
  PayoutMethod: PayoutMethodScreen,
  PayNowDetails: PayNowDetailsScreen,
  BankDetails: BankDetailsScreen,
};

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.dark } };

export default function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { initializing, user, profile, profileLoaded, routingLocked } = useAuth();
  const [minSplashDone, setMinSplashDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), config.splashMinMs);
    return () => clearTimeout(t);
  }, []);

  const live = computeTarget(initializing, user, profile, profileLoaded);
  const [target, setTarget] = useState<Target>(live);

  // Only move between groups when nothing has locked routing.
  const liveKey = live.kind === 'onboarding' ? `onboarding` : live.kind;
  useEffect(() => {
    if (routingLocked) return;
    setTarget((current) => {
      const currentKey = current.kind === 'onboarding' ? 'onboarding' : current.kind;
      return currentKey === liveKey ? current : live;
    });
  }, [liveKey, routingLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSplash = !fontsReady || !minSplashDone || target.kind === 'splash';

  // The first screen registered in a group is the one shown when the group mounts.
  const onboardingOrder = useMemo(() => {
    if (target.kind !== 'onboarding') return [];
    const all = Object.keys(ONBOARDING_SCREENS) as OnboardingRoute[];
    return [target.initial, ...all.filter((r) => r !== target.initial)];
  }, [target]);

  if (showSplash) return <SplashScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {target.kind === 'auth' && (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetVerify" component={ResetVerifyScreen} />
            <Stack.Screen name="CreateNewPassword" component={CreateNewPasswordScreen} />
          </Stack.Group>
        )}
        {target.kind === 'onboarding' && (
          <Stack.Group>
            {onboardingOrder.map((name) => (
              <Stack.Screen key={name} name={name} component={ONBOARDING_SCREENS[name]} />
            ))}
          </Stack.Group>
        )}
        {target.kind === 'status' && (
          <Stack.Group>
            <Stack.Screen name="AccountStatus" component={AccountStatusScreen} />
            <Stack.Screen name="Resubmit" component={ResubmitScreen} />
            <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} />
          </Stack.Group>
        )}
        {target.kind === 'app' && (
          <Stack.Group>
            <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'none' }} />
            <Stack.Screen name="Account" component={AccountScreen} options={{ animation: 'none' }} />
            {/* DEV BRANCH (Account section off):
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="IdentityDocuments" component={IdentityDocumentsScreen} />
            <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
            <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} />
            */}
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
