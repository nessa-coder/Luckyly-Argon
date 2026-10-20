/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NESSA CONTEXT & AUTHENTIC VOICE ENGINE
 * Manages Nessa the Golden Cat's authentic voice and speech synchronization:
 * - 5 official voice tracks extracted directly from official video recordings
 * - Pure audio-only engine (zero video display elements, zero browser text-to-speech)
 * - Dual-audio playback sequence on Nessa avatar click:
 *   1. Locks interaction to prevent spamming/overlapping
 *   2. Immediately plays website's signature harmonic chime SFX
 *   3. After ~400ms delay, plays authentic voice audio track extracted from the uploaded video
 *   4. Advances sequentially to the next video line in the dialogue array
 *   5. Synchronized speech caption bubble floating above avatar with exact spoken dialogue
 *   6. Dismisses the caption bubble 2 seconds after voice audio finishes playing
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { soundService } from '../services/soundService.ts';
import { NESSA_DIALOGUES, NessaDialogueItem } from '../data/nessaDialogue.ts';

export type NessaClipKey = 'welcome' | 'trivia' | 'coins' | 'amazon' | 'milestone';

export interface NessaClipData {
  src: string;
  text: string;
  durationSec: number;
}

export const NESSA_CLIPS: Partial<Record<NessaClipKey, NessaClipData>> = {};

// Clean system explanations map
export const EXPLANATIONS: Record<string, string> = {
  intro: "Welcome to Luckyly. Tap around to explore our community milestones.",
  welcome: "Welcome to Luckyly. Tap around to explore our community milestones.",
  waitlist: "Join the founding waitlist to secure your early entry benefits.",
  coins: "1,500 virtual Luckyly coins are reserved for founding community members.",
  questionnaire: "Answer quick community questions to shape upcoming rewards.",
  trivia: "Answer quick community questions to shape upcoming rewards.",
  amazon: "Select your preferred Amazon store for regional gift card compatibility.",
  amazon_region: "Select your preferred Amazon store for regional gift card compatibility.",
  milestone: "When our community reaches 200 members, the first $5 Amazon gift card draw goes live.",
  milestone_draw: "When our community reaches 200 members, the first $5 Amazon gift card draw goes live.",
  badge: "This is your early founding pass—proof you were here with us from the very beginning.",
  team_pool: "Join a 5-person pool with family or friends to boost everyone's collective milestone progression!",
  treasury: "Review all your member privileges and unlock complimentary bonuses.",
};


export interface NessaContextType {
  isNessaActive: boolean;
  currentClip: 'welcome' | 'trivia' | 'coins' | 'amazon' | 'milestone' | 'idle';
  isSpeaking: boolean;
  isHighlighted: boolean;
  isLocked: boolean;
  currentSubtitle: string | null;
  currentMessage: string | null; // Backwards compatible alias for currentSubtitle
  currentDialogueIndex: number;
  handleNessaClick: () => void;
  toggleNessa: () => void; // alias for handleNessaClick
  playNessaClip: (clipKey: NessaClipKey) => void;
  explain: (key: string, customText?: string) => void; // Backwards compatible helper
  silenceNessa: () => void;
  handleVideoEnded: () => void;
  videoRef: React.RefObject<HTMLAudioElement | null>; // Backwards compatible ref pointing to audio element
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setIsSpeaking: (speaking: boolean) => void;
}

const NessaContext = createContext<NessaContextType | undefined>(undefined);

export const NessaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNessaActive, setIsNessaActive] = useState<boolean>(false);
  const [currentClip, setCurrentClip] = useState<'welcome' | 'trivia' | 'coins' | 'amazon' | 'milestone' | 'idle'>('idle');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isHighlighted, setIsHighlighted] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sequenceDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear subtitles, cancel timers, and pause audio
  const silenceNessa = useCallback(() => {
    if (sequenceDelayTimeoutRef.current) clearTimeout(sequenceDelayTimeoutRef.current);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (fallbackDurationTimeoutRef.current) clearTimeout(fallbackDurationTimeoutRef.current);

    setIsSpeaking(false);
    setIsHighlighted(false);
    setIsLocked(false);
    setCurrentSubtitle(null);
    setCurrentClip('idle');

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // When speech track finishes playing (via onEnded event on <audio>)
  const handleAudioEnded = useCallback(() => {
    if (fallbackDurationTimeoutRef.current) clearTimeout(fallbackDurationTimeoutRef.current);
    setIsSpeaking(false);

    // Requirement 5: Dismiss the caption bubble 2 seconds after the voice audio finishes playing
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = setTimeout(() => {
      setCurrentSubtitle(null);
      setIsHighlighted(false);
      setIsLocked(false);
      setCurrentClip('idle');
    }, 2000);
  }, []);

  /**
   * Requirement 4: DUAL-AUDIO PLAYBACK SEQUENCE ON CLICK:
   * When user clicks the Nessa avatar:
   * a. Lock interaction to prevent spamming/overlapping
   * b. Immediately play the website's existing signature sound / chime SFX
   * c. After a ~350ms-450ms delay (allowing signature chime to ring clearly),
   *    play the authentic audio line extracted from the uploaded video
   * d. Advance to the next video line in the array for subsequent clicks
   */
  const handleNessaClick = useCallback(() => {
    // a. Lock interaction to prevent spamming/overlapping
    if (isLocked || isSpeaking) {
      return;
    }

    setIsLocked(true);
    setIsNessaActive(true);

    if (sequenceDelayTimeoutRef.current) clearTimeout(sequenceDelayTimeoutRef.current);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (fallbackDurationTimeoutRef.current) clearTimeout(fallbackDurationTimeoutRef.current);

    // b. Immediately play website's signature sound / chime SFX
    soundService.playNessaChime();

    // Select the current dialogue item and advance index for subsequent clicks
    const dialogueList: NessaDialogueItem[] = NESSA_DIALOGUES.length > 0 ? NESSA_DIALOGUES : Object.values(NESSA_CLIPS).map((c, i) => ({
      id: Object.keys(NESSA_CLIPS)[i],
      transcript: c.text,
      text: c.text,
      mediaSrc: c.src,
      audioSrc: c.src,
      durationSec: c.durationSec,
    }));

    const dialogueIndex = currentDialogueIndex % dialogueList.length;
    const dialogue: NessaDialogueItem = dialogueList[dialogueIndex];

    // d. Advance to next video line in the array for subsequent clicks
    setCurrentDialogueIndex((prev) => (prev + 1) % dialogueList.length);

    // c. After a ~400ms delay, play the authentic audio line extracted from uploaded video
    sequenceDelayTimeoutRef.current = setTimeout(() => {
      // 5. Render synchronized floating caption bubble above avatar
      setCurrentSubtitle(dialogue.transcript || dialogue.text || null);
      setIsSpeaking(true);
      setIsHighlighted(true);
      setCurrentClip(dialogue.id as NessaClipKey);

      if (audioRef.current) {
        audioRef.current.src = dialogue.mediaSrc || dialogue.audioSrc || '';
        audioRef.current.loop = false;
        audioRef.current.muted = false;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          if (audioRef.current && dialogue.audioFallbackSrc) {
            audioRef.current.src = dialogue.audioFallbackSrc;
            audioRef.current.play().catch(err => {
              console.warn('[NessaContext] Video audio playback notice:', err);
            });
          }
        });
      }

      // Safety fallback in case onEnded event is delayed
      const fallbackDelay = Math.ceil((dialogue.durationSec + 0.8) * 1000);
      fallbackDurationTimeoutRef.current = setTimeout(() => {
        handleAudioEnded();
      }, fallbackDelay);
    }, 400); // 400ms delay allowing chime to ring clearly
  }, [isLocked, isSpeaking, currentDialogueIndex, handleAudioEnded]);

  // Contextual Trigger Function: playNessaClip(clipKey)
  const playNessaClip = useCallback((clipKey: NessaClipKey) => {
    const clip = NESSA_CLIPS[clipKey];
    if (!clip) return;

    setIsNessaActive(true);
    setCurrentClip(clipKey);
    setCurrentSubtitle(clip.text);
    setIsSpeaking(true);
    setIsHighlighted(true);
    setIsLocked(true);

    if (sequenceDelayTimeoutRef.current) clearTimeout(sequenceDelayTimeoutRef.current);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (fallbackDurationTimeoutRef.current) clearTimeout(fallbackDurationTimeoutRef.current);

    if (audioRef.current) {
      audioRef.current.src = clip.src;
      audioRef.current.loop = false;
      audioRef.current.muted = false;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.warn(`[NessaContext] Voice playback notice for ${clipKey}:`, err);
      });
    }

    const fallbackDelay = Math.ceil((clip.durationSec + 0.8) * 1000);
    fallbackDurationTimeoutRef.current = setTimeout(() => {
      handleAudioEnded();
    }, fallbackDelay);
  }, [handleAudioEnded]);

  // Backwards-compatible explain function
  const explain = useCallback((key: string, customText?: string) => {
    const lowerKey = (key || '').toLowerCase();
    if (lowerKey === 'coins' || lowerKey === 'treasury' || lowerKey === 'bonus' || lowerKey === 'luckyly_coins') {
      playNessaClip('coins');
    } else if (lowerKey === 'questionnaire' || lowerKey === 'trivia' || lowerKey === 'survey') {
      playNessaClip('trivia');
    } else if (lowerKey === 'amazon' || lowerKey === 'amazon_region' || lowerKey === 'amazon_store') {
      playNessaClip('amazon');
    } else if (lowerKey === 'milestone' || lowerKey === 'milestone_draw' || lowerKey === 'progress' || lowerKey === 'milestone_200') {
      playNessaClip('milestone');
    } else if (lowerKey === 'welcome' || lowerKey === 'intro' || lowerKey === 'waitlist' || lowerKey === 'join') {
      playNessaClip('welcome');
    } else {
      const text = customText || EXPLANATIONS[key] || "I'm keeping an eye on your fortune!";
      setCurrentSubtitle(text);
      setIsSpeaking(false);
      setIsHighlighted(true);
      setIsNessaActive(true);

      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = setTimeout(() => {
        setCurrentSubtitle(null);
        setIsHighlighted(false);
        setCurrentClip('idle');
      }, 5000);
    }
  }, [playNessaClip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sequenceDelayTimeoutRef.current) clearTimeout(sequenceDelayTimeoutRef.current);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      if (fallbackDurationTimeoutRef.current) clearTimeout(fallbackDurationTimeoutRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <NessaContext.Provider
      value={{
        isNessaActive,
        currentClip,
        isSpeaking,
        isHighlighted,
        isLocked,
        currentSubtitle,
        currentMessage: currentSubtitle,
        currentDialogueIndex,
        handleNessaClick,
        toggleNessa: handleNessaClick,
        playNessaClip,
        explain,
        silenceNessa,
        handleVideoEnded: handleAudioEnded,
        videoRef: audioRef,
        audioRef,
        setIsSpeaking,
      }}
    >
      {children}
    </NessaContext.Provider>
  );
};

export const useNessa = (): NessaContextType => {
  const context = useContext(NessaContext);
  if (!context) {
    throw new Error('useNessa must be used within a NessaProvider');
  }
  return context;
};
