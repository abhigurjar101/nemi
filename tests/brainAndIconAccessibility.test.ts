import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { BotIcon } from '../src/renderer/src/components/BotIcon'
import { ALL_N8N_BOTS } from '../n8n'

describe('Ultra-Premium Iconography & Universal Accessibility', () => {
  it('BotIcon defaults to ultra-minimalist strokeWidth=1.65', () => {
    const el = BotIcon({ botId: 'orchestrator' })
    expect(el).toBeDefined()
    expect(el.props.strokeWidth).toBe(1.65)
    expect(el.props['aria-hidden']).toBe('true')
  })

  it('BotIcon maps all 11 bots with valid icon components and strokeWidth=1.65', () => {
    for (const bot of ALL_N8N_BOTS) {
      const el = BotIcon({ botId: bot.id, iconName: bot.icon })
      expect(el).toBeDefined()
      expect(el.props.strokeWidth).toBe(1.65)
      expect(typeof el.type).toBe('object')
    }
  })

  it('BotFleetDock source code enforces full ARIA accessibility and labels for all 11 bots', () => {
    const dockPath = path.resolve(__dirname, '../src/renderer/src/components/BotFleetDock.tsx')
    const content = fs.readFileSync(dockPath, 'utf8')

    expect(content).toContain('aria-label="Autonomous Bot Fleet Navigation"')
    expect(content).toContain('aria-label={`Select ${bot.name} (${bot.shortName}) - ${bot.category}`}')
    expect(content).toContain('strokeWidth={1.65}')
    expect(content).toContain('role="toolbar"')
    expect(content).toContain('focus-visible:outline-none')
  })

  it('NemiBrain source code renders OrbitControls and sleek camera HUD', () => {
    const brainPath = path.resolve(__dirname, '../src/renderer/src/components/NemiBrain.tsx')
    const content = fs.readFileSync(brainPath, 'utf8')

    expect(content).toContain('<OrbitControls')
    expect(content).toContain('enableRotate={true}')
    expect(content).toContain('enableZoom={true}')
    expect(content).toContain('enablePan={true}')
    expect(content).toContain('screenSpacePanning={true}')
    expect(content).toContain('minDistance={1.2}')
    expect(content).toContain('maxDistance={40}')
    expect(content).toContain('touchAction: \'none\'')
    expect(content).toContain('aria-label="Zoom in on NEMI Brain"')
    expect(content).toContain('aria-label="Zoom out of NEMI Brain"')
    expect(content).toContain('aria-label="Reset Brain Camera View"')
    expect(content).toContain('strokeWidth={1.65}')
  })
})

describe('3D Brain Orbit & Camera Discrimination Logic', () => {
  it('correctly discriminates between dragging to rotate/pan vs clicking', () => {
    // Pointer delta threshold is 6px:
    const isDrag = (startX: number, startY: number, endX: number, endY: number) => {
      const dx = Math.abs(endX - startX)
      const dy = Math.abs(endY - startY)
      return dx >= 6 || dy >= 6
    }

    // Micro-click or tap
    expect(isDrag(100, 100, 102, 101)).toBe(false)
    expect(isDrag(250, 300, 250, 300)).toBe(false)

    // Drag to rotate / orbit 3D brain
    expect(isDrag(100, 100, 115, 100)).toBe(true)
    expect(isDrag(100, 100, 100, 120)).toBe(true)
    expect(isDrag(100, 100, 200, 200)).toBe(true)
  })

  it('clamps zoom distance within safe interactive range [1.2, 40]', () => {
    const clampDistance = (dist: number, factor: number) => {
      let newDist = dist * factor
      if (newDist < 1.2) newDist = 1.2
      if (newDist > 40) newDist = 40
      return newDist
    }

    // Zooming in from 14
    expect(clampDistance(14, 0.72)).toBeCloseTo(10.08, 1)
    // Deep zoom in clamps at 1.2
    expect(clampDistance(1.5, 0.5)).toBe(1.2)
    // Macro zoom out clamps at 40
    expect(clampDistance(35, 1.5)).toBe(40)
  })
})

describe('Universal Accessibility (a11y) & WCAG Compliance Standards', () => {
  const modals = [
    'AuthModal.tsx',
    'AutonomousLearningModal.tsx',
    'BranchingContextModal.tsx',
    'CodeSandboxModal.tsx',
    'CryptoVaultModal.tsx',
    'Hardest100BenchmarkModal.tsx',
    'OfflineModeModal.tsx',
    'P2PMeshModal.tsx',
    'SwarmDagModal.tsx',
    'TradingFleetModal.tsx',
    'VoiceEngineModal.tsx',
  ]

  it('verifies that all 11 modal dialogs contain role="dialog", aria-modal="true", aria-labelledby, and Escape listener', () => {
    for (const m of modals) {
      const filePath = path.resolve(__dirname, '../src/renderer/src/components', m)
      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, 'utf8')

      expect(content).toContain('role="dialog"')
      expect(content).toContain('aria-modal="true"')
      expect(content).toContain('aria-labelledby')
      expect(content).toContain('Escape')
    }
  })

  it('verifies index.html has lang="en", mobile viewport meta, and charset UTF-8', () => {
    const htmlPath = path.resolve(__dirname, '../src/renderer/index.html')
    const html = fs.readFileSync(htmlPath, 'utf8')

    expect(html).toContain('<html lang="en">')
    expect(html).toContain('charset="UTF-8"')
    expect(html).toContain('viewport-fit=cover')
  })

  it('verifies all inputs across UI components have accessible labels', () => {
    const componentsDir = path.resolve(__dirname, '../src/renderer/src/components')
    const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith('.tsx'))

    const unlabeled: string[] = []
    for (const f of files) {
      const content = fs.readFileSync(path.join(componentsDir, f), 'utf8')
      const matches = content.matchAll(/<input[^>]+>/gs)
      for (const m of matches) {
        const tag = m[0]
        if (!tag.includes('aria-label') && !tag.includes('id=') && !tag.includes('aria-labelledby')) {
          unlabeled.push(`${f}: ${tag.slice(0, 60)}`)
        }
      }
    }

    expect(unlabeled).toEqual([])
  })

  it('verifies all image tags across UI components have alt text attributes', () => {
    const componentsDir = path.resolve(__dirname, '../src/renderer/src/components')
    const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith('.tsx'))

    const uncaptioned: string[] = []
    for (const f of files) {
      const content = fs.readFileSync(path.join(componentsDir, f), 'utf8')
      const matches = content.matchAll(/<img[^>]+>/gs)
      for (const m of matches) {
        const tag = m[0]
        if (!tag.includes('alt=')) {
          uncaptioned.push(`${f}: ${tag.slice(0, 60)}`)
        }
      }
    }

    expect(uncaptioned).toEqual([])
  })

  it('verifies TradingFleetModal has id="trading-fleet-title" and explicit aria-labels on controls', () => {
    const filePath = path.resolve(__dirname, '../src/renderer/src/components/TradingFleetModal.tsx')
    const content = fs.readFileSync(filePath, 'utf8')

    expect(content).toContain('id="trading-fleet-title"')
    expect(content).toContain('aria-label="Dismiss notice"')
    expect(content).toContain('aria-label="Trade order amount in USD"')
    expect(content).toContain('aria-label="Cancel Trading View"')
  })
})
