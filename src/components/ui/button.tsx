import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusUtils, animationUtils } from "@/lib/design-system/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap font-medium",
    "disabled:pointer-events-none disabled:opacity-50",
    "relative overflow-hidden",
    focusUtils.ring,
    animationUtils.transition.colors,
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-[var(--color-interactive-primary)] text-white",
          "hover:bg-[var(--color-interactive-primary-hover)]",
          "active:bg-[var(--color-interactive-primary-active)]",
          "shadow-sm hover:shadow-md",
        ],
        secondary: [
          "bg-[var(--color-interactive-secondary)] text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-interactive-secondary-hover)]",
          "active:bg-[var(--color-interactive-secondary-active)]",
          "border border-[var(--color-border-primary)]",
        ],
        tertiary: [
          "bg-[var(--color-interactive-tertiary)] text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-interactive-tertiary-hover)]",
          "active:bg-[var(--color-interactive-tertiary-active)]",
        ],
        destructive: [
          "bg-[var(--color-interactive-destructive)] text-white",
          "hover:bg-[var(--color-interactive-destructive-hover)]",
          "active:bg-[var(--color-interactive-destructive-active)]",
          "shadow-sm hover:shadow-md",
        ],
        outline: [
          "border border-[var(--color-border-primary)] bg-transparent",
          "text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-background-secondary)]",
          "hover:border-[var(--color-border-secondary)]",
        ],
        ghost: [
          "bg-transparent text-[var(--color-text-primary)]",
          "hover:bg-[var(--color-background-secondary)]",
        ],
        link: [
          "bg-transparent text-[var(--color-text-link)] underline-offset-4",
          "hover:underline hover:text-[var(--color-text-link-hover)]",
          "p-0 h-auto font-normal",
        ],
      },
      size: {
        xs: "h-6 px-2 text-xs rounded-md",
        sm: "h-8 px-3 text-sm rounded-md",
        md: "h-10 px-4 text-sm rounded-lg",
        lg: "h-12 px-6 text-base rounded-lg",
        xl: "h-14 px-8 text-lg rounded-xl",
        icon: "h-10 w-10 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        <span className="truncate">
          {loading && loadingText ? loadingText : children}
        </span>
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };