/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY SYNDICATE & GROUP POOL SERVICE
 * Enforces strict 5-person maximum cap per syndicate group.
 * Allows members to form pools with friends & family so if anyone wins, the whole group celebrates!
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase.ts';
import { SyndicateGroup, SyndicateMember, UserProfile } from '../types/luckyly.ts';
import { recordAuditEvent } from './auditService.ts';
import { trackEvent } from './analyticsService.ts';

// Deterministic short code generator
function generateGroupCode(seed: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  let code = 'LKY-';
  for (let i = 0; i < 4; i++) {
    const idx = Math.abs((hash >> (i * 4)) % chars.length);
    code += chars[idx];
  }
  return code;
}

const REFERRAL_STORAGE_KEY = 'luckyly_pending_referral_group';

/**
 * Robustly parses and normalizes referral / group tokens from URL strings or storage.
 */
export function cleanReferralToken(raw: string): string {
  if (!raw) return '';
  let token = raw.trim();
  if (token.includes('?')) {
    try {
      const parsed = new URL(token, 'https://luckyly.org');
      const param = parsed.searchParams.get('group') || parsed.searchParams.get('ref') || parsed.searchParams.get('referral');
      if (param) token = param;
    } catch {
      const match = token.match(/(?:group|ref|referral)=([^&]+)/i);
      if (match) token = match[1];
    }
  } else if (token.includes('=')) {
    const parts = token.split('=');
    token = parts[parts.length - 1];
  }
  return decodeURIComponent(token).trim().toUpperCase();
}

/**
 * Parses and returns any pending referral/group token from URL or localStorage.
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('group') || params.get('ref') || params.get('referral');
    if (fromUrl && fromUrl.trim()) {
      const clean = cleanReferralToken(fromUrl);
      if (clean) {
        localStorage.setItem(REFERRAL_STORAGE_KEY, clean);
        return clean;
      }
    }
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    return stored ? cleanReferralToken(stored) : null;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export async function getUserSyndicateGroup(userId: string): Promise<SyndicateGroup | null> {
  if (!userId) return null;
  try {
    // 1. Check if user document references a syndicateGroupId
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const userData = userSnap.data() as UserProfile;
      if (userData.syndicateGroupId) {
        const groupSnap = await getDoc(doc(db, 'syndicate_groups', userData.syndicateGroupId));
        if (groupSnap.exists()) {
          const groupData = groupSnap.data() as SyndicateGroup;
          saveSyndicateLocally(groupData);
          return groupData;
        }
      }
    }

    // 2. Query groups by creatorId
    const qCreator = query(collection(db, 'syndicate_groups'), where('creatorId', '==', userId));
    const creatorSnap = await getDocs(qCreator);
    if (!creatorSnap.empty) {
      const g = creatorSnap.docs[0].data() as SyndicateGroup;
      saveSyndicateLocally(g);
      return g;
    }

    // 3. Query groups where memberIds contains userId
    try {
      const qMember = query(collection(db, 'syndicate_groups'), where('memberIds', 'array-contains', userId));
      const memberSnap = await getDocs(qMember);
      if (!memberSnap.empty) {
        const g = memberSnap.docs[0].data() as SyndicateGroup;
        saveSyndicateLocally(g);
        return g;
      }
    } catch {
      // Fallback
    }

    // Check local storage fallback
    const local = getSyndicateFromLocal();
    if (local && (local.creatorId === userId || local.memberIds?.includes(userId) || local.members?.some(m => m.userId === userId))) {
      return local;
    }

    return null;
  } catch (err) {
    console.warn('[SyndicateService] Error finding user syndicate:', err);
    return getSyndicateFromLocal();
  }
}

function saveSyndicateLocally(group: SyndicateGroup) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('luckyly_active_syndicate', JSON.stringify(group));
    if (group.groupCode) {
      localStorage.setItem(`syndicate_code_${group.groupCode}`, JSON.stringify(group));
    }
    if (group.id) {
      localStorage.setItem(`syndicate_id_${group.id}`, JSON.stringify(group));
    }
  } catch {}
}

function getSyndicateFromLocal(): SyndicateGroup | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('luckyly_active_syndicate');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getSyndicateGroupByCode(groupCode: string): Promise<SyndicateGroup | null> {
  if (!groupCode) return null;
  const cleanCode = cleanReferralToken(groupCode);
  if (!cleanCode) return null;

  try {
    // Direct ID lookup or code lookup
    const directSnap = await getDoc(doc(db, 'syndicate_groups', cleanCode));
    if (directSnap.exists()) {
      const g = directSnap.data() as SyndicateGroup;
      saveSyndicateLocally(g);
      return g;
    }

    const q = query(collection(db, 'syndicate_groups'), where('groupCode', '==', cleanCode));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const g = snap.docs[0].data() as SyndicateGroup;
      saveSyndicateLocally(g);
      return g;
    }
  } catch (err) {
    console.warn('[SyndicateService] Lookup error:', err);
  }

  // Check local cache
  if (typeof window !== 'undefined') {
    try {
      const byCode = localStorage.getItem(`syndicate_code_${cleanCode}`);
      if (byCode) return JSON.parse(byCode);
      const byId = localStorage.getItem(`syndicate_id_${cleanCode}`);
      if (byId) return JSON.parse(byId);
      const active = getSyndicateFromLocal();
      if (active && (active.groupCode === cleanCode || active.id === cleanCode)) return active;
    } catch {}
  }

  return null;
}

export function subscribeToSyndicateGroup(
  groupId: string,
  onUpdate: (group: SyndicateGroup | null) => void
): () => void {
  if (!groupId) {
    onUpdate(null);
    return () => {};
  }
  const groupRef = doc(db, 'syndicate_groups', groupId);
  const unsubFs = onSnapshot(
    groupRef,
    snap => {
      if (snap.exists()) {
        const group = snap.data() as SyndicateGroup;
        saveSyndicateLocally(group);
        onUpdate(group);
      } else {
        onUpdate(null);
      }
    },
    err => {
      console.warn('[SyndicateService] Snapshot error:', err);
      onUpdate(getSyndicateFromLocal());
    }
  );

  const handleCustomSync = (e: any) => {
    if (e.detail) {
      onUpdate(e.detail);
    }
  };
  window.addEventListener('syndicate_updated', handleCustomSync);

  return () => {
    unsubFs();
    window.removeEventListener('syndicate_updated', handleCustomSync);
  };
}

/**
 * Creates or retrieves the user's personal 5-person syndicate group.
 * If a referral token exists, adds the user to the referrer's group instead of creating an isolated group.
 */
export async function getOrCreateUserSyndicate(user: { userId: string; displayName?: string; email?: string; photoURL?: string; syndicateGroupId?: string }): Promise<SyndicateGroup> {
  if (!user || !user.userId) {
    throw new Error('Valid user required to manage syndicate.');
  }

  // 1. Check for pending referral token FIRST to prevent isolated group creation
  const pendingCode = getStoredReferralCode();
  if (pendingCode) {
    try {
      const joined = await joinSyndicateGroup(pendingCode, user);
      if (joined) {
        clearStoredReferralCode();
        return joined;
      }
    } catch (err) {
      console.warn('[SyndicateService] Could not auto-join pending referral group:', err);
    }
  }

  // 2. Check if user already belongs to an existing group
  const existing = await getUserSyndicateGroup(user.userId);
  if (existing) {
    return existing;
  }

  const groupId = `grp_${user.userId.substring(0, 12)}`;
  const groupCode = generateGroupCode(user.userId);
  const now = new Date().toISOString();

  const initialLeaderMember: SyndicateMember = {
    userId: user.userId,
    displayName: user.displayName || 'Team Leader',
    email: user.email || '',
    photoURL: user.photoURL,
    joinedAt: now,
    isLeader: true,
  };

  const newGroup: SyndicateGroup = {
    id: groupId,
    groupCode,
    creatorId: user.userId,
    creatorName: user.displayName || 'Luckyly Member',
    members: [initialLeaderMember],
    memberIds: [user.userId],
    maxMembers: 5,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  // Write group to Firestore
  await setDoc(doc(db, 'syndicate_groups', groupId), cleanFirestoreData(newGroup));

  // Link group ID to user profile
  try {
    await updateDoc(doc(db, 'users', user.userId), cleanFirestoreData({
      syndicateGroupId: groupId,
      updatedAt: now,
    }));
  } catch (err) {
    console.warn('[SyndicateService] Could not update user with syndicateGroupId:', err);
  }

  // Record audit
  await recordAuditEvent({
    eventType: 'SYNDICATE_GROUP_CREATED',
    actorId: user.userId,
    actorType: 'USER',
    userId: user.userId,
    reason: `User created syndicate group ${groupCode} with 5-person max cap`,
    metadata: { groupId, groupCode, maxMembers: 5 },
  });

  trackEvent('syndicate_created' as any, {
    userId: user.userId,
    status: 'success',
    metadata: { groupId, groupCode },
  });

  return newGroup;
}

/**
 * Joins an existing syndicate group with strict 5-member limit enforcement.
 */
export async function joinSyndicateGroup(
  groupCodeOrId: string,
  user: { userId: string; displayName?: string; email?: string; photoURL?: string }
): Promise<SyndicateGroup> {
  if (!user || !user.userId) {
    throw new Error('Sign in required to join a syndicate group.');
  }

  const targetGroup = await getSyndicateGroupByCode(groupCodeOrId);
  if (!targetGroup) {
    throw new Error('Team group code not found. Please verify the invite link.');
  }

  // Already a member?
  const alreadyMember = targetGroup.members.some(m => m.userId === user.userId);
  if (alreadyMember) {
    saveSyndicateLocally(targetGroup);
    return targetGroup;
  }

  // Strictly enforce max 5 members
  if (targetGroup.members.length >= 5) {
    throw new Error('This 5-person team is full (maximum 5 members reached).');
  }

  const now = new Date().toISOString();
  const newMember: SyndicateMember = {
    userId: user.userId,
    displayName: user.displayName || user.email?.split('@')[0] || 'Team Member',
    email: user.email || '',
    photoURL: user.photoURL,
    joinedAt: now,
    isLeader: false,
  };

  const updatedMembers = [...targetGroup.members, newMember];
  const updatedMemberIds = Array.from(new Set([
    ...(targetGroup.memberIds || targetGroup.members.map(m => m.userId)),
    user.userId,
  ]));
  const isFilled = updatedMembers.length >= 5;

  targetGroup.members = updatedMembers;
  targetGroup.memberIds = updatedMemberIds;
  targetGroup.status = isFilled ? 'filled' : 'active';
  targetGroup.updatedAt = now;

  // Persist locally immediately so UI (e.g. 5-square tracker) updates in real-time
  saveSyndicateLocally(targetGroup);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('syndicate_updated', { detail: targetGroup }));
  }

  // Persist to Firestore
  try {
    await updateDoc(doc(db, 'syndicate_groups', targetGroup.id), cleanFirestoreData({
      members: updatedMembers,
      memberIds: updatedMemberIds,
      status: targetGroup.status,
      updatedAt: now,
    }));
  } catch (err) {
    console.warn('[SyndicateService] Firestore group update notice:', err);
  }

  try {
    await updateDoc(doc(db, 'users', user.userId), cleanFirestoreData({
      syndicateGroupId: targetGroup.id,
      updatedAt: now,
    }));
  } catch (err) {
    console.warn('[SyndicateService] Update user syndicate link notice:', err);
  }

  try {
    await recordAuditEvent({
      eventType: 'SYNDICATE_MEMBER_JOINED',
      actorId: user.userId,
      actorType: 'USER',
      userId: user.userId,
      reason: `User joined syndicate group ${targetGroup.groupCode} (${updatedMembers.length}/5 members)`,
      metadata: { groupId: targetGroup.id, membersCount: updatedMembers.length },
    });
  } catch {}

  trackEvent('syndicate_joined' as any, {
    userId: user.userId,
    status: 'success',
    metadata: { groupId: targetGroup.id, groupCode: targetGroup.groupCode },
  });

  return targetGroup;
}
