import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-[16px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F25C05] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.99]',
  {
    variants: {
      variant: {
        default: 'bg-[#F25C05] text-white hover:bg-[#D14D02] active:bg-[#D14D02]',
        secondary: 'bg-[#F6F7F8] text-[#16181D] hover:bg-[#E5E7EB] border border-[#E5E7EB]',
        outline: 'border-2 border-[#F25C05] text-[#F25C05] hover:bg-[#FFF1E9]',
        ghost: 'hover:bg-[#F6F7F8] text-[#16181D]',
        destructive: 'bg-[#DC2626] text-white hover:bg-red-700',
        link: 'text-[#F25C05] underline-offset-4 hover:underline p-0 h-auto font-normal',
      },
      size: {
        default: 'min-h-[56px] h-[56px] px-6 py-3',
        lg: 'min-h-[60px] h-[60px] px-8 text-[18px] font-semibold',
        sm: 'min-h-[44px] h-[44px] px-4 text-[14px]',
        icon: 'h-[56px] w-[56px] p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
