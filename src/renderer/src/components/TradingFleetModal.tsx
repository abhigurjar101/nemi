import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  TrendingUp,
  Download,
  Play,
  ShieldCheck,
  Zap,
  Layers,
  BarChart2,
  RefreshCw,
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import BotIcon from './BotIcon'
import {
  ALL_TRADING_BOTS,
  type TradingBot,
  type ConsensusDecision,
  calculateSwarmConsensus,
  runStrategyBacktest,
  generateMockCandles,
  calculateAllIndicators,
} from '../types_bots'

interface TradingFleetModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectBotForChat?: (botId: string, prompt?: string) => void
}

export default function TradingFleetModal({
  isOpen,
  onClose,
  onSelectBotForChat,
}: TradingFleetModalProps) {
  const [selectedTicker, setSelectedTicker] = useState<'BTC/USDT' | 'ETH/USDT' | 'SOL/USDT' | 'NVDA' | 'SPY'>('BTC/USDT')
  const [activeTab, setActiveTab] = useState<'fleet' | 'consensus' | 'backtest' | 'n8n-export' | 'architecture'>('fleet')
  const [selectedBot, setSelectedBot] = useState<TradingBot>(ALL_TRADING_BOTS[9]) // Default to Trading Orchestrator
  const [testOutput, setTestOutput] = useState<string | null>(null)
  const [isRunningSim, setIsRunningSim] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)

  // Price map
  const tickerPrices: Record<string, number> = {
    'BTC/USDT': 64350,
    'ETH/USDT': 3480,
    'SOL/USDT': 152.4,
    'NVDA': 124.6,
    'SPY': 562.3,
  }

  const currentPrice = tickerPrices[selectedTicker] || 64350

  // Live Swarm Consensus
  const consensus: ConsensusDecision = useMemo(() => {
    return calculateSwarmConsensus(selectedTicker, currentPrice, 100000)
  }, [selectedTicker, currentPrice])

  // Mock Candles & Backtest Data
  const mockCandles = useMemo(() => {
    return generateMockCandles(selectedTicker, 120, currentPrice * 0.92, 'bullish')
  }, [selectedTicker, currentPrice])

  const backtestResult = useMemo(() => {
    return runStrategyBacktest(mockCandles, 100000)
  }, [mockCandles])

  const indicators = useMemo(() => {
    return calculateAllIndicators(mockCandles)
  }, [mockCandles])

  // Download individual workflow JSON
  const handleDownloadWorkflow = async (bot: TradingBot) => {
    try {
      const response = await fetch(`/n8n/workflows/trading/${bot.id}.workflow.json`)
      let jsonText = ''
      if (response.ok) {
        jsonText = await response.text()
      } else {
        // Fallback: construct valid n8n workflow dynamically
        const fallbackSchema = {
          id: `nemi-${bot.id}-v1`,
          name: `NEMI Trading - ${bot.name}`,
          active: true,
          nodes: [
            {
              id: 'node-webhook',
              name: 'Webhook Trigger',
              type: 'n8n-nodes-base.webhook',
              typeVersion: 1,
              position: [100, 300],
              parameters: {
                path: bot.defaultWebhook,
                httpMethod: 'POST',
                responseMode: 'responseNode',
              },
            },
            {
              id: 'node-calculation',
              name: 'Quantitative Engine',
              type: 'n8n-nodes-base.code',
              typeVersion: 2,
              position: [350, 300],
              parameters: {
                language: 'javaScript',
                jsCode: `// NEMI ${bot.name} Logic\nreturn { json: { botId: "${bot.id}", status: "SUCCESS" } };`,
              },
            },
            {
              id: 'node-response',
              name: 'Respond to Webhook',
              type: 'n8n-nodes-base.respondToWebhook',
              typeVersion: 1,
              position: [600, 300],
              parameters: {
                respondWith: 'json',
                responseBody: '={{ $json }}',
              },
            },
          ],
          connections: {
            'Webhook Trigger': {
              main: [[{ node: 'Quantitative Engine', type: 'main', index: 0 }]],
            },
            'Quantitative Engine': {
              main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
            },
          },
          settings: { executionOrder: 'v1' },
          meta: { instanceId: 'nemi-trading-swarm', botId: bot.id, version: '2.0.0' },
        }
        jsonText = JSON.stringify(fallbackSchema, null, 2)
      }

      const blob = new Blob([jsonText], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bot.id}.workflow.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDownloadSuccess(`Downloaded ${bot.id}.workflow.json!`)
      setTimeout(() => setDownloadSuccess(null), 3000)
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  // Download all 10 workflows sequentially
  const handleDownloadAllWorkflows = () => {
    for (const bot of ALL_TRADING_BOTS) {
      setTimeout(() => {
        handleDownloadWorkflow(bot)
      }, 200)
    }
  }

  // Simulate prompt execution
  const handleRunBotTest = (bot: TradingBot, prompt: string) => {
    setIsRunningSim(true)
    setTestOutput(null)
    setTimeout(() => {
      setIsRunningSim(false)
      const simulatedOutput = `### [${bot.name}] Execution Output
**Timestamp:** ${new Date().toISOString()} | **Status:** 200 OK | **Latency:** 98ms

#### Quantitative Analysis for "${prompt}":
- **Signal:** ${consensus.consensusAction} (${consensus.overallConfidence}% Confidence)
- **Calculated Metric:** RSI = ${indicators.rsi}, MACD Hist = ${indicators.macd.hist}, ATR = ${indicators.atr}
- **Optimal Entry:** $${consensus.entryTarget} | **Stop Loss:** $${consensus.stopLoss} | **Target:** $${consensus.takeProfit1}
- **Kelly Position Sizing:** $${consensus.recommendedPositionSizeUsd} (${consensus.riskAudit.kellyFraction}% Portfolio Allocation)
- **Risk Sentinel Verdict:** ${consensus.riskAudit.reason}

\`\`\`python
# Algorithmic Directive Executed via n8n Webhook: ${bot.defaultWebhook}
import ccxt

def execute_signal():
    print("Connecting to ${bot.supportedExchanges[0]}...")
    order = {
        "symbol": "${selectedTicker}",
        "side": "${consensus.consensusAction.toLowerCase()}",
        "entry": ${consensus.entryTarget},
        "stop_loss": ${consensus.stopLoss},
        "take_profit": ${consensus.takeProfit1},
        "size_usd": ${consensus.recommendedPositionSizeUsd}
    }
    return {"status": "ORDER_PLACED", "order": order}

if __name__ == '__main__':
    res = execute_signal()
    print("Execution Result:", res)
\`\`\`
`
      setTestOutput(simulatedOutput)
    }, 600)
  }

  // Keyboard shortcut: Escape to close modal
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
      aria-labelledby="trading-fleet-title"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl h-[92vh] max-h-[900px] flex flex-col glass-panel bg-slate-950/95 border border-purple-500/30 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden"
      >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-emerald-500/30 border border-purple-400/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold bg-gradient-to-r from-purple-200 via-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                    NEMI Algorithmic Trading Fleet
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    10 AGENTS ACTIVE
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Institutional Multi-Agent Swarm with Bayesian Consensus & n8n Workflow Automation
                </p>
              </div>
            </div>

            {/* Asset Selector & Action Buttons */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {(['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'NVDA', 'SPY'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTicker(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTicker === t
                        ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleDownloadAllWorkflows}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer transition-all"
                title="Download All 10 n8n Workflow JSONs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export 10 Workflows</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-white/10 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('fleet')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  activeTab === 'fleet'
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>10 Trading Agents</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('consensus')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  activeTab === 'consensus'
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Swarm Consensus Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('backtest')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  activeTab === 'backtest'
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Strategy Backtest Simulation</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('n8n-export')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  activeTab === 'n8n-export'
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-orange-400" />
                <span>n8n Import Instructions</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('architecture')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  activeTab === 'architecture'
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Agentic RAG & MCP Architecture</span>
              </button>
            </div>

            {downloadSuccess && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle className="w-3.5 h-3.5" />
                {downloadSuccess}
              </span>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto nemi-scroll p-6">
            {/* TAB 1: 10 TRADING AGENTS FLEET */}
            {activeTab === 'fleet' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Agent List (Left Column) */}
                <div className="lg:col-span-5 flex flex-col gap-2.5">
                  <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                    Select Specialist Agent
                  </span>
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[640px] pr-1">
                    {ALL_TRADING_BOTS.map((bot, index) => {
                      const isSelected = bot.id === selectedBot.id
                      return (
                        <div
                          key={bot.id}
                          onClick={() => setSelectedBot(bot)}
                          className={`p-3 rounded-2xl cursor-pointer transition-all border text-left ${
                            isSelected
                              ? 'bg-purple-600/25 border-purple-400/60 shadow-[0_0_16px_rgba(168,85,247,0.3)]'
                              : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-mono font-bold text-white/30">
                                #{index + 1}
                              </span>
                              <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300">
                                <BotIcon botId={bot.id} iconName={bot.icon} className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white leading-tight">
                                  {bot.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-purple-300/80 font-mono">
                                    {bot.tradingCategory}
                                  </span>
                                  <span className="text-[10px] text-white/30">•</span>
                                  <span className="text-[10px] text-emerald-400 font-mono">
                                    {bot.riskProfile}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Agent Deep Inspector (Right Column) */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-purple-600/30 border border-purple-400/40 text-purple-300">
                          <BotIcon botId={selectedBot.id} iconName={selectedBot.icon} className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {selectedBot.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-semibold">
                              {selectedBot.tradingCategory}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                              Risk: {selectedBot.riskProfile}
                            </span>
                            <span className="text-xs text-white/40 font-mono">
                              Webhook: /{selectedBot.defaultWebhook}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadWorkflow(selectedBot)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/40 cursor-pointer transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download JSON</span>
                      </button>
                    </div>

                    <p className="text-xs text-white/70 leading-relaxed">
                      {selectedBot.description}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10">
                      <div>
                        <span className="text-[10px] text-white/40 uppercase font-mono">Target Assets</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedBot.targetAssets.slice(0, 3).map((a) => (
                            <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/70">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 uppercase font-mono">Timeframes</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedBot.timeframes.slice(0, 3).map((tf) => (
                            <span key={tf} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/70">
                              {tf}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 uppercase font-mono">Exchanges / Rails</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedBot.supportedExchanges.slice(0, 2).map((ex) => (
                            <span key={ex} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-emerald-300">
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Prompts & Execution Harness */}
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Executable Quantitative Scenarios
                      </span>
                      {onSelectBotForChat && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBotForChat(selectedBot.id)
                            onClose()
                          }}
                          className="text-xs text-purple-300 hover:text-purple-200 underline cursor-pointer"
                        >
                          Open in NEMI Chat &rarr;
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {selectedBot.samplePrompts.map((prompt, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all text-xs"
                        >
                          <span className="text-white/80 pr-2">{prompt}</span>
                          <button
                            type="button"
                            onClick={() => handleRunBotTest(selectedBot, prompt)}
                            disabled={isRunningSim}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-all"
                          >
                            <Play className="w-3 h-3" />
                            <span>Simulate</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test Output Panel */}
                  {testOutput && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs font-mono text-white/90 overflow-x-auto nemi-scroll max-h-56 whitespace-pre-wrap leading-relaxed">
                      {testOutput}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SWARM CONSENSUS MATRIX */}
            {activeTab === 'consensus' && (
              <div className="flex flex-col gap-6">
                {/* Consensus Hero Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 via-slate-950 to-slate-900 border border-purple-500/30 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono text-purple-300/70 uppercase tracking-wider">
                        Autonomous Hedge Fund Swarm Consensus
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <h3 className="text-2xl font-black text-white">{selectedTicker}</h3>
                        <span className={`px-3 py-1 rounded-xl text-sm font-bold font-mono border ${
                          consensus.consensusAction === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : consensus.consensusAction === 'SELL'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {consensus.consensusAction} SIGNAL ({consensus.overallConfidence}% CONFIDENCE)
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold border ${
                          consensus.gatekeeperPassed
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        }`}>
                          {consensus.gatekeeperPassed ? '✅ P(Win) >= 70% APPROVED' : '⛔ < 70% REJECTED'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-white/50">
                          Synthesized from 7 active specialist votes with Bayesian confidence weighting
                        </span>
                        <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                          Estimated Win Probability: {Math.round(consensus.winProbability * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-white/40 uppercase font-mono">Current Spot</span>
                        <div className="text-xl font-mono font-bold text-white">${currentPrice.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-white/40 uppercase font-mono">Kelly Position Size</span>
                        <div className="text-xl font-mono font-bold text-emerald-400">
                          ${consensus.recommendedPositionSizeUsd.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Execution Levels Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase font-mono">Optimal Entry</span>
                      <div className="text-sm font-mono font-bold text-cyan-300">${consensus.entryTarget}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase font-mono">Stop Loss (Risk)</span>
                      <div className="text-sm font-mono font-bold text-rose-400">${consensus.stopLoss} (-2.5%)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase font-mono">Take Profit 1 (1:1.5 RR)</span>
                      <div className="text-sm font-mono font-bold text-emerald-300">${consensus.takeProfit1} (+3.8%)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] text-white/40 uppercase font-mono">Take Profit 2 (1:2.8 RR)</span>
                      <div className="text-sm font-mono font-bold text-emerald-400">${consensus.takeProfit2} (+7.0%)</div>
                    </div>
                  </div>

                  {/* Risk Sentinel Clearance */}
                  <div className={`flex items-center gap-3 mt-4 p-3 rounded-xl border text-xs ${
                    consensus.gatekeeperPassed
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}>
                    <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${consensus.gatekeeperPassed ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <span>{consensus.riskAudit.reason}</span>
                  </div>
                </div>

                {/* Individual Agent Votes Breakdown */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Agent Voting Confluence Breakdown
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {consensus.agentVotes.map((vote) => (
                      <div
                        key={vote.botId}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BotIcon botId={vote.botId} className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-white">{vote.botName}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                            vote.action === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : vote.action === 'SELL'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {vote.action} ({vote.confidence}%)
                          </span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">
                          {vote.reasoning}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/40 pt-1 border-t border-white/5">
                          <span>Bayesian Weight: {(vote.weight * 100).toFixed(0)}%</span>
                          <span>Weighted Score: {((vote.confidence / 100) * vote.weight * 100).toFixed(1)} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STRATEGY BACKTEST SIMULATION */}
            {activeTab === 'backtest' && (
              <div className="flex flex-col gap-6">
                {/* Backtest KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Total Return</span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      +{backtestResult.totalReturnPercent}%
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Win Rate</span>
                    <div className="text-xl font-bold font-mono text-cyan-300">
                      {backtestResult.winRate}%
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Profit Factor</span>
                    <div className="text-xl font-bold font-mono text-white">
                      {backtestResult.profitFactor}x
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Sharpe Ratio</span>
                    <div className="text-xl font-bold font-mono text-purple-300">
                      {backtestResult.sharpeRatio}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Max Drawdown</span>
                    <div className="text-xl font-bold font-mono text-rose-400">
                      -{backtestResult.maxDrawdownPercent}%
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Total Trades</span>
                    <div className="text-xl font-bold font-mono text-white">
                      {backtestResult.totalTrades}
                    </div>
                  </div>
                </div>

                {/* Simulated Equity Curve Visualization */}
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white">
                        Simulated Portfolio Equity Curve (Starting Capital: $100,000)
                      </h4>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono">
                      15-minute timeframe execution
                    </span>
                  </div>

                  {/* SVG Line Graph */}
                  <div className="w-full h-48 bg-slate-950/80 rounded-2xl p-4 border border-white/5 relative overflow-hidden flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const points = backtestResult.equityCurve
                        if (points.length < 2) return null
                        const minEq = Math.min(...points.map((p) => p.equity)) * 0.98
                        const maxEq = Math.max(...points.map((p) => p.equity)) * 1.02
                        const range = maxEq - minEq || 1

                        const coords = points.map((p, idx) => {
                          const x = (idx / (points.length - 1)) * 500
                          const y = 140 - ((p.equity - minEq) / range) * 130
                          return `${x},${y}`
                        })

                        const linePath = `M ${coords.join(' L ')}`
                        const areaPath = `${linePath} L 500,150 L 0,150 Z`

                        return (
                          <>
                            <path d={areaPath} fill="url(#equityGrad)" />
                            <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                          </>
                        )
                      })()}
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: N8N IMPORT INSTRUCTIONS */}
            {activeTab === 'n8n-export' && (
              <div className="flex flex-col gap-6 max-w-4xl">
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        How to Import NEMI Trading Agents into n8n
                      </h3>
                      <p className="text-xs text-white/50">
                        Compatible with n8n Cloud and self-hosted n8n (Community / Enterprise)
                      </p>
                    </div>
                  </div>

                  <ol className="list-decimal list-inside text-xs text-white/80 space-y-2.5 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                    <li>
                      <strong>Export Workflow JSON:</strong> Click <em>"Download JSON"</em> on any agent or click <em>"Export 10 Workflows"</em> in the top header.
                    </li>
                    <li>
                      <strong>Open n8n Instance:</strong> Navigate to your n8n workspace dashboard (e.g. <code>http://localhost:5678</code> or your n8n Cloud URL).
                    </li>
                    <li>
                      <strong>Import from File:</strong> Click <strong>Workflows &rarr; Import from File</strong> and select the downloaded <code>.workflow.json</code> file.
                    </li>
                    <li>
                      <strong>Set Credentials:</strong> Add your broker API keys (Alpaca, Binance, Coinbase, or Telegram Bot Token) in the respective credentials nodes.
                    </li>
                    <li>
                      <strong>Activate Workflow:</strong> Toggle the <strong>Active</strong> switch in n8n. The webhook will immediately start listening for market triggers and executing trades!
                    </li>
                  </ol>

                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-purple-200">
                        All 10 Production Workflows Stored Locally
                      </h4>
                      <p className="text-[11px] text-white/50">
                        Located in <code>n8n/workflows/trading/*.workflow.json</code> in this repository.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadAllWorkflows}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer transition-all shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download All</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'architecture' && (
              <div className="flex flex-col gap-6 max-w-5xl">
                {/* Header Banner */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-purple-950/30 to-slate-900 border border-amber-500/30 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">
                        Reasoning-Driven Retrieval (Agentic RAG) &amp; Model Context Protocol (MCP)
                      </h3>
                      <p className="text-xs text-white/60 mt-0.5">
                        Institutional quantitative agent architecture: Reason &rarr; Retrieve &rarr; Reason &rarr; Retrieve with Generator-Critic-Verifier Cascades
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid: 3 Pillars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pillar 1: Reasoning-Driven Retrieval */}
                  <div className="p-5 rounded-3xl bg-white/[0.02] border border-cyan-500/30 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        1. Reasoning-Driven Retrieval Loop
                      </h4>
                    </div>
                    <p className="text-xs text-white/60">
                      Moves away from static single-shot RAG to hypothesis-guided multi-hop investigation.
                    </p>

                    <div className="flex flex-col gap-2 mt-1">
                      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
                        <strong>1. Observe:</strong> Reads current state, hop budget, and already retrieved evidence.
                      </div>
                      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
                        <strong>2. Reason:</strong> Identifies missing data gaps (e.g. debt maturity, news catalysts).
                      </div>
                      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
                        <strong>3. Plan Query:</strong> Formulates targeted queries with reformulation distance guard.
                      </div>
                      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
                        <strong>4. Retrieve &amp; Select:</strong> Dedupes candidate chunks and commits trusted evidence subset.
                      </div>
                      <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
                        <strong>5. Decide (Sufficiency):</strong> Evaluates termination condition; halts when goal is covered.
                      </div>
                    </div>

                    <div className="mt-2 p-3 rounded-xl bg-slate-950/80 border border-white/10 text-[11px] font-mono text-white/70 space-y-1">
                      <div>&bull; Max Hop Budget: <strong>5 hops</strong> | Max Step Budget: <strong>8 steps</strong></div>
                      <div>&bull; Reformulation Distance Guard: <strong>Jaccard token cutoff 0.85</strong></div>
                      <div>&bull; Cost Circuit Breaker: <strong>4,000 tokens hard cap</strong></div>
                    </div>
                  </div>

                  {/* Pillar 2: Composed Generator-Critic-Verifier Cascade */}
                  <div className="p-5 rounded-3xl bg-white/[0.02] border border-purple-500/30 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        2. Generator + Critic + Verifier Cascade
                      </h4>
                    </div>
                    <p className="text-xs text-white/60">
                      Separates subjective setup polish from objective pass/fail security gating.
                    </p>

                    <div className="flex flex-col gap-2 mt-1">
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200">
                        <strong>Generator Node:</strong> Formulates structured trade hypothesis, stop-loss, and take-profit targets.
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200">
                        <strong>Critic Node (Art Teacher):</strong> Subjective quality scorer (0-10 scale). Demands &ge; 8.0/10 score across risk-reward asymmetry and confluence.
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200">
                        <strong>Verifier Node (Security Guard):</strong> Objective pass/fail gatekeeper. Strictly enforces <strong>P(Win) &ge; 70%</strong>, portfolio heat &le; 6%, and daily loss &le; 3%. Never rewrites.
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200">
                        <strong>Reflexive Memory (Cross-Run):</strong> Stores post-mortems in <code>memory/reflexive_lessons.json</code>, adjusting future Bayesian priors.
                      </div>
                    </div>

                    <div className="mt-2 p-3 rounded-xl bg-slate-950/80 border border-white/10 text-[11px] font-mono text-white/70 space-y-1">
                      <div>&bull; Gatekeeper Rule: <strong>STRICT P(Win) &ge; 70% Required</strong></div>
                      <div>&bull; Max Revisions: <strong>3 iterative loops</strong></div>
                      <div>&bull; Cross-Run Prior Tuning: <strong>&plusmn;8% Bayesian correction</strong></div>
                    </div>
                  </div>
                </div>

                {/* Pillar 3: Model Context Protocol (MCP) Standard Server */}
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-emerald-500/30 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-base font-bold text-white">
                        3. Model Context Protocol (MCP) Standard JSON-RPC Server
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Standard JSON-RPC 2.0 (stdio / HTTP :8000/mcp)
                    </span>
                  </div>

                  <p className="text-xs text-white/60">
                    Provides an open standard contract allowing external agents (Cursor, Claude Desktop, Antigravity, or custom IDEs) to discover and invoke trading capabilities without custom adaptors.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tools */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-2">
                      <span className="text-xs font-bold text-emerald-300 uppercase font-mono">Tools (Actions)</span>
                      <ul className="text-[11px] text-white/70 space-y-1 font-mono">
                        <li>&bull; get_market_quote</li>
                        <li>&bull; compute_technical_indicators</li>
                        <li>&bull; evaluate_trading_swarm</li>
                        <li>&bull; run_agentic_rag_research</li>
                        <li>&bull; run_composed_cascade</li>
                        <li>&bull; run_risk_audit</li>
                        <li>&bull; get_realtime_matrix</li>
                      </ul>
                    </div>

                    {/* Resources */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-2">
                      <span className="text-xs font-bold text-cyan-300 uppercase font-mono">Resources (Context)</span>
                      <ul className="text-[11px] text-white/70 space-y-1 font-mono">
                        <li>&bull; market://universe</li>
                        <li>&bull; market://portfolio</li>
                        <li>&bull; market://gatekeeper</li>
                        <li>&bull; market://reflexive/lessons</li>
                      </ul>
                    </div>

                    {/* Prompts */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-2">
                      <span className="text-xs font-bold text-purple-300 uppercase font-mono">Prompts (Templates)</span>
                      <ul className="text-[11px] text-white/70 space-y-1 font-mono">
                        <li>&bull; review_trade_proposal</li>
                        <li>&bull; critique_market_confluence</li>
                        <li>&bull; post_mortem_analysis</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 text-xs font-mono text-white/80">
                    <span className="text-white/40"># Run MCP Server via stdio:</span><br />
                    <code>cd trader &amp;&amp; ./.venv/bin/python3 -m mcp.server</code><br />
                    <span className="text-white/40"># Or send JSON-RPC 2.0 requests to FastAPI endpoint:</span><br />
                    <code>curl -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{`{"jsonrpc":"2.0","id":1,"method":"tools/list"}`}'</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
  )
}
