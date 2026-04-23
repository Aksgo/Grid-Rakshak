"use client"

import { usePMUStore, calculateHealthMetrics, getHealthStatus } from "@/lib/pmu-store"
import { HealthGauge } from "@/components/health-gauge"
import { MetricCard } from "@/components/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Zap, Radio, GitBranch } from "lucide-react"

export function HealthScreen() {
  const { pmuData } = usePMUStore()
  const metrics = calculateHealthMetrics(pmuData)
  const status = getHealthStatus(metrics.overall)
  
  const metadata = pmuData?.metadata
  
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Health</h1>
          <p className="text-sm text-muted-foreground">
            Real-time grid stability monitoring
          </p>
        </div>
        <Badge
          variant={status === "stable" ? "default" : status === "warning" ? "secondary" : "destructive"}
          className={
            status === "stable" 
              ? "bg-success text-success-foreground" 
              : status === "warning" 
                ? "bg-warning text-warning-foreground" 
                : "bg-destructive text-destructive-foreground"
          }
        >
          {status.toUpperCase()}
        </Badge>
      </div>
      
      {/* Main Gauge */}
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <HealthGauge value={metrics.overall} size={240} />
        </CardContent>
      </Card>
      
      {/* System Info */}
      {metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-primary font-mono">
                {metadata.n_buses}
              </div>
              <div className="text-xs text-muted-foreground">Total Buses</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-chart-2 font-mono">
                {metadata.simulation_time.toFixed(1)}s
              </div>
              <div className="text-xs text-muted-foreground">Sim. Time</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive font-mono">
                Bus {metadata.fault_bus}
              </div>
              <div className="text-xs text-muted-foreground">Fault Location</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-chart-3 font-mono">
                {metadata.sampling_rate.toFixed(0)} Hz
              </div>
              <div className="text-xs text-muted-foreground">Sample Rate</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Sub-metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-foreground">Stability Metrics</h2>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            title="Voltage Stability"
            value={metrics.voltageStability * 100}
            icon={<Zap className="h-4 w-4" />}
            trend={metrics.voltageStability > 0.7 ? "up" : "down"}
          />
          <MetricCard
            title="Frequency Stability"
            value={metrics.frequencyStability * 100}
            icon={<Activity className="h-4 w-4" />}
            trend={metrics.frequencyStability > 0.7 ? "up" : "down"}
          />
          <MetricCard
            title="Oscillation Risk"
            value={(1 - metrics.oscillationRisk) * 100}
            icon={<Radio className="h-4 w-4" />}
            trend={metrics.oscillationRisk < 0.3 ? "up" : "down"}
          />
          <MetricCard
            title="Correlation Strength"
            value={metrics.correlationStrength * 100}
            icon={<GitBranch className="h-4 w-4" />}
            trend="stable"
          />
        </div>
      </div>
      
      {/* Algorithm Info */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Health Score Algorithm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-1 font-mono">
            <p>H = 0.35V + 0.35F + 0.15(1-O) + 0.15C</p>
            <p className="text-muted-foreground/70">
              V: Voltage deviation from 1.0 p.u. | F: Frequency std. dev. | O: FFT oscillation peaks | C: Correlation strength
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
