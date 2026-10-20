/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface LuckylyLogoProps {
  className?: string;
  size?: number | string; // height of the logo in pixels or CSS units
  height?: number | string;
  width?: number | string;
  variant?: 'primary' | 'emblem' | 'wordmark';
  showText?: boolean; // legacy compatibility prop
}

export const LuckylyLogo: React.FC<LuckylyLogoProps> = ({
  className = '',
  size = 38,
  height,
  width,
  variant = 'primary',
  showText = false,
}) => {
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);

  // Check if user uploaded a custom logo image
  useEffect(() => {
    try {
      const stored = localStorage.getItem('luckyly_custom_logo');
      if (stored) {
        setCustomLogoUrl(stored);
      }
    } catch {
      // LocalStorage access safe guard
    }
  }, []);

  const isEmblem = variant === 'emblem';
  const isWordmark = variant === 'wordmark';

  // Original authoritative asset dimensions and exact width-to-height ratios:
  // - Primary/Complete Logo (luckyly-logo.svg): width 398, height 110 -> 398 / 110 = 3.61818:1 (199:55)
  // - Central Emblem (luckyly-emblem.svg): width 110, height 110 -> 110 / 110 = 1:1
  // - Wordmark (luckyly-wordmark.svg): width 236, height 68 -> 236 / 68 = 3.47059:1 (59:17)
  let logoSrc = '/assets/luckyly-logo.svg';
  let intrinsicRatio = '398 / 110';
  let altText = 'Luckyly Logo';

  if (isEmblem) {
    logoSrc = '/assets/luckyly-emblem.svg';
    intrinsicRatio = '1 / 1';
    altText = 'Luckyly Emblem';
  } else if (isWordmark) {
    logoSrc = '/assets/luckyly-wordmark.svg';
    intrinsicRatio = '236 / 68';
    altText = 'Luckyly Wordmark';
  }

  if (customLogoUrl && !isEmblem) {
    logoSrc = customLogoUrl;
  }

  // Dimension scaling that strictly preserves verified aspect ratio without height reduction or distortion
  const hasExplicitWidth = width !== undefined;
  const hasExplicitHeight = height !== undefined || !hasExplicitWidth;
  const effectiveHeight = hasExplicitHeight ? (height ?? size) : undefined;

  const numericHeight = effectiveHeight !== undefined
    ? (typeof effectiveHeight === 'number' ? `${effectiveHeight}px` : effectiveHeight)
    : 'auto';

  const numericWidth = hasExplicitWidth
    ? (typeof width === 'number' ? `${width}px` : width)
    : 'auto';

  // Prevent CSS utility collisions: if className specifies an un-prefixed display/visibility class (e.g. 'hidden'),
  // do not prepend 'inline-flex', which collides with 'hidden' at equal specificity in Tailwind CSS.
  const hasDisplayOverride = /(^|\s)(hidden|block|inline-block|flex|grid)(\s|$)/.test(className);
  const baseDisplay = hasDisplayOverride ? '' : 'inline-flex';

  return (
    <div
      className={`${baseDisplay} items-center justify-center shrink-0 select-none ${className}`.trim().replace(/\s+/g, ' ')}
      style={{
        height: numericHeight,
        width: numericWidth,
        maxWidth: '100%',
      }}
    >
      <img
        src={logoSrc}
        alt={altText}
        style={{
          height: numericHeight,
          width: numericWidth,
          aspectRatio: customLogoUrl ? undefined : intrinsicRatio,
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
        className="block select-none pointer-events-none filter drop-shadow-[0_4px_14px_rgba(217,119,6,0.35)] transition-transform duration-200"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};
