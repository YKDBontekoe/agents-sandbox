import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/design-system/utils";

const cardVariants = cva(
  [
    "bg-[var(--color-card-background)] text-[var(--color-text-primary)]",
    "border border-[var(--color-card-border)]",
    "overflow-hidden",
  ],
  {
    variants: {
      variant: {
        default: "shadow-sm",
        elevated: "shadow-md hover:shadow-lg transition-shadow duration-200",
        outlined: "shadow-none border-2",
        ghost: "shadow-none border-none bg-transparent",
      },
      size: {
        sm: "rounded-md",
        md: "rounded-lg",
        lg: "rounded-xl",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      padding: "none",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, padding, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const cardHeaderVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      padding: "md",
    },
  }
);

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardHeaderVariants({ padding, className }))}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const cardTitleVariants = cva(
  [
    "font-semibold leading-none tracking-tight",
    "text-[var(--color-text-primary)]",
  ],
  {
    variants: {
      size: {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl",
        xl: "text-3xl",
      },
    },
    defaultVariants: {
      size: "lg",
    },
  }
);

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof cardTitleVariants> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size, as: Component = 'h3', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(cardTitleVariants({ size, className }))}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-[var(--color-text-secondary)] leading-relaxed",
      className
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const cardContentVariants = cva(
  "",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-4 pt-0",
        md: "p-6 pt-0",
        lg: "p-8 pt-0",
      },
    },
    defaultVariants: {
      padding: "md",
    },
  }
);

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardContentVariants({ padding, className }))}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

const cardFooterVariants = cva(
  "flex items-center",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-4 pt-0",
        md: "p-6 pt-0",
        lg: "p-8 pt-0",
      },
      justify: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
      },
    },
    defaultVariants: {
      padding: "md",
      justify: "start",
    },
  }
);

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding, justify, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardFooterVariants({ padding, justify, className }))}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };