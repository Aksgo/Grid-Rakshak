"use client"

import { usePMUStore } from "@/lib/pmu-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, AlertTriangle, AlertCircle, Info, Trash2, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Notification } from "@/lib/types"

function NotificationItem({ notification }: { notification: Notification }) {
  const getIcon = () => {
    switch (notification.type) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />
      default:
        return <Info className="h-5 w-5 text-primary" />
    }
  }
  
  const getBadgeStyle = () => {
    switch (notification.type) {
      case "critical":
        return "bg-destructive/20 text-destructive border-destructive/30"
      case "warning":
        return "bg-warning/20 text-warning border-warning/30"
      default:
        return "bg-primary/20 text-primary border-primary/30"
    }
  }
  
  const formatTime = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  
  return (
    <Card className={cn(
      "bg-card border-border transition-all hover:bg-muted/50",
      notification.type === "critical" && "border-l-4 border-l-destructive"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {notification.title}
              </h4>
              <Badge variant="outline" className={cn("text-xs shrink-0", getBadgeStyle())}>
                {notification.type.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{formatTime(notification.timestamp)}</span>
              {notification.busId && (
                <span className="font-mono">Bus {notification.busId}</span>
              )}
              {notification.value !== undefined && (
                <span className="font-mono">{notification.value.toFixed(3)} p.u.</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function NotificationsScreen() {
  const { notifications, unreadCount, clearNotifications, markAllRead } = usePMUStore()
  
  const criticalCount = notifications.filter(n => n.type === "critical").length
  const warningCount = notifications.filter(n => n.type === "warning").length
  const infoCount = notifications.filter(n => n.type === "info").length
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-4 md:p-6 pb-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              System alerts and fault detection history
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-destructive/10 border-destructive/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-destructive font-mono">
                    {criticalCount}
                  </div>
                  <div className="text-xs text-destructive/80">Critical</div>
                </div>
                <AlertCircle className="h-6 w-6 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-warning/10 border-warning/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-warning font-mono">
                    {warningCount}
                  </div>
                  <div className="text-xs text-warning/80">Warnings</div>
                </div>
                <AlertTriangle className="h-6 w-6 text-warning/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/10 border-primary/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-primary font-mono">
                    {infoCount}
                  </div>
                  <div className="text-xs text-primary/80">Info</div>
                </div>
                <Info className="h-6 w-6 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearNotifications}
            disabled={notifications.length === 0}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>
      
      {/* Scrollable Notifications List */}
      <div className="flex-1 min-h-0 p-4 md:p-6 pt-4">
        <Card className="bg-card border-border h-full flex flex-col overflow-hidden">
          <CardHeader className="py-3 flex-shrink-0 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alert History
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">Alerts will appear here when detected</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-3 p-4">
                  {notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
