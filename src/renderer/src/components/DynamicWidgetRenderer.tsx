/**
 * NEMI Generative Dynamic UI Widget Renderer
 * Parses structured AI JSON/XML blocks into interactive React widgets
 * (sliders, parameter tuning cards, interactive charts, metric grids, visual diffs).
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Sliders, BarChart3, CheckSquare, Sparkles, RefreshCw, Play } from 'lucide-react'

export interface DynamicWidgetProps {
  type: 'slider-tuner' | 'metrics-grid' | 'interactive-poll' | 'algorithm-diff'
  title: string
  description?: string
  data: Record<string, any>
  onAction?: (action: string, payload: any) => void
}

export const DynamicWidgetRenderer: React.FC<DynamicWidgetProps> = ({
  type,
  title,
  description,
  data,
  onAction,
}) => {
  // ── Slider Tuner Widget ──────────
  if (type === 'slider-tuner') {
    const [params, setParams] = useState<Record<string, number>>(data.params || { temperature: 0.7, topP: 0.95, maxTokens: 2048 })

    return (
      <div className="my-3 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-cyan-200">{title}</h4>
        </div>
        {description && <p className="text-xs text-slate-400 mb-3">{description}</p>}

        <div className="space-y-3">
          {Object.entries(params).map(([key, val]) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-mono text-cyan-400">{val}</span>
              </div>
              <input
                type="range"
                min={key === 'maxTokens' ? 256 : 0}
                max={key === 'maxTokens' ? 8192 : 1}
                step={key === 'maxTokens' ? 256 : 0.05}
                value={val}
                onChange={(e) => {
                  const updated = { ...params, [key]: parseFloat(e.target.value) }
                  setParams(updated)
                  if (onAction) onAction('param_change', updated)
                }}
                className="accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Metrics Grid Widget ──────────
  if (type === 'metrics-grid') {
    const metrics: Array<{ label: string; value: string | number; change?: string; positive?: boolean }> =
      data.metrics || [
        { label: 'Latency', value: '42ms', change: '-35%', positive: true },
        { label: 'Throughput', value: '142 tps', change: '+2.8x', positive: true },
        { label: 'Cache Hit Rate', value: '94.2%', change: '+12%', positive: true },
      ]

    return (
      <div className="my-3 p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-semibold text-purple-200">{title}</h4>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {metrics.map((m, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-purple-500/20 text-center">
              <div className="text-[11px] text-slate-400">{m.label}</div>
              <div className="text-base font-bold font-mono text-purple-200 my-0.5">{m.value}</div>
              {m.change && (
                <div className={`text-[10px] font-medium ${m.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {m.change}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Default fallback widget
  return (
    <div className="my-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-md">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>{title}</span>
      </div>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
    </div>
  )
}
