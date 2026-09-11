import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  startOrbitalMusicEngine,
  updateOrbitalProximity,
  stopOrbitalMusicEngine,
  toggleSoothingMusic,
  isSoothingMusicActive,
  setSoothingMusicActive,
  setSoothingMusicVolume,
  getSoothingMusicVolume,
} from '../src/renderer/src/services/orbitalMusic'

describe('Orbital Proximity Soundscape & Music Engine', () => {
  afterEach(() => {
    stopOrbitalMusicEngine()
  })

  it('initializes the orbital audio engine smoothly', () => {
    const started = startOrbitalMusicEngine()
    expect(typeof started).toBe('boolean')
  })

  it('calculates 0 proximity when camera is far away (distance = 14)', () => {
    const proximity = updateOrbitalProximity(14.0)
    expect(proximity).toBe(0)
  })

  it('calculates medium proximity when camera approaches (distance = 8)', () => {
    const proximity = updateOrbitalProximity(8.0)
    expect(proximity).toBeGreaterThan(0.4)
    expect(proximity).toBeLessThan(0.8)
  })

  it('calculates maximum proximity when camera is close to the ring (distance = 4.5)', () => {
    const proximity = updateOrbitalProximity(4.5)
    expect(proximity).toBeCloseTo(1.0, 1)
  })

  it('toggles soothing music manually and preserves active soundscape', () => {
    expect(isSoothingMusicActive()).toBe(false)
    const active = toggleSoothingMusic(true)
    expect(active).toBe(true)
    expect(isSoothingMusicActive()).toBe(true)

    // With manual soothing music active, proximity stays at serene level
    const proximity = updateOrbitalProximity(14.0)
    expect(proximity).toBeGreaterThanOrEqual(0.85)

    // Toggle off
    toggleSoothingMusic(false)
    expect(isSoothingMusicActive()).toBe(false)
  })

  it('adjusts soothing music volume smoothly', () => {
    setSoothingMusicVolume(0.4)
    expect(getSoothingMusicVolume()).toBe(0.4)
    setSoothingMusicVolume(1.5) // clamped to 1.0
    expect(getSoothingMusicVolume()).toBe(1.0)
    setSoothingMusicVolume(-0.2) // clamped to 0.0
    expect(getSoothingMusicVolume()).toBe(0.0)
  })

  it('stops and cleans up the engine gracefully without unhandled exceptions', () => {
    startOrbitalMusicEngine()
    setSoothingMusicActive(true)
    updateOrbitalProximity(5.0)
    expect(() => stopOrbitalMusicEngine()).not.toThrow()
    expect(isSoothingMusicActive()).toBe(false)
  })
})
