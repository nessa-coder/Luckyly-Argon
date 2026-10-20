/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../context/UserContext.tsx';
import { Sparkles, Coins, LogOut, CheckCircle2, ShieldCheck, Mail, SlidersHorizontal, User as UserIcon, Menu, X, Ticket, Trash2, AlertTriangle, Copy, Check, Globe } from 'lucide-react';
import { LuckylyLogo } from './LuckylyLogo.tsx';
import { AMAZON_REGIONS } from '../config/constants.ts';

export type NavTab = 'home' | 'vision' | 'about' | 'rewards' | 'faq' | 'transparency' | 'draw' | 'dashboard' | 'questionnaire' | 'bonus';

interface NavbarProps {
  onOpenQuestionnaire: () => void;
  onOpenLedger: () => void;
  onOpenEmailInbox: () => void;
  onOpenAdmin: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onScrollToSection?: (sectionId: string) => void;
  onOpenBonusEntry?: () => void;
  activeTab: NavTab;
  unreadEmailCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenQuestionnaire,
  onOpenLedger,
  onOpenEmailInbox,
  onOpenAdmin,
  onNavigateTab,
  onScrollToSection,
  onOpenBonusEntry,
  activeTab,
  unreadEmailCount,
}) => {
  const { user, userProfile, loading, signInWithGoogle, logout, deleteAccount, isAdmin, updateUserAmazonRegion } = useAuth();
  const { memberUser, updateAmazonRegion, clearMemberUser, copyMemberBadgeId } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);
  const [regionSaved, setRegionSaved] = useState(false);

  const activeUser = memberUser;
  const isUserActive = !!((user && userProfile) || userProfile || activeUser);
  const activeCoins = activeUser ? activeUser.coinBalance : (userProfile?.totalCoins ?? 0);
  const activeDisplayName = userProfile?.displayName || (activeUser?.email ? activeUser.email.split('@')[0] : 'Member');
  const activeEmail = userProfile?.email || activeUser?.email || '';
  const activeBadgeCode = activeUser?.memberBadgeId || (userProfile?.userId ? `TKT-MEMBER-${userProfile.userId.substring(0, 8).toUpperCase()}` : null);
  const activeRegionCode = (activeUser?.amazon_region || userProfile?.amazon_region || 'US').toUpperCase();
  const isQuestionnaireCompleted = Boolean(
    userProfile?.questionnaireCompleted ||
    userProfile?.has_completed_questionnaire ||
    activeUser?.questionnaireCompleted
  );
  const isQuestionnairePending = isUserActive && !isQuestionnaireCompleted;

  const handleRegionChange = (newRegion: string) => {
    const code = newRegion.toUpperCase();
    updateAmazonRegion(code);
    if (userProfile) {
      updateUserAmazonRegion(code).catch(() => {});
    }
    setRegionSaved(true);
    setTimeout(() => setRegionSaved(false), 2000);
  };

  const handleConfirmDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      await deleteAccount();
      setConfirmingDelete(false);
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      onNavigateTab('home');
    } catch (err) {
      console.error('Failed to delete account:', err);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleNavClick = (tab: NavTab, sectionId?: string) => {
    setMobileMenuOpen(false);
    if (tab === 'home') {
      onNavigateTab('home');
      if (sectionId) {
        setTimeout(() => {
          onScrollToSection?.(sectionId);
        }, 100);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (tab === 'rewards') {
      onNavigateTab('home');
      setTimeout(() => {
        onScrollToSection?.('future-rewards');
      }, 100);
    } else if (tab === 'transparency') {
      onNavigateTab('home');
      setTimeout(() => {
        onScrollToSection?.('transparency');
      }, 100);
    } else if (tab === 'faq') {
      onNavigateTab('home');
      setTimeout(() => {
        onScrollToSection?.('faq');
      }, 100);
    } else {
      onNavigateTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#050608]/90 backdrop-blur-md border-b border-amber-500/15 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        
        {/* Brand Logo (Original Proportions) */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none transition-transform hover:scale-[1.02]"
            title="Luckyly Home"
            aria-label="Luckyly Home"
          >
            <LuckylyLogo size={54} variant="emblem" />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs uppercase tracking-wider font-medium">
            <button
              onClick={() => handleNavClick('home')}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'home'
                  ? 'text-amber-300 font-semibold'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleNavClick('vision')}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'vision'
                  ? 'text-amber-300 font-semibold'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            >
              Vision
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'about'
                  ? 'text-amber-300 font-semibold'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            >
              About
            </button>
            <button
              onClick={() => handleNavClick('rewards')}
              className="px-3 py-2 rounded-lg text-slate-300 hover:text-amber-200 transition-colors cursor-pointer"
            >
              Future Rewards
            </button>
            <button
              onClick={() => handleNavClick('faq')}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'faq'
                  ? 'text-amber-300 font-semibold'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            >
              FAQ
            </button>
            <button
              onClick={() => handleNavClick('transparency')}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'transparency'
                  ? 'text-amber-300 font-semibold'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 stroke-[1.75]" />
              <span>Transparency</span>
            </button>
            {(user || activeUser) && (
              <button
                onClick={() => handleNavClick('draw')}
                className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'draw' || activeTab === 'dashboard'
                    ? 'text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30'
                    : 'text-amber-300/90 hover:text-amber-200'
                }`}
              >
                <Ticket className="w-3.5 h-3.5 text-red-400 stroke-[2]" />
                <span>Milestones</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5">
          {loading ? (
            <div className="w-24 h-10 bg-slate-900/60 animate-pulse rounded-xl border border-slate-800" />
          ) : isUserActive ? (
            <>
              {/* Questionnaire shortcut if pending */}
              {isQuestionnairePending && (
                <button
                  onClick={onOpenQuestionnaire}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold h-10 px-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-red-950/25 to-amber-500/15 hover:from-amber-500/25 hover:to-red-900/35 text-amber-300 border border-amber-500/35 hover:border-amber-400/60 transition-all duration-200 cursor-pointer shadow-sm shadow-amber-500/10"
                  aria-label="Open onboarding questionnaire (+100 Coins)"
                  title="Complete Onboarding Questionnaire (+100 Coins)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 stroke-[1.75]" />
                  <span>Onboarding Questionnaire</span>
                </button>
              )}

              {/* Complimentary Bonus Entry Shortcut */}
              {onOpenBonusEntry && userProfile && !userProfile.has_claimed_bonus && (
                <button
                  onClick={onOpenBonusEntry}
                  className="hidden md:flex items-center gap-1.5 text-xs font-semibold h-10 px-3 rounded-xl bg-gradient-to-r from-red-950/40 to-[#0e1017] hover:from-red-900/50 hover:to-[#161822] text-amber-300 border border-amber-500/35 hover:border-amber-400/60 transition-all duration-200 cursor-pointer shadow-sm shadow-amber-500/5"
                  aria-label="Open your complimentary bonus pass"
                  title="A Complimentary Luckyly Privilege — Member Bonus"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 stroke-[1.75]" />
                  <span>Get Free Bonus 🐾</span>
                </button>
              )}

              {/* Instant Member Status Badge */}
              {isUserActive && (
                <button
                  onClick={() => handleNavClick('draw')}
                  className="flex items-center gap-1.5 text-xs font-bold h-10 px-3 sm:px-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-[#0d1410] to-emerald-950/60 hover:from-emerald-900/80 hover:to-emerald-950/80 text-emerald-300 border border-emerald-500/50 hover:border-emerald-400/80 transition-all duration-200 cursor-pointer shadow-md shadow-emerald-950/40 shrink-0"
                  aria-label="View member pass"
                  title={`Member Pass Active: ${activeBadgeCode || 'Verified'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.2]" />
                  <span>✓ Member</span>
                </button>
              )}

              {/* Coin Balance Chip */}
              <button
                onClick={onOpenLedger}
                className="h-10 flex items-center gap-2 bg-[#0a0c12] hover:bg-[#12141c] border border-amber-400/35 hover:border-amber-400/60 rounded-xl px-3 transition-all duration-200 cursor-pointer shadow-sm shadow-amber-500/5"
                title="View your Luckyly Coin Ledger"
                aria-label={`View your Luckyly Coin Ledger: ${activeCoins.toLocaleString()} coins`}
              >
                <LuckylyLogo size={18} variant="emblem" />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-xs font-bold text-amber-300 font-mono tracking-tight">
                    {activeCoins.toLocaleString()}
                  </span>
                  <span className="text-[8px] text-amber-400/70 font-mono tracking-wider">COINS</span>
                </div>
              </button>

              {/* Email Center */}
              <button
                onClick={onOpenEmailInbox}
                className="relative h-10 w-10 rounded-xl bg-[#0a0c12] hover:bg-[#12141c] text-amber-300/80 hover:text-amber-200 border border-amber-500/25 hover:border-amber-400/50 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-amber-500/10"
                title="View System Dispatches & Records"
                aria-label={`View dispatches and records${unreadEmailCount > 0 ? ` (${unreadEmailCount} unread)` : ''}`}
              >
                <Mail className="w-4 h-4 stroke-[1.75]" />
                {unreadEmailCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-gradient-to-r from-red-700 to-red-600 text-[9px] font-bold text-white flex items-center justify-center border border-amber-400/50 shadow-md shadow-red-950/60 leading-none">
                    {unreadEmailCount}
                  </span>
                )}
              </button>

              {/* Admin Button */}
              {isAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="h-10 w-10 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-amber-500/30 hover:border-amber-400/60 text-amber-300 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm hover:shadow-red-950/40"
                  title="Admin Console"
                  aria-label="Open admin console"
                >
                  <SlidersHorizontal className="w-4 h-4 text-amber-400 stroke-[1.75]" />
                </button>
              )}

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="h-10 flex items-center p-0.5 rounded-xl hover:bg-slate-900/80 transition-colors cursor-pointer"
                  aria-label="User account menu"
                  aria-expanded={dropdownOpen}
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={activeDisplayName}
                      className="w-9 h-9 rounded-lg object-cover ring-1 ring-amber-500/40 hover:ring-amber-400/70 transition-all"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-900 to-red-950 border border-amber-500/40 flex items-center justify-center text-amber-200 text-xs font-bold ring-1 ring-amber-500/20">
                      {activeDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-[#0a0b10] border border-amber-500/30 rounded-2xl shadow-2xl p-3 z-50 text-slate-200 backdrop-blur-md">
                      <div className="px-2 py-2 border-b border-slate-800 mb-2">
                        <div className="font-semibold text-sm text-white truncate">
                          {activeDisplayName}
                        </div>
                        <div className="text-xs text-slate-400 truncate font-light">
                          {activeEmail}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-300 font-mono">
                          <span>{userProfile?.rewardTierName || 'Member Waitlist'}</span>
                          <span>·</span>
                          <span>#{userProfile?.userIndex || 1}</span>
                        </div>

                        {activeBadgeCode && (
                          <button
                            type="button"
                            onClick={() => {
                              copyMemberBadgeId(activeBadgeCode);
                              setBadgeCopied(true);
                              setTimeout(() => setBadgeCopied(false), 2000);
                            }}
                            className="mt-2 w-full p-2 rounded-lg bg-[#07080d] hover:bg-[#121520] border border-amber-500/25 hover:border-amber-400/50 text-[10px] font-mono text-amber-300 flex items-center justify-between transition-colors cursor-pointer group"
                            title="Click to copy badge ID"
                          >
                            <span className="truncate flex items-center gap-1.5 text-slate-300 group-hover:text-amber-200">
                              <Ticket className="w-3 h-3 text-red-400 shrink-0" />
                              <span className="font-bold">{activeBadgeCode}</span>
                            </span>
                            {badgeCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 shrink-0" />
                            )}
                          </button>
                        )}

                        {/* Amazon Store Region Selector in Profile Drawer */}
                        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                          <label htmlFor="navbar-amazon-region" className="flex items-center justify-between text-[10px] text-amber-200/90 font-semibold">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-amber-400" />
                              <span>Amazon Region ($5 Code)</span>
                            </span>
                            {regionSaved && (
                              <span className="text-[9px] text-emerald-400 font-mono">Saved!</span>
                            )}
                          </label>
                          <select
                            id="navbar-amazon-region"
                            value={activeRegionCode}
                            onChange={e => handleRegionChange(e.target.value)}
                            className="w-full py-1.5 px-2 rounded-lg bg-[#07080d] border border-amber-500/30 focus:border-amber-400 focus:outline-none text-white text-[11px] cursor-pointer"
                          >
                            {AMAZON_REGIONS.map(r => (
                              <option key={r.code} value={r.code} className="bg-[#08090e] text-white">
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenLedger();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-amber-200 transition-colors cursor-pointer text-left"
                        >
                          <Coins className="w-4 h-4 text-amber-400 stroke-[1.75]" />
                          <span>Coin Ledger ({activeCoins.toLocaleString()} Coins)</span>
                        </button>

                        {onOpenBonusEntry && (
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              onOpenBonusEntry();
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-slate-800/80 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer text-left"
                          >
                            <Sparkles className="w-4 h-4 text-amber-400 stroke-[1.75]" />
                            <span>Your Bonus Entry (Privilege)</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenQuestionnaire();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-amber-200 transition-colors cursor-pointer text-left"
                        >
                          <CheckCircle2 className="w-4 h-4 text-amber-400 stroke-[1.75]" />
                          <span>
                            {isQuestionnaireCompleted
                              ? 'Review Questionnaire'
                              : 'Complete Questionnaire (+100)'}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onOpenEmailInbox();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-amber-200 transition-colors cursor-pointer text-left"
                        >
                          <Mail className="w-4 h-4 text-amber-400 stroke-[1.75]" />
                          <span>Dispatches & Records</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setDropdownOpen(false);
                              onOpenAdmin();
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-red-950/60 text-amber-300 transition-colors cursor-pointer text-left"
                          >
                            <SlidersHorizontal className="w-4 h-4 text-amber-400 stroke-[1.75]" />
                            <span>Admin Panel</span>
                          </button>
                        )}

                        <div className="border-t border-slate-800 my-1" />

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            setConfirmingDelete(false);
                            clearMemberUser();
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 stroke-[1.75]" />
                          <span>Sign Out</span>
                        </button>

                        {!confirmingDelete ? (
                          <button
                            onClick={() => setConfirmingDelete(true)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg hover:bg-red-950/60 text-red-400/90 hover:text-red-300 transition-colors cursor-pointer text-left"
                          >
                            <Trash2 className="w-4 h-4 stroke-[1.75]" />
                            <span>Delete Account & Data</span>
                          </button>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 space-y-2 mt-1">
                            <div className="flex items-start gap-1.5 text-[11px] text-red-200 leading-snug">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              <span>Permanently erase profile, coins, tickets, and survey data?</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={handleConfirmDeleteAccount}
                                disabled={isDeletingAccount}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isDeletingAccount ? 'Erasing...' : 'Confirm Erase'}
                              </button>
                              <button
                                onClick={() => setConfirmingDelete(false)}
                                disabled={isDeletingAccount}
                                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={signInWithGoogle}
                className="h-10 flex items-center gap-2 bg-gradient-to-r from-red-800 via-red-700 to-red-900 hover:from-red-700 text-amber-50 font-semibold text-xs sm:text-sm px-4 rounded-xl border border-amber-400/35 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
                aria-label="Join Waitlist with Google"
              >
                <UserIcon className="w-3.5 h-3.5 text-amber-300 stroke-[1.75]" />
                <span>Join Waitlist</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-10 w-10 rounded-xl bg-[#0a0c12] hover:bg-[#12141c] text-amber-300/80 hover:text-amber-200 border border-amber-500/25 hover:border-amber-400/50 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-4.5 h-4.5 stroke-[1.75]" />
            ) : (
              <Menu className="w-4.5 h-4.5 stroke-[1.75]" />
            )}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#07080a] border-b border-amber-500/20 px-4 py-4 space-y-2 text-sm uppercase tracking-wider font-medium">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left py-2 px-3 rounded-lg ${activeTab === 'home' ? 'text-amber-300 bg-amber-500/10 font-bold' : 'text-slate-300'}`}
          >
            Overview
          </button>
          <button
            onClick={() => handleNavClick('vision')}
            className={`w-full text-left py-2 px-3 rounded-lg ${activeTab === 'vision' ? 'text-amber-300 bg-amber-500/10 font-bold' : 'text-slate-300'}`}
          >
            Vision
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className={`w-full text-left py-2 px-3 rounded-lg ${activeTab === 'about' ? 'text-amber-300 bg-amber-500/10 font-bold' : 'text-slate-300'}`}
          >
            About
          </button>
          <button
            onClick={() => handleNavClick('rewards')}
            className="w-full text-left py-2 px-3 rounded-lg text-slate-300"
          >
            Future Rewards
          </button>
          <button
            onClick={() => handleNavClick('faq')}
            className={`w-full text-left py-2 px-3 rounded-lg ${activeTab === 'faq' ? 'text-amber-300 bg-amber-500/10 font-bold' : 'text-slate-300'}`}
          >
            FAQ
          </button>
          <button
            onClick={() => handleNavClick('transparency')}
            className={`w-full text-left py-2 px-3 rounded-lg ${activeTab === 'transparency' ? 'text-amber-300 bg-amber-500/10 font-bold' : 'text-slate-300'}`}
          >
            Transparency
          </button>

          {user && onOpenBonusEntry && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBonusEntry();
              }}
              className="w-full flex items-center gap-2 text-left py-2.5 px-3 rounded-lg text-amber-300 bg-amber-500/15 border border-amber-500/30 font-bold text-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Your Bonus Entry (Privilege)</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
