import React from 'react';

interface AgronomicMotifProps {
  className?: string;
  variant?: 'wheat' | 'leaf' | 'contour' | 'constellation';
  motif?: 'wheat' | 'leaf' | 'contour' | 'constellation';
  opacity?: number;
}

export const AgronomicMotif: React.FC<AgronomicMotifProps> = ({
  className = '',
  variant,
  motif,
  opacity = 0.08
}) => {
  const chosenVariant = variant || motif || 'wheat';

  const baseStyle: React.CSSProperties = {
    opacity,
    position: 'absolute',
    pointerEvents: 'none'
  };

  if (chosenVariant === 'leaf') {
    return (
      <svg
        className={`pointer-events-none select-none absolute ${className}`}
        style={baseStyle}
        width="160"
        height="160"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M20 140C20 140 40 70 120 40C120 40 140 110 60 140C40 147 20 140 20 140Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 140C45 110 80 80 120 40"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M50 115C65 118 85 110 95 95"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M75 90C90 92 105 85 112 72"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (chosenVariant === 'contour') {
    return (
      <svg
        className={`pointer-events-none select-none absolute ${className}`}
        style={baseStyle}
        width="240"
        height="180"
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M10 40C60 20 120 60 180 30C210 15 230 25 240 35"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M5 80C70 50 130 100 190 70C220 55 235 65 240 75"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M0 120C80 90 140 140 200 110C225 95 238 105 240 115"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
        <path
          d="M0 160C90 130 150 170 210 150C230 140 238 145 240 155"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  // Default Wheat Stalk Motif
  return (
    <svg
      className={`pointer-events-none select-none absolute ${className}`}
      style={baseStyle}
      width="140"
      height="200"
      viewBox="0 0 140 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M70 190V30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Grains */}
      <path
        d="M70 45C60 38 45 40 40 50C38 60 55 65 70 55"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M70 45C80 38 95 40 100 50C102 60 85 65 70 55"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M70 75C58 68 42 70 38 80C35 90 52 95 70 85"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M70 75C82 68 98 70 102 80C105 90 88 95 70 85"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M70 105C58 98 42 100 38 110C35 120 52 125 70 115"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M70 105C82 98 98 100 102 110C105 120 88 125 70 115"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M70 135C60 130 46 132 44 140C42 148 56 152 70 145"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M70 135C80 130 94 132 96 140C98 148 84 152 70 145"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M70 30L65 15M70 30L75 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
