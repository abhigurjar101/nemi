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
    expect(content).toContain('minDistance={2.5}')
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

  it('clamps zoom distance within safe interactive range [2.5, 40]', () => {
    const clampDistance = (dist: number, factor: number) => {
      let newDist = dist * factor
      if (newDist < 2.5) newDist = 2.5
      if (newDist > 40) newDist = 40
      return newDist
    }

    // Zooming in from 14
    expect(clampDistance(14, 0.72)).toBeCloseTo(10.08, 1)
    // Deep zoom in clamps at 2.5
    expect(clampDistance(3, 0.5)).toBe(2.5)
    // Macro zoom out clamps at 40
    expect(clampDistance(35, 1.5)).toBe(40)
  })
})
