/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Shield, FileText, AlertCircle } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: 'privacy' | 'terms';
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#111319] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-500/20 flex items-center justify-between shrink-0 bg-[#0b0c10]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[#181a22] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-red-950/60 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => setActiveTab('terms')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'terms'
                    ? 'bg-red-950/60 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Terms of Use
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
          
          {/* Owner Input Required Notice Flag (Section 12 requirement) */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Note for Site Operator: </strong>
              The items below reflect Phase 1 website data flows. Formal legal entity registration, official contact email (nessa@luckyly.org), and governing jurisdiction ([JURISDICTION_GOVERNING_LAW]) must be finalized with legal counsel prior to commercial launch.
            </div>
          </div>

          {activeTab === 'privacy' ? (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Phase 1 Privacy Policy</span>
              </h3>
              <p className="text-[11px] text-slate-400">Last updated: October 2026</p>

              <h4 className="font-bold text-white mt-3">1. Information We Collect</h4>
              <p>
                When you participate in our Phase 1 waiting list, we collect:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Account details provided via Google Authentication (email address, display name, profile avatar).</li>
                <li>Voluntary responses submitted through our onboarding questionnaire.</li>
                <li>Basic application event timestamps and technical session identifiers necessary for security.</li>
              </ul>

              <h4 className="font-bold text-white mt-3">2. How Information is Used</h4>
              <p>
                Data is used exclusively to maintain your waitlist position, deliver transactional onboarding confirmations, and aggregate non-identifiable member feedback to guide future platform features.
              </p>

              <h4 className="font-bold text-white mt-3">3. Service Providers & Storage</h4>
              <p>
                Authentication and secure persistent storage are powered by Google Firebase (Firebase Authentication and Cloud Firestore). We do not sell your personal data or distribute it to third-party marketing brokers.
              </p>

              <h4 className="font-bold text-white mt-3">4. Contact & Inquiries</h4>
              <p>
                For data access or deletion requests, contact the Luckyly team at <a href="mailto:nessa@luckyly.org" className="underline text-amber-300 hover:text-amber-200 font-semibold">nessa@luckyly.org</a>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Phase 1 Terms of Use</span>
              </h3>
              <p className="text-[11px] text-slate-400">Last updated: October 2026</p>

              <h4 className="font-bold text-white mt-3">1. Scope of Phase 1</h4>
              <p>
                The Luckyly website currently operates as an informational waiting list and platform preview. No monetary transactions, active prize redemptions, or financial contracts are conducted on this website.
              </p>

              <h4 className="font-bold text-white mt-3">2. In-House Luckyly Coins</h4>
              <p>
                Any virtual Luckyly Coins displayed or recorded in user profiles represent internal promotional platform units. Coins carry no monetary, cash, or investment value, and do not constitute equity, debt, shares, dividends, or cryptocurrency.
              </p>

              <h4 className="font-bold text-white mt-3">3. Illustrative Reward Examples</h4>
              <p>
                Images, brands, and hardware references displayed on the website are illustrative examples of concepts under consideration. Display does not imply endorsement, active partnership, or guaranteed future availability.
              </p>

              <h4 className="font-bold text-white mt-3">4. Governing Jurisdiction & Inquiries</h4>
              <p>
                These terms are subject to final jurisdiction-specific legal review prior to full commercial rollout ([JURISDICTION_GOVERNING_LAW]). For inquiries regarding these terms or platform operations, contact <a href="mailto:nessa@luckyly.org" className="underline text-amber-300 hover:text-amber-200 font-semibold">nessa@luckyly.org</a>.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0b0c10] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
