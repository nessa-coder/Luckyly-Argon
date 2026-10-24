/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY PRODUCTION AUTHENTICATION SERVICE
 * Supports Google, Apple, and Microsoft authentication via Firebase Auth.
 * Includes automated popup-to-redirect fallbacks, redirect result recovery,
 * safe account-linking flows (preventing unauthenticated account merges),
 * and transparent, actionable user error messages.
 */

import {
  Auth,
  AuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  User,
  UserCredential,
  browserLocalPersistence,
  getRedirectResult,
  linkWithCredential,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  fetchSignInMethodsForEmail,
  AuthCredential,
} from 'firebase/auth';
import { auth } from './firebase.ts';
import { trackEvent } from '../services/analyticsService.ts';

export type SupportedAuthProvider = 'google' | 'apple' | 'microsoft';

export interface AuthActionResult {
  user: User;
  credential?: AuthCredential;
  isNewUser?: boolean;
}

export interface ProviderConfigStatus {
  provider: SupportedAuthProvider;
  displayName: string;
  isConfigured: boolean;
  statusNote: string;
}

// 1. Google Provider Configuration
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// 2. Apple Provider Configuration
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// 3. Microsoft Provider Configuration
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('openid');
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');

/**
 * Returns the appropriate Firebase AuthProvider instance.
 */
export function getProviderInstance(providerName: SupportedAuthProvider): AuthProvider {
  switch (providerName) {
    case 'google':
      return googleProvider;
    case 'apple':
      return appleProvider;
    case 'microsoft':
      return microsoftProvider;
    default:
      throw new Error(`Unsupported auth provider: ${providerName}`);
  }
}

/**
 * User-friendly error message translator for Firebase Auth codes.
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred during authentication.';
  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by your browser. Please allow popups for Luckyly or try redirect sign-in.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled before completion. Please try again whenever you are ready.';
    case 'auth/cancelled-popup-request':
      return 'Only one sign-in window can be open at a time. Please retry.';
    case 'auth/unauthorized-domain':
      return `This domain (${typeof window !== 'undefined' ? window.location.hostname : 'current'}) is not authorized in Firebase Console. Add this domain to Firebase Authentication > Settings > Authorized domains.`;
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled in the Firebase Console yet. Please contact nessa@luckyly.org or use Google Sign-In.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email address using another sign-in method. Please sign in with your original provider.';
    case 'auth/network-request-failed':
      return 'A network error occurred while contacting authentication servers. Please check your internet connection.';
    case 'auth/invalid-credential':
      return 'The authentication credentials supplied have expired or are invalid. Please try signing in again.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact nessa@luckyly.org for assistance.';
    default:
      return message || 'Authentication failed. Please try again.';
  }
}

/**
 * Ensures session persistence is configured (browserLocalPersistence).
 */
export async function ensureAuthPersistence(): Promise<void> {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (err) {
    console.warn('[AuthService] Could not set local persistence:', err);
  }
}

// Proactively configure persistence on boot without blocking user click gestures
ensureAuthPersistence().catch(() => {});

/**
 * Checks for and processes pending redirect results upon application boot.
 */
export async function checkRedirectAuthResult(): Promise<AuthActionResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      trackEvent('auth_redirect_resolved', {
        userId: result.user.uid,
        status: 'success',
      });
      return {
        user: result.user,
        credential: (result as any).credential || undefined,
      };
    }
    return null;
  } catch (error: any) {
    console.error('[AuthService] Error resolving redirect authentication:', error);
    trackEvent('auth_redirect_error', {
      metadata: { code: error?.code, message: error?.message },
    });
    throw error;
  }
}

/**
 * Universal sign-in handler with automatic popup fallback to redirect.
 * Prioritizes popup authentication on both desktop and mobile, ensuring
 * that user-initiated gestures are handled cleanly without iframe navigation breakage.
 */
export async function authenticateWithProvider(
  providerName: SupportedAuthProvider,
  forceRedirect = false
): Promise<AuthActionResult> {
  const provider = getProviderInstance(providerName);

  trackEvent('auth_attempt_started', {
    metadata: { provider: providerName, forceRedirect },
  });

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // If redirect is explicitly requested and we are in a top-level window (not an iframe), use redirect
  if (forceRedirect && !isInIframe) {
    try {
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    } catch (err: any) {
      console.error(`[AuthService] signInWithRedirect error for ${providerName}:`, err);
      throw err;
    }
  }

  // Primary path: Attempt popup authentication first.
  // Modern mobile browsers and desktop browsers both support popups from user-initiated gestures.
  try {
    const userCredential: UserCredential = await signInWithPopup(auth, provider);

    trackEvent('auth_attempt_succeeded', {
      userId: userCredential.user.uid,
      metadata: { provider: providerName },
    });
    return {
      user: userCredential.user,
      credential: (userCredential as any).credential || undefined,
    };
  } catch (popupError: any) {
    console.warn(`[AuthService] Popup sign-in notice (code ${popupError?.code}):`, popupError);

    const isPopupBlocked =
      popupError?.code === 'auth/popup-blocked' ||
      popupError?.code === 'auth/operation-not-supported-in-this-environment';

    // If popup is blocked and we are NOT inside an iframe, fall back to redirect
    if (isPopupBlocked && !isInIframe) {
      console.info('[AuthService] Falling back to redirect authentication for top-level browser...');
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    }

    throw popupError;
  }
}

/**
 * Handles account conflict resolution: If an account exists with a different credential,
 * queries available sign-in methods so the user can sign in with the primary provider
 * and optionally link their secondary provider safely.
 */
export async function getExistingMethodsForConflict(email: string): Promise<string[]> {
  try {
    return await fetchSignInMethodsForEmail(auth, email);
  } catch (err) {
    console.warn('[AuthService] Could not fetch sign-in methods for email:', err);
    return [];
  }
}

/**
 * Links a pending credential to an already authenticated user.
 */
export async function linkPendingCredentialToUser(
  currentUser: User,
  credential: AuthCredential
): Promise<UserCredential> {
  try {
    const result = await linkWithCredential(currentUser, credential);
    trackEvent('auth_account_linked', {
      userId: currentUser.uid,
      status: 'success',
    });
    return result;
  } catch (error: any) {
    console.error('[AuthService] Account linking error:', error);
    throw error;
  }
}

/**
 * Signs out the current user and clears session state.
 */
export async function performSignOut(): Promise<void> {
  await signOut(auth);
  trackEvent('auth_sign_out', { status: 'success' });
}

