import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusUtils } from "@/lib/design-system/utils";

const inputVariants = cva(
  [
    "flex w-full transition-colors duration-200",
    "bg-[var(--color-background-input)] text-[var(--color-text-primary)]",
    "border border-[var(--color-border-input)]",
    "placeholder:text-[var(--color-text-tertiary)]",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "disabled:cursor-not-allowed disabled:opacity-50",
    focusUtils.ring,
  ],
  {
    variants: {
      variant: {
        default: [
          "hover:border-[var(--color-border-input-hover)]",
          "focus:border-[var(--color-border-input-focus)]",
        ],
        filled: [
          "bg-[var(--color-background-secondary)]",
          "border-transparent",
          "hover:bg-[var(--color-background-tertiary)]",
          "focus:bg-[var(--color-background-input)]",
          "focus:border-[var(--color-border-input-focus)]",
        ],
        ghost: [
          "bg-transparent border-transparent",
          "hover:bg-[var(--color-background-secondary)]",
          "focus:bg-[var(--color-background-input)]",
          "focus:border-[var(--color-border-input-focus)]",
        ],
      },
      size: {
        sm: "h-8 px-2 py-1 text-xs rounded-sm",
        md: "h-10 px-3 py-2 text-sm rounded-md",
        lg: "h-12 px-4 py-3 text-base rounded-lg",
      },
      state: {
        default: "",
        error: [
          "border-[var(--color-border-error)]",
          "focus:border-[var(--color-border-error)]",
          "focus:ring-[var(--color-border-error)]/20",
        ],
        success: [
          "border-[var(--color-border-success)]",
          "focus:border-[var(--color-border-success)]",
          "focus:ring-[var(--color-border-success)]/20",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      state: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    state, 
    leftIcon, 
    rightIcon, 
    error, 
    helperText, 
    label, 
    type, 
    ...props 
  }, ref) => {
    const inputState = error ? "error" : state;
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ variant, size, state: inputState }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p className={cn(
            "mt-1.5 text-xs",
            error ? "text-[var(--color-text-error)]" : "text-[var(--color-text-secondary)]"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };