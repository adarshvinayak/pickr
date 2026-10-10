import React from 'react';

export type MaterialIconKey =
  | 'sand'
  | 'aggregate'
  | 'soil'
  | 'debris'
  | 'cement'
  | 'steel'
  | 'brick'
  | 'block'
  | 'tiles'
  | 'pipes'
  | 'wood'
  | 'mixed';

interface MaterialIconProps extends React.SVGProps<SVGSVGElement> {
  name: MaterialIconKey | string;
  size?: number | string;
  className?: string;
}

export function MaterialIcon({ name, size = 32, className = '', ...props }: MaterialIconProps) {
  let key: MaterialIconKey = 'sand';
  if (name.includes('sand')) key = 'sand';
  else if (name.includes('jelly') || name.includes('aggregate') || name.includes('metal')) key = 'aggregate';
  else if (name.includes('soil') || name.includes('mud')) key = 'soil';
  else if (name.includes('debris') || name.includes('waste')) key = 'debris';
  else if (name.includes('cement')) key = 'cement';
  else if (name.includes('steel') || name.includes('tmt')) key = 'steel';
  else if (name.includes('brick')) key = 'brick';
  else if (name.includes('block')) key = 'block';
  else if (name.includes('tiles')) key = 'tiles';
  else if (name.includes('pipes')) key = 'pipes';
  else if (name.includes('wood')) key = 'wood';
  else if (name.includes('mixed')) key = 'mixed';

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* 1. SAND: Cone of grains / sand mound */}
      {key === 'sand' && (
        <g>
          <path d="M16 6 L27 26 L5 26 Z" opacity="0.9" />
          <circle cx="16" cy="12" r="1" fill="#FFFFFF" />
          <circle cx="13" cy="18" r="1.2" fill="#FFFFFF" />
          <circle cx="19" cy="19" r="1" fill="#FFFFFF" />
          <circle cx="16" cy="22" r="1.2" fill="#FFFFFF" />
        </g>
      )}

      {/* 2. AGGREGATE / JELLY: Three angular stones */}
      {key === 'aggregate' && (
        <g>
          {/* Top stone */}
          <polygon points="12,5 19,4 23,10 18,15 10,12" />
          {/* Bottom left stone */}
          <polygon points="5,17 14,16 16,24 8,27 3,22" />
          {/* Bottom right stone */}
          <polygon points="17,17 26,15 29,23 23,28 17,25" />
        </g>
      )}

      {/* 3. SOIL / MUD: Curved smooth mound of earth */}
      {key === 'soil' && (
        <g>
          <path d="M4 26 C6 14 16 10 28 26 Z" />
          <ellipse cx="14" cy="20" rx="3" ry="1.5" fill="#FFFFFF" opacity="0.3" />
        </g>
      )}

      {/* 4. DEBRIS / WASTE: Broken slab + scattered rubble */}
      {key === 'debris' && (
        <g>
          {/* Broken slab */}
          <polygon points="4,16 13,10 22,14 19,26 8,26" />
          <line x1="12" y1="12" x2="14" y2="24" stroke="#FFFFFF" strokeWidth="1.5" />
          {/* Rubble fragments */}
          <polygon points="23,8 27,6 29,11 25,12" />
          <polygon points="22,18 28,17 29,23 24,25" />
        </g>
      )}

      {/* 5. CEMENT: Sack with tie band */}
      {key === 'cement' && (
        <g>
          {/* Top gather */}
          <polygon points="13,4 19,4 18,7 14,7" />
          {/* Neck band */}
          <rect x="12" y="7" width="8" height="2" fill="#FFFFFF" />
          {/* Main sack */}
          <path d="M11 9 C7 12 7 24 9 27 L23 27 C25 24 25 12 21 9 Z" />
          {/* Label band */}
          <rect x="10" y="15" width="12" height="4" fill="#FFFFFF" opacity="0.4" />
        </g>
      )}

      {/* 6. STEEL: Bundle of 7 round rods, end-on */}
      {key === 'steel' && (
        <g>
          <circle cx="16" cy="16" r="3.2" />
          <circle cx="16" cy="8.5" r="3.2" />
          <circle cx="22.5" cy="12" r="3.2" />
          <circle cx="22.5" cy="20" r="3.2" />
          <circle cx="16" cy="23.5" r="3.2" />
          <circle cx="9.5" cy="20" r="3.2" />
          <circle cx="9.5" cy="12" r="3.2" />
        </g>
      )}

      {/* 7. BRICK: Stacked rectangular bricks with stagger */}
      {key === 'brick' && (
        <g>
          {/* Top row */}
          <rect x="4" y="6" width="11" height="5" rx="0.5" />
          <rect x="17" y="6" width="11" height="5" rx="0.5" />
          {/* Middle row */}
          <rect x="3" y="13" width="5" height="5" rx="0.5" />
          <rect x="10" y="13" width="12" height="5" rx="0.5" />
          <rect x="24" y="13" width="5" height="5" rx="0.5" />
          {/* Bottom row */}
          <rect x="4" y="20" width="11" height="5" rx="0.5" />
          <rect x="17" y="20" width="11" height="5" rx="0.5" />
        </g>
      )}

      {/* 8. HOLLOW BLOCK: Concrete block with two voids */}
      {key === 'block' && (
        <g>
          <rect x="4" y="7" width="24" height="18" rx="1" />
          <rect x="7" y="10" width="7" height="12" rx="1" fill="#FFFFFF" />
          <rect x="18" y="10" width="7" height="12" rx="1" fill="#FFFFFF" />
        </g>
      )}

      {/* 9. TILES: Fanned diagonal square tiles */}
      {key === 'tiles' && (
        <g>
          <polygon points="12,5 24,10 18,22 6,17" opacity="0.6" />
          <polygon points="16,9 28,14 22,26 10,21" />
        </g>
      )}

      {/* 10. PIPES: Three cylindrical pipes, end-on */}
      {key === 'pipes' && (
        <g>
          {/* Pipe 1 top */}
          <circle cx="16" cy="10" r="5.5" />
          <circle cx="16" cy="10" r="3" fill="#FFFFFF" />
          {/* Pipe 2 bottom-left */}
          <circle cx="10" cy="21" r="5.5" />
          <circle cx="10" cy="21" r="3" fill="#FFFFFF" />
          {/* Pipe 3 bottom-right */}
          <circle cx="22" cy="21" r="5.5" />
          <circle cx="22" cy="21" r="3" fill="#FFFFFF" />
        </g>
      )}

      {/* 11. WOOD: Stacked wooden planks */}
      {key === 'wood' && (
        <g>
          <rect x="4" y="7" width="24" height="4" rx="0.5" />
          <rect x="4" y="14" width="24" height="4" rx="0.5" />
          <rect x="4" y="21" width="24" height="4" rx="0.5" />
        </g>
      )}

      {/* 12. MIXED: Three diverse geometric objects */}
      {key === 'mixed' && (
        <g>
          <circle cx="10" cy="12" r="5" />
          <rect x="17" y="7" width="10" height="10" rx="1" />
          <polygon points="16,19 26,27 6,27" />
        </g>
      )}
    </svg>
  );
}
