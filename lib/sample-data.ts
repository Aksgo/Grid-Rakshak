import type { PMUData } from "./types"

// Generate sample PMU data for demonstration
export function generateSamplePMUData(): PMUData {
  const n_buses = 68
  const n_samples = 200
  const sampling_rate = 50
  const fault_bus = 22
  const simulation_time = n_samples / sampling_rate
  
  // Generate time array
  const time: number[] = []
  for (let i = 0; i < n_samples; i++) {
    time.push(i / sampling_rate)
  }
  
  // Generate voltage magnitude data
  const voltage_magnitude: number[][] = []
  const frequency: number[][] = []
  
  const faultTime = n_samples * 0.3 // Fault occurs at 30% of simulation
  const recoveryTime = n_samples * 0.7 // Recovery at 70%
  
  for (let t = 0; t < n_samples; t++) {
    const voltageRow: number[] = []
    const freqRow: number[] = []
    
    for (let bus = 0; bus < n_buses; bus++) {
      // Distance from fault bus (circular distance)
      const distance = Math.min(
        Math.abs(bus - (fault_bus - 1)),
        n_buses - Math.abs(bus - (fault_bus - 1))
      )
      
      // Fault impact decreases with distance
      const impactFactor = Math.exp(-distance / 10)
      
      let voltage = 1.0
      let freq = 60.0
      
      if (t >= faultTime && t < recoveryTime) {
        // Fault period
        const faultProgress = (t - faultTime) / (recoveryTime - faultTime)
        const faultMagnitude = 0.3 * impactFactor * Math.exp(-faultProgress * 2)
        voltage = 1.0 - faultMagnitude + (Math.random() - 0.5) * 0.02
        
        // Frequency oscillations during fault
        const oscillation = 0.5 * impactFactor * Math.sin(2 * Math.PI * 0.5 * t / sampling_rate)
        freq = 60.0 - oscillation + (Math.random() - 0.5) * 0.1
      } else if (t >= recoveryTime) {
        // Recovery period
        const recoveryProgress = (t - recoveryTime) / (n_samples - recoveryTime)
        const residual = 0.05 * impactFactor * (1 - recoveryProgress)
        voltage = 1.0 - residual + (Math.random() - 0.5) * 0.01
        freq = 60.0 + (Math.random() - 0.5) * 0.05
      } else {
        // Normal operation
        voltage = 1.0 + (Math.random() - 0.5) * 0.01
        freq = 60.0 + (Math.random() - 0.5) * 0.02
      }
      
      voltageRow.push(Math.max(0.5, Math.min(1.2, voltage)))
      freqRow.push(Math.max(59, Math.min(61, freq)))
    }
    
    voltage_magnitude.push(voltageRow)
    frequency.push(freqRow)
  }
  
  // Generate network edges (simplified ring + some cross connections)
  const edges: { from_bus: number; to_bus: number }[] = []
  
  // Ring topology
  for (let i = 1; i <= n_buses; i++) {
    edges.push({ from_bus: i, to_bus: i === n_buses ? 1 : i + 1 })
  }
  
  // Some cross connections
  for (let i = 1; i <= n_buses; i += 10) {
    const target = ((i + 15 - 1) % n_buses) + 1
    edges.push({ from_bus: i, to_bus: target })
  }
  
  return {
    metadata: {
      n_buses,
      n_samples,
      sampling_rate,
      fault_bus,
      simulation_time,
    },
    time,
    measurements: {
      voltage_magnitude,
      frequency,
    },
    network: {
      edges,
    },
  }
}
