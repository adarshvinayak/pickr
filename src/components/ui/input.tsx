import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex min-h-[56px] h-[56px] w-full rounded-[14px] border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-[16px] text-[#16181D] placeholder:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F25C05] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
