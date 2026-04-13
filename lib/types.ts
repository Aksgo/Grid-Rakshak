// PMU Data Types for Power Grid Monitoring

export interface PMUMetadata {
  n_buses: number
  n_samples: number
  sampling_rate: number
  fault_bus: number
  simulation_time: number
}

export interface NetworkEdge {
  from_bus: number
  to_bus: number
}

export interface PMUNetwork {
  edges: NetworkEdge[]
}

export interface PMUMeasurements {
  voltage_magnitude: number[][]
  frequency: number[][]
  phase_angle?: number[][]
}

export interface PMUData {
  metadata: PMUMetadata
  time: number[]
  measurements: PMUMeasurements
  network?: PMUNetwork
}

export interface HealthMetrics {
  overall: number
  voltageStability: number
  frequencyStability: number
  oscillationRisk: number
  correlationStrength: number
}

export interface Notification {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  busId?: number
  value?: number
}

export type HealthStatus = 'stable' | 'warning' | 'critical'

export interface BusData {
  id: number
  voltage: number
  frequency: number
  correlation: number
  isFaultBus: boolean
}

// Analysis Results
export interface FFTResult {
  frequencies: number[]
  magnitudes: number[]
  peaks: number[]
}

export interface CorrelationResult {
  busId: number
  correlation: number
}
