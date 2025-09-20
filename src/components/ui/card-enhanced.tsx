import * as React from "react"
import { Shield, Star, CheckCircle, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// Enhanced Enterprise Card with Trust Signals
interface EnterpriseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  verified?: boolean
  rating?: number
  trending?: boolean
  hover?: boolean
  premium?: boolean
}

const Card = React.forwardRef<HTMLDivElement, EnterpriseCardProps>(
  ({ 
    className, 
    verified = false, 
    rating, 
    trending = false,
    hover = true,
    premium = false,
    children,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base enterprise card styling
          "relative bg-card text-card-foreground rounded-xl border overflow-hidden",
          // Professional border and shadow treatment
          "border-border/50 shadow-sm",
          // Premium card treatment
          premium && "border-primary/20 bg-gradient-to-br from-card to-primary/5",
          // Professional hover treatment
          hover && "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30",
          // Enhanced shadow for premium cards
          premium && hover && "hover:shadow-xl hover:shadow-primary/10",
          className
        )}
        {...props}
      >
        {/* Trust indicators overlay */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {verified && (
            <Badge 
              variant="secondary" 
              className="bg-green-500/10 text-green-700 border-green-500/20 shadow-sm"
            >
              <Shield className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
          {trending && (
            <Badge 
              variant="secondary" 
              className="bg-blue-500/10 text-blue-700 border-blue-500/20 shadow-sm"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>
        
        {/* Rating display */}
        {rating && (
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50 shadow-sm">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="text-xs font-semibold">{rating}</span>
            </div>
          </div>
        )}
        
        {/* Premium indicator */}
        {premium && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
        )}
        
        {children}
      </div>
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "leading-none font-semibold text-lg tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-muted-foreground text-sm leading-relaxed",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("px-6 pb-6", className)} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between px-6 py-4 bg-muted/20 border-t border-border/50",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Trust Badge Component for displaying credibility indicators
interface TrustBadgeProps {
  type: 'verified' | 'rating' | 'response-time' | 'completed-jobs'
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description: string
  className?: string
}

const TrustBadge: React.FC<TrustBadgeProps> = ({ 
  type, 
  value, 
  icon: Icon, 
  description,
  className 
}) => {
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'verified':
        return "bg-green-50 border-green-200 text-green-800"
      case 'rating':
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
      case 'response-time':
        return "bg-blue-50 border-blue-200 text-blue-800"
      case 'completed-jobs':
        return "bg-purple-50 border-purple-200 text-purple-800"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800"
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 hover:shadow-md",
      getTypeStyles(type),
      className
    )}>
      <div className="flex-shrink-0 w-10 h-10 bg-white/50 rounded-full flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold text-lg">{value}</div>
        <div className="text-sm opacity-80">{description}</div>
      </div>
    </div>
  )
}

// Statistics Counter Component for displaying animated numbers
interface StatisticsCounterProps {
  endValue: number
  duration?: number
  prefix?: string
  suffix?: string
  description: string
  className?: string
}

const StatisticsCounter: React.FC<StatisticsCounterProps> = ({ 
  endValue, 
  duration = 2000, 
  prefix = "", 
  suffix = "", 
  description,
  className 
}) => {
  const [count, setCount] = React.useState(0)
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  React.useEffect(() => {
    if (!isVisible) return
    
    let startTime: number | null = null
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * endValue))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [endValue, duration, isVisible])
  
  return (
    <div ref={ref} className={cn("text-center", className)}>
      <div className="text-3xl font-bold text-primary mb-1">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  TrustBadge,
  StatisticsCounter,
}