"use client"

import { useState, useCallback } from "react"
import { usePMUStore } from "@/lib/pmu-store"
import { generateSamplePMUData } from "@/lib/sample-data"
import type { PMUData } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, FileJson, CheckCircle, AlertCircle, Play, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function UploadScreen() {
  const { pmuData, setPMUData, setLoading, isLoading, error, setError } = usePMUStore()
  const [dragActive, setDragActive] = useState(false)
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null)
  const [preview, setPreview] = useState<Partial<PMUData> | null>(null)
  
  const validatePMUData = (data: unknown): data is PMUData => {
    if (typeof data !== "object" || data === null) return false
    const d = data as Record<string, unknown>
    
    if (!d.metadata || typeof d.metadata !== "object") return false
    if (!d.time || !Array.isArray(d.time)) return false
    if (!d.measurements || typeof d.measurements !== "object") return false
    
    const m = d.measurements as Record<string, unknown>
    if (!m.voltage_magnitude || !Array.isArray(m.voltage_magnitude)) return false
    if (!m.frequency || !Array.isArray(m.frequency)) return false
    
    return true
  }
  
  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setFileInfo({ name: file.name, size: file.size })
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!validatePMUData(data)) {
        throw new Error("Invalid PMU data structure. Required: metadata, time, measurements (voltage_magnitude, frequency)")
      }
      
      setPreview(data)
      setPMUData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON file")
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setPMUData])
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        processFile(file)
      } else {
        setError("Please upload a JSON file")
      }
    }
  }
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }
  
  const loadSampleData = () => {
    setLoading(true)
    setError(null)
    setFileInfo({ name: "sample_pmu_data.json", size: 0 })
    
    // Simulate loading delay for UX
    setTimeout(() => {
      const sampleData = generateSamplePMUData()
      setPreview(sampleData)
      setPMUData(sampleData)
      setLoading(false)
    }, 500)
  }
  
  const clearData = () => {
    setPMUData(null)
    setFileInfo(null)
    setPreview(null)
    setError(null)
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "Generated"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Data Upload</h1>
        <p className="text-sm text-muted-foreground">
          Import PMU data from JSON file or load sample data
        </p>
      </div>
      
      {/* Upload Zone */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-all",
              dragActive ? "border-primary bg-primary/5" : "border-border",
              isLoading && "opacity-50 pointer-events-none"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Drop your JSON file here
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse files
            </p>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" asChild>
                <span>Select File</span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>
      
      {/* Sample Data Button */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Try with Sample Data</h3>
              <p className="text-sm text-muted-foreground">
                Load a simulated IEEE 68-bus fault scenario
              </p>
            </div>
            <Button onClick={loadSampleData} disabled={isLoading}>
              <Play className="h-4 w-4 mr-2" />
              Load Sample
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Error Display */}
      {error && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <h4 className="font-semibold text-destructive">Error Loading Data</h4>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* File Info & Preview */}
      {fileInfo && !error && (
        <Card className="bg-card border-border">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Loaded File
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearData}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <div className="font-mono text-sm text-foreground">{fileInfo.name}</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(fileInfo.size)}</div>
                </div>
              </div>
              <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                Valid
              </Badge>
            </div>
            
            {preview && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Buses</div>
                  <div className="font-mono font-bold text-foreground">
                    {preview.metadata?.n_buses ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Samples</div>
                  <div className="font-mono font-bold text-foreground">
                    {preview.metadata?.n_samples ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Sample Rate</div>
                  <div className="font-mono font-bold text-foreground">
                    {preview.metadata?.sampling_rate?.toFixed(0) ?? "N/A"} Hz
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Fault Bus</div>
                  <div className="font-mono font-bold text-destructive">
                    Bus {preview.metadata?.fault_bus ?? "N/A"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Expected Format */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Expected JSON Structure</CardTitle>
          <CardDescription className="text-xs">
            Your data file should follow this format
          </CardDescription>
        </CardHeader>
        <CardContent className="py-3">
          <ScrollArea className="h-[200px]">
            <pre className="text-xs font-mono text-muted-foreground bg-muted p-4 rounded-lg overflow-x-auto">
{`{
  "metadata": {
    "n_buses": 68,
    "n_samples": 200,
    "sampling_rate": 50,
    "fault_bus": 22,
    "simulation_time": 4.0
  },
  "time": [0.0, 0.02, 0.04, ...],
  "measurements": {
    "voltage_magnitude": [
      [1.0, 1.0, 0.98, ...],  // time step 0
      [0.95, 0.97, 0.92, ...], // time step 1
      ...
    ],
    "frequency": [
      [60.0, 60.0, 60.0, ...],
      [59.8, 59.9, 59.7, ...],
      ...
    ]
  },
  "network": {
    "edges": [
      {"from_bus": 1, "to_bus": 2},
      {"from_bus": 2, "to_bus": 3},
      ...
    ]
  }
}`}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
