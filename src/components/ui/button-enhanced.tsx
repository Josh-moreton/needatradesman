import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Enhanced Enterprise Button Variants
const buttonVariants = cva(
  // Base enterprise styling with professional polish
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative overflow-hidden active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Primary enterprise button - confident and trustworthy
        primary: 
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 border border-primary/20",
        
        // Professional secondary option
        secondary: 
          "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary/90 hover:shadow-lg border border-secondary/20",
        
        // Enterprise outline for less prominent actions
        outline: 
          "border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5",
        
        // Subtle professional ghost variant
        ghost: 
          "hover:bg-accent hover:text-accent-foreground hover:shadow-sm transition-all duration-200",
        
        // Professional destructive actions
        destructive: 
          "bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90 hover:shadow-xl border border-destructive/20",
        
        // Premium variant with gradient for hero CTAs
        premium: 
          "bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-xl hover:shadow-2xl hover:-translate-y-1 border border-primary/30 relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        // Success state for completed actions
        success:
          "bg-green-600 text-white shadow-lg hover:bg-green-700 hover:shadow-xl border border-green-500/20",
        
        // Professional link styling
        link: 
          "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-colors duration-200",
      },
      size: {
        sm: "h-8 px-3 py-2 text-xs rounded-md gap-1.5",
        default: "h-10 px-6 py-2.5 text-sm rounded-lg gap-2",
        lg: "h-12 px-8 py-3 text-base rounded-lg gap-2.5",
        xl: "h-14 px-10 py-4 text-lg rounded-xl gap-3", // For hero CTAs
        icon: "h-10 w-10 rounded-lg p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 bg-current opacity-20 flex items-center justify-center rounded-inherit">
            <Loader2 className="h-4 w-4 animate-spin text-current" />
          </div>
        )}
        <span className={cn("flex items-center gap-2", loading && "opacity-0")}>
          {children}
        </span>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }