/**
 * NEMI 3D Audio-Reactive Neural Visualizer Service
 * Connects Web Audio frequency FFT spectrum to Three.js particle shader uniforms.
 */

export interface AudioFrequencyBands {
  bass: number // 0 to 1
  mid: number // 0 to 1
  treble: number // 0 to 1
  spectralCentroid: number
  overallEnergy: number
}

export class NeuralAudioVisualizer {
  private bands: AudioFrequencyBands = {
    bass: 0,
    mid: 0,
    treble: 0,
    spectralCentroid: 0,
    overallEnergy: 0,
  }
  private listeners: Set<(bands: AudioFrequencyBands) => void> = new Set()

  public getBands(): AudioFrequencyBands {
    return this.bands
  }

  public subscribe(cb: (bands: AudioFrequencyBands) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  public updateFromByteData(frequencyData: Uint8Array): void {
    const len = frequencyData.length
    if (len === 0) return

    let bassSum = 0
    let midSum = 0
    let trebleSum = 0
    let totalSum = 0

    const bassEnd = Math.floor(len * 0.15)
    const midEnd = Math.floor(len * 0.6)

    for (let i = 0; i < len; i++) {
      const val = frequencyData[i] / 255
      totalSum += val
      if (i < bassEnd) bassSum += val
      else if (i < midEnd) midSum += val
      else trebleSum += val
    }

    this.bands = {
      bass: Math.min(1, (bassSum / Math.max(1, bassEnd)) * 1.5),
      mid: Math.min(1, (midSum / Math.max(1, midEnd - bassEnd)) * 1.2),
      treble: Math.min(1, (trebleSum / Math.max(1, len - midEnd)) * 1.8),
      spectralCentroid: totalSum > 0 ? (midSum + trebleSum * 2) / (totalSum * 2) : 0,
      overallEnergy: Math.min(1, totalSum / len),
    }

    this.listeners.forEach((cb) => cb(this.bands))
  }

  public simulateAudioPulse(energy = 0.8): void {
    this.bands = {
      bass: energy,
      mid: energy * 0.85,
      treble: energy * 0.6,
      spectralCentroid: 0.5,
      overallEnergy: energy,
    }
    this.listeners.forEach((cb) => cb(this.bands))
  }
}

export const globalAudioVisualizer = new NeuralAudioVisualizer()
