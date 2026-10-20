/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * IN-PLACE ANIMATED NESSA MASCOT — SOLE VIDEO ARCHITECTURE
 * Uses only this video (/video/nessa.mp4):
 * - Direct in-place video playback at strictly locked dimensions (h-28 md:h-36)
 * - mix-blend-mode: screen eliminates the black background so only the animated cat and sparkles are visible
 * - Click to play with audio, click to pause and reset
 * - Auto-rewinds on completion
 */

import React, { useState, useRef, useEffect } from 'react';

const SPOKEN_LINE = "Hi, welcome to Luckily. I'm Nessa, the golden cat. Tap around. I'll explain how everything works.";

export const NessaMascot: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showBubble, setShowBubble] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoAudioRef = videoRef;
  const chimeRef = useRef<HTMLAudioElement | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };
  }, []);

  const handleMascotClick = () => {
    if (!videoRef.current) return;

    // If currently playing, tapping pauses and resets
    if (isPlaying) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setShowBubble(false);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      return;
    }

    // Play only this video with sound (380 sync timestamp)
    videoRef.current.currentTime = 0;
    videoRef.current.muted = false;
    videoRef.current.play().then(() => {
      setIsPlaying(true);
      setShowBubble(true);
    }).catch((err) => {
      console.warn('Playback error, falling back:', err);
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().catch(console.error);
        setIsPlaying(true);
        setShowBubble(true);
      }
    });
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    // 2000 ms dismiss timeout for speech bubble
    dismissTimerRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 2000);
  };

  return (
    <>
      {/* Floating anchor to bottom-right viewport */}
      <aside
        aria-label="Nessa the Golden Cat"
        className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 flex flex-col items-end pointer-events-auto select-none"
      >
        {/* Animated luxury gold/dark speech bubble with spoken line */}
        {showBubble && (
          <div
            className={`mb-3 max-w-[270px] md:max-w-[320px] bg-neutral-950/95 border border-amber-400/80 rounded-2xl p-3.5 shadow-2xl shadow-amber-950/60 text-neutral-100 text-xs md:text-sm font-medium animate-in fade-in zoom-in-95 duration-200 relative backdrop-blur-md ${
              isPlaying ? 'ring-1 ring-amber-400/50' : ''
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase font-mono tracking-wider text-amber-300">
              <span>🐾</span>
              <span>Nessa</span>
              {isPlaying && (
                <span className="flex gap-0.5 ml-auto items-center">
                  <span className="w-1 h-2 bg-amber-400 animate-pulse rounded-full" />
                  <span className="w-1 h-3.5 bg-amber-400 animate-pulse delay-75 rounded-full" />
                  <span className="w-1 h-2 bg-amber-400 animate-pulse delay-150 rounded-full" />
                </span>
              )}
            </div>
            <p className="leading-snug text-neutral-200">
              "{SPOKEN_LINE}"
            </p>
            {/* Bubble tail */}
            <div className="absolute -bottom-2 right-8 w-3 h-3 bg-neutral-950 border-b border-r border-amber-400/80 rotate-45" />
          </div>
        )}

        {/* 
          Fixed-Size Clickable Button:
          Only this video is used, perfectly sized at h-28 md:h-36 with zero scale distortion.
        */}
        <button
          onClick={handleMascotClick}
          type="button"
          title={isPlaying ? "Tap to pause Nessa" : "Tap to play video"}
          aria-label="Interactive Nessa Mascot"
          className="focus:outline-none cursor-pointer relative block h-28 md:h-36 w-auto aspect-[9/16] transition-none"
          style={{
            filter: isPlaying
              ? 'drop-shadow(0 0 16px rgba(245, 158, 11, 0.95)) drop-shadow(0 0 32px rgba(239, 68, 68, 0.8))'
              : 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.7)) drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))',
          }}
        >
          {/* Sole Media: Only this video */}
          <video
            ref={videoRef}
            src="/video/nessa.mp4"
            poster="/assets/nessa-avatar.png"
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            className="h-28 md:h-36 w-auto aspect-[9/16] object-contain pointer-events-none select-none rounded-2xl block"
            style={{
              mixBlendMode: 'screen',
            }}
          />

          {/* Subtle Tap Hint badge when idle */}
          {!isPlaying && !showBubble && (
            <span className="absolute -top-1 -left-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-neutral-950 text-[10px] font-bold shadow-md animate-bounce">
              Tap me!
            </span>
          )}
        </button>
      </aside>
    </>
  );
};

export default NessaMascot;
