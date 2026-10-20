/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY AUTHENTICATION CONTEXT & STATE MANAGER
 * Manages user sessions, profile synchronization, redirect result resolution,
 * multi-provider authentication (Google, Apple, Microsoft), email verification,
 * and idempotent waitlist entitlement creation.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getCountFromServer,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db, cleanFirestoreData } from '../lib/firebase.ts';
import {
  SupportedAuthProvider,
  authenticateWithProvider,
  checkRedirectAuthResult,
  performSignOut,
  getFriendlyAuthErrorMessage,
} from '../lib/authService.ts';
import { UserProfile } from '../types/luckyly.ts';
import { DEFAULT_COHORTS, CURRENT_CAMPAIGN_ID } from '../config/constants.ts';
import { createCoinTransaction } from '../services/coinService.ts';
import { sendAutomatedEmail, createWelcomeEmail } from '../services/emailService.ts';
import { recordUserRegistrationProgress } from '../services/milestoneService.ts';
import { recordAuditEvent } from '../services/auditService.ts';
import { trackEvent } from '../services/analyticsService.ts';
import { deleteUserDataCascade, UserDeletionSummary } from '../services/userDeletionService.ts';
import { getStoredReferralCode, joinSyndicateGroup, clearStoredReferralCode } from '../services/syndicateService.ts';
import { insertWaitlistUserToSupabase, updateWaitlistUserRegionInSupabase } from '../lib/supabase.ts';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  authError: string | null;
  clearAuthError: () => void;
  showFirstPrizeReveal: boolean;
  setShowFirstPrizeReveal: (show: boolean) => void;
  authenticate: (provider: SupportedAuthProvider, forceRedirect?: boolean) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<UserDeletionSummary | null>;
  sendVerificationEmail: () => Promise<boolean>;
  updateUserAmazonRegion: (region: string) => Promise<void>;
  rewardEarnedNotice: { amount: number; title: string; subtitle: string } | null;
  clearRewardNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showFirstPrizeReveal, setShowFirstPrizeReveal] = useState<boolean>(false);
  const [rewardEarnedNotice, setRewardEarnedNotice] = useState<{
    amount: number;
    title: string;
    subtitle: string;
  } | null>(null);

  const clearAuthError = () => setAuthError(null);
  const clearRewardNotice = () => setRewardEarnedNotice(null);

  // 1. Check for pending redirect authentication on page mount
  useEffect(() => {
    async function handlePendingRedirect() {
      try {
        const redirectResult = await checkRedirectAuthResult();
        if (redirectResult?.user) {
          console.info('[AuthContext] Successfully recovered redirected auth user:', redirectResult.user.uid);
        }
      } catch (err: any) {
        console.warn('[AuthContext] Redirect auth error:', err);
        setAuthError(getFriendlyAuthErrorMessage(err));
      }
    }
    handlePendingRedirect();
  }, []);

  // 2. Listen to Firebase Auth state changes
  useEffect(() => {
    let unsubscribeProfileListener: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);

      // Clean up previous profile listener if any
      if (unsubscribeProfileListener) {
        unsubscribeProfileListener();
        unsubscribeProfileListener = null;
      }

      if (!currentUser) {
        try {
          const storedMember = localStorage.getItem('luckyly_member_user') || localStorage.getItem('luckyly_pioneer_user');
          if (storedMember) {
            const parsed = JSON.parse(storedMember);
            if (parsed && parsed.email) {
              const badgeId = parsed.memberBadgeId || parsed.pioneerBadgeId || 'member_user';
              const region = (parsed.amazon_region || parsed.amazonRegion || 'US').toUpperCase();
              const defaultMemberProfile: UserProfile = {
                userId: badgeId,
                email: parsed.email,
                displayName: parsed.email.split('@')[0],
                country: region,
                amazon_region: region,
                amazonRegion: region,
                joinedAt: parsed.joinedAt || new Date().toISOString(),
                cohortId: 'member',
                rewardTierName: 'Member',
                totalCoins: parsed.coinBalance ?? 1500,
                userIndex: 1,
                questionnaireCompleted: !!parsed.questionnaireCompleted,
                has_claimed_bonus: !!parsed.bonusClaimed,
                role: 'user',
                createdAt: parsed.joinedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setUserProfile(defaultMemberProfile);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.debug('[AuthContext] Member local storage hydration notice:', e);
        }
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          // New User Registration & Waitlist Enrollment Flow
          trackEvent('signup_started', { userId: currentUser.uid });

          // Determine user index safely with fallbacks
          let userIndex = 1;
          try {
            const countSnap = await getCountFromServer(collection(db, 'users'));
            userIndex = (countSnap.data().count || 0) + 1;
          } catch (countError) {
            userIndex = Math.max(1, Math.floor((Date.now() - 1710000000000) / 100000));
          }

          const cohort =
            DEFAULT_COHORTS.find(
              c => userIndex >= c.minUserIndex && userIndex <= c.maxUserIndex
            ) || DEFAULT_COHORTS[0];

          const now = new Date().toISOString();
          const isAdminUser =
            currentUser.email === 'neryasay@gmail.com' ||
            currentUser.email === 'nessa@luckyly.org';

          let initialRegion = 'US';
          try {
            const storedMember = localStorage.getItem('luckyly_member_user') || localStorage.getItem('luckyly_pioneer_user');
            if (storedMember) {
              const parsed = JSON.parse(storedMember);
              if (parsed?.amazon_region || parsed?.amazonRegion) {
                initialRegion = String(parsed.amazon_region || parsed.amazonRegion).toUpperCase();
              }
            }
          } catch {}

          const newProfile: UserProfile = {
            userId: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Luckyly Member',
            country: initialRegion,
            amazon_region: initialRegion,
            amazonRegion: initialRegion,
            joinedAt: now,
            cohortId: cohort.id,
            rewardTierName: cohort.name,
            totalCoins: 0,
            userIndex,
            questionnaireCompleted: false,
            role: isAdminUser ? 'admin' : 'user',
            createdAt: now,
            updatedAt: now,
          };

          if (currentUser.photoURL) {
            newProfile.photoURL = currentUser.photoURL;
          }

          // Auto-link referral token to referrer's existing 5-person group (prevent isolated groups)
          try {
            const pendingRef = getStoredReferralCode();
            if (pendingRef) {
              const joined = await joinSyndicateGroup(pendingRef, newProfile);
              if (joined) {
                newProfile.syndicateGroupId = joined.id;
                clearStoredReferralCode();
              }
            }
          } catch (refErr) {
            console.warn('[AuthContext] Auto-link referral notice:', refErr);
          }

          // 1. Create User Document with clean data (preventing undefined field crashes)
          await setDoc(userDocRef, cleanFirestoreData(newProfile));
          setUserProfile(newProfile);

          // 1b. Dual-Sync to Supabase waitlist_users
          if (newProfile.email) {
            insertWaitlistUserToSupabase({
              email: newProfile.email,
              member_badge_id: `TKT-MEMBER-${currentUser.uid.substring(0, 8).toUpperCase()}`,
              coin_balance: cohort.rewardCoins,
              amazon_region: initialRegion,
            }).catch(() => {});
          }

          // 2. Check for duplicate transaction protection before minting entitlement
          try {
            const txQuery = query(
              collection(db, 'coin_transactions'),
              where('userId', '==', currentUser.uid),
              where('type', '==', 'signup_reward')
            );
            const existingTxSnap = await getDocs(txQuery);

            if (existingTxSnap.empty) {
              await createCoinTransaction({
                userId: currentUser.uid,
                amount: cohort.rewardCoins,
                type: 'signup_reward',
                description: `Base waitlist entitlement (${cohort.rewardCoins.toLocaleString()} Coins reserved for email distribution)`,
                campaignId: CURRENT_CAMPAIGN_ID,
                reason: `Joined Luckyly as founding member #${userIndex}`,
                metadata: { cohortId: cohort.id, userIndex, status: 'allocated_for_distribution' },
              });
            }
          } catch (txErr) {
            console.warn('[AuthContext] Coin entitlement step notice:', txErr);
          }

          // 3. Record Audit Log & Public Milestone Registration Count
          try {
            recordUserRegistrationProgress(currentUser.uid).catch(() => {});
            await recordAuditEvent({
              eventType: 'USER_REGISTERED_WAITLIST',
              actorId: currentUser.uid,
              actorType: 'USER',
              userId: currentUser.uid,
              campaignId: CURRENT_CAMPAIGN_ID,
              reason: `User joined waitlist, assigned to ${cohort.name} (#${userIndex}) with ${cohort.rewardCoins} coins entitled`,
              metadata: { userIndex, rewardCoins: cohort.rewardCoins, amazon_region: initialRegion },
            });
          } catch (auditErr) {
            console.warn('[AuthContext] Audit log notice:', auditErr);
          }

          // 4. Send Automated Welcome & Waitlist Email
          try {
            const welcomeEmail = createWelcomeEmail(
              newProfile.displayName,
              cohort.name,
              cohort.rewardCoins
            );
            await sendAutomatedEmail({
              userId: currentUser.uid,
              recipientEmail: newProfile.email,
              type: 'welcome_waitlist',
              subject: welcomeEmail.subject,
              bodyHtml: welcomeEmail.bodyHtml,
              metadata: { cohortId: cohort.id, coinsAwarded: cohort.rewardCoins },
            });
          } catch (emailErr) {
            console.warn('[AuthContext] Email dispatch notice:', emailErr);
          }

          // Emit Funnel Analytics
          trackEvent('signup_completed', {
            userId: currentUser.uid,
            status: 'success',
            metadata: { userIndex, cohortId: cohort.id, amazon_region: initialRegion },
          });

          trackEvent('coin_entitlement_created', {
            userId: currentUser.uid,
            status: 'success',
            metadata: {
              amount: cohort.rewardCoins,
              cohortId: cohort.id,
              status: 'allocated_for_distribution',
            },
          });

          // Trigger celebratory first prize reveal modal
          setShowFirstPrizeReveal(true);

          // Show celebration toast
          setRewardEarnedNotice({
            amount: cohort.rewardCoins,
            title: `Welcome to Luckyly! +${cohort.rewardCoins.toLocaleString()} Coins Entitlement`,
            subtitle: `You joined early as a ${cohort.name} (Member #${userIndex}).`,
          });
        }

        // Real-time listener for user profile updates
        unsubscribeProfileListener = onSnapshot(
          userDocRef,
          docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              const reg = (data.amazon_region || data.amazonRegion || data.country || 'US').toUpperCase();
              setUserProfile({
                ...data,
                amazon_region: reg,
                amazonRegion: reg,
              });
            }
            setLoading(false);
          },
          err => {
            console.warn('[AuthContext] Profile snapshot error:', err);
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error('Error handling user auth profile:', err);
        setAuthError(getFriendlyAuthErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfileListener) unsubscribeProfileListener();
      unsubscribeAuth();
    };
  }, []);

  // Update User Amazon Region in Firestore, Supabase, and local state
  const updateUserAmazonRegion = async (region: string): Promise<void> => {
    const cleanRegion = (region || 'US').trim().toUpperCase();
    setUserProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        country: cleanRegion,
        amazon_region: cleanRegion,
        amazonRegion: cleanRegion,
        updatedAt: new Date().toISOString(),
      };
    });

    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), cleanFirestoreData({
          country: cleanRegion,
          amazon_region: cleanRegion,
          amazonRegion: cleanRegion,
          updatedAt: new Date().toISOString(),
        }));
      } catch (e) {
        console.warn('[AuthContext] Could not update region in Firestore:', e);
      }
    }

    if (userProfile?.email) {
      updateWaitlistUserRegionInSupabase(userProfile.email, cleanRegion).catch(() => {});
    }
  };

  // Universal Authentication Function
  const authenticate = async (provider: SupportedAuthProvider, forceRedirect = false) => {
    trackEvent('signup_cta_click', { metadata: { provider } });
    clearAuthError();

    try {
      await authenticateWithProvider(provider, forceRedirect);
    } catch (error: any) {
      console.error(`[AuthContext] ${provider} authentication error:`, error);
      const friendlyMessage = getFriendlyAuthErrorMessage(error);
      setAuthError(friendlyMessage);
      trackEvent('signup_failed', {
        status: 'failure',
        metadata: { provider, reason: error?.message, code: error?.code },
      });
      throw error;
    }
  };

  // Google Sign-In Convenience Wrapper
  const signInWithGoogle = async () => {
    return authenticate('google');
  };

  // Sign out
  const logout = async () => {
    try {
      await performSignOut();
      setUserProfile(null);
      setShowFirstPrizeReveal(false);
      clearAuthError();
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setAuthError(getFriendlyAuthErrorMessage(err));
    }
  };

  // Cascading Account & Data Deletion (GDPR/CCPA Right to Erasure)
  const deleteAccount = async (): Promise<UserDeletionSummary | null> => {
    const targetUid = user?.uid || userProfile?.userId;
    if (!targetUid) return null;
    try {
      clearAuthError();
      const summary = await deleteUserDataCascade(targetUid, { deleteAuthUser: true });
      setUserProfile(null);
      setUser(null);
      setShowFirstPrizeReveal(false);
      return summary;
    } catch (err: any) {
      console.error('[AuthContext] Error deleting user account cascade:', err);
      setAuthError(err?.message || 'Failed to delete user account data.');
      throw err;
    }
  };

  // Email verification helper
  const sendVerificationEmail = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await sendEmailVerification(auth.currentUser);
      trackEvent('verification_email_sent', {
        userId: auth.currentUser.uid,
        status: 'success',
      });
      return true;
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      setAuthError(getFriendlyAuthErrorMessage(err));
      return false;
    }
  };

  const isAdmin =
    user?.email === 'neryasay@gmail.com' ||
    user?.email === 'nessa@luckyly.org' ||
    userProfile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAdmin,
        authError,
        clearAuthError,
        showFirstPrizeReveal,
        setShowFirstPrizeReveal,
        authenticate,
        signInWithGoogle,
        logout,
        deleteAccount,
        sendVerificationEmail,
        updateUserAmazonRegion,
        rewardEarnedNotice,
        clearRewardNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
