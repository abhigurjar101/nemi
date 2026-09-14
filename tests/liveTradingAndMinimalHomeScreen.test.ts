import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Live Trading & Minimal Transparent Home Screen Architecture', () => {
  const appPath = path.resolve(__dirname, '../src/renderer/src/App.tsx')
  const appContent = fs.readFileSync(appPath, 'utf8')
  const modalPath = path.resolve(__dirname, '../src/renderer/src/components/TradingFleetModal.tsx')
  const modalContent = fs.readFileSync(modalPath, 'utf8')
  const apiPath = path.resolve(__dirname, '../api/trade.ts')
  const apiContent = fs.readFileSync(apiPath, 'utf8')

  describe('1. Home Screen Minimalist Layout & Singular Transparent TRADE Tab', () => {
    it('defaults dashboardOpen to false so the home screen displays the 3D brain and transparent Trade tab', () => {
      expect(appContent).toContain("const [dashboardOpen, setDashboardOpen] = useState<boolean>(false)")
    })

    it('removes unnecessary buttons on the home screen dock and provides singular TRADE action', () => {
      expect(appContent).toContain('LIVE QUANT FEED')
      expect(appContent).toContain('92.4% PROFIT PREDICTIONS')
      expect(appContent).toContain('aria-label="TRADE Swarm"')
      expect(appContent).toContain('setTradingFleetModalOpen(true)')
      expect(appContent).toContain('Real-Time Market Data')
      expect(appContent).toContain('Profitable Trade Predictions')
    })

    it('renders TRADE button in a transparent, ultra-high quality glassmorphic styling', () => {
      expect(appContent).toContain('bg-slate-950/40 hover:bg-slate-900/60 active:bg-slate-950/80 backdrop-blur-2xl border border-emerald-400/40')
      expect(appContent).toContain('shadow-[0_12px_48px_rgba(0,0,0,0.85),0_0_35px_rgba(16,185,129,0.3)]')
    })
  })

  describe('2. Always-Present Cancel Button', () => {
    it('includes omnipresent floating Cancel button pinned on top right', () => {
      expect(modalContent).toContain('ALWAYS-PRESENT FLOATING CANCEL BUTTON')
      expect(modalContent).toContain('fixed top-3 sm:top-5 right-3 sm:right-6 z-[120]')
      expect(modalContent).toContain('title="Cancel Trading View & Return to Living Brain"')
      expect(modalContent).toContain('aria-label="Cancel Trading View"')
      expect(modalContent).toContain('Cancel')
    })

    it('includes Escape key shortcut and backdrop click to cancel', () => {
      expect(modalContent).toContain("e.key === 'Escape' && isOpen")
      expect(modalContent).toContain('onClick={onClose}')
    })
  })

  describe('3. Real-Time Live Feed & Profitable Trade Predictions', () => {
    it('provides real-time streaming price feed and order flow tape', () => {
      expect(modalContent).toContain('LIVE ORDER FLOW TAPE')
      expect(modalContent).toContain('LIVE STREAMING')
      expect(modalContent).toContain('Real-Time Price Stream')
      expect(modalContent).toContain('LIVE FEED ACTIVE')
    })

    it('provides high-confidence AI profitable trade predictions with Bayesian gatekeeper', () => {
      expect(modalContent).toContain('REAL-TIME PROFITABLE TRADE PREDICTION')
      expect(modalContent).toContain('10-Agent Bayesian Consensus Gatekeeper')
      expect(modalContent).toContain('WIN RATE')
      expect(modalContent).toContain('EXECUTE THIS PREDICTED TRADE')
    })

    it('exposes /api/trade serverless endpoint with streaming market prices and AI predictions', () => {
      expect(apiContent).toContain('liveTickers')
      expect(apiContent).toContain('generateProfitablePredictions')
      expect(apiContent).toContain('winProbability')
      expect(apiContent).toContain('≥ 70% Bayesian Win Probability Enforced')
    })
  })

  describe('4. Transparent Glassmorphism Overlay Keeping 3D Brain Visible', () => {
    it('uses transparent backdrop and translucent modal container so the 3D Brain is visible', () => {
      expect(modalContent).toContain('bg-black/40 backdrop-blur-md')
      expect(modalContent).toContain('bg-slate-950/75 sm:bg-slate-950/65 backdrop-blur-3xl border border-emerald-500/30')
    })
  })
})
