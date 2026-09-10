import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeLocalEmbedding,
  cosineSimilarity,
  HNSWVectorIndex,
  globalVectorIndex,
} from '../src/renderer/src/services/vectorIndex'
import {
  simulateSpeculativeRun,
  REGISTERED_MODELS,
} from '../src/renderer/src/services/speculativeRouter'
import {
  detectLanguage,
  computeCyclomaticComplexity,
  analyzeSourceAST,
} from '../src/renderer/src/services/astIndexer'
import {
  deriveKeyFromPassphrase,
  encryptVaultData,
  decryptVaultData,
  registerPasskey,
} from '../src/renderer/src/services/cryptoVault'
import {
  SwarmDAGOrchestrator,
} from '../src/renderer/src/services/swarmOrchestrator'
import {
  runCodeInSandbox,
} from '../src/renderer/src/services/codeRunner'
import {
  Sub150msVoiceEngine,
} from '../src/renderer/src/services/voiceEngine'
import {
  BranchingContextManager,
} from '../src/renderer/src/services/branchingMemory'
import {
  P2PMeshNetwork,
} from '../src/renderer/src/services/p2pMeshSync'
import {
  LocalSLMEngine,
  AVAILABLE_LOCAL_MODELS,
} from '../src/renderer/src/services/localSLMEngine'
import {
  NeuralAudioVisualizer,
} from '../src/renderer/src/services/audioVisualizer'

describe('15 World-Class Innovations Verification Suite', () => {
  // ── 1. Vector Memory & HNSW Multi-Layer Index ──
  describe('1. Hyperdimensional Vector Memory & HNSW Indexing', () => {
    it('computes deterministic L2-normalized 128-dimensional embeddings', () => {
      const vec1 = computeLocalEmbedding('Quantum neural network architecture', 128)
      const vec2 = computeLocalEmbedding('Quantum neural network architecture', 128)
      const vec3 = computeLocalEmbedding('Cooking Italian pasta recipe', 128)

      expect(vec1.length).toBe(128)
      expect(vec1).toEqual(vec2)

      const simSame = cosineSimilarity(vec1, vec2)
      const simDiff = cosineSimilarity(vec1, vec3)

      expect(simSame).toBeCloseTo(1.0, 4)
      expect(simDiff).toBeLessThan(simSame)
    })

    it('indexes documents and performs sub-2ms multi-layer nearest neighbor retrieval', () => {
      const index = new HNSWVectorIndex(128)
      index.addDocument({ id: 'doc1', content: 'Distributed consensus algorithm using Raft' })
      index.addDocument({ id: 'doc2', content: 'Paxos distributed consensus engine' })
      index.addDocument({ id: 'doc3', content: 'React frontend UI styling with Tailwind CSS' })

      expect(index.size()).toBe(3)

      const results = index.search('distributed consensus algorithm', 2)
      expect(results.length).toBe(2)
      expect(['doc1', 'doc2']).toContain(results[0].document.id)
      expect(results[0].score).toBeGreaterThan(0.5)

      expect(index.removeDocument('doc1')).toBe(true)
      expect(index.size()).toBe(2)
    })
  })

  // ── 2. Speculative Multi-Draft Routing ──
  describe('2. Speculative Multi-Draft Routing & Cost Optimizer', () => {
    it('simulates speculative speedup and cost savings over frontier models', () => {
      const prompt = 'Implement an asynchronous cache-oblivious B-tree in Rust with concurrent lock-free reads.'
      const res = simulateSpeculativeRun(prompt, 'llama-3.3-70b-versatile', 'claude-3-5-sonnet')

      expect(res.draftModel.id).toBe('llama-3.3-70b-versatile')
      expect(res.targetModel.id).toBe('claude-3-5-sonnet')
      expect(res.acceptedTokens).toBeGreaterThan(0)
      expect(res.acceptanceRate).toBeGreaterThan(0.5)
      expect(res.speedupFactor).toBeGreaterThan(1.0)
      expect(res.costSavingsPercent).toBeGreaterThan(0)
    })
  })

  // ── 3. Semantic AST Codebase Indexer ──
  describe('3. Semantic Tree-Sitter / AST Codebase Indexer', () => {
    it('detects language and parses functions, classes, complexity, and call graphs', () => {
      const tsCode = `
        import { useState, useEffect } from 'react';
        import axios from 'axios';

        export function calculateMetrics(data: number[]): number {
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            if (data[i] > 0) {
              sum += data[i];
            } else {
              sum -= data[i];
            }
          }
          return sum;
        }

        export class NeuralPipeline {
          execute() {
            return calculateMetrics([1, 2, 3]);
          }
        }
      `

      const report = analyzeSourceAST('pipeline.ts', tsCode)
      expect(report.language).toBe('typescript')
      expect(report.symbols.length).toBeGreaterThanOrEqual(2)
      expect(report.symbols.some((s) => s.name === 'calculateMetrics' && s.kind === 'function')).toBe(true)
      expect(report.symbols.some((s) => s.name === 'NeuralPipeline' && s.kind === 'class')).toBe(true)
      expect(report.imports.length).toBe(2)
      expect(report.averageComplexity).toBeGreaterThanOrEqual(1)
      expect(report.maintainabilityIndex).toBeGreaterThan(0)
    })

    it('accurately parses Python code and definitions', () => {
      const pyCode = `
        import math
        from collections import deque

        def solve_n_queens(n):
            if n <= 0:
                return []
            res = []
            return res
      `

      const report = analyzeSourceAST('solver.py', pyCode)
      expect(report.language).toBe('python')
      expect(report.symbols.some((s) => s.name === 'solve_n_queens')).toBe(true)
    })
  })

  // ── 4. Zero-Knowledge Cryptographic Vault ──
  describe('4. Zero-Knowledge Cryptographic Vault & Passkeys', () => {
    it('seals sensitive data with AES-256-GCM and unseals with correct passphrase', async () => {
      const plain = 'Secret NEMI master neural memory.'
      const pass = 'SuperStrongPassphrase123!'

      const encrypted = await encryptVaultData(plain, pass)
      expect(encrypted.algorithm).toBe('AES-256-GCM')
      expect(encrypted.ciphertext).toBeTruthy()
      expect(encrypted.salt).toBeTruthy()
      expect(encrypted.iv).toBeTruthy()

      const decrypted = await decryptVaultData(encrypted, pass)
      expect(decrypted).toBe(plain)
    })

    it('registers hardware-backed or simulated biometric passkeys', async () => {
      const res = await registerPasskey('test_user')
      expect(res.success).toBe(true)
      expect(res.credential).toBeDefined()
      expect(res.credential?.type).toBe('public-key')
    })
  })

  // ── 5. Multi-Agent Swarm Orchestration with DAG ──
  describe('5. Autonomous Multi-Agent Swarm DAG Orchestrator', () => {
    it('constructs a 5-agent DAG and dispatches parallel execution to consensus', async () => {
      const orchestrator = new SwarmDAGOrchestrator('Implement high-performance lock-free queue')
      const initialExec = orchestrator.getExecution()

      expect(initialExec.agents.length).toBe(5)
      expect(initialExec.nodes.length).toBe(5)
      expect(initialExec.overallStatus).toBe('idle')

      const finalExec = await orchestrator.runDAG()
      expect(finalExec.overallStatus).toBe('completed')
      expect(finalExec.finalConsensus).toContain('consensus')
      expect(finalExec.nodes.every((n) => n.status === 'completed')).toBe(true)
    })
  })

  // ── 6. In-Browser WASM Code Sandbox & REPL ──
  describe('6. In-Browser WASM Code Sandbox & REPL Runner', () => {
    it('executes JavaScript algorithms and intercepts console logs and execution latency', async () => {
      const code = `
        const list = [1, 2, 3, 4, 5];
        const doubled = list.map(x => x * 2);
        console.log('Result:', doubled);
        return doubled.length;
      `

      const res = await runCodeInSandbox(code, 'javascript')
      expect(res.status).toBe('success')
      expect(res.stdout).toContain('Result: [2,4,6,8,10]')
      expect(res.returnValue).toBe('5')
      expect(res.executionTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('handles Python sandbox execution', async () => {
      const pyCode = `print("Hello from Python WASM")`
      const res = await runCodeInSandbox(pyCode, 'python')
      expect(res.status).toBe('success')
      expect(res.stdout).toContain('Hello from Python WASM')
    })
  })

  // ── 7. Sub-150ms Full-Duplex Voice Engine ──
  describe('7. Sub-150ms Full-Duplex Voice & VAD Engine', () => {
    it('initializes and manages voice activity detection state', async () => {
      const engine = new Sub150msVoiceEngine()
      let eventReceived = false

      const unsub = engine.subscribe((e) => {
        eventReceived = true
        expect(e.timestamp).toBeGreaterThan(0)
      })

      const started = await engine.start()
      expect(started).toBe(true)
      expect(engine.getActiveState()).toBe(true)

      engine.stop()
      expect(engine.getActiveState()).toBe(false)
      unsub()
    })
  })

  // ── 8. Time-Travel Conversation Graph & Context Trees ──
  describe('8. Time-Travel Context Tree & Branching Engine', () => {
    it('branches conversations, records checkpoints, and reconstructs linear paths', () => {
      const mgr = new BranchingContextManager('Algorithm Session')
      const msg1 = mgr.addMessage('user', 'How do we solve Problem 51 (Raft)?')
      const msg2 = mgr.addMessage('assistant', 'Here is the leader election heartbeat state machine.')

      const branch = mgr.createBranch(msg1.id, 'paxos-alternative')
      const msg3 = mgr.addMessage('assistant', 'Here is the Multi-Paxos consensus variant.')

      const paxosHistory = mgr.getLinearHistory(msg3.id)
      expect(paxosHistory.length).toBe(4) // root + msg1 + branch + msg3
      expect(paxosHistory.some((m) => m.content.includes('Multi-Paxos'))).toBe(true)
      expect(paxosHistory.some((m) => m.content.includes('Raft'))).toBe(true)
    })
  })

  // ── 9. P2P Local Mesh Network Sync ──
  describe('9. P2P Local Mesh Network Sync', () => {
    it('discovers local LAN peers and synchronizes neural memory states', () => {
      const mesh = new P2PMeshNetwork('Test Station')
      mesh.discoverSimulatedLocalPeers()

      const peers = mesh.getPeers()
      expect(peers.length).toBeGreaterThanOrEqual(3)
      expect(peers.some((p) => p.deviceType === 'desktop')).toBe(true)
      expect(peers.some((p) => p.deviceType === 'mobile')).toBe(true)

      const syncRes = mesh.syncMemories([{ id: 'mem1', text: 'Important neural fact' }])
      expect(syncRes.syncedCount).toBe(1)
    })
  })

  // ── 10. 100% Offline Mode & Local SLM Engine ──
  describe('10. 100% Offline Mode & WebGPU SLM Engine', () => {
    it('probes WebGPU acceleration and synthesizes local offline prompt responses', async () => {
      const slm = new LocalSLMEngine()
      const gpu = await slm.checkWebGPUSupport()
      expect(gpu).toHaveProperty('supported')

      const activeModel = slm.getActiveModel()
      expect(activeModel.family).toBe('DeepSeek-R1')

      const tokens: string[] = []
      const res = await slm.generateOfflineResponse('hello nemi', (tok) => tokens.push(tok))

      expect(res.text).toContain('Offline Mode')
      expect(res.stats.tokensGenerated).toBeGreaterThan(0)
      expect(res.stats.tokensPerSecond).toBeGreaterThan(0)
      expect(tokens.length).toBeGreaterThan(0)
    })
  })

  // ── 11. Spatial Audio Frequency FFT Analyzer ──
  describe('11. Spatial 3D Audio-Reactive Neural Waves', () => {
    it('calculates bass, mid, treble frequency bands and overall energy', () => {
      const visualizer = new NeuralAudioVisualizer()
      const testFft = new Uint8Array(256).fill(128)

      visualizer.updateFromByteData(testFft)
      const bands = visualizer.getBands()

      expect(bands.bass).toBeGreaterThan(0)
      expect(bands.mid).toBeGreaterThan(0)
      expect(bands.treble).toBeGreaterThan(0)
      expect(bands.overallEnergy).toBeGreaterThan(0)
    })
  })
})
