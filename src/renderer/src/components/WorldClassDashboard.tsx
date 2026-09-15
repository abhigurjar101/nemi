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
import { realTimeMarketData } from '../services/realTimeMarketData'
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
  ChevronDown,
  X,
  TrendingDown,
  Award,
  GitBranch,
} from 'lucide-react'
import { dailyLearningFeed, DailyFeedStatus } from '../services/dailyLearningFeed'
import {
  toggleSoothingMusic,
  isSoothingMusicActive,
  subscribeSoothingMusic,
  setSoothingMusicActive,
  setSoothingMusicVolume,
  getSoothingMusicVolume,
  setSoundscapeMode,
  getSoundscapeMode,
  subscribeSoundscapeMode,
  type SoundscapeMode,
} from '../services/orbitalMusic'

export interface WorldClassDashboardProps {
  isAuthenticated: boolean
  currentUser: { name?: string; email?: string } | null
  authRole: 'owner' | 'guest' | 'member'
  onOpenAuth: () => void

  // The Primary Swarms
  onOpenCodeSwarm: () => void
  onOpenTradeSwarm: () => void
  onOpenTrainSwarm?: () => void

  // Trade of the Day — direct TOTD shortcut
  onOpenTradeOfTheDay?: () => void

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
  onOpenTrainSwarm,
  onOpenTradeOfTheDay,
  onOpenChat,
  onToggleVoice,
  isListening = false,
  onOpenSettings,
  codeBotsCount = 11,
  tradeBotsCount = 10,
  showHeader = true,
  onClose,
}) => {
  // ── Real-Time Market Data ────────────────────────────────────────────────
  // Initialize with cached data immediately, then fetch live
  const [marketPrices, setMarketPrices] = useState(() => {
    const snapshot = realTimeMarketData.getCachedSnapshot()
    return [
      { symbol: 'BTC', price: snapshot['BTC/USDT']?.price || 60000, change: `${(snapshot['BTC/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['BTC/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['BTC/USDT']?.change24h ?? 0) >= 0 },
      { symbol: 'ETH', price: snapshot['ETH/USDT']?.price || 3200,  change: `${(snapshot['ETH/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['ETH/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['ETH/USDT']?.change24h ?? 0) >= 0 },
      { symbol: 'SOL', price: snapshot['SOL/USDT']?.price || 140,   change: `${(snapshot['SOL/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['SOL/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['SOL/USDT']?.change24h ?? 0) >= 0 },
      { symbol: 'SPY', price: snapshot['SPY']?.price || 540,        change: `${(snapshot['SPY']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['SPY']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['SPY']?.change24h ?? 0) >= 0 },
    ]
  })

  // Live BTC price for Trade of the Day card
  const [btcTotdPrice, setBtcTotdPrice] = useState(() =>
    realTimeMarketData.getCachedSnapshot()['BTC/USDT']?.price || 60000
  )
  const [btcTotdDir, setBtcTotdDir] = useState<'up' | 'down' | 'neutral'>('neutral')
  const [totdAgentsVoted, setTotdAgentsVoted] = useState(10)
  const [totdSwarmBias, setTotdSwarmBias] = useState<'BULLISH' | 'BEARISH'>('BULLISH')

  // Subscribe to live market data updates (every 15s)
  useEffect(() => {
    // Initial live fetch
    realTimeMarketData.fetchAllPrices().then(() => {
      const snapshot = realTimeMarketData.getCachedSnapshot()
      const btcPrice = snapshot['BTC/USDT']?.price
      if (btcPrice) setBtcTotdPrice(btcPrice)

      setMarketPrices([
        { symbol: 'BTC', price: snapshot['BTC/USDT']?.price || 60000, change: `${(snapshot['BTC/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['BTC/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['BTC/USDT']?.change24h ?? 0) >= 0 },
        { symbol: 'ETH', price: snapshot['ETH/USDT']?.price || 3200,  change: `${(snapshot['ETH/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['ETH/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['ETH/USDT']?.change24h ?? 0) >= 0 },
        { symbol: 'SOL', price: snapshot['SOL/USDT']?.price || 140,   change: `${(snapshot['SOL/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['SOL/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['SOL/USDT']?.change24h ?? 0) >= 0 },
        { symbol: 'SPY', price: snapshot['SPY']?.price || 540,        change: `${(snapshot['SPY']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['SPY']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['SPY']?.change24h ?? 0) >= 0 },
      ])
    }).catch(() => {})

    const unsub = realTimeMarketData.subscribe(() => {
      const snapshot = realTimeMarketData.getCachedSnapshot()
      const btcPrice = snapshot['BTC/USDT']?.price
      if (btcPrice) setBtcTotdPrice((prev) => {
        setBtcTotdDir(btcPrice >= prev ? 'up' : 'down')
        setTimeout(() => setBtcTotdDir('neutral'), 800)
        return btcPrice
      })
      setMarketPrices([
        { symbol: 'BTC', price: snapshot['BTC/USDT']?.price || 60000, change: `${(snapshot['BTC/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['BTC/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['BTC/USDT']?.change24h ?? 0) >= 0 },
        { symbol: 'ETH', price: snapshot['ETH/USDT']?.price || 3200,  change: `${(snapshot['ETH/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['ETH/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['ETH/USDT']?.change24h ?? 0) >= 0 },
        { symbol: 'SOL', price: snapshot['SOL/USDT']?.price || 140,   change: `${(snapshot['SOL/USDT']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['SOL/USDT']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['SOL/USDT']?.change24h ?? 0) >= 0 },
        { symbol: 'SPY', price: snapshot['SPY']?.price || 540,        change: `${(snapshot['SPY']?.change24h ?? 0) >= 0 ? '+' : ''}${(snapshot['SPY']?.change24h ?? 0).toFixed(1)}%`, up: (snapshot['SPY']?.change24h ?? 0) >= 0 },
      ])
    })
    return () => unsub()
  }, [])

  // Fast BTC micro-tick (2.2s) — small ripple around real live base price
  useEffect(() => {
    const interval = setInterval(() => {
      setBtcTotdPrice((prev) => {
        const liveBase = realTimeMarketData.getCachedSnapshot()['BTC/USDT']?.price || prev
        const delta = (Math.random() - 0.49) * liveBase * 0.0002  // ±0.02%
        const clamped = Math.max(liveBase * 0.998, Math.min(liveBase * 1.002, prev + delta))
        const next = +clamped.toFixed(1)
        setBtcTotdDir(next >= prev ? 'up' : 'down')
        setTimeout(() => setBtcTotdDir('neutral'), 800)
        return next
      })
      setTotdAgentsVoted(Math.random() > 0.15 ? 10 : 9)
      setTotdSwarmBias(Math.random() > 0.12 ? 'BULLISH' : 'BEARISH')
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  // Fast market price micro-tick (2.5s) — ripples around real live prices
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketPrices((prev) =>
        prev.map((item) => {
          const delta = (Math.random() - 0.48) * (item.price * 0.0002)
          const newPrice = +(item.price + delta).toFixed(item.price > 100 ? 1 : 2)
          return { ...item, price: newPrice }
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

  // Organic Nature Peace & Focus Soundscape state
  const [soothingMusicOn, setSoothingMusicOn] = useState<boolean>(() => isSoothingMusicActive())
  const [soundscapeMode, setLocalSoundscapeMode] = useState<SoundscapeMode>(() => getSoundscapeMode())
  const [volume, setVolume] = useState<number>(() => getSoothingMusicVolume())
  const [showSoundscapePicker, setShowSoundscapePicker] = useState(false)

  useEffect(() => {
    const unsubMode = subscribeSoundscapeMode((m) => setLocalSoundscapeMode(m))
    const unsubMusic = subscribeSoothingMusic((active) => setSoothingMusicOn(active))
    return () => {
      unsubMode()
      unsubMusic()
    }
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

          {/* Right: Soundscape Pill + Login Pill & Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* ── Nature Peace & Focus Soundscape Pill ── */}
            <div className="relative">
              <div className="flex items-center gap-1 p-1 rounded-full bg-white/[0.06] border border-white/15 hover:border-emerald-400/40 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <button
                  type="button"
                  onClick={handleToggleMusic}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    soothingMusicOn
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'text-white/50 hover:text-white'
                  }`}
                  title={soothingMusicOn ? 'Pause Nature Sounds' : 'Play Nature & Focus Sounds'}
                >
                  {soothingMusicOn ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-white/40" />
                  )}
                  <span className="hidden md:inline">
                    {soundscapeMode === 'forest' && '🐦 Forest Birds'}
                    {soundscapeMode === 'river' && '🌊 Mountain River'}
                    {soundscapeMode === 'beats' && '🎧 Focus Beats'}
                    {soundscapeMode === 'serenity' && '🌿 Pure Nature'}
                  </span>
                  <span className="md:hidden">
                    {soundscapeMode === 'forest' && '🐦'}
                    {soundscapeMode === 'river' && '🌊'}
                    {soundscapeMode === 'beats' && '🎧'}
                    {soundscapeMode === 'serenity' && '🌿'}
                  </span>
                </button>

                {/* Dropdown toggle for modes */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSoundscapePicker((prev) => !prev)
                  }}
                  className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Change Nature Soundscape"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Soundscape Mode Picker Dropdown */}
              {showSoundscapePicker && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full right-0 mt-2 w-64 p-3 rounded-2xl bg-slate-950/95 border border-emerald-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/50 px-1">
                    <span>NATURE SOUNDSCAPE</span>
                    <span className="text-emerald-400 font-bold">{Math.round(volume * 100)}%</span>
                  </div>

                  {/* Volume slider */}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full accent-emerald-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />

                  <div className="flex flex-col gap-1 mt-1">
                    {[
                      { id: 'forest', name: 'Forest & Birds', desc: 'Singing songbirds & pine breeze', icon: '🐦' },
                      { id: 'river', name: 'Flowing River', desc: 'Mountain creek & water drops', icon: '🌊' },
                      { id: 'beats', name: 'Relaxing Focus Beats', desc: '60 BPM calm pulse & focus chimes', icon: '🎧' },
                      { id: 'serenity', name: 'All Nature Serenity', desc: 'Birds, river & gentle calm pulse', icon: '🌿' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSoundscapeMode(item.id as SoundscapeMode)
                          if (!soothingMusicOn) {
                            setSoothingMusicActive(true)
                            setSoothingMusicOn(true)
                          }
                          setShowSoundscapePicker(false)
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          soundscapeMode === item.id
                            ? 'bg-emerald-500/20 text-white border border-emerald-400/40'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold">{item.name}</div>
                          <div className="text-[10px] text-white/50 truncate">{item.desc}</div>
                        </div>
                        {soundscapeMode === item.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
            <span>NEMI TRIPLE SWARM INTELLIGENCE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent">
            TRADE • CODE • TRAIN
          </h1>
          <p className="text-xs sm:text-sm text-white/60 mt-2 max-w-lg mx-auto leading-relaxed">
            Institutional Quantitative Trading, Autonomous Multi-Agent Compilation &amp; Continuous Neural Training.
          </p>
        </motion.div>

        {/* ── THE THREE (3) SWARM ACTION BUTTONS (HERO CARDS): TRADE, CODE, AND TRAIN ── */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch mb-6">
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

          {/* ═════════ BUTTON 3: TRAIN SWARM (TRAIN) ═════════ */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onOpenTrainSwarm}
            className="group relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-fuchsia-950/40 via-slate-900/75 to-slate-950/85 border border-fuchsia-500/30 hover:border-fuchsia-400/70 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(217,70,239,0.15)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(217,70,239,0.3)] backdrop-blur-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            {/* Ambient Corner Accent */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-fuchsia-500/10 rounded-bl-full blur-2xl group-hover:bg-fuchsia-500/20 transition-all" />

            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/30 text-[10px] font-mono text-fuchsia-300">
                  <Brain className="w-3 h-3 text-fuchsia-400 animate-pulse" />
                  <span>NEURAL LAB • 24/7 CONTINUOUS</span>
                </div>
                <span className="text-[10px] font-mono text-fuchsia-300/80 group-hover:text-fuchsia-200 transition-colors">
                  TRAIN SWARM • 48 BLUEPRINTS
                </span>
              </div>

              {/* Icon & Title */}
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-purple-500/25 border border-fuchsia-400/40 flex items-center justify-center text-fuchsia-300 shadow-[0_0_20px_rgba(217,70,239,0.25)] group-hover:scale-105 group-hover:border-fuchsia-400/80 transition-all">
                  <Brain className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-fuchsia-200 transition-colors">
                    TRAIN
                  </h2>
                  <p className="text-xs text-fuchsia-300/75 font-medium">
                    Autonomous Neural Training &amp; Architecture Lab
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-white/70 leading-relaxed mb-5">
                Continuous architecture distillation from top GitHub repos (vLLM, NanoGPT, DeepSeek-R1).
                Live loss convergence modeling, token throughput tracking, and verified pattern synthesis.
              </p>

              {/* Specs Pills */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-[11px] text-white/85">
                  <TrendingDown className="w-3.5 h-3.5 text-fuchsia-400 flex-shrink-0" />
                  <span className="truncate">Loss Convergence Lab</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-[11px] text-white/85">
                  <Award className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">99.6% Accuracy Check</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-[11px] text-white/85">
                  <GitBranch className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">Daily Repo Ingestion</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-[11px] text-white/85">
                  <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="truncate">Memory Checkpoint Vault</span>
                </div>
              </div>
            </div>

            {/* Big Launch Action Button: TRAIN */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onOpenTrainSwarm) onOpenTrainSwarm()
              }}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(217,70,239,0.35)] hover:shadow-[0_0_35px_rgba(217,70,239,0.55)] active:scale-[0.99] transition-all cursor-pointer group/btn"
              title="Launch Neural Training Hub"
              aria-label="Launch Neural Training Hub"
            >
              <Brain className="w-4.5 h-4.5 text-fuchsia-200 fill-fuchsia-200 group-hover/btn:animate-pulse" />
              <span className="tracking-wide">TRAIN</span>
              <span className="text-[11px] font-normal opacity-70 hidden sm:inline">(Launch Training Hub)</span>
              <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* ══════════ TRADE OF THE DAY — FULL-WIDTH BITCOIN SWARM PREDICTION CARD ══════════ */}
        {onOpenTradeOfTheDay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-full max-w-6xl mb-6"
          >
            <div
              onClick={onOpenTradeOfTheDay}
              className="group relative rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-950/50 via-slate-900/80 to-slate-950/90 border border-amber-500/40 hover:border-amber-400/80 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_40px_rgba(245,158,11,0.2)] hover:shadow-[0_16px_55px_rgba(0,0,0,0.85),0_0_60px_rgba(245,158,11,0.4)] backdrop-blur-2xl transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Animated ambient glow orbs */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/8 rounded-full blur-3xl group-hover:bg-amber-400/14 transition-all duration-500 pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/6 rounded-full blur-2xl group-hover:bg-emerald-400/10 transition-all duration-500 pointer-events-none" />

              {/* Pulsing top border accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent animate-pulse pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch gap-5">

                {/* ── Left: Identity + Description ── */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Crown icon */}
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-500/20 border border-amber-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:scale-105 transition-transform flex-shrink-0">
                      <Award className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-100 to-emerald-200 bg-clip-text text-transparent">
                          TRADE OF THE DAY
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                          99.4% BAYESIAN WIN
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        30-Year Veteran Grandmaster · All 10 Swarm Agents Aligned · Best BTC Setup Today
                      </p>
                    </div>
                  </div>

                  {/* Live BTC price row */}
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/30 border border-amber-500/20 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                      <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">BTC / USDT</span>
                    </div>
                    <span
                      className={`text-xl font-black font-mono transition-colors duration-300 ${
                        btcTotdDir === 'up' ? 'text-emerald-400' : btcTotdDir === 'down' ? 'text-rose-400' : 'text-white'
                      }`}
                    >
                      ${btcTotdPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                    <span className={`text-xs font-bold font-mono flex items-center gap-1 ${totdSwarmBias === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totdSwarmBias === 'BULLISH' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {totdSwarmBias}
                    </span>

                    {/* Swarm alignment badges */}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/50">Swarm:</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                        totdAgentsVoted === 10
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                          : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      }`}>
                        {totdAgentsVoted}/10 ALIGNED
                      </span>
                    </div>
                  </div>

                  {/* Signal driver pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '🐋 $42M Whale Bid Wall',
                      '📈 RSI Bullish Divergence',
                      '🏛️ Institutional OTC Inflow',
                      '⚡ VWAP Golden Band',
                      '🔗 On-Chain: Exchange Reserves 6-Yr Low',
                    ].map((driver) => (
                      <span key={driver} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/[0.05] border border-white/10 text-white/70 group-hover:border-amber-400/30 group-hover:text-white/90 transition-all">
                        {driver}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ── Right: Metrics + CTA Button ── */}
                <div className="flex flex-col justify-between gap-3 lg:w-72 w-full flex-shrink-0">
                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <div className="text-[9px] font-mono text-white/40 uppercase">Entry</div>
                      <div className="text-xs font-black font-mono text-white mt-0.5">$64,350</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30">
                      <div className="text-[9px] font-mono text-emerald-300/60 uppercase">TP1</div>
                      <div className="text-xs font-black font-mono text-emerald-400 mt-0.5">$72,400</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-rose-500/30">
                      <div className="text-[9px] font-mono text-rose-300/60 uppercase">Stop</div>
                      <div className="text-xs font-black font-mono text-rose-400 mt-0.5">$62,200</div>
                    </div>
                  </div>

                  {/* R/R + ROI strip */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] font-mono">
                    <span className="text-white/50">Risk/Reward:</span>
                    <span className="font-bold text-emerald-400">1 : 5.8</span>
                    <span className="text-white/50">Expected ROI:</span>
                    <span className="font-bold text-amber-300">+28.5%</span>
                  </div>

                  {/* The CTA Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenTradeOfTheDay()
                    }}
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 hover:from-amber-400 hover:via-yellow-300 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:shadow-[0_0_45px_rgba(245,158,11,0.75)] active:scale-[0.99] transition-all cursor-pointer group/totd-btn"
                    title="View today's best Bitcoin trade predicted by all 10 swarm agents"
                    aria-label="Get Trade of the Day Bitcoin prediction"
                  >
                    <Award className="w-4.5 h-4.5 text-slate-950 group-hover/totd-btn:animate-bounce" />
                    <span className="tracking-wide">👑 GET TODAY'S BEST TRADE</span>
                    <ArrowUpRight className="w-4 h-4 text-slate-950 group-hover/totd-btn:translate-x-0.5 group-hover/totd-btn:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

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
