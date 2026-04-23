"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { usePMUStore, computeCorrelations } from "@/lib/pmu-store"
import { ZoomIn, ZoomOut, RotateCcw, Info } from "lucide-react"

interface NodePosition {
  id: number
  x: number
  y: number
}

interface HoveredBus {
  id: number
  voltage: number
  frequency: number
  correlation: number
  x: number
  y: number
}

export function TopologyScreen() {
  const { pmuData, selectedBus, setSelectedBus, selectedTimeIndex } = usePMUStore()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredBus, setHoveredBus] = useState<HoveredBus | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  const correlations = useMemo(() => computeCorrelations(pmuData), [pmuData])
  
  // Generate node positions in a circular layout
  const nodePositions = useMemo<NodePosition[]>(() => {
    if (!pmuData) return []
    const n = pmuData.metadata.n_buses
    const centerX = 400
    const centerY = 300
    const radius = 250
    
    return Array.from({ length: n }, (_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      return {
        id: i + 1,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })
  }, [pmuData])
  
  // Get edges from network data
  const edges = useMemo(() => {
    if (!pmuData?.network?.edges) {
      // Generate default ring topology if no edges
      const n = pmuData?.metadata.n_buses ?? 0
      return Array.from({ length: n }, (_, i) => ({
        from: i + 1,
        to: ((i + 1) % n) + 1,
      }))
    }
    return pmuData.network.edges.map(e => ({
      from: e.from_bus,
      to: e.to_bus,
    }))
  }, [pmuData])
  
  // Get current measurements for display
  const getCurrentValues = useCallback((busId: number) => {
    if (!pmuData) return { voltage: 1, frequency: 60, correlation: 0 }
    const idx = busId - 1
    const t = Math.min(selectedTimeIndex, pmuData.time.length - 1)
    
    return {
      voltage: pmuData.measurements.voltage_magnitude[t]?.[idx] ?? 1,
      frequency: pmuData.measurements.frequency[t]?.[idx] ?? 60,
      correlation: correlations.find(c => c.busId === busId)?.correlation ?? 0,
    }
  }, [pmuData, selectedTimeIndex, correlations])
  
  // Get node color based on voltage deviation
  const getNodeColor = useCallback((busId: number) => {
    if (!pmuData) return "oklch(0.7 0.18 165)"
    if (busId === pmuData.metadata.fault_bus) return "oklch(0.6 0.22 25)"
    
    const { voltage } = getCurrentValues(busId)
    const deviation = Math.abs(voltage - 1.0)
    
    if (deviation > 0.15) return "oklch(0.6 0.22 25)"
    if (deviation > 0.05) return "oklch(0.75 0.18 85)"
    return "oklch(0.7 0.18 145)"
  }, [pmuData, getCurrentValues])
  
  // Pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  const handleNodeHover = (busId: number, e: React.MouseEvent) => {
    const values = getCurrentValues(busId)
    const node = nodePositions.find(n => n.id === busId)
    if (node && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      setHoveredBus({
        id: busId,
        ...values,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }
  
  const handleNodeClick = (busId: number) => {
    setSelectedBus(busId)
  }
  
  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  
  if (!pmuData) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground">No data loaded. Please upload a PMU data file.</p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Network Topology</h1>
          <p className="text-sm text-muted-foreground">
            IEEE 68-Bus System - Interactive Graph
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={resetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "oklch(0.7 0.18 145)" }} />
          <span className="text-muted-foreground">Stable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "oklch(0.75 0.18 85)" }} />
          <span className="text-muted-foreground">Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "oklch(0.6 0.22 25)" }} />
          <span className="text-muted-foreground">Critical / Fault</span>
        </div>
        <Badge variant="outline" className="ml-auto">
          Selected: Bus {selectedBus}
        </Badge>
      </div>
      
      {/* Topology Graph */}
      <Card className="bg-card border-border flex-1 min-h-0">
        <CardContent className="p-0 h-full relative overflow-hidden">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox="0 0 800 600"
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp()
              setHoveredBus(null)
            }}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.map((edge, i) => {
                const from = nodePositions.find(n => n.id === edge.from)
                const to = nodePositions.find(n => n.id === edge.to)
                if (!from || !to) return null
                
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="oklch(0.3 0.01 250)"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                )
              })}
              
              {/* Nodes */}
              {nodePositions.map((node) => {
                const isFault = node.id === pmuData.metadata.fault_bus
                const isSelected = node.id === selectedBus
                const color = getNodeColor(node.id)
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node.id)}
                    onMouseEnter={(e) => handleNodeHover(node.id, e)}
                    onMouseLeave={() => setHoveredBus(null)}
                  >
                    {/* Glow effect for fault bus */}
                    {isFault && (
                      <circle
                        r={16}
                        fill="none"
                        stroke="oklch(0.6 0.22 25)"
                        strokeWidth={2}
                        opacity={0.5}
                        className="animate-pulse-glow"
                      />
                    )}
                    
                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        r={14}
                        fill="none"
                        stroke="oklch(0.7 0.18 165)"
                        strokeWidth={2}
                      />
                    )}
                    
                    {/* Main node */}
                    <circle
                      r={isFault ? 10 : 8}
                      fill={color}
                      stroke={isSelected ? "white" : "oklch(0.2 0.01 250)"}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    
                    {/* Node label (show for every 5th bus or fault/selected) */}
                    {(node.id % 10 === 0 || isFault || isSelected) && (
                      <text
                        y={-14}
                        textAnchor="middle"
                        fill="oklch(0.65 0 0)"
                        fontSize={10}
                        fontFamily="monospace"
                      >
                        {node.id}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
          
          {/* Hover tooltip */}
          {hoveredBus && (
            <div
              className="absolute pointer-events-none bg-card border border-border rounded-lg p-3 shadow-lg"
              style={{
                left: Math.min(hoveredBus.x + 10, 200),
                top: hoveredBus.y + 10,
                transform: "translate(0, 0)",
              }}
            >
              <div className="text-sm font-bold text-foreground mb-2">
                Bus {hoveredBus.id}
                {hoveredBus.id === pmuData.metadata.fault_bus && (
                  <Badge variant="destructive" className="ml-2 text-xs">FAULT</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Voltage:</span>
                <span className="font-mono text-foreground">{hoveredBus.voltage.toFixed(4)} p.u.</span>
                <span className="text-muted-foreground">Frequency:</span>
                <span className="font-mono text-foreground">{hoveredBus.frequency.toFixed(3)} Hz</span>
                <span className="text-muted-foreground">Correlation:</span>
                <span className="font-mono text-foreground">{hoveredBus.correlation.toFixed(3)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Selected Bus Info */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Selected Bus Details
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Bus ID</div>
              <div className="font-mono font-bold text-foreground">{selectedBus}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Voltage</div>
              <div className="font-mono text-foreground">
                {getCurrentValues(selectedBus).voltage.toFixed(4)} p.u.
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Frequency</div>
              <div className="font-mono text-foreground">
                {getCurrentValues(selectedBus).frequency.toFixed(3)} Hz
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Correlation</div>
              <div className="font-mono text-foreground">
                {getCurrentValues(selectedBus).correlation.toFixed(3)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
