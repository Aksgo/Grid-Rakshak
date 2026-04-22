"use client"

/**
 * components/screens/fault-prediction-screen.tsx
 *
 * Fault prediction and localization using data-adaptive feature analysis.
 */

import { useMemo, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts"
import { usePMUStore } from "@/lib/pmu-store"
import { predictFault, DEFAULT_PREDICTOR_CONFIG } from "@/lib/fault-predictor"
import type { PredictorConfig } from "@/lib/fault-predictor"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  BrainCircuit, ShieldAlert, ShieldCheck, Clock, Target,
  TrendingDown, Activity, GitBranch, Waves, ChevronDown,
  ChevronUp, Info, CheckCircle, XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Chart colours (can't use CSS vars in Recharts) ──────────────────────────
const C = {
  prob:       "oklch(0.65 0.22 25)",
  prediction: "oklch(0.72 0.22 150)",
  grid:       "oklch(0.25 0.01 250)",
  features:   [
    "oklch(0.65 0.18 220)",
    "oklch(0.70 0.18 165)",
    "oklch(0.75 0.18 85)",
    "oklch(0.60 0.22 25)",
    "oklch(0.68 0.20 300)",
    "oklch(0.72 0.18 50)",
  ],
  barTop:  "oklch(0.60 0.22 25)",
  barRest: "oklch(0.70 0.15 165)",
}

// ─── Methodology panel ────────────────────────────────────────────────────────

function MethodologyPanel() {
  const [open, setOpen] = useState(false)
  const features = [
    { icon: <TrendingDown className="h-4 w-4 text-blue-400" />,  name: "Mean Voltage Depression",    desc: "Buses under electrical stress show chronically low average voltage. Scored relative to network baseline for scale-invariance." },
    { icon: <Waves className="h-4 w-4 text-green-400" />,        name: "Minimum Voltage",             desc: "Fault locations experience the deepest voltage dips. Deepest nadir in observation window is a strong fault indicator." },
    { icon: <Activity className="h-4 w-4 text-amber-400" />,     name: "Frequency Deviation",         desc: "Rotor swings near fault cause local frequency to deviate from nominal. Deviation magnitude correlates with fault proximity." },
    { icon: <Activity className="h-4 w-4 text-purple-400" />,    name: "Frequency Oscillation",       desc: "High frequency variance indicates electromagnetic stress. Fault buses exhibit sustained oscillations, not just transients." },
    { icon: <ShieldAlert className="h-4 w-4 text-rose-400" />,   name: "Persistent Undervoltage",    desc: "Chronic operation below 0.95 p.u. signals sustained stress, not momentary disturbance. Sustained stress = fault location." },
    { icon: <GitBranch className="h-4 w-4 text-orange-400" />,   name: "Voltage Transient Severity", desc: "Large voltage swings (peak-to-trough) during fault evolution. Swing amplitude increases with electrical proximity to fault." },
  ]
  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-3 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Fault Detection Methodology
          </CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pb-5">
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            <span className="font-semibold text-foreground">Adaptive Z-Score Ranking:</span>{" "}
            Each feature is normalized relative to the cross-bus population distribution in the current observation window.
            A bus with z = +3 is 3σ above the network average — a statistical outlier — regardless of absolute signal magnitude.
            This makes the method scale-invariant and adaptive to varying operating conditions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {features.map(f => (
              <div key={f.name} className="flex gap-2 text-xs">
                <div className="mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <div className="font-semibold text-foreground mb-0.5">{f.name}</div>
                  <div className="text-muted-foreground leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="font-mono text-xs bg-muted/50 rounded p-3 text-muted-foreground space-y-1">
            <div className="text-foreground font-semibold">Composite Score</div>
            <div>z(bus) = mean( z₁_meanV + z₂_minV + z₃_freqDev + z₄_freqStd + z₅_fracLow + z₆_vRange )</div>
            <div>p(bus) = sigmoid(z, scale=1.5) — z=+3 → p≈0.99</div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Tuning panel ─────────────────────────────────────────────────────────────

function TuningPanel({ config, onChange }: { config: PredictorConfig; onChange: (p: Partial<PredictorConfig>) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-3 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Algorithm Parameters</CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pb-5 space-y-5">
          {[
            { label: "Window Size", key: "windowSize" as const, min: 5, max: 40, step: 1, unit: "samples" },
            { label: "Vote Window", key: "voteWindowSize" as const, min: 3, max: 10, step: 1, unit: "windows" },
            { label: "Vote Threshold", key: "voteThreshold" as const, min: 1, max: 8, step: 1, unit: "votes" },
            { label: "Sigmoid Scale", key: "sigmoidScale" as const, min: 0.5, max: 4, step: 0.1, unit: "" },
            { label: "Undervoltage pu", key: "undervoltageThreshold" as const, min: 0.80, max: 0.99, step: 0.01, unit: "p.u." },
          ].map(({ label, key, min, max, step, unit }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-mono text-foreground">{config[key]} {unit}</span>
              </div>
              <Slider min={min} max={max} step={step}
                value={[config[key] as number]}
                onValueChange={([v]) => onChange({ [key]: v })} />
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full"
            onClick={() => onChange({ ...DEFAULT_PREDICTOR_CONFIG })}>
            Reset to Defaults
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function FaultPredictionScreen() {
  const { pmuData } = usePMUStore()
  const [config, setConfig] = useState<PredictorConfig>(DEFAULT_PREDICTOR_CONFIG)

  const prediction = useMemo(
    () => pmuData ? predictFault(pmuData, config) : null,
    [pmuData, config]
  )

  const handleConfig = (partial: Partial<PredictorConfig>) =>
    setConfig(prev => ({ ...prev, ...partial }))

  if (!pmuData || !prediction) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <BrainCircuit className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">No Data Loaded</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Upload a PMU JSON file or load sample data to run fault prediction.</p>
      </div>
    )
  }

  // ── Probability chart data ────────────────────────────────────────────────
  // Format time axis nicely — handle negative timestamps (common in PMU data)
  const chartData = prediction.probabilityCurve.map(p => ({
    time: +p.timeSec.toFixed(3),
    probability: +(p.faultProbability * 100).toFixed(1),
  }))

  const predTimeSec = prediction.predictionSampleIndex >= 0
    ? +prediction.predictionTimeSec.toFixed(3)
    : null

  // ── Feature breakdown chart ───────────────────────────────────────────────
  const fb = prediction.featureBreakdown
  const featureData = [
    { name: "Mean V Dep",  value: +(fb.meanVoltageDep   * 100 / 5).toFixed(1), color: C.features[0] },
    { name: "Min V",       value: +(fb.minVoltage        * 100 / 5).toFixed(1), color: C.features[1] },
    { name: "Freq Dev",    value: +(fb.freqDeviation     * 100 / 5).toFixed(1), color: C.features[2] },
    { name: "Freq Std",    value: +(fb.freqStd           * 100 / 5).toFixed(1), color: C.features[3] },
    { name: "Frac <0.95",  value: +(fb.fracUndervoltage  * 100 / 5).toFixed(1), color: C.features[4] },
    { name: "V Range",     value: +(fb.voltageRange      * 100 / 5).toFixed(1), color: C.features[5] },
  ]

  // ── Bus ranking chart (top 10) ────────────────────────────────────────────
  const rankingData = prediction.busRanking.slice(0, 10).map((r, i) => ({
    name: `Bus ${r.busId}`,
    risk: +(r.peakRisk * 100).toFixed(1),
    isTop: i === 0,
    isGt: r.busId === prediction.groundTruthFaultBus,
  }))

  const statusColor =
    prediction.predictionCorrect === true  ? "text-green-400" :
    prediction.predictionCorrect === false ? "text-destructive" :
    prediction.faultPredicted             ? "text-amber-400" : "text-green-400"

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            Fault Prediction
          </h1>
          <p className="text-sm text-muted-foreground">
            Adaptive feature analysis · {pmuData.metadata.n_buses} buses · {pmuData.metadata.n_samples} samples
            {pmuData.metadata.fault_bus > 0 && (
              <span className="text-destructive"> · Ground truth: Bus {pmuData.metadata.fault_bus}</span>
            )}
          </p>
        </div>
        {prediction.predictionCorrect !== null && (
          <Badge variant="outline" className={cn(
            "text-sm px-3 py-1",
            prediction.predictionCorrect
              ? "bg-green-500/20 text-green-400 border-green-500/40"
              : "bg-destructive/20 text-destructive border-destructive/40"
          )}>
            {prediction.predictionCorrect
              ? <><CheckCircle className="h-4 w-4 mr-1.5 inline" />Prediction Correct</>
              : <><XCircle className="h-4 w-4 mr-1.5 inline" />Prediction Incorrect</>}
          </Badge>
        )}
      </div>

      {/* ── Verdict cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={cn("border", prediction.faultPredicted
          ? "bg-destructive/10 border-destructive/40"
          : "bg-green-500/10 border-green-500/30")}>
          <CardContent className="pt-4 pb-3">
            <div className="mb-1">
              {prediction.faultPredicted
                ? <ShieldAlert className="h-4 w-4 text-destructive" />
                : <ShieldCheck className="h-4 w-4 text-green-400" />}
            </div>
            <div className={cn("text-2xl font-bold font-mono",
              prediction.faultPredicted ? "text-destructive" : "text-green-400")}>
              {prediction.faultPredicted ? `Bus ${prediction.predictedFaultBus}` : "None"}
            </div>
            <div className="text-xs text-muted-foreground">Predicted Fault Bus</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold font-mono text-primary">
              {prediction.faultPredicted
                ? `${(prediction.globalProbability * 100).toFixed(0)}%`
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Global Probability</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <Clock className="h-3 w-3 text-muted-foreground mb-1" />
            <div className="text-2xl font-bold font-mono text-chart-2">
              {prediction.predictionTimeSec >= 0
                ? `${prediction.predictionTimeSec.toFixed(3)}s`
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Prediction Committed</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <Target className="h-3 w-3 text-muted-foreground mb-1" />
            <div className="text-2xl font-bold font-mono text-amber-400">
              {prediction.samplesBeforeActualFault > 0
                ? `${prediction.samplesBeforeActualFault} samp.`
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Advance Warning</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Probability curve ── */}
      <Card className="bg-card border-border">
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Fault Probability Over Time (Sliding Window)</CardTitle>
          <CardDescription className="text-xs">
            System-level fault risk derived from rolling z-score analysis.
            {predTimeSec !== null
              ? ` Green line = prediction committed at t = ${predTimeSec}s.`
              : " No prediction threshold crossing detected yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              Not enough data for sliding window analysis
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="prob-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.prob} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.prob} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.01 250)" }}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  label={{ value: "Time (s)", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "oklch(0.45 0.01 250)" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "oklch(0.55 0.01 250)" }}
                  label={{ value: "Risk %", angle: -90, position: "insideLeft", fontSize: 10, fill: "oklch(0.45 0.01 250)" }}
                />
                <Tooltip
                  contentStyle={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(0.22 0.01 250)", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Fault Risk"]}
                  labelFormatter={(v: number) => `t = ${v}s`}
                />
                {predTimeSec !== null && (
                  <ReferenceLine
                    x={predTimeSec}
                    stroke={C.prediction}
                    strokeWidth={2}
                    label={{ value: "Predicted", position: "insideTopLeft", fontSize: 9, fill: C.prediction }}
                  />
                )}
                <Area type="monotone" dataKey="probability"
                  stroke={C.prob} strokeWidth={2}
                  fill="url(#prob-grad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Feature breakdown + Bus ranking ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Feature breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Feature Breakdown
              {prediction.faultPredicted && (
                <span className="text-muted-foreground font-normal ml-1 text-xs">
                  — Bus {prediction.predictedFaultBus} (global)
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Z-score contribution of each feature (0–100% of max = 5σ)
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={featureData} layout="vertical"
                margin={{ top: 0, right: 20, left: 15, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "oklch(0.55 0.01 250)" }} />
                <YAxis type="category" dataKey="name" width={70}
                  tick={{ fontSize: 9, fill: "oklch(0.55 0.01 250)" }} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(0.22 0.01 250)", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Z-Score"]}
                />
                <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                  {featureData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bus ranking */}
        <Card className="bg-card border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Top At-Risk Buses</CardTitle>
            <CardDescription className="text-xs">
              Global-mode composite probability (entire dataset)
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={rankingData} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "oklch(0.55 0.01 250)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "oklch(0.55 0.01 250)" }} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.14 0.01 250)", border: "1px solid oklch(0.22 0.01 250)", borderRadius: 6, fontSize: 11 }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Global Probability"]}
                />
                <Bar dataKey="risk" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {rankingData.map((e, i) => (
                    <Cell key={i} fill={e.isTop ? C.barTop : C.barRest} opacity={e.isTop ? 1 : 0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {prediction.groundTruthFaultBus > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Ground truth: <span className="text-destructive font-mono">Bus {prediction.groundTruthFaultBus}</span>
                {" · "}
                Predicted: <span className="text-primary font-mono">
                  {prediction.predictedFaultBus > 0 ? `Bus ${prediction.predictedFaultBus}` : "—"}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Parameter tuning ── */}
      <TuningPanel config={config} onChange={handleConfig} />

      {/* ── Methodology ── */}
      <MethodologyPanel />
    </div>
  )
}
