/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, cleanFirestoreData } from '../lib/firebase.ts';
import { AuditLog, AuditActorType } from '../types/luckyly.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import { SYSTEM_VERSION } from '../config/constants.ts';

export async function recordAuditEvent(params: {
  eventType: string;
  actorId: string;
  actorType: AuditActorType;
  reason: string;
  userId?: string;
  drawId?: string;
  campaignId?: string;
  coinTxId?: string;
  previousState?: string;
  newState?: string;
  metadata?: Record<string, any>;
}): Promise<AuditLog> {
  const auditId = 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const log: any = {
    id: auditId,
    timestamp: new Date().toISOString(),
    eventType: params.eventType,
    actorId: params.actorId,
    actorType: params.actorType,
    reason: params.reason,
    systemVersion: SYSTEM_VERSION,
    metadata: params.metadata || {},
  };

  if (params.userId) log.userId = params.userId;
  if (params.drawId) log.drawId = params.drawId;
  if (params.campaignId) log.campaignId = params.campaignId;
  if (params.coinTxId) log.coinTxId = params.coinTxId;
  if (params.previousState) log.previousState = params.previousState;
  if (params.newState) log.newState = params.newState;

  try {
    await setDoc(doc(db, 'audit_logs', auditId), cleanFirestoreData(log));
    return log as AuditLog;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `audit_logs/${auditId}`);
  }
}

export async function getRecentAuditLogs(max = 25): Promise<AuditLog[]> {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AuditLog);
  } catch (error) {
    // If not accessible or offline, gracefully return empty
    console.warn('Could not fetch audit logs:', error);
    return [];
  }
}
