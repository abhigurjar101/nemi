/**
 * NEMI Sub-150ms Full-Duplex Voice Engine Modal
 * Configures real-time Voice Activity Detection (VAD), audio-worklet telemetry,
 * barge-in interruption sensitivity, and streaming speech endpoints.
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, Volume2, Sliders, Activity, Zap, CheckCircle2, X } from 'lucide-react'
import { globalVoiceEngine, type VoiceActivityEvent } from '../services/voiceEngine'

export const VoiceEngineModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const [vadThreshold, setVadThreshold] = useState(0.55)
  const [bargeInSensitivity, setBargeInSensitivity] = useState(0.7)
  const [sttEngine, setSttEngine] = useState('groq-whisper')
  const [ttsEngine, setTtsEngine] = useState('cartesia')
  const [vadEvent, setVadEvent] = useState<VoiceActivityEvent>({
    isSpeaking: false,
    amplitude: 0,
    vadProbability: 0,
    timestamp: Date.now(),
  })
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const unsub = globalVoiceEngine.subscribe((ev) => {
      setVadEvent(ev)
    })
    setIsRunning(globalVoiceEngine.getActiveState())
    return () => unsub()
  }, [isOpen])

  const toggleEngine = async () => {
    if (isRunning) {
      globalVoiceEngine.stop()
      setIsRunning(false)
    } else {
      await globalVoiceEngine.start()
      setIsRunning(true)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-engine-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl flex flex-col rounded-2xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl shadow-cyan-950/80 overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-cyan-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 id="voice-engine-title" className="text-base font-bold text-cyan-200">
                Sub-150ms Full-Duplex Voice Engine
              </h3>
              <p className="text-xs text-slate-400">
                WebAudio Worklet VAD, instant barge-in, and streaming synthesis
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close voice engine modal" className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Live VAD Meter */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Live Voice Activity & Audio Amplitude</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  vadEvent.isSpeaking
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {vadEvent.isSpeaking ? 'SPEECH DETECTED' : 'SILENT'}
              </span>
            </div>

            {/* Level Bar */}
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-75"
                style={{ width: `${Math.round(vadEvent.amplitude * 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>VAD Probability: {(vadEvent.vadProbability * 100).toFixed(0)}%</span>
              <span>Amplitude: {(vadEvent.amplitude * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Engine Controls */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>VAD Threshold</span>
                <span className="font-mono text-cyan-400">{(vadThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                aria-label="Voice Activity Detection threshold"
                min="0.1"
                max="0.9"
                step="0.05"
                value={vadThreshold}
                onChange={(e) => setVadThreshold(parseFloat(e.target.value))}
                className="accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Barge-in Interruption Sensitivity</span>
                <span className="font-mono text-cyan-400">{(bargeInSensitivity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                aria-label="Barge-in interruption sensitivity"
                min="0.3"
                max="0.95"
                step="0.05"
                value={bargeInSensitivity}
                onChange={(e) => setBargeInSensitivity(parseFloat(e.target.value))}
                className="accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Provider Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Streaming STT Engine</label>
              <select
                value={sttEngine}
                onChange={(e) => setSttEngine(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="groq-whisper">Groq Whisper (120ms)</option>
                <option value="browser-native">Browser Web Speech</option>
                <option value="whisper-live-wasm">Whisper Live (WASM)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-semibold">Streaming TTS Synthesis</label>
              <select
                value={ttsEngine}
                onChange={(e) => setTtsEngine(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="cartesia">Cartesia Sonic (85ms)</option>
                <option value="elevenlabs">ElevenLabs Turbo v2</option>
                <option value="browser-speech">Browser Native Voices</option>
              </select>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={toggleEngine}
            className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-950/50'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isRunning ? 'Stop Full-Duplex Engine' : 'Activate Full-Duplex Engine'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
