import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, spacingUtils, layoutUtils } from "@/lib/design-system/utils";

// Container Component
const containerVariants = cva(
  "mx-auto w-full",
  {
    variants: {
      size: {
        sm: "max-w-screen-sm",
        md: "max-w-screen-md",
        lg: "max-w-screen-lg",
        xl: "max-w-screen-xl",
        "2xl": "max-w-screen-2xl",
        full: "max-w-full",
      },
      padding: {
        none: "px-0",
        sm: "px-4",
        md: "px-6",
        lg: "px-8",
      },
    },
    defaultVariants: {
      size: "lg",
      padding: "md",
    },
  }
);

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(containerVariants({ size, padding }), className)}
      {...props}
    />
  )
);
Container.displayName = "Container";

// Stack Component
const stackVariants = cva(
  "flex flex-col",
  {
    variants: {
      spacing: {
        none: "gap-0",
        xs: "gap-1",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8",
        "2xl": "gap-12",
      },
      align: {
        start: "items-start",
        center: "items-center",
        end: "items-end",
        stretch: "items-stretch",
      },
      justify: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around",
        evenly: "justify-evenly",
      },
    },
    defaultVariants: {
      spacing: "md",
      align: "stretch",
      justify: "start",
    },
  }
);

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, spacing, align, justify, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(stackVariants({ spacing, align, justify }), className)}
      {...props}
    />
  )
);
Stack.displayName = "Stack";

// Inline Component (Horizontal Stack)
const inlineVariants = cva(
  "flex flex-row",
  {
    variants: {
      spacing: {
        none: "gap-0",
        xs: "gap-1",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8",
        "2xl": "gap-12",
      },
      align: {
        start: "items-start",
        center: "items-center",
        end: "items-end",
        stretch: "items-stretch",
        baseline: "items-baseline",
      },
      justify: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around",
        evenly: "justify-evenly",
      },
      wrap: {
        nowrap: "flex-nowrap",
        wrap: "flex-wrap",
        "wrap-reverse": "flex-wrap-reverse",
      },
    },
    defaultVariants: {
      spacing: "md",
      align: "center",
      justify: "start",
      wrap: "nowrap",
    },
  }
);

export interface InlineProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inlineVariants> {}

const Inline = React.forwardRef<HTMLDivElement, InlineProps>(
  ({ className, spacing, align, justify, wrap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(inlineVariants({ spacing, align, justify, wrap }), className)}
      {...props}
    />
  )
);
Inline.displayName = "Inline";

// Grid Component
const gridVariants = cva(
  "grid",
  {
    variants: {
      cols: {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
        6: "grid-cols-6",
        12: "grid-cols-12",
      },
      gap: {
        none: "gap-0",
        xs: "gap-1",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8",
        "2xl": "gap-12",
      },
      responsive: {
        true: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        false: "",
      },
    },
    defaultVariants: {
      cols: 1,
      gap: "md",
      responsive: false,
    },
  }
);

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, responsive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        gridVariants({ cols: responsive ? undefined : cols, gap, responsive }),
        className
      )}
      {...props}
    />
  )
);
Grid.displayName = "Grid";

// Divider Component
const dividerVariants = cva(
  "border-[var(--color-border-primary)]",
  {
    variants: {
      orientation: {
        horizontal: "w-full border-t",
        vertical: "h-full border-l",
      },
      size: {
        sm: "border-t",
        md: "border-t-2",
        lg: "border-t-4",
      },
      variant: {
        solid: "border-solid",
        dashed: "border-dashed",
        dotted: "border-dotted",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
      size: "sm",
      variant: "solid",
    },
  }
);

export interface DividerProps
  extends React.HTMLAttributes<HTMLHRElement>,
    VariantProps<typeof dividerVariants> {}

const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ className, orientation, size, variant, ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(dividerVariants({ orientation, size, variant }), className)}
      {...props}
    />
  )
);
Divider.displayName = "Divider";

// Center Component
const Center = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-center", className)}
    {...props}
  />
));
Center.displayName = "Center";

// Spacer Component
const spacerVariants = cva(
  "flex-shrink-0",
  {
    variants: {
      size: {
        xs: "w-1 h-1",
        sm: "w-2 h-2",
        md: "w-4 h-4",
        lg: "w-6 h-6",
        xl: "w-8 h-8",
        "2xl": "w-12 h-12",
      },
      axis: {
        both: "",
        horizontal: "h-0",
        vertical: "w-0",
      },
    },
    defaultVariants: {
      size: "md",
      axis: "both",
    },
  }
);

export interface SpacerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spacerVariants> {}

const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ className, size, axis, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(spacerVariants({ size, axis }), className)}
      {...props}
    />
  )
);
Spacer.displayName = "Spacer";

export {
  Container,
  Stack,
  Inline,
  Grid,
  Divider,
  Center,
  Spacer,
  containerVariants,
  stackVariants,
  inlineVariants,
  gridVariants,
  dividerVariants,
  spacerVariants,
};