import { vi } from 'vitest'

// Ensure window is defined globally in Node for Web Audio API tests
if (typeof (globalThis as any).window === 'undefined') {
  ;(globalThis as any).window = globalThis
}

/**
 * Reusable Mock Web Audio API Fixture
 * Provides opaque-box simulation and call-spying for Web Audio synthesis,
 * dynamics compression, frequency analysis, and audio playback.
 */

export class MockAudioParam {
  value: number
  defaultValue: number
  minValue: number
  maxValue: number
  events: Array<{ type: string; value?: number; time: number; extra?: any }> = []

  constructor(defaultValue = 1) {
    this.value = defaultValue
    this.defaultValue = defaultValue
    this.minValue = -3.4028235e38
    this.maxValue = 3.4028235e38
  }

  setValueAtTime(value: number, startTime: number): this {
    this.value = value
    this.events.push({ type: 'setValueAtTime', value, time: startTime })
    return this
  }

  linearRampToValueAtTime(value: number, endTime: number): this {
    this.value = value
    this.events.push({ type: 'linearRampToValueAtTime', value, time: endTime })
    return this
  }

  exponentialRampToValueAtTime(value: number, endTime: number): this {
    this.value = value
    this.events.push({ type: 'exponentialRampToValueAtTime', value, time: endTime })
    return this
  }

  setTargetAtTime(target: number, startTime: number, timeConstant: number): this {
    this.value = target
    this.events.push({ type: 'setTargetAtTime', value: target, time: startTime, extra: { timeConstant } })
    return this
  }

  cancelScheduledValues(startTime: number): this {
    this.events.push({ type: 'cancelScheduledValues', time: startTime })
    return this
  }

  setValueCurveAtTime(values: Float32Array | number[], startTime: number, duration: number): this {
    this.events.push({ type: 'setValueCurveAtTime', time: startTime, extra: { values, duration } })
    return this
  }
}

export class MockAudioNode {
  context: MockAudioContext
  numberOfInputs: number = 1
  numberOfOutputs: number = 1
  connections: Array<MockAudioNode | MockAudioParam> = []

  constructor(context: MockAudioContext) {
    this.context = context
  }

  connect(destination: MockAudioNode | MockAudioParam): any {
    this.connections.push(destination)
    return destination
  }

  disconnect(destination?: MockAudioNode | MockAudioParam): void {
    if (!destination) {
      this.connections = []
    } else {
      this.connections = this.connections.filter((c) => c !== destination)
    }
  }
}

export class MockAudioDestinationNode extends MockAudioNode {
  maxChannelCount = 2
  constructor(context: MockAudioContext) {
    super(context)
  }
}

export class MockGainNode extends MockAudioNode {
  gain: MockAudioParam
  constructor(context: MockAudioContext) {
    super(context)
    this.gain = new MockAudioParam(1.0)
  }
}

export class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine'
  frequency: MockAudioParam
  detune: MockAudioParam
  started = false
  stopped = false
  startTime: number | null = null
  stopTime: number | null = null
  onended: ((this: MockOscillatorNode, ev: Event) => any) | null = null

  constructor(context: MockAudioContext) {
    super(context)
    this.frequency = new MockAudioParam(440)
    this.detune = new MockAudioParam(0)
  }

  start(time = 0): void {
    if (this.started) throw new Error('InvalidStateError: Oscillator already started')
    this.started = true
    this.startTime = time
  }

  stop(time = 0): void {
    if (!this.started) throw new Error('InvalidStateError: Cannot stop unstarted oscillator')
    this.stopped = true
    this.stopTime = time
  }
}

export class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass'
  frequency: MockAudioParam
  detune: MockAudioParam
  Q: MockAudioParam
  gain: MockAudioParam

  constructor(context: MockAudioContext) {
    super(context)
    this.frequency = new MockAudioParam(350)
    this.detune = new MockAudioParam(0)
    this.Q = new MockAudioParam(1)
    this.gain = new MockAudioParam(0)
  }
}

export class MockDynamicsCompressorNode extends MockAudioNode {
  threshold: MockAudioParam
  knee: MockAudioParam
  ratio: MockAudioParam
  attack: MockAudioParam
  release: MockAudioParam
  reduction: number = 0

  constructor(context: MockAudioContext) {
    super(context)
    this.threshold = new MockAudioParam(-24)
    this.knee = new MockAudioParam(30)
    this.ratio = new MockAudioParam(12)
    this.attack = new MockAudioParam(0.003)
    this.release = new MockAudioParam(0.25)
  }
}

export class MockAnalyserNode extends MockAudioNode {
  fftSize = 2048
  minDecibels = -100
  maxDecibels = -30
  smoothingTimeConstant = 0.8
  mockData: Uint8Array | null = null

  constructor(context: MockAudioContext) {
    super(context)
  }

  get frequencyBinCount(): number {
    return this.fftSize / 2
  }

  setMockFrequencyData(data: number[] | Uint8Array): void {
    this.mockData = data instanceof Uint8Array ? data : new Uint8Array(data)
  }

  getByteFrequencyData(array: Uint8Array): void {
    if (this.mockData) {
      const len = Math.min(array.length, this.mockData.length)
      for (let i = 0; i < len; i++) {
        array[i] = this.mockData[i]
      }
      for (let i = len; i < array.length; i++) {
        array[i] = 0
      }
    } else {
      array.fill(0)
    }
  }

  getByteTimeDomainData(array: Uint8Array): void {
    array.fill(128)
  }

  getFloatFrequencyData(array: Float32Array): void {
    array.fill(-100)
  }

  getFloatTimeDomainData(array: Float32Array): void {
    array.fill(0)
  }
}

export class MockAudioBuffer {
  sampleRate: number
  length: number
  duration: number
  numberOfChannels: number
  private channels: Float32Array[]

  constructor(options: { numberOfChannels?: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels || 1
    this.length = options.length
    this.sampleRate = options.sampleRate
    this.duration = this.length / this.sampleRate
    this.channels = Array.from({ length: this.numberOfChannels }, () => new Float32Array(this.length))
  }

  getChannelData(channel: number): Float32Array {
    if (channel >= this.numberOfChannels) {
      throw new Error(`IndexSizeError: channel ${channel} exceeds ${this.numberOfChannels}`)
    }
    return this.channels[channel]
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset = 0): void {
    const src = this.getChannelData(channelNumber)
    destination.set(src.subarray(bufferOffset, bufferOffset + destination.length))
  }

  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset = 0): void {
    const dst = this.getChannelData(channelNumber)
    dst.set(source, bufferOffset)
  }
}

export class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: MockAudioBuffer | null = null
  playbackRate: MockAudioParam
  loop = false
  loopStart = 0
  loopEnd = 0
  started = false
  stopped = false
  onended: ((this: MockAudioBufferSourceNode, ev: Event) => any) | null = null

  constructor(context: MockAudioContext) {
    super(context)
    this.playbackRate = new MockAudioParam(1)
  }

  start(time = 0): void {
    this.started = true
  }

  stop(time = 0): void {
    this.stopped = true
    if (this.onended) {
      this.onended.call(this, new Event('ended'))
    }
  }
}

// Global registry of all created audio nodes across all contexts
export const audioRegistry = {
  oscillators: [] as MockOscillatorNode[],
  gainNodes: [] as MockGainNode[],
  filters: [] as MockBiquadFilterNode[],
  compressors: [] as MockDynamicsCompressorNode[],
  analysers: [] as MockAnalyserNode[],
  bufferSources: [] as MockAudioBufferSourceNode[],
  reset() {
    this.oscillators = []
    this.gainNodes = []
    this.filters = []
    this.compressors = []
    this.analysers = []
    this.bufferSources = []
  },
}

export class MockAudioContext {
  static allInstances: MockAudioContext[] = []

  state: AudioContextState = 'running'
  currentTime = 0
  sampleRate = 44100
  destination: MockAudioDestinationNode

  createdOscillators: MockOscillatorNode[] = []
  createdGainNodes: MockGainNode[] = []
  createdBiquadFilters: MockBiquadFilterNode[] = []
  createdCompressors: MockDynamicsCompressorNode[] = []
  createdAnalysers: MockAnalyserNode[] = []
  createdBufferSources: MockAudioBufferSourceNode[] = []

  constructor(options?: { sampleRate?: number }) {
    if (options?.sampleRate) this.sampleRate = options.sampleRate
    this.destination = new MockAudioDestinationNode(this)
    MockAudioContext.allInstances.push(this)
  }

  createOscillator(): MockOscillatorNode {
    const osc = new MockOscillatorNode(this)
    this.createdOscillators.push(osc)
    audioRegistry.oscillators.push(osc)
    return osc
  }

  createGain(): MockGainNode {
    const gain = new MockGainNode(this)
    this.createdGainNodes.push(gain)
    audioRegistry.gainNodes.push(gain)
    return gain
  }

  createBiquadFilter(): MockBiquadFilterNode {
    const filter = new MockBiquadFilterNode(this)
    this.createdBiquadFilters.push(filter)
    audioRegistry.filters.push(filter)
    return filter
  }

  createDynamicsCompressor(): MockDynamicsCompressorNode {
    const comp = new MockDynamicsCompressorNode(this)
    this.createdCompressors.push(comp)
    audioRegistry.compressors.push(comp)
    return comp
  }

  createAnalyser(): MockAnalyserNode {
    const analyser = new MockAnalyserNode(this)
    this.createdAnalysers.push(analyser)
    audioRegistry.analysers.push(analyser)
    return analyser
  }

  createBufferSource(): MockAudioBufferSourceNode {
    const src = new MockAudioBufferSourceNode(this)
    this.createdBufferSources.push(src)
    audioRegistry.bufferSources.push(src)
    return src
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate })
  }

  async decodeAudioData(
    audioData: ArrayBuffer,
    successCallback?: (buffer: MockAudioBuffer) => void
  ): Promise<MockAudioBuffer> {
    const buf = new MockAudioBuffer({ numberOfChannels: 1, length: audioData.byteLength / 2, sampleRate: 24000 })
    if (successCallback) successCallback(buf)
    return buf
  }

  async resume(): Promise<void> {
    this.state = 'running'
  }

  async suspend(): Promise<void> {
    this.state = 'suspended'
  }

  async close(): Promise<void> {
    this.state = 'closed'
  }

  advanceTime(seconds: number): void {
    this.currentTime += seconds
  }
}

// Global installation helpers
let activeContext: MockAudioContext | null = null

export function installMockWebAudio(): MockAudioContext {
  const g = typeof window !== 'undefined' ? (window as any) : (globalThis as any)
  g.window = g

  audioRegistry.reset()

  const MockCtor = function (this: any, options?: any) {
    const ctx = new MockAudioContext(options)
    activeContext = ctx
    return ctx
  } as any

  g.AudioContext = MockCtor
  g.webkitAudioContext = MockCtor
  ;(globalThis as any).AudioContext = MockCtor
  ;(globalThis as any).webkitAudioContext = MockCtor

  if (!activeContext) {
    activeContext = new MockAudioContext()
  }

  return activeContext
}

export function restoreMockWebAudio(): void {
  audioRegistry.reset()
}

export function getLastMockAudioContext(): MockAudioContext {
  if (MockAudioContext.allInstances.length > 0) {
    return MockAudioContext.allInstances[MockAudioContext.allInstances.length - 1]
  }
  if (!activeContext) {
    activeContext = new MockAudioContext()
  }
  return activeContext
}
