'use client';

import React from 'react';

interface ITPLogoProps {
  size?: number;
  className?: string;
}

export function ITPLogo({ size = 40, className = '' }: ITPLogoProps) {
  // Colors matching virtue accents
  const humbleColor = '#00A3E1'; // Sonance Cyan
  const hungryColor = '#E88C30'; // Warm amber
  const peopleSmartColor = '#7C5BB0'; // Soft purple

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label="ITP Logo - Triple Venn Diagram"
    >
      <defs>
        {/* Gradients for each circle */}
        <linearGradient id="humbleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={humbleColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={humbleColor} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="hungryGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={hungryColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={hungryColor} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="peopleSmartGradient" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={peopleSmartColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={peopleSmartColor} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Three overlapping circles */}
      {/* Top circle - Humble (Cyan) */}
      <circle
        cx="50"
        cy="32"
        r="28"
        fill="url(#humbleGradient)"
        style={{ mixBlendMode: 'multiply' }}
      />
      
      {/* Bottom-left circle - Hungry (Amber) */}
      <circle
        cx="34"
        cy="60"
        r="28"
        fill="url(#hungryGradient)"
        style={{ mixBlendMode: 'multiply' }}
      />
      
      {/* Bottom-right circle - People Smart (Purple) */}
      <circle
        cx="66"
        cy="60"
        r="28"
        fill="url(#peopleSmartGradient)"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Center highlight - the "Ideal Team Player" intersection */}
      <circle
        cx="50"
        cy="50"
        r="10"
        fill="white"
        fillOpacity="0.4"
      />
    </svg>
  );
}

export default ITPLogo;
