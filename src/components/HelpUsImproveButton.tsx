/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FLOATING "HELP US IMPROVE" TRIGGER
 * Discreet, luxury floating button that opens the 'Report to Nessa' bug & feedback modal.
 */

import React from 'react';

interface HelpUsImproveButtonProps {
  onOpen: () => void;
}

export const HelpUsImproveButton: React.FC<HelpUsImproveButtonProps> = ({ onOpen }) => {
  return (
    <aside
      aria-label="Help Us Improve & Bug Report Trigger"
      className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-40 pointer-events-auto select-none"
    >
      <button
        type="button"
        onClick={onOpen}
        title="Report a bug or glitch to Nessa"
        aria-haspopup="dialog"
        className="group flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2.5 rounded-full bg-neutral-950/90 hover:bg-neutral-900 border border-amber-500/40 hover:border-amber-400 shadow-xl shadow-black/60 backdrop-blur-md text-neutral-300 hover:text-amber-200 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
      >
        <span className="text-sm transform group-hover:rotate-12 transition-transform duration-300">
          🐾
        </span>
        <span className="text-xs font-medium tracking-wide">
          Help Us Improve
        </span>
      </button>
    </aside>
  );
};
export default HelpUsImproveButton;
