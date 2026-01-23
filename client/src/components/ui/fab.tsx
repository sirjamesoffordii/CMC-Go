import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const fabVariants = cva(
  "fixed z-50 inline-flex items-center justify-center rounded-full font-medium shadow-lg transition-all active:scale-90 disabled:pointer-events-none disabled:opacity-50 md:hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-primary/20",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/80 shadow-destructive/20",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
      },
      size: {
        default: "h-14 w-14",
        sm: "h-12 w-12",
        lg: "h-16 w-16",
      },
      position: {
        "bottom-right": "bottom-6 right-6",
        "bottom-left": "bottom-6 left-6",
        "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      position: "bottom-right",
    },
  }
);

export interface FabProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof fabVariants> {
  /**
   * Icon or content to display in the FAB
   */
  children: React.ReactNode;
}

function Fab({
  className,
  variant,
  size,
  position,
  children,
  ...props
}: FabProps) {
  return (
    <button
      className={cn(fabVariants({ variant, size, position, className }))}
      {...props}
    >
      {children}
    </button>
  );
}

export { Fab, fabVariants };
