import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/design-system/utils";

// Responsive Grid System
const responsiveGridVariants = cva(
  "grid w-full",
  {
    variants: {
      // Base grid columns (mobile-first)
      cols: {
        1: "grid-cols-1",
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        6: "grid-cols-6",
        12: "grid-cols-12",
      },
      // Small screens (sm: 640px+)
      smCols: {
        1: "sm:grid-cols-1",
        2: "sm:grid-cols-2",
        3: "sm:grid-cols-3",
        4: "sm:grid-cols-4",
        6: "sm:grid-cols-6",
        12: "sm:grid-cols-12",
      },
      // Medium screens (md: 768px+)
      mdCols: {
        1: "md:grid-cols-1",
        2: "md:grid-cols-2",
        3: "md:grid-cols-3",
        4: "md:grid-cols-4",
        6: "md:grid-cols-6",
        12: "md:grid-cols-12",
      },
      // Large screens (lg: 1024px+)
      lgCols: {
        1: "lg:grid-cols-1",
        2: "lg:grid-cols-2",
        3: "lg:grid-cols-3",
        4: "lg:grid-cols-4",
        6: "lg:grid-cols-6",
        12: "lg:grid-cols-12",
      },
      // Extra large screens (xl: 1280px+)
      xlCols: {
        1: "xl:grid-cols-1",
        2: "xl:grid-cols-2",
        3: "xl:grid-cols-3",
        4: "xl:grid-cols-4",
        6: "xl:grid-cols-6",
        12: "xl:grid-cols-12",
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
      // Auto-fit responsive patterns
      autoFit: {
        none: "",
        cards: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        features: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        sidebar: "grid-cols-1 lg:grid-cols-4",
        "two-column": "grid-cols-1 md:grid-cols-2",
      },
    },
    defaultVariants: {
      cols: 1,
      gap: "md",
      autoFit: "none",
    },
  }
);

export interface ResponsiveGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof responsiveGridVariants> {}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ className, cols, smCols, mdCols, lgCols, xlCols, gap, autoFit, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        responsiveGridVariants({ 
          cols: autoFit === "none" ? cols : undefined, 
          smCols, 
          mdCols, 
          lgCols, 
          xlCols, 
          gap, 
          autoFit 
        }),
        className
      )}
      {...props}
    />
  )
);
ResponsiveGrid.displayName = "ResponsiveGrid";

// Grid Item Component
const gridItemVariants = cva(
  "",
  {
    variants: {
      // Column span
      colSpan: {
        1: "col-span-1",
        2: "col-span-2",
        3: "col-span-3",
        4: "col-span-4",
        5: "col-span-5",
        6: "col-span-6",
        7: "col-span-7",
        8: "col-span-8",
        9: "col-span-9",
        10: "col-span-10",
        11: "col-span-11",
        12: "col-span-12",
        full: "col-span-full",
      },
      // Row span
      rowSpan: {
        1: "row-span-1",
        2: "row-span-2",
        3: "row-span-3",
        4: "row-span-4",
        5: "row-span-5",
        6: "row-span-6",
        full: "row-span-full",
      },
      // Responsive column spans
      smColSpan: {
        1: "sm:col-span-1",
        2: "sm:col-span-2",
        3: "sm:col-span-3",
        4: "sm:col-span-4",
        6: "sm:col-span-6",
        12: "sm:col-span-12",
        full: "sm:col-span-full",
      },
      mdColSpan: {
        1: "md:col-span-1",
        2: "md:col-span-2",
        3: "md:col-span-3",
        4: "md:col-span-4",
        6: "md:col-span-6",
        12: "md:col-span-12",
        full: "md:col-span-full",
      },
      lgColSpan: {
        1: "lg:col-span-1",
        2: "lg:col-span-2",
        3: "lg:col-span-3",
        4: "lg:col-span-4",
        6: "lg:col-span-6",
        12: "lg:col-span-12",
        full: "lg:col-span-full",
      },
    },
    defaultVariants: {
      colSpan: 1,
      rowSpan: 1,
    },
  }
);

export interface GridItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridItemVariants> {}

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ className, colSpan, rowSpan, smColSpan, mdColSpan, lgColSpan, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        gridItemVariants({ colSpan, rowSpan, smColSpan, mdColSpan, lgColSpan }),
        className
      )}
      {...props}
    />
  )
);
GridItem.displayName = "GridItem";

// Masonry Grid Component (CSS Grid based)
const masonryGridVariants = cva(
  "grid",
  {
    variants: {
      cols: {
        2: "grid-cols-2",
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
      },
      gap: {
        none: "gap-0",
        xs: "gap-1",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8",
      },
      responsive: {
        true: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        false: "",
      },
    },
    defaultVariants: {
      cols: 3,
      gap: "md",
      responsive: false,
    },
  }
);

export interface MasonryGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof masonryGridVariants> {}

const MasonryGrid = React.forwardRef<HTMLDivElement, MasonryGridProps>(
  ({ className, cols, gap, responsive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        masonryGridVariants({ cols: responsive ? undefined : cols, gap, responsive }),
        "auto-rows-max",
        className
      )}
      {...props}
    />
  )
);
MasonryGrid.displayName = "MasonryGrid";

export {
  ResponsiveGrid,
  GridItem,
  MasonryGrid,
  responsiveGridVariants,
  gridItemVariants,
  masonryGridVariants,
};