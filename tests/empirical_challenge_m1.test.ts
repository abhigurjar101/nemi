import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import React from 'react'
import HumanCompanionLayer, { HumanCompanionLayerProps } from '../src/renderer/src/humanCompanion/HumanCompanionLayer'
import { renderCompanion } from './fixtures/companionContract'
import * as soundscape from '../src/renderer/src/humanCompanion/soundscape'

describe('Empirical Challenge: Milestone 1 Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Adversarial Challenge 1: Presence Pill Total Elimination', () => {
    const states = [
      { enabled: true, isListening: false, isThinking: false, isSpeaking: false, label: 'idle' },
      { enabled: true, isListening: true, isThinking: false, isSpeaking: false, label: 'listening' },
      { enabled: true, isListening: false, isThinking: true, isSpeaking: false, label: 'thinking' },
      { enabled: true, isListening: false, isThinking: false, isSpeaking: true, label: 'speaking' },
      { enabled: true, isListening: true, isThinking: true, isSpeaking: false, label: 'listening+thinking' },
      { enabled: true, isListening: true, isThinking: false, isSpeaking: true, label: 'listening+speaking' },
      { enabled: true, isListening: false, isThinking: true, isSpeaking: true, label: 'thinking+speaking' },
      { enabled: true, isListening: true, isThinking: true, isSpeaking: true, label: 'all-active' },
      { enabled: false, isListening: true, isThinking: true, isSpeaking: true, label: 'disabled-all-active' },
    ]

    states.forEach(({ enabled, isListening, isThinking, isSpeaking, label }) => {
      it(`verifies no presence pill or text in state: ${label}`, () => {
        const element = renderCompanion({ enabled, isListening, isThinking, isSpeaking })
        const json = JSON.stringify(element)

        // Must not contain presence pill CSS or positioning
        expect(json).not.toContain('top-4')
        expect(json).not.toContain('left-1/2')
        expect(json).not.toContain('presenceText')
        expect(json).not.toContain('dotColor')
        expect(json).not.toContain('backdrop-blur')
        expect(json).not.toContain('NEMI is present')
        expect(json).not.toContain('Listening attentively')
        expect(json).not.toContain('Reflecting deeply')
      })
    })

    it('empirically verifies HumanCompanionLayer.tsx file source contains zero presence pill patterns', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/humanCompanion/HumanCompanionLayer.tsx'),
        'utf-8'
      )
      expect(source).not.toContain('presenceText')
      expect(source).not.toContain('dotColor')
      expect(source).not.toContain('top-4')
      expect(source).not.toContain('left-1/2')
      expect(source).not.toContain('NEMI is present')
      expect(source).not.toContain('Listening attentively')
    })
  })

  describe('Adversarial Challenge 2: Conditional Unmounting and Disabling in App.tsx', () => {
    it('verifies HumanCompanionLayer returns null when enabled is false', () => {
      const element = renderCompanion({
        enabled: false,
        isListening: true,
        isThinking: true,
        isSpeaking: true,
      })
      expect(element).toBeNull()
    })

    it('verifies transitions while disabled do NOT trigger soundscape chimes', () => {
      const chimeSpy = vi.spyOn(soundscape, 'playActivationChime')
      const sparkSpy = vi.spyOn(soundscape, 'playThoughtSpark')

      renderCompanion({
        enabled: false,
        isListening: true,
        isThinking: true,
        isSpeaking: false,
      })

      expect(chimeSpy).not.toHaveBeenCalled()
      expect(sparkSpy).not.toHaveBeenCalled()
    })

    it('verifies App.tsx conditionally mounts HumanCompanionLayer with boolean guard', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )
      // Must contain {humanCompanionEnabled && ( <HumanCompanionLayer ...
      expect(appSource).toMatch(/\{humanCompanionEnabled\s*&&\s*\(\s*<HumanCompanionLayer/)
    })

    it('verifies App.tsx persists humanCompanionEnabled to localStorage', () => {
      const appSource = fs.readFileSync(
        path.resolve(__dirname, '../src/renderer/src/App.tsx'),
        'utf-8'
      )
      expect(appSource).toContain("localStorage.getItem('nemi_human_companion')")
      expect(appSource).toContain("localStorage.setItem('nemi_human_companion'")
    })
  })

  describe('Adversarial Challenge 3: Living Ripple Positioning & Interaction Boundary', () => {
    it('verifies ripple container is placed behind Voice Orb at bottom-8 right-8 with pointer-events-none', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('fixed bottom-8 right-8')
      expect(json).toContain('pointer-events-none')
      expect(json).toContain('amber-ripple')
    })

    it('verifies idle state renders zero ripple rings', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: false,
      })
      const json = JSON.stringify(element)
      expect(json).not.toContain('amber-ripple')
      expect(json).not.toContain('emerald-ripple')
    })

    it('verifies speaking state renders emerald ripples and no amber ripples', () => {
      const element = renderCompanion({
        enabled: true,
        isListening: false,
        isThinking: false,
        isSpeaking: true,
      })
      const json = JSON.stringify(element)
      expect(json).toContain('emerald-ripple')
      expect(json).not.toContain('amber-ripple')
    })
  })

  describe('Adversarial Challenge 4: Interface Contract Conformance & Boundary Resilience', () => {
    it('accepts optional getAudioLevel callback without error', () => {
      const mockAudioLevel = () => 0.85
      const element = renderCompanion({
        enabled: true,
        isListening: true,
        isThinking: false,
        isSpeaking: false,
        getAudioLevel: mockAudioLevel,
      })
      expect(element).not.toBeNull()
    })

    it('survives rapid toggling of enabled flag', () => {
      for (let i = 0; i < 50; i++) {
        const enabled = i % 2 === 0
        const el = renderCompanion({
          enabled,
          isListening: true,
          isThinking: false,
          isSpeaking: false,
        })
        if (enabled) {
          expect(el).not.toBeNull()
        } else {
          expect(el).toBeNull()
        }
      }
    })
  })
})
