/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { EmailEvent } from '../types/luckyly.ts';
import { subscribeToUserEmails } from '../services/emailService.ts';
import { Mail, CheckCircle2, X, Inbox } from 'lucide-react';

interface EmailInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailInboxModal: React.FC<EmailInboxModalProps> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [emails, setEmails] = useState<EmailEvent[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!userProfile) return;
    const unsubscribe = subscribeToUserEmails(userProfile.userId, list => {
      setEmails(list);
      setLoading(false);
      if (list.length > 0 && !selectedEmail) {
        setSelectedEmail(list[0]);
      }
    });
    return () => unsubscribe();
  }, [userProfile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#111319] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-500/20 flex items-center justify-between shrink-0 bg-[#0b0c10]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Luckyly Transactional Email Records
              </h3>
              <p className="text-xs text-slate-400">
                Automated communications delivered to: {userProfile?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close transactional email records"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Content Split: List & Rendered Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Email List Column */}
          <div className="w-full md:w-72 border-r border-slate-800/80 overflow-y-auto p-3 space-y-1.5 shrink-0 bg-[#0c0d12]">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300/80 flex items-center justify-between">
              <span>Inbox ({emails.length})</span>
              <span className="text-[10px] text-amber-400 font-semibold">Delivered</span>
            </div>

            {loading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-900 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <div>No emails sent yet</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Emails trigger automatically on waitlist sign-up, survey completion, and draw events.
                </div>
              </div>
            ) : (
              emails.map(email => {
                const isSelected = selectedEmail?.id === email.id;
                const time = new Date(email.sentAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex flex-col gap-1 border cursor-pointer ${
                      isSelected
                        ? 'bg-red-950/60 border-amber-400/80 text-white shadow-md'
                        : 'bg-[#111319] border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold truncate max-w-[140px] text-amber-300">
                        {email.type.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 text-[10px]">{time}</span>
                    </div>
                    <div className="text-xs font-medium truncate text-slate-200">{email.subject}</div>
                  </button>
                );
              })
            )}
          </div>

          {/* Rendered Email Viewer Column */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0b0e] flex flex-col justify-between">
            {selectedEmail ? (
              <div className="space-y-4">
                
                {/* Email Metadata Header */}
                <div className="bg-[#12141a] border border-amber-500/20 rounded-2xl p-4 text-xs space-y-1.5 shadow-md">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-white">{selectedEmail.subject}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-semibold border border-amber-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      Delivered
                    </span>
                  </div>
                  <div className="text-slate-400 flex flex-wrap gap-x-4 text-[11px]">
                    <span>From: <strong>noreply@luckyly.org</strong></span>
                    <span>To: <strong>{selectedEmail.recipientEmail}</strong></span>
                    <span>Date: <strong>{new Date(selectedEmail.sentAt).toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Rendered HTML Container */}
                <div
                  className="bg-white text-slate-900 rounded-2xl p-4 sm:p-6 shadow-inner overflow-hidden border border-amber-500/20"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Select an email from the left to view contents.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
