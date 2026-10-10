import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#FFF1E9] text-[#F25C05]',
        secondary: 'border-transparent bg-[#F6F7F8] text-[#16181D]',
        success: 'border-transparent bg-[#DEF7EC] text-[#0E9F6E]',
        warning: 'border-transparent bg-[#FEF08A] text-[#B45309]',
        destructive: 'border-transparent bg-[#FDE8E8] text-[#DC2626]',
        outline: 'border-[#E5E7EB] text-[#16181D]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
