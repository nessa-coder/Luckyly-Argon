/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY ADMIN INTELLIGENCE CSV EXPORT UTILITY
 * Standard RFC 4180 compliant CSV export engine for:
 * 1. Registered & Waitlist Member Users
 * 2. Market Research Survey Responses
 * 3. Behavioral Analytics & Audit Trail Events
 */

function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // If string contains quotes, commas, or newlines, quote it and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  } else {
    str = `"${str}"`;
  }
  return str;
}

export function generateCSVContent(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map(h => escapeCSVField(h)).join(',');
  const rowLines = rows.map(row => row.map(cell => escapeCSVField(cell)).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export function downloadCSV(filename: string, csvContent: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface UnifiedUserExportItem {
  id?: string;
  email: string;
  displayName?: string;
  memberBadgeId?: string;
  pioneerBadgeId?: string;
  totalCoins?: number;
  amazon_region?: string;
  role?: string;
  hasClaimedBonus?: boolean;
  questionnaireCompleted?: boolean;
  createdAt?: string;
  source?: string;
}

export function exportUsersToCSV(users: UnifiedUserExportItem[]): void {
  const headers = [
    'User ID / Record ID',
    'Email Address',
    'Display Name',
    'Member Badge ID',
    'Coin Balance',
    'Amazon Region',
    'Account Role',
    'Bonus Claimed',
    'Survey Completed',
    'Registration Date',
    'Database Source',
  ];

  const rows = users.map(u => [
    u.id || 'N/A',
    u.email,
    u.displayName || 'Founding Member',
    u.memberBadgeId || u.pioneerBadgeId || 'N/A',
    u.totalCoins ?? 1500,
    u.amazon_region || 'US',
    u.role || 'user',
    u.hasClaimedBonus ? 'Yes' : 'No',
    u.questionnaireCompleted ? 'Yes' : 'No',
    u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    u.source || 'Dual-Synced',
  ]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const csv = generateCSVContent(headers, rows);
  downloadCSV(`luckyly_member_users_${timestamp}.csv`, csv);
}

export interface UnifiedQuestionnaireExportItem {
  id?: string;
  userId?: string;
  email: string;
  answers: Record<string, any>;
  amazon_region?: string;
  coinsAwarded?: number;
  submittedAt?: string;
  source?: string;
}

export function exportQuestionnaireToCSV(responses: UnifiedQuestionnaireExportItem[]): void {
  // Collect all unique question keys dynamically
  const questionKeySet = new Set<string>();
  responses.forEach(r => {
    if (r.answers && typeof r.answers === 'object') {
      Object.keys(r.answers).forEach(k => questionKeySet.add(k));
    }
  });
  const questionKeys = Array.from(questionKeySet);

  const headers = [
    'Response ID',
    'User / Account ID',
    'Email Address',
    'Amazon Region',
    'Submission Date',
    'Coins Awarded',
    'Database Source',
    ...questionKeys.map(k => `Q: ${k}`),
  ];

  const rows = responses.map(r => {
    const baseCols = [
      r.id || 'N/A',
      r.userId || 'anonymous_member',
      r.email,
      r.amazon_region || (r.answers?.q6_region ? String(r.answers.q6_region) : 'US'),
      r.submittedAt ? new Date(r.submittedAt).toISOString() : new Date().toISOString(),
      r.coinsAwarded ?? 100,
      r.source || 'Dual-Synced',
    ];

    const answerCols = questionKeys.map(k => {
      const val = r.answers ? r.answers[k] : undefined;
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return val.join('; ');
      return String(val);
    });

    return [...baseCols, ...answerCols];
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const csv = generateCSVContent(headers, rows);
  downloadCSV(`luckyly_market_research_responses_${timestamp}.csv`, csv);
}

export interface UnifiedAnalyticsExportItem {
  id?: string;
  sessionId: string;
  userId?: string;
  eventName: string;
  elementId?: string;
  timestamp?: string;
  environment?: string;
  url?: string;
  metadata?: Record<string, any>;
  source?: string;
}

export function exportAnalyticsToCSV(events: UnifiedAnalyticsExportItem[]): void {
  const headers = [
    'Event ID',
    'Session ID',
    'User ID',
    'Event Name',
    'Target Element ID',
    'Timestamp',
    'Environment / URL',
    'Metadata (JSON)',
    'Database Source',
  ];

  const rows = events.map(e => [
    e.id || 'N/A',
    e.sessionId,
    e.userId || 'visitor',
    e.eventName,
    e.elementId || 'viewport',
    e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
    e.url || e.environment || 'production',
    e.metadata ? JSON.stringify(e.metadata) : '{}',
    e.source || 'Dual-Synced',
  ]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const csv = generateCSVContent(headers, rows);
  downloadCSV(`luckyly_session_analytics_${timestamp}.csv`, csv);
}
