import React from 'react';

export type VehicleIconKey =
  | 'auto'
  | 'ace'
  | 'pickup'
  | 'lcv'
  | 'container'
  | 'tipper_small'
  | 'tipper_medium'
  | 'tipper_large';

interface VehicleIconProps extends React.SVGProps<SVGSVGElement> {
  name: VehicleIconKey | string;
  size?: number | string;
  className?: string;
}

export function VehicleIcon({ name, size = 48, className = '', ...props }: VehicleIconProps) {
  // Normalize string to match key
  let iconKey: VehicleIconKey = 'ace';
  if (name.includes('auto')) iconKey = 'auto';
  else if (name.includes('ace')) iconKey = 'ace';
  else if (name.includes('pickup') || name === 'pickup_1t') iconKey = 'pickup';
  else if (name.includes('lcv') || name === 'lcv_14ft') iconKey = 'lcv';
  else if (name.includes('container') || name === 'container_17ft') iconKey = 'container';
  else if (name === 'tipper_small' || name === 'tipper_100') iconKey = 'tipper_small';
  else if (name === 'tipper_medium' || name === 'tipper_200') iconKey = 'tipper_medium';
  else if (name === 'tipper_large' || name === 'taurus_700') iconKey = 'tipper_large';

  return (
    <svg
      viewBox="0 0 48 32"
      width={size}
      height={typeof size === 'number' ? (size * 32) / 48 : 'auto'}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* 1. AUTO: Three wheeler, small cab, tiny tray */}
      {iconKey === 'auto' && (
        <g>
          {/* Cab */}
          <path d="M6 22 L10 10 L20 10 L22 17 L22 22 Z" />
          <line x1="12" y1="12" x2="19" y2="12" />
          {/* Open Tray */}
          <path d="M22 16 L42 16 L42 22 L22 22" />
          {/* Wheel front */}
          <circle cx="10" cy="24" r="3" fill="currentColor" />
          {/* Wheels rear */}
          <circle cx="34" cy="24" r="3" fill="currentColor" />
        </g>
      )}

      {/* 2. TATA ACE: 2 axles, cab ≈ tray length */}
      {iconKey === 'ace' && (
        <g>
          {/* Cab */}
          <path d="M4 22 L4 12 L14 8 L22 8 L22 22 Z" />
          <path d="M14 10 L20 10 L20 15 L12 15 Z" />
          {/* Open/semi Tray */}
          <path d="M22 14 L44 14 L44 22 L22 22" />
          {/* Wheels */}
          <circle cx="12" cy="24" r="3.5" fill="currentColor" />
          <circle cx="36" cy="24" r="3.5" fill="currentColor" />
        </g>
      )}

      {/* 3. BOLERO PICKUP: 2 axles, long bonnet cab, low open tray */}
      {iconKey === 'pickup' && (
        <g>
          {/* Long bonnet cab */}
          <path d="M3 22 L3 16 L10 16 L16 10 L24 10 L24 22 Z" />
          <path d="M12 12 L22 12 L22 16 L10 16 Z" />
          {/* Low open tray */}
          <path d="M24 16 L45 16 L45 22 L24 22" />
          {/* Wheels */}
          <circle cx="10" cy="24" r="3.5" fill="currentColor" />
          <circle cx="37" cy="24" r="3.5" fill="currentColor" />
        </g>
      )}

      {/* 4. 14FT LCV: 2 axles, tall box tray, cab shorter than tray */}
      {iconKey === 'lcv' && (
        <g>
          {/* Cab */}
          <path d="M4 22 L4 11 L14 7 L17 7 L17 22 Z" />
          <path d="M6 13 L14 9 L15 15 L6 15 Z" />
          {/* Tall box tray */}
          <path d="M17 5 L45 5 L45 22 L17 22 Z" />
          <line x1="31" y1="5" x2="31" y2="22" />
          {/* Wheels */}
          <circle cx="11" cy="24" r="3.5" fill="currentColor" />
          <circle cx="37" cy="24" r="3.5" fill="currentColor" />
        </g>
      )}

      {/* 5. 17FT CONTAINER: 2 axles, fully enclosed tall box */}
      {iconKey === 'container' && (
        <g>
          {/* Cab */}
          <path d="M3 22 L3 12 L12 8 L16 8 L16 22 Z" />
          <path d="M6 13 L12 10 L14 15 L6 15 Z" />
          {/* Fully enclosed corrugated container box */}
          <rect x="16" y="4" width="30" height="18" rx="1" />
          <line x1="23" y1="4" x2="23" y2="22" />
          <line x1="30" y1="4" x2="30" y2="22" />
          <line x1="37" y1="4" x2="37" y2="22" />
          {/* Wheels */}
          <circle cx="10" cy="24" r="3.5" fill="currentColor" />
          <circle cx="38" cy="24" r="3.5" fill="currentColor" />
        </g>
      )}

      {/* 6. TIPPER 100 (6-wheel): 2 axles, angled/raised tipping body */}
      {iconKey === 'tipper_small' && (
        <g>
          {/* Cab with visor */}
          <path d="M4 22 L4 12 L14 7 L18 7 L18 22 Z" />
          <path d="M13 7 L6 12 L16 12 Z" />
          {/* Angled Tipper Body */}
          <path d="M18 10 L42 6 L45 22 L18 22 Z" />
          <line x1="20" y1="6" x2="18" y2="10" />
          {/* Hydraulic cylinder base */}
          <line x1="24" y1="22" x2="28" y2="15" strokeWidth="1.5" />
          {/* 2 Axles (Front + Rear dual) */}
          <circle cx="11" cy="24" r="3.5" fill="currentColor" />
          <circle cx="37" cy="24" r="3.5" fill="currentColor" />
        </g>
      )}

      {/* 7. TIPPER 200 (10-wheel): 3 axles, angled tipping body */}
      {iconKey === 'tipper_medium' && (
        <g>
          {/* Cab */}
          <path d="M3 22 L3 11 L13 6 L17 6 L17 22 Z" />
          <path d="M12 6 L5 11 L15 11 Z" />
          {/* Medium Tipper Body */}
          <path d="M17 9 L44 5 L46 22 L17 22 Z" />
          <line x1="19" y1="5" x2="17" y2="9" />
          <line x1="24" y1="22" x2="28" y2="14" strokeWidth="1.5" />
          {/* 3 Axles */}
          <circle cx="10" cy="24" r="3.2" fill="currentColor" />
          <circle cx="33" cy="24" r="3.2" fill="currentColor" />
          <circle cx="41" cy="24" r="3.2" fill="currentColor" />
        </g>
      )}

      {/* 8. TAURUS 700 (multi-axle): 4 axles, long angled tipping body */}
      {iconKey === 'tipper_large' && (
        <g>
          {/* Cab */}
          <path d="M2 22 L2 11 L11 6 L15 6 L15 22 Z" />
          <path d="M10 6 L4 11 L13 11 Z" />
          {/* Long Large Tipper Body */}
          <path d="M15 8 L46 4 L47 22 L15 22 Z" />
          <line x1="17" y1="4" x2="15" y2="8" />
          <line x1="22" y1="22" x2="26" y2="13" strokeWidth="1.5" />
          {/* 4 Axles (Dual front, dual rear) */}
          <circle cx="8" cy="24" r="3" fill="currentColor" />
          <circle cx="14" cy="24" r="3" fill="currentColor" />
          <circle cx="35" cy="24" r="3" fill="currentColor" />
          <circle cx="42" cy="24" r="3" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}
