"use client"

import { useMemo, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePMUStore, computeFFT, computeCorrelations } from "@/lib/pmu-store"

// Color constants for charts (can't use CSS variables directly in Recharts)
const CHART_COLORS = {
  primary: "oklch(0.7 0.18 165)",
  secondary: "oklch(0.65 0.18 220)",
  warning: "oklch(0.75 0.18 85)",
  danger: "oklch(0.6 0.22 25)",
  muted: "oklch(0.4 0.01 250)",
  grid: "oklch(0.25 0.01 250)",
}

export function ChartsScreen() {
  const { pmuData, selectedBus, setSelectedBus } = usePMUStore()
  const [activeTab, setActiveTab] = useState("voltage")
  
  // Prepare voltage heatmap data (sampled for performance)
  const voltageData = useMemo(() => {
    if (!pmuData) return []
    const { voltage_magnitude } = pmuData.measurements
    const { time } = pmuData
    
    // Sample every nth point for performance
    const sampleRate = Math.max(1, Math.floor(time.length / 100))
    const data = []
    
    for (let t = 0; t < time.length; t += sampleRate) {
      const row: Record<string, number> = { time: time[t] }
      // Show subset of buses for clarity
      const busStep = Math.max(1, Math.floor(voltage_magnitude[t].length / 20))
      for (let b = 0; b < voltage_magnitude[t].length; b += busStep) {
        row[`bus${b + 1}`] = voltage_magnitude[t][b]
      }
      data.push(row)
    }
    return data
  }, [pmuData])
  
  // Prepare frequency data
  const frequencyData = useMemo(() => {
    if (!pmuData) return []
    const { frequency } = pmuData.measurements
    const { time } = pmuData
    
    const sampleRate = Math.max(1, Math.floor(time.length / 100))
    const data = []
    
    for (let t = 0; t < time.length; t += sampleRate) {
      const freqs = frequency[t]
      const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length
      const variance = freqs.reduce((a, b) => a + (b - mean) ** 2, 0) / freqs.length
      const std = Math.sqrt(variance)
      
      data.push({
        time: time[t],
        mean,
        upper: mean + std,
        lower: mean - std,
        selected: freqs[selectedBus - 1] ?? mean,
      })
    }
    return data
  }, [pmuData, selectedBus])
  
  // FFT data for selected bus
  const fftData = useMemo(() => {
    const result = computeFFT(pmuData, selectedBus - 1)
    return result.frequencies.map((freq, i) => ({
      frequency: freq,
      magnitude: result.magnitudes[i],
      isPeak: result.peaks.includes(i),
    })).filter(d => d.frequency <= 10) // Show up to 10 Hz
  }, [pmuData, selectedBus])
  
  // Correlation data
  const correlationData = useMemo(() => {
    return computeCorrelations(pmuData).map(c => ({
      ...c,
      color: c.correlation > 0.8 ? CHART_COLORS.danger : 
             c.correlation > 0.5 ? CHART_COLORS.warning : 
             CHART_COLORS.primary,
    }))
  }, [pmuData])
  
  const busOptions = useMemo(() => {
    if (!pmuData) return []
    return Array.from({ length: pmuData.metadata.n_buses }, (_, i) => i + 1)
  }, [pmuData])
  
  if (!pmuData) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground">No data loaded. Please upload a PMU data file.</p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header with bus selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Visualization</h1>
          <p className="text-sm text-muted-foreground">
            Interactive charts for PMU analysis
          </p>
        </div>
        <Select value={selectedBus.toString()} onValueChange={(v) => setSelectedBus(parseInt(v))}>
          <SelectTrigger className="w-[140px] bg-card">
            <SelectValue placeholder="Select Bus" />
          </SelectTrigger>
          <SelectContent>
            {busOptions.map((bus) => (
              <SelectItem key={bus} value={bus.toString()}>
                Bus {bus} {bus === pmuData.metadata.fault_bus && "(Fault)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Tabs for different visualizations */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-muted">
          <TabsTrigger value="voltage">Voltage</TabsTrigger>
          <TabsTrigger value="frequency">Frequency</TabsTrigger>
          <TabsTrigger value="fft">FFT</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
        </TabsList>
        
        {/* Voltage Heatmap / Lines */}
        <TabsContent value="voltage">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Voltage Magnitude Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={voltageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                      tickFormatter={(v) => v.toFixed(1)}
                      label={{ value: "Time (s)", position: "insideBottom", offset: -5, fill: CHART_COLORS.muted }}
                    />
                    <YAxis 
                      tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                      domain={[0.7, 1.1]}
                      label={{ value: "Voltage (p.u.)", angle: -90, position: "insideLeft", fill: CHART_COLORS.muted }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.16 0.01 250)",
                        border: "1px solid oklch(0.25 0.01 250)",
                        borderRadius: "8px",
                      }}
                      labelFormatter={(v) => `Time: ${Number(v).toFixed(2)}s`}
                    />
                    {Object.keys(voltageData[0] || {}).filter(k => k.startsWith("bus")).map((key, i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={`oklch(0.7 0.15 ${(i * 20) % 360})`}
                        strokeWidth={1}
                        dot={false}
                        name={`Bus ${key.replace("bus", "")}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Frequency Analysis */}
        <TabsContent value="frequency">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Frequency Analysis - Bus {selectedBus}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={frequencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                      tickFormatter={(v) => v.toFixed(1)}
                    />
                    <YAxis 
                      tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                      domain={[59.5, 60.5]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.16 0.01 250)",
                        border: "1px solid oklch(0.25 0.01 250)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [value.toFixed(3) + " Hz", ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stroke="transparent"
                      fill={CHART_COLORS.secondary}
                      fillOpacity={0.2}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stroke="transparent"
                      fill="oklch(0.12 0.01 250)"
                      fillOpacity={1}
                    />
                    <Line
                      type="monotone"
                      dataKey="mean"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      dot={false}
                      name="Mean Frequency"
                    />
                    <Line
                      type="monotone"
                      dataKey="selected"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      dot={false}
                      name={`Bus ${selectedBus}`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* FFT Analysis */}
        <TabsContent value="fft">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">FFT Spectrum - Bus {selectedBus}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fftData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                    <XAxis 
                      dataKey="frequency" 
                      tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                      tickFormatter={(v) => v.toFixed(1)}
                      label={{ value: "Frequency (Hz)", position: "insideBottom", offset: -5, fill: CHART_COLORS.muted }}
                    />
                    <YAxis 
                      tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                      label={{ value: "Magnitude", angle: -90, position: "insideLeft", fill: CHART_COLORS.muted }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.16 0.01 250)",
                        border: "1px solid oklch(0.25 0.01 250)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [value.toFixed(4), "Magnitude"]}
                      labelFormatter={(v) => `${Number(v).toFixed(2)} Hz`}
                    />
                    <Area
                      type="monotone"
                      dataKey="magnitude"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {fftData.some(d => d.isPeak) && (
                <div className="mt-4 text-sm text-muted-foreground">
                  <span className="text-warning">Oscillation peaks detected at: </span>
                  {fftData.filter(d => d.isPeak).map(d => d.frequency.toFixed(2) + " Hz").join(", ")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Correlation Analysis */}
        <TabsContent value="correlation">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Event Propagation - Correlation with Fault Bus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={correlationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                    <XAxis 
                      dataKey="busId" 
                      tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
                      interval={Math.floor(correlationData.length / 15)}
                    />
                    <YAxis 
                      tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                      domain={[-0.2, 1]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.16 0.01 250)",
                        border: "1px solid oklch(0.25 0.01 250)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [value.toFixed(3), "Correlation"]}
                      labelFormatter={(v) => `Bus ${v}`}
                    />
                    <Bar dataKey="correlation" name="Correlation">
                      {correlationData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.busId === pmuData.metadata.fault_bus ? CHART_COLORS.danger : entry.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.danger }} />
                  <span>Fault Bus / High Correlation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.warning }} />
                  <span>Medium Correlation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.primary }} />
                  <span>Low Correlation</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
