/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY ADMIN INTELLIGENCE & DUAL-SYNC AUDIT DASHBOARD
 * Features:
 * - Dual-Sync live data engine (Supabase PostgreSQL + Google Cloud Firestore)
 * - Live data tables with real-time search & filter
 * - RFC 4180 CSV export for Users, Questionnaire Surveys, and Behavioral Analytics
 * - JSON metadata viewer for full-fidelity audit inspection
 * - Safe user deletion cascade
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Draw, UserProfile, QuestionnaireAnswer } from '../types/luckyly.ts';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { calculateMilestoneProgress, getRealRegistrationCount } from '../services/milestoneService.ts';
import { getAnalyticsEvents, calculateFunnelMetrics, AnalyticsEventRecord } from '../services/analyticsService.ts';
import { fetchSupabaseAdminData, isSupabaseConfigured } from '../lib/supabase.ts';
import {
  exportUsersToCSV,
  exportQuestionnaireToCSV,
  exportAnalyticsToCSV,
  UnifiedUserExportItem,
  UnifiedQuestionnaireExportItem,
  UnifiedAnalyticsExportItem,
} from '../lib/csvExport.ts';
import {
  X,
  Users,
  Trophy,
  Activity,
  BarChart3,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Gift,
  Trash2,
  Download,
  Search,
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { LuckylyLogo } from './LuckylyLogo.tsx';
import { deleteUserDataCascade } from '../services/userDeletionService.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  draws: Draw[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'questionnaire' | 'sync'>('overview');
  const [liveUserCount, setLiveUserCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  
  // Raw Data Stores
  const [firestoreUsers, setFirestoreUsers] = useState<UserProfile[]>([]);
  const [firestoreQuestionnaires, setFirestoreQuestionnaires] = useState<QuestionnaireAnswer[]>([]);
  const [localAnalyticsEvents, setLocalAnalyticsEvents] = useState<AnalyticsEventRecord[]>([]);
  
  // Supabase Data Stores
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [supabaseQuestionnaires, setSupabaseQuestionnaires] = useState<any[]>([]);
  const [supabaseAnalytics, setSupabaseAnalytics] = useState<any[]>([]);
  const [isSupabaseOnline, setIsSupabaseOnline] = useState<boolean>(false);

  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [surveySearchQuery, setSurveySearchQuery] = useState('');
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');

  // Selected item modal for JSON inspection
  const [inspectedItem, setInspectedItem] = useState<{ title: string; data: any } | null>(null);

  // Deletion States
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletionFeedback, setDeletionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAdminData();
    }
  }, [isOpen]);

  const loadAdminData = async () => {
    setLoadingData(true);
    try {
      // 1. Real user count
      const count = await getRealRegistrationCount();
      setLiveUserCount(count);

      // 2. Fetch Firestore data in parallel
      const [usersSnap, qSnap, fsEventsSnap] = await Promise.allSettled([
        getDocs(query(collection(db, 'users'), limit(150))),
        getDocs(query(collection(db, 'questionnaire_answers'), limit(150))),
        getDocs(query(collection(db, 'analytics_events'), limit(150))),
      ]);

      const uList = usersSnap.status === 'fulfilled'
        ? (usersSnap.value.docs.map(d => ({ ...d.data(), id: d.id })) as unknown as UserProfile[])
        : [];
      setFirestoreUsers(uList);

      const qList = qSnap.status === 'fulfilled'
        ? (qSnap.value.docs.map(d => ({ ...d.data(), id: d.id })) as QuestionnaireAnswer[])
        : [];
      setFirestoreQuestionnaires(qList);

      // Merge Firestore analytics with in-memory stream
      const memEvents = getAnalyticsEvents();
      const fsEvents = fsEventsSnap.status === 'fulfilled'
        ? fsEventsSnap.value.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              eventName: data.event_name || data.eventName,
              sessionId: data.session_id || data.sessionId,
              userId: data.user_id || data.userId,
              elementId: data.element_id || data.elementId,
              timestamp: data.timestamp || new Date().toISOString(),
              environment: 'production' as const,
              metadata: data.metadata || {},
            } as AnalyticsEventRecord;
          })
        : [];
      
      // Deduplicate events by id
      const eventMap = new Map<string, AnalyticsEventRecord>();
      [...fsEvents, ...memEvents].forEach(evt => {
        if (!eventMap.has(evt.id)) {
          eventMap.set(evt.id, evt);
        }
      });
      setLocalAnalyticsEvents(Array.from(eventMap.values()));

      // 3. Fetch Supabase Data
      const supData = await fetchSupabaseAdminData();
      setSupabaseUsers(supData.waitlistUsers || []);
      setSupabaseQuestionnaires(supData.questionnaireResponses || []);
      setSupabaseAnalytics(supData.analyticsEvents || []);
      setIsSupabaseOnline(supData.isConfigured);
    } catch (err) {
      console.warn('[AdminPanel] Error loading admin datasets:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Unified Users Dataset
  const unifiedUsers: UnifiedUserExportItem[] = useMemo(() => {
    const map = new Map<string, UnifiedUserExportItem>();

    // 1. Ingest Firestore users
    firestoreUsers.forEach(fu => {
      const email = fu.email?.toLowerCase().trim();
      if (!email) return;
      const badgeId = (fu as any).memberBadgeId || (fu as any).pioneerBadgeId || (fu as any).ticketCode || 'N/A';
      map.set(email, {
        id: fu.userId,
        email,
        displayName: fu.displayName || 'Member',
        memberBadgeId: badgeId,
        pioneerBadgeId: badgeId,
        totalCoins: typeof fu.totalCoins === 'number' ? fu.totalCoins : 1500,
        role: fu.role,
        hasClaimedBonus: fu.has_claimed_bonus,
        questionnaireCompleted: fu.questionnaireCompleted || fu.has_completed_questionnaire,
        createdAt: fu.createdAt,
        source: 'Firestore',
      });
    });

    // 2. Ingest / merge Supabase waitlist users
    supabaseUsers.forEach(su => {
      const email = su.email?.toLowerCase().trim();
      if (!email) return;
      const badgeId = su.member_badge_id || su.pioneer_badge_id || 'N/A';
      if (map.has(email)) {
        const existing = map.get(email)!;
        existing.source = 'Dual-Synced';
        if (badgeId !== 'N/A' && existing.memberBadgeId === 'N/A') {
          existing.memberBadgeId = badgeId;
          existing.pioneerBadgeId = badgeId;
        }
      } else {
        map.set(email, {
          id: su.id,
          email,
          displayName: 'Waitlist Member',
          memberBadgeId: badgeId,
          pioneerBadgeId: badgeId,
          totalCoins: typeof su.coin_balance === 'number' ? su.coin_balance : 1500,
          role: 'user',
          hasClaimedBonus: false,
          questionnaireCompleted: false,
          createdAt: su.created_at,
          source: 'Supabase',
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [firestoreUsers, supabaseUsers]);

  // Unified Questionnaire Dataset
  const unifiedQuestionnaires: UnifiedQuestionnaireExportItem[] = useMemo(() => {
    const list: UnifiedQuestionnaireExportItem[] = [];
    const seenEmails = new Set<string>();

    firestoreQuestionnaires.forEach(fq => {
      const email = (fq as any).email || (fq as any).userEmail || (fq.userId?.startsWith('pioneer_') ? fq.userId.replace('pioneer_', '') : '');
      const item: UnifiedQuestionnaireExportItem = {
        id: fq.id,
        userId: fq.userId,
        email: email || `user_${fq.userId.substring(0, 8)}`,
        answers: fq.answers || {},
        coinsAwarded: 100,
        submittedAt: fq.submittedAt,
        source: 'Firestore',
      };
      if (email) seenEmails.add(email.toLowerCase().trim());
      list.push(item);
    });

    supabaseQuestionnaires.forEach(sq => {
      const email = sq.email?.toLowerCase().trim();
      const isDual = email && seenEmails.has(email);
      list.push({
        id: sq.id,
        userId: sq.user_id,
        email: sq.email,
        answers: sq.answers || {},
        coinsAwarded: sq.coins_awarded || 100,
        submittedAt: sq.created_at,
        source: isDual ? 'Dual-Synced' : 'Supabase',
      });
    });

    return list.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [firestoreQuestionnaires, supabaseQuestionnaires]);

  // Unified Analytics Events Dataset
  const unifiedAnalytics: UnifiedAnalyticsExportItem[] = useMemo(() => {
    const list: UnifiedAnalyticsExportItem[] = [];

    localAnalyticsEvents.forEach(evt => {
      list.push({
        id: evt.id,
        sessionId: evt.sessionId,
        userId: evt.userId,
        eventName: evt.eventName,
        elementId: (evt as any).elementId,
        timestamp: evt.timestamp,
        environment: evt.environment,
        metadata: evt.metadata,
        source: 'Firestore / EventStream',
      });
    });

    supabaseAnalytics.forEach(sa => {
      list.push({
        id: sa.id,
        sessionId: sa.session_id,
        userId: sa.user_id,
        eventName: sa.event_name,
        elementId: sa.element_id,
        timestamp: sa.created_at,
        url: sa.url,
        metadata: sa.metadata,
        source: 'Supabase',
      });
    });

    return list.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });
  }, [localAnalyticsEvents, supabaseAnalytics]);

  // Filtered Lists
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return unifiedUsers;
    const q = userSearchQuery.toLowerCase();
    return unifiedUsers.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.pioneerBadgeId && u.pioneerBadgeId.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  }, [unifiedUsers, userSearchQuery]);

  const filteredSurveys = useMemo(() => {
    if (!surveySearchQuery.trim()) return unifiedQuestionnaires;
    const q = surveySearchQuery.toLowerCase();
    return unifiedQuestionnaires.filter(s =>
      s.email.toLowerCase().includes(q) ||
      (s.userId && s.userId.toLowerCase().includes(q)) ||
      JSON.stringify(s.answers).toLowerCase().includes(q)
    );
  }, [unifiedQuestionnaires, surveySearchQuery]);

  const filteredAnalytics = useMemo(() => {
    if (!analyticsSearchQuery.trim()) return unifiedAnalytics;
    const q = analyticsSearchQuery.toLowerCase();
    return unifiedAnalytics.filter(e =>
      e.eventName.toLowerCase().includes(q) ||
      e.sessionId.toLowerCase().includes(q) ||
      (e.elementId && e.elementId.toLowerCase().includes(q)) ||
      (e.userId && e.userId.toLowerCase().includes(q))
    );
  }, [unifiedAnalytics, analyticsSearchQuery]);

  const handleCascadeDeleteUser = async (targetUserId: string, displayName: string) => {
    try {
      setDeletingUserId(targetUserId);
      setDeletionFeedback(null);
      const summary = await deleteUserDataCascade(targetUserId, { deleteAuthUser: false });
      setConfirmDeleteUserId(null);
      setDeletionFeedback(
        `Cascaded deletion complete for ${displayName} (${targetUserId}): removed ${summary.totalDocumentsRemoved} records across Firestore.`
      );
      await loadAdminData();
    } catch (err: any) {
      console.error('Admin cascade delete failed:', err);
      setDeletionFeedback(`Failed to delete user ${targetUserId}: ${err?.message || 'Unknown error'}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!isOpen) return null;

  const progress = calculateMilestoneProgress(liveUserCount);
  const funnel = calculateFunnelMetrics(localAnalyticsEvents);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-[#090b10] border-2 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-slate-100 max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-500/20 flex items-center justify-between shrink-0 bg-[#06070a]">
          <div className="flex items-center gap-3">
            <LuckylyLogo size={28} variant="emblem" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">Luckyly Intelligence Console</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/80 text-amber-300 border border-amber-500/40 uppercase font-bold">
                  Dual-Sync Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Member waitlist persistence, market research analytics, and RFC 4180 CSV exports
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              disabled={loadingData}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh All Datasets"
              aria-label="Refresh admin data"
            >
              <RefreshCw className={`w-4 h-4 stroke-[1.75] ${loadingData ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close admin console"
            >
              <X className="w-5 h-5 stroke-[1.75]" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="bg-[#0c0e15] px-5 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-semibold">Firestore:</span>
              <span className="text-emerald-400 font-mono">Connected</span>
              <span className="text-slate-500">({firestoreUsers.length} users, {firestoreQuestionnaires.length} surveys)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSupabaseOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-semibold">Supabase:</span>
              <span className={isSupabaseOnline ? 'text-emerald-400 font-mono' : 'text-amber-300 font-mono'}>
                {isSupabaseOnline ? 'Connected' : 'Preview Fallback'}
              </span>
              <span className="text-slate-500">({supabaseUsers.length} waitlist, {supabaseQuestionnaires.length} surveys)</span>
            </div>
          </div>
          <div className="text-[10px] text-amber-300/80 flex items-center gap-1">
            <Database className="w-3 h-3 text-amber-400" />
            <span>Dual-Sync Redundancy Active</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#08090e] border-b border-slate-800 text-xs shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Milestones & Funnel</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Member Users ({unifiedUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('questionnaire')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'questionnaire'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Market Research ({unifiedQuestionnaires.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Session Audit Stream ({unifiedAnalytics.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#0e1017] border border-amber-500/30">
                  <div className="text-slate-400 text-[11px] font-semibold uppercase">Total Eligible Members</div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1 font-mono">
                    {liveUserCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Dual-verified across systems</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0e1017] border border-amber-500/30">
                  <div className="text-slate-400 text-[11px] font-semibold uppercase">Target Milestone</div>
                  <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
                    {progress.nextMilestone.targetCount}
                  </div>
                  <div className="text-[10px] text-amber-400/80 mt-0.5">{progress.percentToNext}% progress</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0e1017] border border-amber-500/30">
                  <div className="text-slate-400 text-[11px] font-semibold uppercase">First Prize Value</div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 font-mono">
                    $5.00
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Amazon Gift Card (Milestone 1)</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#0e1017] border border-amber-500/30">
                  <div className="text-slate-400 text-[11px] font-semibold uppercase">Dual-Sync Records</div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono">
                    {(unifiedUsers.length + unifiedQuestionnaires.length).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Users + Surveys Persisted</div>
                </div>
              </div>

              {/* Milestone Tracker Card */}
              <div className="p-5 rounded-2xl bg-[#0e1017] border border-amber-500/20 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Launch Milestone Progression</span>
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Current: <strong className="text-amber-300">{liveUserCount}</strong></span>
                    <span>Target: <strong className="text-white">{progress.nextMilestone.targetCount}</strong></span>
                  </div>
                  <div className="h-3 rounded-full bg-black/60 border border-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-300 transition-all duration-500"
                      style={{ width: `${progress.percentToNext}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Funnel Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#0e1017] border border-slate-800">
                  <div className="text-slate-400 text-[11px] uppercase">Landing Page Views</div>
                  <div className="text-xl font-bold text-white mt-1 font-mono">{funnel.landingViews}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0e1017] border border-slate-800">
                  <div className="text-slate-400 text-[11px] uppercase">CTA Clicks</div>
                  <div className="text-xl font-bold text-amber-300 mt-1 font-mono">{funnel.ctaClicks}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0e1017] border border-slate-800">
                  <div className="text-slate-400 text-[11px] uppercase">Signups Completed</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{funnel.signupsCompleted}</div>
                </div>
                <div className="p-4 rounded-2xl bg-[#0e1017] border border-slate-800">
                  <div className="text-slate-400 text-[11px] uppercase">Questionnaires Finished</div>
                  <div className="text-xl font-bold text-amber-400 mt-1 font-mono">{funnel.questionnaireCompleted}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBER & REGISTERED USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Table Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d0f16] p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder="Search by email, badge ID, or name..."
                    className="w-full bg-[#06070a] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  onClick={() => exportUsersToCSV(filteredUsers)}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>Export Users CSV ({filteredUsers.length})</span>
                </button>
              </div>

              {deletionFeedback && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{deletionFeedback}</span>
                </div>
              )}

              {filteredUsers.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-[#0d0f16] rounded-2xl border border-slate-800">
                  No users found matching your query.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#0d0f16]">
                  <div className="overflow-x-auto max-h-[55vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#07080d] text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800 z-10">
                        <tr>
                          <th className="p-3">Email</th>
                          <th className="p-3">Badge / Member Pass</th>
                          <th className="p-3">Region</th>
                          <th className="p-3">Coins</th>
                          <th className="p-3">Source</th>
                          <th className="p-3">Enrolled At</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {filteredUsers.map(u => (
                          <tr key={u.id || u.email} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-white font-medium select-all">
                              {u.email}
                              {u.role === 'admin' && (
                                <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded bg-red-950 text-amber-300 border border-amber-500/30">
                                  ADMIN
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-amber-300/90 text-[11px] select-all">
                              {u.memberBadgeId || u.pioneerBadgeId || 'N/A'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px] font-bold">
                                {u.amazon_region || 'US'}
                              </span>
                            </td>
                            <td className="p-3 text-emerald-400 font-bold">
                              {u.totalCoins?.toLocaleString() || '1,500'}
                            </td>
                            <td className="p-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                u.source === 'Dual-Synced'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                  : u.source === 'Supabase'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                  : 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                              }`}>
                                {u.source || 'Dual-Synced'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setInspectedItem({ title: `User: ${u.email}`, data: u })}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                  title="View Record JSON"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {u.id && u.role !== 'admin' && (
                                  confirmDeleteUserId === u.id ? (
                                    <button
                                      onClick={() => handleCascadeDeleteUser(u.id!, u.displayName || u.email)}
                                      disabled={deletingUserId === u.id}
                                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold"
                                    >
                                      Confirm Delete
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDeleteUserId(u.id!)}
                                      className="p-1.5 rounded-lg hover:bg-red-950 text-slate-500 hover:text-red-400"
                                      title="Delete user cascade"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MARKET RESEARCH SUBMISSIONS */}
          {activeTab === 'questionnaire' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d0f16] p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={surveySearchQuery}
                    onChange={e => setSurveySearchQuery(e.target.value)}
                    placeholder="Search questionnaire responses by email or content..."
                    className="w-full bg-[#06070a] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  onClick={() => exportQuestionnaireToCSV(filteredSurveys)}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>Export Survey CSV ({filteredSurveys.length})</span>
                </button>
              </div>

              {filteredSurveys.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-[#0d0f16] rounded-2xl border border-slate-800">
                  No survey responses recorded yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
                  {filteredSurveys.map(item => (
                    <div key={item.id} className="p-4 rounded-xl bg-[#0d0f16] border border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{item.email}</span>
                          <span className="text-slate-500">({item.userId || 'Member'})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.source === 'Dual-Synced'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}>
                            {item.source}
                          </span>
                          <span>{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'Recent'}</span>
                          <button
                            onClick={() => setInspectedItem({ title: `Survey: ${item.email}`, data: item })}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                        {Object.entries(item.answers || {}).map(([qKey, aVal]) => (
                          <div key={qKey} className="p-2.5 rounded-lg bg-[#06070b] border border-slate-800/80">
                            <span className="text-amber-400 font-semibold block uppercase text-[10px] tracking-wider mb-0.5">{qKey}</span>
                            <span className="text-slate-200 font-mono">
                              {Array.isArray(aVal) ? aVal.join(', ') : String(aVal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SESSION ANALYTICS & AUDIT STREAM */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d0f16] p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={analyticsSearchQuery}
                    onChange={e => setAnalyticsSearchQuery(e.target.value)}
                    placeholder="Search events by name, session ID, or element..."
                    className="w-full bg-[#06070a] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  onClick={() => exportAnalyticsToCSV(filteredAnalytics)}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>Export Analytics CSV ({filteredAnalytics.length})</span>
                </button>
              </div>

              {filteredAnalytics.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-[#0d0f16] rounded-2xl border border-slate-800">
                  No behavioral analytics events found.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-[#0d0f16]">
                  <div className="overflow-x-auto max-h-[55vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#07080d] text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800 z-10">
                        <tr>
                          <th className="p-3">Event Name</th>
                          <th className="p-3">Session ID</th>
                          <th className="p-3">Element / Target</th>
                          <th className="p-3">Source</th>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3 text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {filteredAnalytics.map(evt => (
                          <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 text-amber-300 font-bold">
                              {evt.eventName}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px] select-all">
                              {evt.sessionId}
                            </td>
                            <td className="p-3 text-slate-300 text-[11px]">
                              {evt.elementId || 'viewport'}
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                                {evt.source}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'N/A'}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setInspectedItem({ title: `Event: ${evt.eventName}`, data: evt })}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title="Inspect JSON payload"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* JSON Inspector Modal */}
        {inspectedItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#0e1017] border border-amber-500/40 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-[#08090f]">
                <h5 className="font-bold text-white text-xs font-mono">{inspectedItem.title}</h5>
                <button
                  onClick={() => setInspectedItem(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 font-mono text-[11px] bg-[#050609] text-amber-200/90">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(inspectedItem.data, null, 2)}
                </pre>
              </div>
              <div className="px-4 py-2.5 border-t border-slate-800 bg-[#08090f] flex justify-end">
                <button
                  onClick={() => setInspectedItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
