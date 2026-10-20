/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY BRAND MONOGRAM ICON
 * Renders the authoritative Luckyly luxury brand emblem and gold monogram.
 */

import React from 'react';

interface NessaIconProps {
  size?: number;
  className?: string;
}

export const NessaIcon: React.FC<NessaIconProps> = ({ size = 64, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Luckyly Brand Emblem"
    >
      <defs>
        <linearGradient id="brandGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2B2" />
          <stop offset="35%" stopColor="#E5B942" />
          <stop offset="70%" stopColor="#B3861B" />
          <stop offset="100%" stopColor="#7A5809" />
        </linearGradient>
      </defs>

      {/* Outer Coin Circle */}
      <circle cx="50" cy="50" r="44" stroke="url(#brandGoldGrad)" strokeWidth="2.5" fill="#0C0D12" />
      <circle cx="50" cy="50" r="39" stroke="url(#brandGoldGrad)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />

      {/* Central 4-pointed Luckyly Star */}
      <path
        d="M50 20 L53 47 L80 50 L53 53 L50 80 L47 53 L20 50 L47 47 Z"
        fill="url(#brandGoldGrad)"
      />

      {/* Subtle Central Ruby Accent */}
      <circle cx="50" cy="50" r="3.5" fill="#DC2626" />
    </svg>
  );
};

export default NessaIcon;
