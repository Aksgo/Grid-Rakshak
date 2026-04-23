"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: number
  unit?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "stable"
  className?: string
  valueColor?: string
}

export function MetricCard({
  title,
  value,
  unit = "%",
  icon,
  trend,
  className,
  valueColor,
}: MetricCardProps) {
  const getValueColor = () => {
    if (valueColor) return valueColor
    if (value >= 75) return "text-success"
    if (value >= 50) return "text-warning"
    return "text-destructive"
  }
  
  const getTrendIcon = () => {
    if (trend === "up") return "↑"
    if (trend === "down") return "↓"
    return "→"
  }
  
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold font-mono", getValueColor())}>
            {value.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          {trend && (
            <span className={cn(
              "text-xs ml-auto",
              trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            )}>
              {getTrendIcon()}
            </span>
          )}
        </div>
        
        {/* Mini progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              value >= 75 ? "bg-success" : value >= 50 ? "bg-warning" : "bg-destructive"
            )}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
