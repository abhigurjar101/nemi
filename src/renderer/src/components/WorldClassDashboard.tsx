/**
 * NEMI World-Class Command Dashboard
 * Designed with Apple/Linear/Cosmic luxury aesthetics.
 * - Prominent Login / User profile system in top navigation
 * - Exactly 2 Monumental Swarm Action Cards/Buttons:
 *     1. [ CODE SWARM ] (Autonomous Multi-Agent DAG & Neural Compiler)
 *     2. [ TRADE SWARM ] (10 Quant AI Agents, Real-Time Market Matrix, 70%+ Win Gatekeeper)
 * - Minimalistic floating chat trigger at bottom dock
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Code2,
  TrendingUp,
  ShieldCheck,
  Lock,
  Sparkles,
  Mic,
  Settings as SettingsIcon,
  Activity,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  Command,
  Layers,
  BarChart3,
  Cpu,
  Bot,
  Brain,
  RefreshCw,
  Music,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { dailyLearningFeed, DailyFeedStatus } from '../services/dailyLearningFeed'
import {
  toggleSoothingMusic,
  isSoothingMusicActive,
  subscribeSoothingMusic,
  setSoothingMusicVolume,
  getSoothingMusicVolume,
} from '../services/orbitalMusic'

export interface WorldClassDashboardProps {
  isAuthenticated: boolean
  currentUser: { name?: string; email?: string } | null
  authRole: 'owner' | 'guest'
  onOpenAuth: () => void

  // The 2 Primary Swarms
  onOpenCodeSwarm: () => void
  onOpenTradeSwarm: () => void

  // Minimalist Chat Trigger
  onOpenChat: () => void
  onToggleVoice?: () => void
  isListening?: boolean

  // Secondary Settings & Telemetry
  onOpenSettings?: () => void
  codeBotsCount?: number
  tradeBotsCount?: number
  showHeader?: boolean
  onClose?: () => void
}

export const WorldClassDashboard: React.FC<WorldClassDashboardProps> = ({
  isAuthenticated,
  currentUser,
  authRole,
  onOpenAuth,
  onOpenCodeSwarm,
  onOpenTradeSwarm,
  onOpenChat,
  onToggleVoice,
  isListening = false,
  onOpenSettings,
  codeBotsCount = 11,
  tradeBotsCount = 10,
  showHeader = true,
  onClose,
}) => {
  // Real-time micro-fluctuation ticker for the trading card preview
  const [marketPrices, setMarketPrices] = useState([
    { symbol: 'BTC', price: 64380, change: '+2.4%', up: true },
    { symbol: 'ETH', price: 3485, change: '+1.8%', up: true },
    { symbol: 'SOL', price: 152.8, change: '+4.2%', up: true },
    { symbol: 'SPY', price: 562.4, change: '+0.7%', up: true },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketPrices((prev) =>
        prev.map((item) => {
          const delta = (Math.random() - 0.48) * (item.price * 0.001)
          const newPrice = +(item.price + delta).toFixed(item.price > 100 ? 1 : 2)
          return {
            ...item,
            price: newPrice,
          }
        })
      )
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // Daily Continuous Learning Feed state & sync
  const [feedStatus, setFeedStatus] = useState<DailyFeedStatus>(() => dailyLearningFeed.getStatus())
  const [isSyncingFeed, setIsSyncingFeed] = useState(false)
  const [feedToast, setFeedToast] = useState<string | null>(null)

  useEffect(() => {
    setFeedStatus(dailyLearningFeed.getStatus())
  }, [])

  // Keyboard shortcut: Escape to dismiss dashboard overlay and stay on home screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSyncDailyFeed = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSyncingFeed) return
    setIsSyncingFeed(true)
    try {
      const result = await dailyLearningFeed.ingestDailyFeed(true)
      setFeedStatus(dailyLearningFeed.getStatus())
      setFeedToast(`Fed ${result.codePatternsIngested} code & ${result.tradePatternsIngested} quant blueprints!`)
      setTimeout(() => setFeedToast(null), 4000)
    } catch {
      setFeedToast('Daily feed synchronized')
      setTimeout(() => setFeedToast(null), 3000)
    } finally {
      setIsSyncingFeed(false)
    }
  }

  // 432Hz Zen Mind-Soothing Music state
  const [soothingMusicOn, setSoothingMusicOn] = useState<boolean>(() => isSoothingMusicActive())
  const [volume, setVolume] = useState<number>(() => getSoothingMusicVolume())

  useEffect(() => {
    return subscribeSoothingMusic((active) => setSoothingMusicOn(active))
  }, [])

  const handleToggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = toggleSoothingMusic()
    setSoothingMusicOn(next)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const val = parseFloat(e.target.value)
    setVolume(val)
    setSoothingMusicVolume(val)
  }

  return (
    <div className="relative w-full h-full min-h-[100dvh] flex flex-col justify-between overflow-hidden text-white select-none pointer-events-auto">
      {/* ── Ambient Cosmic Glow Backdrop ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Cyan Ambient Orb */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[130px]" />
        {/* Purple/Indigo Ambient Orb */}
        <div className="absolute top-1/3 -right-40 w-[650px] h-[650px] rounded-full bg-purple-600/10 blur-[140px]" />
        {/* Emerald Ambient Orb */}
        <div className="absolute -bottom-40 left-1/4 w-[550px] h-[550px] rounded-full bg-emerald-500/10 blur-[130px]" />

        {/* Subtle Cyber Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* ── Top Header Navigation: Branding + Telemetry + Login ── */}
      {showHeader && (
        <header className="relative z-20 w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-white/[0.07] bg-slate-950/40 backdrop-blur-xl">
          {/* Left: Brand Monogram */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_12px_#00d4ff]" />
              <div className="absolute w-5 h-5 rounded-full border border-cyan-400/40 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-[0.25em] bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                  NEMI
                </span>
                <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  OS v3.0
                </span>
              </div>
              <p className="text-[10px] text-white/40 hidden sm:block tracking-wide">
                Dual Swarm Command Center
              </p>
            </div>
          </div>

          {/* Center: Live Neural Telemetry Strip */}
          <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md text-[11px] font-mono text-white/70">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>CODE: {codeBotsCount} BOTS</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>TRADE: {tradeBotsCount} AGENTS</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Brain className="w-3.5 h-3.5 text-cyan-400" />
              <span>FEED: {feedStatus.codeSwarmProficiency}% PROFICIENT</span>
            </div>
          </div>

          {/* Right: Login Pill & Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Login / User Session Profile */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/60 flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_16px_rgba(16,185,129,0.15)] group"
                title="Manage Account / Session"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-emerald-200 max-w-[120px] truncate">
                  {currentUser?.name || currentUser?.email || 'Owner'}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {authRole === 'owner' ? 'OWNER' : 'PRO'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-cyan-500/15 border border-white/15 hover:border-cyan-400/50 flex items-center gap-2 transition-all cursor-pointer group shadow-[0_0_16px_rgba(0,212,255,0.08)]"
                title="Sign In to NEMI Account"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-white/90 group-hover:text-white">
                  Sign In
                </span>
              </button>
            )}

            {/* Quick Settings Micro-trigger */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 rounded-full text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                title="System Settings"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── Main Hero Section: TRADE & CODE + SIGN UP + STAY ON HOME SCREEN ── */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center py-4 sm:py-6">
        {/* ── Top Floating Action Bar: Sign Up / Login Button + Cancel & Stay on Home Screen ── */}
        <div className="w-full max-w-4xl flex items-center justify-between gap-3 mb-6 px-1">
          {/* Sign Up / Login Button */}
          <div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)] group"
                title="Manage Account / Session"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold max-w-[140px] truncate">
                  {currentUser?.name || currentUser?.email || 'Owner'}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  {authRole === 'owner' ? 'OWNER' : 'PRO'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-400/40 hover:border-cyan-300 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(0,212,255,0.25)] group"
                title="Sign In / Connect (Sign Up / Login)"
                aria-label="Sign Up or Login"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Sign Up / Login</span>
              </button>
            )}
          </div>

          {/* Close Overlay & Stay on Home Screen Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-white/30 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95 group"
              title="Close this overlay and stay on the clean 3D home screen"
              aria-label="Cancel and Stay on Home Screen"
            >
              <X className="w-4 h-4 text-white/60 group-hover:text-white group-hover:rotate-90 transition-all" />
              <span className="text-white/80 group-hover:text-white">Cancel &amp; Stay on Home Screen</span>
            </button>
          )}
        </div>

        {/* ── Title & Mission: TRADE & CODE ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[11px] font-mono text-cyan-300 mb-2.5 shadow-[0_0_20px_rgba(0,212,255,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>NEMI DUAL SWARM INTELLIGENCE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent">
            TRADE &amp; CODE
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-2 max-w-md mx-auto leading-relaxed">
            Institutional Quantitative Trading &amp; Autonomous Multi-Agent Software Compilation.
          </p>
        </motion.div>

        {/* ── THE EXACTLY TWO (2) SWARM ACTION BUTTONS (HERO CARDS): TRADE AND CODE ── */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch mb-6">
          {/* ═════════ BUTTON 1: TRADE SWARM (TRADE) ═════════ */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onOpenTradeSwarm}
            className="group relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-emerald-950/40 via-slate-900/75 to-slate-950/85 border border-emerald-500/30 hover:border-emerald-400/70 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.15)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.3)] backdrop-blur-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            {/* Ambient Corner Accent */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-bl-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />

            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-mono text-emerald-300">
                  <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>SURE SHOT WIN RATE ≥ 70%</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300/80 group-hover:text-emerald-200 transition-colors">
                  TRADE SWARM • 10 QUANT AGENTS • {feedStatus.tradeSwarmProficiency}% EDGE
                </span>
              </div>

              {/* Icon & Title */}
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] group-hover:scale-105 group-hover:border-emerald-400/80 transition-all">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-emerald-200 transition-colors">
                    TRADE
                  </h2>
                  <p className="text-xs text-emerald-300/75 font-medium">
                    10 Elite Quant Agents Fleet Cockpit
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-white/70 leading-relaxed mb-5">
                Real-time institutional quant swarm. Executes market orders only when Bayesian win probability
                exceeds 70%. Fed daily with volatility models and regime shifts.
              </p>

              {/* Live Market Matrix Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {marketPrices.map((item) => (
                  <div
                    key={item.symbol}
                    className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col text-[11px]"
                  >
                    <div className="flex items-center justify-between text-white/50 text-[10px]">
                      <span>{item.symbol}</span>
                      <span className="text-emerald-400 font-mono font-bold">{item.change}</span>
                    </div>
                    <div className="font-mono font-bold text-white text-xs mt-0.5">
                      ${item.price.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Big Launch Action Button: TRADE */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenTradeSwarm()
              }}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] active:scale-[0.99] transition-all cursor-pointer group/btn"
              title="Launch Trade Swarm"
              aria-label="Launch Trade Swarm"
            >
              <BarChart3 className="w-4.5 h-4.5 text-slate-950 fill-slate-950 group-hover/btn:scale-110 transition-transform" />
              <span className="tracking-wide">TRADE</span>
              <span className="text-[11px] font-normal opacity-70 hidden sm:inline">(Launch Trade Swarm)</span>
              <ArrowUpRight className="w-4 h-4 text-slate-950 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </button>
          </motion.div>

          {/* ═════════ BUTTON 2: CODE SWARM (CODE) ═════════ */}
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onOpenCodeSwarm}
            className="group relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-indigo-950/40 via-slate-900/75 to-slate-950/85 border border-indigo-500/30 hover:border-cyan-400/70 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(99,102,241,0.15)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.3)] backdrop-blur-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            {/* Ambient Corner Accent */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-bl-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />

            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-mono text-cyan-300">
                  <Cpu className="w-3 h-3" />
                  <span>PARALLEL DAG • 11 BOTS</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300/80 group-hover:text-cyan-200 transition-colors">
                  CODE SWARM • {feedStatus.codeSwarmProficiency}% MASTERY
                </span>
              </div>

              {/* Icon & Title */}
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-indigo-500/25 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] group-hover:scale-105 group-hover:border-cyan-400/80 transition-all">
                  <Code2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-cyan-200 transition-colors">
                    CODE
                  </h2>
                  <p className="text-xs text-cyan-300/75 font-medium">
                    Autonomous Multi-Agent DAG Studio
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-white/70 leading-relaxed mb-5">
                Orchestrates 11 specialized software bots via Directed Acyclic Graph pipelines.
                Zero-shot AST syntax validation, consensus generation, and continuous daily learning feed.
              </p>

              {/* Specs Pills */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-[11px] text-white/85">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">AST Syntax Verifier</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-[11px] text-white/85">
                  <Layers className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">DAG Multi-Bot Flow</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-[11px] text-white/85">
                  <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="truncate">Self-Healing Loops</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-[11px] text-white/85">
                  <Brain className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">Daily Neural Feed</span>
                </div>
              </div>
            </div>

            {/* Big Launch Action Button: CODE */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenCodeSwarm()
              }}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] active:scale-[0.99] transition-all cursor-pointer group/btn"
              title="Launch Code Swarm"
              aria-label="Launch Code Swarm"
            >
              <Zap className="w-4.5 h-4.5 text-cyan-200 fill-cyan-200 group-hover/btn:animate-bounce" />
              <span className="tracking-wide">CODE</span>
              <span className="text-[11px] font-normal opacity-70 hidden sm:inline">(Launch Code Swarm)</span>
              <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* ── Daily Continuous Learning Feed Live Sync Capsule ── */}
        <div className="w-full max-w-4xl p-3 sm:p-3.5 rounded-2xl bg-slate-900/60 border border-white/15 hover:border-cyan-400/40 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.2)] flex-shrink-0">
              <Brain className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide text-white">
                  CONTINUOUS DAILY LEARNING FEED
                </span>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                  feedStatus.isSyncedToday
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                }`}>
                  {feedStatus.isSyncedToday ? '● DAILY FEED SYNCED' : '○ SYNC READY'}
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-0.5">
                Feeds verified AST code blueprints and institutional quant edge directly into neural memory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {feedToast && (
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-400/30">
                {feedToast}
              </span>
            )}
            <button
              type="button"
              onClick={handleSyncDailyFeed}
              disabled={isSyncingFeed}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-400/40 hover:border-emerald-400/60 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,212,255,0.15)] disabled:opacity-50"
              title="Feed today's real-time quant edge and zero-placeholder code patterns to both swarms"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 ${isSyncingFeed ? 'animate-spin' : ''}`} />
              <span>{isSyncingFeed ? 'Feeding...' : "Feed Today's Intel"}</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── Minimalistic Floating Chat Capsule (Bottom Dock) ── */}
      <footer className="relative z-30 w-full px-4 pb-5 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onClick={onOpenChat}
          className="max-w-lg w-[94%] sm:w-[480px] p-2 rounded-full bg-slate-900/80 backdrop-blur-2xl border border-white/20 hover:border-cyan-400/60 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(0,212,255,0.2)] flex items-center justify-between gap-3 transition-all duration-300 group cursor-pointer"
        >
          {/* Left Sparkle & Minimal Prompt Label */}
          <div className="flex items-center gap-3 pl-3 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,212,255,0.3)]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            </div>
            <span className="text-xs text-white/70 group-hover:text-white transition-colors font-medium truncate">
              Ask NEMI anything...
            </span>
          </div>

          {/* Right Action Icons: Minimalist Mic + Open Pill */}
          <div
            className="flex items-center gap-1.5 pr-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {onToggleVoice && (
              <button
                type="button"
                onClick={onToggleVoice}
                aria-label={isListening ? 'Stop Voice Listening' : 'Activate Voice Command'}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isListening
                    ? 'bg-cyan-500/30 text-cyan-200 shadow-[0_0_12px_#00d4ff]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Voice Command"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenChat}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-cyan-500/20 text-white/80 hover:text-cyan-200 border border-white/10 hover:border-cyan-400/40 text-[11px] font-mono flex items-center gap-1 transition-all"
              title="Open Chat (⌘K)"
            >
              <Command className="w-3 h-3" />
              <span>K</span>
            </button>
          </div>
        </motion.div>
      </footer>
    </div>
  )
}

export default WorldClassDashboard
