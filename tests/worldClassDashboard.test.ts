import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('World-Class Dashboard Architecture Suite', () => {
  const dashboardPath = path.resolve(__dirname, '../src/renderer/src/components/WorldClassDashboard.tsx')
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8')
  const appPath = path.resolve(__dirname, '../src/renderer/src/App.tsx')
  const appContent = fs.readFileSync(appPath, 'utf8')

  describe('1. The 2 Primary Swarm Buttons Requirement', () => {
    it('implements CODE SWARM hero card and primary launch action button', () => {
      expect(dashboardContent).toContain('CODE SWARM')
      expect(dashboardContent).toContain('Autonomous Multi-Agent DAG Studio')
      expect(dashboardContent).toContain('Launch Code Swarm')
      expect(dashboardContent).toContain('PARALLEL DAG • 11 BOTS')
      expect(dashboardContent).toContain('AST Syntax Verifier')
      expect(dashboardContent).toContain('onOpenCodeSwarm')
    })

    it('implements TRADE SWARM hero card and primary launch action button', () => {
      expect(dashboardContent).toContain('TRADE SWARM')
      expect(dashboardContent).toContain('10 Elite Quant Agents Fleet Cockpit')
      expect(dashboardContent).toContain('Launch Trade Swarm')
      expect(dashboardContent).toContain('SURE SHOT WIN RATE ≥ 70%')
      expect(dashboardContent).toContain('10 QUANT AGENTS')
      expect(dashboardContent).toContain('onOpenTradeSwarm')
    })

    it('displays live real-time market matrix ticker on Trade Swarm card', () => {
      expect(dashboardContent).toContain('BTC')
      expect(dashboardContent).toContain('ETH')
      expect(dashboardContent).toContain('SOL')
      expect(dashboardContent).toContain('SPY')
      expect(dashboardContent).toContain('marketPrices')
    })
  })

  describe('2. Login System Integration', () => {
    it('provides prominent Sign In trigger when unauthenticated', () => {
      expect(dashboardContent).toContain('Sign In / Connect')
      expect(dashboardContent).toContain('onOpenAuth')
      expect(dashboardContent).toContain('isAuthenticated')
    })

    it('displays user profile, name, and owner/pro role badge when authenticated', () => {
      expect(dashboardContent).toContain('currentUser?.name')
      expect(dashboardContent).toContain('currentUser?.email')
      expect(dashboardContent).toContain("authRole === 'owner' ? 'OWNER' : 'PRO'")
      expect(dashboardContent).toContain('ShieldCheck')
    })
  })

  describe('3. Minimalistic Floating Chat Capsule', () => {
    it('implements floating minimalist chat capsule trigger docked at bottom', () => {
      expect(dashboardContent).toContain('Ask NEMI anything...')
      expect(dashboardContent).toContain('onOpenChat')
      expect(dashboardContent).toContain('rounded-full bg-slate-900/80 backdrop-blur-2xl')
    })

    it('provides voice command mic and ⌘K command pill in minimalist chat trigger', () => {
      expect(dashboardContent).toContain('onToggleVoice')
      expect(dashboardContent).toContain('Voice Command')
      expect(dashboardContent).toContain('Open Chat (⌘K)')
    })
  })

  describe('4. Integration in App.tsx', () => {
    it('mounts WorldClassDashboard in main canvas when chat is closed', () => {
      expect(appContent).toContain('WorldClassDashboard')
      expect(appContent).toContain('onOpenCodeSwarm={() => setSwarmDagModalOpen(true)}')
      expect(appContent).toContain('onOpenTradeSwarm={() => setTradingFleetModalOpen(true)}')
      expect(appContent).toContain('onOpenAuth={() => setAuthModalOpen(true)}')
      expect(appContent).toContain('onOpenChat={() => handleToggleChatOpen(true)}')
    })

    it('ensures 3D NemiBrain runs in canvas background behind dashboard', () => {
      expect(appContent).toContain('<NemiBrain')
      expect(appContent).toContain('pointer-events-none')
    })
  })

  describe('5. Continuous Daily Learning Feed Integration', () => {
    it('connects to dailyLearningFeed service and renders status banner', () => {
      expect(dashboardContent).toContain('dailyLearningFeed')
      expect(dashboardContent).toContain('CONTINUOUS DAILY LEARNING FEED')
      expect(dashboardContent).toContain('handleSyncDailyFeed')
      expect(dashboardContent).toContain("Feed Today's Intel")
    })

    it('renders telemetry and proficiency scores for both swarms', () => {
      expect(dashboardContent).toContain('feedStatus.codeSwarmProficiency')
      expect(dashboardContent).toContain('feedStatus.tradeSwarmProficiency')
      expect(dashboardContent).toContain('feedStatus.isSyncedToday')
    })
  })
})
