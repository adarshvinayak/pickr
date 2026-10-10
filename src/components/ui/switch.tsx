'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Switch({ checked, onCheckedChange, disabled, className, id }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        'peer inline-flex h-[32px] w-[56px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F25C05] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-[#F25C05]' : 'bg-[#E5E7EB]',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-[26px] w-[26px] rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-[24px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );
}
