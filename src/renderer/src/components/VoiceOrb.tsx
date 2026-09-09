import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, Loader2, X } from 'lucide-react'

interface VoiceOrbProps {
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  transcript: string          // Live interim transcript
  onToggle: () => void
  onStop: () => void
  nimActive?: boolean
  hidden?: boolean
}

// ── Audio level visualizer bars ──
function AudioBars({ isListening, nimActive }: { isListening: boolean; nimActive: boolean }) {
  const bars = 12
  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full bg-gradient-to-t ${nimActive ? 'from-green-400 to-lime-200' : 'from-cyan-400 to-cyan-200'}`}
          animate={
            isListening
              ? {
                  height: ['4px', `${8 + Math.random() * 16}px`, '4px'],
                  opacity: [0.4, 1, 0.4],
                }
              : { height: '3px', opacity: 0.2 }
          }
          transition={{
            duration: 0.4 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.06,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ── Thinking dots ──
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-purple-400"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

// ── Orbital rings around the orb when active ──
function OrbRings({ isListening, nimActive }: { isListening: boolean; nimActive: boolean }) {
  if (!isListening) return null
  return (
    <>
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className={`absolute inset-0 rounded-full border ${nimActive ? 'border-green-400' : 'border-cyan-400'}`}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1 + ring * 0.35, opacity: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: ring * 0.45,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  )
}

export default function VoiceOrb({
  isListening,
  isThinking,
  isSpeaking,
  transcript,
  onToggle,
  onStop,
  nimActive = false,
  hidden = false,
}: VoiceOrbProps) {
  if (hidden) return null
  const hasContent = isListening || isThinking || isSpeaking || !!transcript

  // Orb color states
  const orbGradient = nimActive
    ? isListening
      ? 'from-lime-400 via-emerald-400 to-green-300'
      : isThinking
      ? 'from-emerald-600 via-green-500 to-lime-400'
      : isSpeaking
      ? 'from-green-400 via-emerald-400 to-teal-300'
      : 'from-emerald-700 via-green-600 to-lime-500'
    : isListening
    ? 'from-cyan-500 via-cyan-400 to-teal-300'
    : isThinking
    ? 'from-purple-600 via-violet-500 to-purple-400'
    : isSpeaking
    ? 'from-pink-500 via-pink-400 to-rose-300'
    : 'from-slate-700 via-slate-600 to-slate-500'

  const orbGlow = nimActive
    ? 'shadow-[0_0_30px_rgba(34,197,94,0.75),0_0_70px_rgba(16,185,129,0.35)]'
    : isListening
    ? 'shadow-[0_0_30px_rgba(0,212,255,0.7),0_0_60px_rgba(0,212,255,0.3)]'
    : isThinking
    ? 'shadow-[0_0_30px_rgba(139,92,246,0.7),0_0_60px_rgba(139,92,246,0.3)]'
    : isSpeaking
    ? 'shadow-[0_0_30px_rgba(236,72,153,0.7),0_0_60px_rgba(236,72,153,0.3)]'
    : 'shadow-[0_0_10px_rgba(0,0,0,0.3)]'

  return (
    <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-50">

      {/* ── LIVE TRANSCRIPT BAR — floats above orb, doesn't cover content ── */}
      <AnimatePresence>
        {(isListening || isThinking || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass-panel px-4 py-3 max-w-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              {isListening && (
                <>
                  <span className={`text-xs font-semibold ${nimActive ? 'text-lime-300' : 'text-cyan-400'} tracking-widest uppercase`}>Listening</span>
                  <AudioBars isListening={isListening} nimActive={nimActive} />
                </>
              )}
              {isThinking && (
                <>
                  <span className={`text-xs font-semibold ${nimActive ? 'text-emerald-300' : 'text-purple-400'} tracking-widest uppercase`}>Thinking</span>
                  <ThinkingDots />
                </>
              )}
              {isSpeaking && (
                <>
                  <span className={`text-xs font-semibold ${nimActive ? 'text-green-300' : 'text-pink-400'} tracking-widest uppercase`}>Speaking</span>
                  <Volume2 className={`w-4 h-4 ${nimActive ? 'text-green-300' : 'text-pink-400'} animate-pulse`} />
                </>
              )}

              {/* Dismiss button */}
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop audio or voice listening"
                className="ml-auto text-white/40 hover:text-white/80 transition-colors p-1 rounded-md focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.65} />
              </button>
            </div>

            {/* Live transcript */}
            {transcript && (
              <p className="text-sm text-white/90 font-light leading-relaxed">
                {transcript}
                <span className={`inline-block w-0.5 h-4 ml-0.5 ${nimActive ? 'bg-green-400' : 'bg-cyan-400'} animate-pulse align-text-bottom`} />
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VOICE ORB BUTTON ── */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={
          isListening
            ? { scale: [1, 1.05, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Ripple rings */}
        <OrbRings isListening={isListening} nimActive={nimActive} />

        {/* Main orb */}
        <motion.button
          type="button"
          onClick={onToggle}
          aria-label={
            isThinking
              ? 'NEMI is thinking'
              : isListening
              ? 'Stop voice listening'
              : isSpeaking
              ? 'Stop audio response'
              : 'Start voice conversation'
          }
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          className={`
            relative w-16 h-16 rounded-full
            bg-gradient-to-br ${orbGradient}
            ${orbGlow}
            flex items-center justify-center
            cursor-pointer select-none
            transition-all duration-300
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
          `}
        >
          {/* Icon */}
          <AnimatePresence mode="wait">
            {isThinking ? (
              <motion.div
                key="thinking"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
              >
                <Loader2 className="w-6 h-6 text-white animate-spin" strokeWidth={1.65} />
              </motion.div>
            ) : isListening ? (
              <motion.div
                key="listening"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic className="w-6 h-6 text-white" strokeWidth={1.65} />
              </motion.div>
            ) : isSpeaking ? (
              <motion.div
                key="speaking"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Volume2 className="w-6 h-6 text-white" strokeWidth={1.65} />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic className="w-6 h-6 text-white/80" strokeWidth={1.65} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Keyboard hint */}
      <AnimatePresence>
        {!hasContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[10px] text-white/25 text-center tabular-nums"
          >
            ⌘⇧Space
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
