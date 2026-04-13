"use client"

import { useState, useEffect } from "react"
import { usePMUStore } from "@/lib/pmu-store"
import { generateSamplePMUData } from "@/lib/sample-data"
import { HealthScreen } from "@/components/screens/health-screen"
import { ChartsScreen } from "@/components/screens/charts-screen"
import { TopologyScreen } from "@/components/screens/topology-screen"
import { NotificationsScreen } from "@/components/screens/notifications-screen"
import { UploadScreen } from "@/components/screens/upload-screen"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Activity,
  BarChart3,
  Network,
  Bell,
  Upload,
  Zap,
  Menu,
  X,
} from "lucide-react"

type Screen = "health" | "charts" | "topology" | "notifications" | "upload"

const navItems: { id: Screen; label: string; icon: typeof Activity }[] = [
  { id: "health", label: "Health", icon: Activity },
  { id: "charts", label: "Charts", icon: BarChart3 },
  { id: "topology", label: "Network", icon: Network },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "upload", label: "Upload", icon: Upload },
]

export default function PMUTrackerApp() {
  const [activeScreen, setActiveScreen] = useState<Screen>("health")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { pmuData, setPMUData, unreadCount } = usePMUStore()
  
  // Load sample data on first mount if no data exists
  useEffect(() => {
    if (!pmuData) {
      const sampleData = generateSamplePMUData()
      setPMUData(sampleData)
    }
  }, [pmuData, setPMUData])
  
  const renderScreen = () => {
    switch (activeScreen) {
      case "health":
        return <HealthScreen />
      case "charts":
        return <ChartsScreen />
      case "topology":
        return <TopologyScreen />
      case "notifications":
        return <NotificationsScreen />
      case "upload":
        return <UploadScreen />
      default:
        return <HealthScreen />
    }
  }
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">PMU Tracker</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              IEEE 68-Bus System Monitor
            </p>
          </div>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeScreen === item.id
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveScreen(item.id)}
                className={cn(
                  "relative",
                  isActive && "bg-primary/10 text-primary"
                )}
              >
                <Icon className="h-4 w-4 mr-2" />
                {item.label}
                {item.id === "notifications" && unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            )
          })}
        </nav>
        
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
            <span className="text-xs text-muted-foreground">
              {pmuData ? "Data Loaded" : "No Data"}
            </span>
          </div>
        </div>
      </header>
      
      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card">
          <nav className="flex flex-col p-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeScreen === item.id
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setActiveScreen(item.id)
                    setMobileMenuOpen(false)
                  }}
                  className={cn(
                    "justify-start relative",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                  {item.id === "notifications" && unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </nav>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderScreen()}
      </main>
      
      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden flex items-center justify-around border-t border-border bg-card py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeScreen === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all relative",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.id === "notifications" && unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 right-0 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
