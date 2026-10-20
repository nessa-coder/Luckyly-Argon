/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { useBehavioralAnalytics } from '../hooks/useBehavioralAnalytics.ts';

interface FaqSectionProps {
  isDedicatedPage?: boolean;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ isDedicatedPage = false }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { trackFaqToggle } = useBehavioralAnalytics();

  const faqs = [
    {
      q: 'What is Luckyly?',
      a: 'Luckyly is an evolving project building a new kind of rewards experience. In Phase 1, we are welcoming early participants to our waitlist, learning what rewards you love most, and preparing for future platform milestones.',
    },
    {
      q: 'What are Luckyly Coins, and how are they different from cryptocurrency?',
      a: 'Luckyly Coins are purely in-house promotional units managed inside our platform ledger. They are not a cryptocurrency, token, or monetary asset. They cannot be purchased, traded, exchanged for real cash, or transferred to external wallets. Their sole purpose is to acknowledge participation within the Luckyly platform as features roll out.',
    },
    {
      q: 'How do I earn Luckyly Coins?',
      a: 'Joining the waitlist and answering our onboarding questions is 100% free. When you sign up and share what rewards you would love to see, we add complimentary Coins to your profile as a thank you for being here from the beginning.',
    },
    {
      q: 'Does joining the waitlist guarantee prizes or rewards?',
      a: 'No. Registering for the waitlist or completing the questionnaire does not guarantee a prize, immediate reward redemption, or future financial benefit. It secures your place as an early subscriber who will receive project updates, gifts, and promotional notices as the platform advances.',
    },
    {
      q: 'Are the reward images shown on the website confirmed prizes?',
      a: 'No. All images and reward descriptions are illustrative examples of possible future categories Luckyly may explore. Participating brands, availability, and fulfillment mechanics have not been confirmed and will be formally detailed closer to our launch milestones.',
    },
    {
      q: 'When is the official launch date?',
      a: 'Our target public launch date is scheduled for October 16, 2026, subject to development and regulatory milestones. Subscribers will receive regular progress reports leading up to this date.',
    },
    {
      q: 'Why does Luckyly ask questionnaire questions?',
      a: 'Our short onboarding questionnaire helps us learn what potential members value regarding reward types, frequency, and formats. This enables our team to design experiences and features that genuinely resonate with our community.',
    },
    {
      q: 'Is joining the waitlist free?',
      a: 'Yes. Joining the waitlist is 100% free with no purchase, credit card, or payment required.',
    },
    {
      q: 'How is user data and privacy handled?',
      a: 'We respect visitor privacy and comply with standard data protection guidelines. Your email is used exclusively for waitlist communications and project updates. We never sell your data to third parties. You can review our full Privacy Policy anytime.',
    },
  ];

  return (
    <section id="faq" className={`py-20 sm:py-28 bg-[#050608] border-b border-amber-500/15 relative ${isDedicatedPage ? 'min-h-[80vh]' : ''}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="text-center mb-14">
          <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-amber-400/80 mb-3">
            Inquiries & Clarifications
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-luxury font-bold text-white tracking-tight leading-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-xl mx-auto">
            Clear, transparent answers about our Phase 1 waitlist, reward concepts, and launch milestones.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className="rounded-2xl bg-[#090b10] border border-amber-500/20 hover:border-amber-400/40 transition-all duration-200 overflow-hidden"
              >
                <button
                  onClick={() => {
                    const willBeOpen = !isOpen;
                    setOpenIndex(willBeOpen ? index : null);
                    trackFaqToggle(faq.q, willBeOpen, 'FAQ');
                  }}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/40 transition-colors"
                >
                  <span className="font-luxury font-semibold text-sm sm:text-base text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-amber-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 font-light leading-relaxed border-t border-slate-800/80 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
