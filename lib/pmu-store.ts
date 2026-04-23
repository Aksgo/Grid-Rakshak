"use client"

import { create } from "zustand"
import type { PMUData, Notification, HealthMetrics, FFTResult, CorrelationResult } from "./types"

interface PMUStore {
  // Data
  pmuData: PMUData | null
  isLoading: boolean
  error: string | null
  
  // Notifications
  notifications: Notification[]
  unreadCount: number
  
  // Selected state
  selectedBus: number
  selectedTimeIndex: number
  
  // Actions
  setPMUData: (data: PMUData | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedBus: (bus: number) => void
  setSelectedTimeIndex: (index: number) => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  clearNotifications: () => void
  markAllRead: () => void
}

export const usePMUStore = create<PMUStore>((set, get) => ({
  pmuData: null,
  isLoading: false,
  error: null,
  notifications: [],
  unreadCount: 0,
  selectedBus: 1,
  selectedTimeIndex: 0,
  
  setPMUData: (data) => {
    set({ pmuData: data, error: null })
    // Generate notifications based on data analysis
    if (data) {
      const notifications = analyzeForAlerts(data)
      set({ notifications, unreadCount: notifications.length })
    }
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSelectedBus: (bus) => set({ selectedBus: bus }),
  setSelectedTimeIndex: (index) => set({ selectedTimeIndex: index }),
  
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },
  
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  markAllRead: () => set({ unreadCount: 0 }),
}))

// Analysis Functions
function analyzeForAlerts(data: PMUData): Notification[] {
  const alerts: Notification[] = []
  const { measurements, metadata } = data
  
  // Check voltage instability (>10% deviation from nominal 1.0 p.u.)
  const voltages = measurements.voltage_magnitude
  for (let busIdx = 0; busIdx < voltages[0]?.length ?? 0; busIdx++) {
    for (let t = 0; t < voltages.length; t++) {
      const voltage = voltages[t][busIdx]
      const deviation = Math.abs(voltage - 1.0)
      if (deviation > 0.1) {
        alerts.push({
          id: crypto.randomUUID(),
          type: deviation > 0.2 ? 'critical' : 'warning',
          title: `Voltage Instability at Bus ${busIdx + 1}`,
          message: `Voltage deviation of ${(deviation * 100).toFixed(1)}% detected`,
          timestamp: new Date(),
          busId: busIdx + 1,
          value: voltage,
        })
        break // Only one alert per bus
      }
    }
  }
  
  // Fault bus alert
  if (metadata.fault_bus > 0) {
    alerts.unshift({
      id: crypto.randomUUID(),
      type: 'critical',
      title: 'Fault Detected',
      message: `Fault detected at Bus ${metadata.fault_bus}`,
      timestamp: new Date(),
      busId: metadata.fault_bus,
    })
  }
  
  return alerts.slice(0, 10) // Limit to 10 most important alerts
}

// Health Score Calculation
export function calculateHealthMetrics(data: PMUData | null): HealthMetrics {
  if (!data) {
    return {
      overall: 0,
      voltageStability: 0,
      frequencyStability: 0,
      oscillationRisk: 1,
      correlationStrength: 0,
    }
  }
  
  const { measurements, metadata } = data
  const voltages = measurements.voltage_magnitude
  const frequencies = measurements.frequency
  
  // 1. Voltage Stability Score (deviation from 1.0 p.u.)
  let totalVoltageDeviation = 0
  let voltageCount = 0
  for (const row of voltages) {
    for (const v of row) {
      totalVoltageDeviation += Math.abs(v - 1.0)
      voltageCount++
    }
  }
  const avgVoltageDeviation = voltageCount > 0 ? totalVoltageDeviation / voltageCount : 0
  const voltageStability = Math.max(0, 1 - avgVoltageDeviation * 5) // Scale: 20% deviation = 0 score
  
  // 2. Frequency Stability Score (standard deviation)
  let freqSum = 0
  let freqSqSum = 0
  let freqCount = 0
  for (const row of frequencies) {
    for (const f of row) {
      freqSum += f
      freqSqSum += f * f
      freqCount++
    }
  }
  const freqMean = freqCount > 0 ? freqSum / freqCount : 60
  const freqStd = freqCount > 0 ? Math.sqrt(freqSqSum / freqCount - freqMean * freqMean) : 0
  const frequencyStability = Math.max(0, 1 - freqStd * 10) // Scale: 0.1 Hz std = 0 score
  
  // 3. Oscillation Risk (simplified FFT-based detection)
  // Check for high-frequency components in voltage
  const oscillationRisk = detectOscillationRisk(voltages, metadata.sampling_rate)
  
  // 4. Correlation Strength (how correlated is the fault propagation)
  const correlationStrength = calculateCorrelationStrength(voltages, metadata.fault_bus - 1)
  
  // Overall health score
  const overall = (
    voltageStability * 0.35 +
    frequencyStability * 0.35 +
    (1 - oscillationRisk) * 0.15 +
    correlationStrength * 0.15
  )
  
  return {
    overall: Math.max(0, Math.min(1, overall)),
    voltageStability: Math.max(0, Math.min(1, voltageStability)),
    frequencyStability: Math.max(0, Math.min(1, frequencyStability)),
    oscillationRisk: Math.max(0, Math.min(1, oscillationRisk)),
    correlationStrength: Math.max(0, Math.min(1, correlationStrength)),
  }
}

function detectOscillationRisk(voltages: number[][], samplingRate: number): number {
  if (voltages.length < 4) return 0
  
  // Simple variance-based oscillation detection
  const busCount = voltages[0]?.length ?? 0
  let maxVariance = 0
  
  for (let bus = 0; bus < busCount; bus++) {
    const signal = voltages.map(row => row[bus])
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length
    const variance = signal.reduce((a, b) => a + (b - mean) ** 2, 0) / signal.length
    maxVariance = Math.max(maxVariance, variance)
  }
  
  // Normalize: variance > 0.01 is high risk
  return Math.min(1, maxVariance * 100)
}

function calculateCorrelationStrength(voltages: number[][], faultBusIdx: number): number {
  if (voltages.length < 2 || faultBusIdx < 0) return 0.5
  
  const busCount = voltages[0]?.length ?? 0
  if (faultBusIdx >= busCount) return 0.5
  
  const faultSignal = voltages.map(row => row[faultBusIdx])
  let totalCorr = 0
  let count = 0
  
  for (let bus = 0; bus < busCount; bus++) {
    if (bus === faultBusIdx) continue
    const signal = voltages.map(row => row[bus])
    const corr = pearsonCorrelation(faultSignal, signal)
    if (!isNaN(corr)) {
      totalCorr += Math.abs(corr)
      count++
    }
  }
  
  return count > 0 ? totalCorr / count : 0.5
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  for (let i = 0; i < n; i++) {
    sumX += x[i]
    sumY += y[i]
    sumXY += x[i] * y[i]
    sumX2 += x[i] * x[i]
    sumY2 += y[i] * y[i]
  }
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  return denominator === 0 ? 0 : numerator / denominator
}

// FFT Analysis
export function computeFFT(data: PMUData | null, busIndex: number): FFTResult {
  if (!data || busIndex < 0) {
    return { frequencies: [], magnitudes: [], peaks: [] }
  }
  
  const voltages = data.measurements.voltage_magnitude
  const busCount = voltages[0]?.length ?? 0
  if (busIndex >= busCount) {
    return { frequencies: [], magnitudes: [], peaks: [] }
  }
  
  const signal = voltages.map(row => row[busIndex])
  const n = signal.length
  const samplingRate = data.metadata.sampling_rate
  
  // Remove DC component
  const mean = signal.reduce((a, b) => a + b, 0) / n
  const centered = signal.map(v => v - mean)
  
  // Simple DFT (for small datasets)
  const magnitudes: number[] = []
  const frequencies: number[] = []
  const halfN = Math.floor(n / 2)
  
  for (let k = 0; k < halfN; k++) {
    let real = 0, imag = 0
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n
      real += centered[t] * Math.cos(angle)
      imag -= centered[t] * Math.sin(angle)
    }
    magnitudes.push((2 / n) * Math.sqrt(real * real + imag * imag))
    frequencies.push((k * samplingRate) / n)
  }
  
  // Find peaks
  const peaks: number[] = []
  const threshold = Math.max(...magnitudes) * 0.1
  for (let i = 1; i < magnitudes.length - 1; i++) {
    if (magnitudes[i] > magnitudes[i - 1] && 
        magnitudes[i] > magnitudes[i + 1] && 
        magnitudes[i] > threshold) {
      peaks.push(i)
    }
  }
  
  return { frequencies, magnitudes, peaks }
}

// Correlation Analysis
export function computeCorrelations(data: PMUData | null): CorrelationResult[] {
  if (!data) return []
  
  const voltages = data.measurements.voltage_magnitude
  const faultBusIdx = data.metadata.fault_bus - 1
  const busCount = voltages[0]?.length ?? 0
  
  if (faultBusIdx < 0 || faultBusIdx >= busCount) return []
  
  const faultSignal = voltages.map(row => row[faultBusIdx])
  const results: CorrelationResult[] = []
  
  for (let bus = 0; bus < busCount; bus++) {
    const signal = voltages.map(row => row[bus])
    const corr = pearsonCorrelation(faultSignal, signal)
    results.push({
      busId: bus + 1,
      correlation: isNaN(corr) ? 0 : corr,
    })
  }
  
  return results
}

export function getHealthStatus(score: number): 'stable' | 'warning' | 'critical' {
  if (score >= 0.75) return 'stable'
  if (score >= 0.5) return 'warning'
  return 'critical'
}
