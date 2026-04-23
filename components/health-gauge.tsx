"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface HealthGaugeProps {
  value: number // 0 to 1
  size?: number
  className?: string
}

export function HealthGauge({ value, size = 200, className }: HealthGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100)
    return () => clearTimeout(timer)
  }, [value])
  
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - animatedValue * 0.75) // 270 degrees max
  
  const getStatusColor = () => {
    if (animatedValue >= 0.75) return "text-success"
    if (animatedValue >= 0.5) return "text-warning"
    return "text-destructive"
  }
  
  const getGlowClass = () => {
    if (animatedValue >= 0.75) return "glow-success"
    if (animatedValue >= 0.5) return "glow-warning"
    return "glow-destructive"
  }
  
  const getStatusText = () => {
    if (animatedValue >= 0.75) return "STABLE"
    if (animatedValue >= 0.5) return "WARNING"
    return "CRITICAL"
  }
  
  const getStrokeColor = () => {
    if (animatedValue >= 0.75) return "oklch(0.7 0.18 145)"
    if (animatedValue >= 0.5) return "oklch(0.75 0.18 85)"
    return "oklch(0.6 0.22 25)"
  }
  
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn("transform -rotate-135", getGlowClass())}
      >
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          className="text-muted/30"
        />
        
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${getStrokeColor()})`,
          }}
        />
        
        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
          const angle = -135 + tick * 270
          const rad = (angle * Math.PI) / 180
          const innerRadius = radius - 15
          const outerRadius = radius + 5
          const x1 = size / 2 + innerRadius * Math.cos(rad)
          const y1 = size / 2 + innerRadius * Math.sin(rad)
          const x2 = size / 2 + outerRadius * Math.cos(rad)
          const y2 = size / 2 + outerRadius * Math.sin(rad)
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground/50"
            />
          )
        })}
      </svg>
      
      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold font-mono", getStatusColor())}>
          {(animatedValue * 100).toFixed(0)}
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          Health Score
        </span>
        <span className={cn("text-sm font-semibold mt-1", getStatusColor())}>
          {getStatusText()}
        </span>
      </div>
    </div>
  )
}
