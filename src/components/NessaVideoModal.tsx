/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NESSA ANIMATED VIDEO POPUP MODAL
 * Plays the animated video of Nessa with audio.
 * Enforces "only the cat no background" using CSS luminosity/screen blending
 * so the black background is rendered transparent, isolating only the golden cat and her sparkles.
 */

import React, { useRef, useEffect, useState } from 'react';
import { X, RotateCcw, Volume2, Sparkles } from 'lucide-react';

interface NessaVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPOKEN_LINE = "Hi, welcome to Luckily. I'm Nessa, the golden cat. Tap around. I'll explain how everything works.";

export const NessaVideoModal: React.FC<NessaVideoModalProps> = ({ isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasEnded, setHasEnded] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setHasEnded(false);
      setIsPlaying(true);
      // Ensure video plays with audio upon user click
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.muted = false;
          videoRef.current.play().catch((err) => {
            console.warn('Autoplay with sound prevented, retrying muted:', err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(console.error);
            }
          });
        }
      }, 150);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setHasEnded(true);
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setHasEnded(false);
      }).catch(console.error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Nessa Animated Video"
      onClick={onClose}
    >
      {/* Outer Click Stopper */}
      <div
        className="relative flex flex-col items-center max-w-sm w-full mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar with Close Button */}
        <div className="w-full flex items-center justify-between mb-2 px-2 z-10">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold backdrop-blur-sm">
            <Sparkles size={13} className="text-amber-400 animate-spin" />
            <span>Nessa is speaking</span>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-900/90 border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-white flex items-center justify-center transition-all shadow-lg cursor-pointer"
            title="Close video"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Canvas with Background-Free Isolation */}
        <div className="relative w-full aspect-[9/16] max-h-[70vh] flex items-center justify-center overflow-hidden">
          {/* 
            Background-Free Technique:
            mix-blend-mode: screen completely eliminates black/dark pixels from the video,
            rendering ONLY the glowing golden cat, her animated mouth, waving paw, and golden stardust particles!
          */}
          <video
            ref={videoRef}
            src="/video/nessa.mp4"
            playsInline
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain pointer-events-auto select-none"
            style={{
              mixBlendMode: 'screen',
              filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.8)) drop-shadow(0 0 35px rgba(239, 68, 68, 0.5))',
            }}
          />

          {/* Replay Overlay when Video Ends */}
          {hasEnded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl animate-in fade-in duration-200">
              <button
                onClick={handleReplay}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-sm flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Replay Animation</span>
              </button>
            </div>
          )}
        </div>

        {/* Spoken Subtitle Caption Bubble */}
        <div className="mt-3 w-full bg-neutral-950/95 border border-amber-400/80 rounded-2xl p-4 shadow-2xl shadow-amber-950/60 text-center backdrop-blur-md">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-300 mb-1">
            <Volume2 size={13} className="text-amber-400" />
            <span>Nessa — Golden Cat</span>
          </div>
          <p className="text-sm font-medium text-neutral-100 leading-relaxed">
            "{SPOKEN_LINE}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default NessaVideoModal;
