import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  grandmasterTraderBot,
  getTradingBotById,
  compileTradingBotPrompt,
  FLEET_WITH_GRANDMASTER,
} from '../n8n/tradingBots'

describe('30-Year Veteran Grandmaster Trader & Swarm Mentor Architecture Suite', () => {
  const apiPath = path.resolve(__dirname, '../api/trade.ts')
  const apiContent = fs.readFileSync(apiPath, 'utf8')
  const modalPath = path.resolve(__dirname, '../src/renderer/src/components/TradingFleetModal.tsx')
  const modalContent = fs.readFileSync(modalPath, 'utf8')

  describe('1. 30-Year Veteran Grandmaster Identity & Metadata', () => {
    it('defines the 30-Year Veteran CIO with comprehensive metadata', () => {
      expect(grandmasterTraderBot.id).toBe('grandmaster-trader')
      expect(grandmasterTraderBot.name).toContain('30-Year Veteran Master Trader')
      expect(grandmasterTraderBot.shortName).toContain('30-Yr Veteran CIO')
      expect(grandmasterTraderBot.icon).toBe('Crown')
      expect(grandmasterTraderBot.tradingCategory).toBe('Swarm Consensus')
      expect(grandmasterTraderBot.riskProfile).toBe('Conservative')
      expect(grandmasterTraderBot.description).toContain('30+ years')
      expect(grandmasterTraderBot.description).toContain('Advanced RAG')
      expect(grandmasterTraderBot.description).toContain('Machine Learning')
    })

    it('retrieves the Grandmaster bot via getTradingBotById', () => {
      const bot = getTradingBotById('grandmaster-trader')
      expect(bot).toBeDefined()
      expect(bot.id).toBe('grandmaster-trader')
      expect(bot.name).toBe(grandmasterTraderBot.name)
    })

    it('includes the Grandmaster in FLEET_WITH_GRANDMASTER', () => {
      expect(FLEET_WITH_GRANDMASTER.some((b) => b.id === 'grandmaster-trader')).toBe(true)
    })

    it('compiles a heavy institutional system prompt enforcing 30-year RAG, ML, and Mentorship', () => {
      const prompt = compileTradingBotPrompt('grandmaster-trader')
      expect(prompt).toContain('30-Year Veteran Master Trader')
      expect(prompt).toContain('CORE DIRECTIVE')
      expect(prompt).toContain('CAPITAL PRESERVATION')
      expect(grandmasterTraderBot.directive).toContain('30 years of uninterrupted institutional market survival')
      expect(grandmasterTraderBot.directive).toContain('SINGLE APEX TRADE OF THE DAY')
      expect(grandmasterTraderBot.directive).toContain('ADVANCED RAG MEMORY')
      expect(grandmasterTraderBot.directive).toContain('MACHINE LEARNING ENSEMBLE')
      expect(grandmasterTraderBot.directive).toContain('SWARM MENTORSHIP & CONTINUOUS LEARNING')
    })
  })

  describe('2. Backend API Endpoint (/api/trade) Integration', () => {
    it('exposes grandmasterTradeOfTheDay payload with 30-year RAG memory', () => {
      expect(apiContent).toContain('generateGrandmasterTradeOfTheDay')
      expect(apiContent).toContain('grandmasterTradeOfTheDay')
      expect(apiContent).toContain('30-Year Veteran Master Trade of the Day')
      expect(apiContent).toContain('thirtyYearRagMemory')
      expect(apiContent).toContain('Q4 2020 Post-Halving Structural Breakout')
      expect(apiContent).toContain('regimeVectors')
    })

    it('includes Machine Learning model ensemble metrics in backend payload', () => {
      expect(apiContent).toContain('mlEnsembleModelMetrics')
      expect(apiContent).toContain('Bayesian Belief Network')
      expect(apiContent).toContain('XGBoost Quant GBDT')
      expect(apiContent).toContain('Temporal Fusion Transformer')
      expect(apiContent).toContain('orderBookImbalanceRatio')
    })

    it('contains real-time Swarm Mentorship directives coaching all specialist agents', () => {
      expect(apiContent).toContain('swarmMentorshipCoaching')
      expect(apiContent).toContain('sentimentTrader')
      expect(apiContent).toContain('technicalAnalyst')
      expect(apiContent).toContain('smcLiquidity')
      expect(apiContent).toContain('volumeBreakout')
      expect(apiContent).toContain('riskSentinel')
      expect(apiContent).toContain('tradingOrchestrator')
      expect(apiContent).toContain('continuousLearningLesson')
    })
  })

  describe('3. Frontend Trading Cockpit & Mentorship Hub (TradingFleetModal.tsx)', () => {
    it('implements dedicated 30-Yr Veteran Trade of the Day tab in modal', () => {
      expect(modalContent).toContain("activeTab === 'totd'")
      expect(modalContent).toContain('30-Yr Veteran Trade of the Day')
      expect(modalContent).toContain('Apex Grandmaster Trader (30-Year Veteran CIO)')
      expect(modalContent).toContain('32 YEARS INSTITUTIONAL DESK EXPERIENCE')
    })

    it('renders the Definitive Apex Trade of the Day card with 99.4% win rate', () => {
      expect(modalContent).toContain('THE DEFINITIVE APEX TRADE OF THE DAY')
      expect(modalContent).toContain('99.4% BAYESIAN WIN RATE')
      expect(modalContent).toContain('+28.5% ROI')
      expect(modalContent).toContain('$64,350.00')
      expect(modalContent).toContain('$72,400.00')
      expect(modalContent).toContain('$82,800.00')
      expect(modalContent).toContain('$62,200.00')
      expect(modalContent).toContain('1 : 5.8 Risk-to-Reward Ratio')
    })

    it('provides 1-click interactive execution for the Apex Trade of the Day', () => {
      expect(modalContent).toContain('handleExecuteApexTrade')
      expect(modalContent).toContain('EXECUTE APEX TRADE OF THE DAY')
    })

    it('renders 30-Year Advanced RAG Market Precedent and ML Scorecard sections', () => {
      expect(modalContent).toContain('Advanced 30-Year RAG Memory')
      expect(modalContent).toContain('Machine Learning Model Ensemble Scorecard')
      expect(modalContent).toContain('Swarm Mentorship &amp; Continuous Learning Console')
    })
  })
})
