import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { ZoomIn, ZoomOut, RotateCcw, Compass } from 'lucide-react'
import { updateOrbitalProximity } from '../services/orbitalMusic'

// ──────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────
interface NeuronData {
  position: THREE.Vector3
  phase: number
  frequency: number
  baseIntensity: number
  region: 'cortex' | 'limbic' | 'stem' | 'cerebellum'
}

interface SynapseSignal {
  startIdx: number
  endIdx: number
  progress: number   // 0→1 along the edge
  speed: number
  color: THREE.Color
  active: boolean
}

export interface NemiBrainProps {
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  onBrainClick?: () => void
  companionEnabled?: boolean
  audioLevel?: number | (() => number)
  nimActive?: boolean
}

// ──────────────────────────────────────────────────────────
// COMPANION MOTION ENGINE (Self-contained to preserve zero-coupling modularity)
// ──────────────────────────────────────────────────────────
interface BrainMotionValues {
  scale: [number, number, number]
  positionZ: number
  rotationX: number
  rotationSpeedY: number
  excitation: number
}

function computeBrainMotion(
  time: number,
  delta: number,
  current: { positionZ: number; rotationX: number },
  state: {
    isListening: boolean
    isThinking: boolean
    isSpeaking: boolean
    audioLevel: number
    companionEnabled: boolean
  }
): BrainMotionValues {
  if (!state.companionEnabled) {
    return {
      scale: [1, 1, 1],
      positionZ: 0,
      rotationX: 0,
      rotationSpeedY: 0.04,
      excitation: 1.0,
    }
  }

  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0
  const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0.016
  const safeAudio = Number.isFinite(state.audioLevel)
    ? Math.max(0, Math.min(state.audioLevel, 1.5))
    : 0

  const breathCycle = (2 * Math.PI) / 4.5
  const breathPhase = safeTime * breathCycle

  const baseScaleX = 1 + Math.sin(breathPhase) * 0.024
  const baseScaleY = 1 + Math.sin(breathPhase + 0.35) * 0.018
  const baseScaleZ = 1 + Math.sin(breathPhase - 0.25) * 0.022

  const audioPulse = safeAudio * 0.04 * Math.sin(safeTime * 12)
  const excitation =
    (state.isListening ? 1.3 : state.isThinking ? 1.15 : state.isSpeaking ? 1.25 : 1.0) +
    safeAudio * 0.4

  const scaleFactor = 1 + (excitation - 1) * 0.08
  const scale: [number, number, number] = [
    (baseScaleX + audioPulse) * scaleFactor,
    (baseScaleY + audioPulse) * scaleFactor,
    (baseScaleZ + audioPulse) * scaleFactor,
  ]

  const targetZ = state.isListening ? 1.35 : 0.0
  const targetPitch = state.isListening ? -0.075 : 0.0

  const lerpFactor = Math.min(1, Math.max(0, safeDelta * 3.8))
  const safeCurrentZ = Number.isFinite(current?.positionZ) ? current.positionZ : 0
  const safeCurrentPitch = Number.isFinite(current?.rotationX) ? current.rotationX : 0

  const clampedCurrentZ = Math.max(-5, Math.min(safeCurrentZ, 10))
  const positionZ = clampedCurrentZ + (targetZ - clampedCurrentZ) * lerpFactor
  const rotationX = safeCurrentPitch + (targetPitch - safeCurrentPitch) * lerpFactor
  const rotationSpeedY = state.isListening
    ? 0.008
    : 0.04 * (state.isThinking ? 1.5 : state.isSpeaking ? 1.2 : 1.0)

  return {
    scale,
    positionZ,
    rotationX,
    rotationSpeedY,
    excitation,
  }
}

// ──────────────────────────────────────────────────────────
// GENERATE NEURAL NETWORK TOPOLOGY
// ──────────────────────────────────────────────────────────
function generateNeurons(count: number): NeuronData[] {
  const neurons: NeuronData[] = []
  const regions: NeuronData['region'][] = ['cortex', 'limbic', 'stem', 'cerebellum']

  for (let i = 0; i < count; i++) {
    // Fill an ellipsoid (brain shape: wider than tall)
    let x: number, y: number, z: number
    do {
      x = (Math.random() * 2 - 1) * 5.0  // width
      y = (Math.random() * 2 - 1) * 3.8  // height
      z = (Math.random() * 2 - 1) * 4.2  // depth
    } while ((x / 5.0) ** 2 + (y / 3.8) ** 2 + (z / 4.2) ** 2 > 1)

    // Assign brain region based on position
    let region: NeuronData['region']
    if (Math.abs(y) > 2.5) region = 'cortex'
    else if (Math.abs(x) < 2 && Math.abs(z) < 2) region = 'limbic'
    else if (y < -2) region = 'stem'
    else region = 'cerebellum'

    neurons.push({
      position: new THREE.Vector3(x, y, z),
      phase: Math.random() * Math.PI * 2,
      frequency: 0.4 + Math.random() * 1.2,
      baseIntensity: 0.4 + Math.random() * 0.6,
      region,
    })
  }
  return neurons
}

function generateConnections(neurons: NeuronData[], maxDist: number): [number, number][] {
  const connections: [number, number][] = []
  for (let i = 0; i < neurons.length; i++) {
    let count = 0
    for (let j = i + 1; j < neurons.length && count < 5; j++) {
      if (neurons[i].position.distanceTo(neurons[j].position) < maxDist) {
        connections.push([i, j])
        count++
      }
    }
  }
  return connections
}

// ──────────────────────────────────────────────────────────
// NEURON MESH (instanced for performance)
// ──────────────────────────────────────────────────────────
const NEURON_COLORS = {
  idle:        new THREE.Color('#a855f7'),
  listening:   new THREE.Color('#c084fc'),
  thinking:    new THREE.Color('#d946ef'),
  speaking:    new THREE.Color('#f472b6'),
  cortex:      new THREE.Color('#8b5cf6'),
  limbic:      new THREE.Color('#9333ea'),
  stem:        new THREE.Color('#e879f9'),
  cerebellum:  new THREE.Color('#7c3aed'),
}

const NIM_NEURON_COLORS = {
  idle:        new THREE.Color('#c084fc'),
  listening:   new THREE.Color('#f5d0fe'),
  thinking:    new THREE.Color('#d946ef'),
  speaking:    new THREE.Color('#e879f9'),
  cortex:      new THREE.Color('#a855f7'),
  limbic:      new THREE.Color('#7c3aed'),
  stem:        new THREE.Color('#f0abfc'),
  cerebellum:  new THREE.Color('#8b5cf6'),
}

function Neurons({
  neurons,
  isListening,
  isThinking,
  isSpeaking,
  companionEnabled = false,
  audioLevel,
  nimActive = false,
}: {
  neurons: NeuronData[]
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  companionEnabled?: boolean
  audioLevel?: number | (() => number)
  nimActive?: boolean
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const colorArray = useMemo(
    () => new Float32Array(neurons.length * 3),
    [neurons.length]
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    let rawAudio = 0
    if (companionEnabled) {
      if (typeof audioLevel === 'function') {
        try {
          rawAudio = audioLevel()
        } catch {
          rawAudio = 0
        }
      } else if (typeof audioLevel === 'number') {
        rawAudio = audioLevel
      }
    }
    const safeAudio = Number.isFinite(rawAudio) ? Math.max(0, Math.min(rawAudio, 1.5)) : 0

    for (let i = 0; i < neurons.length; i++) {
      const n = neurons[i]
      const pulse = Math.sin(t * n.frequency + n.phase) * 0.5 + 0.5
      const excite =
        (isListening ? 1.3 : isThinking ? 1.1 : isSpeaking ? 1.2 : 1.0) +
        (companionEnabled ? safeAudio * 0.4 : 0)

      // Scale pulsing neurons
      const scale = (0.055 + pulse * 0.04) * excite * (nimActive ? 1.18 : 1)
      dummy.position.copy(n.position)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      // Color based on state + region
      const colors = nimActive ? NIM_NEURON_COLORS : NEURON_COLORS
      let baseColor: THREE.Color
      if (isListening && n.region === 'cortex') {
        baseColor = colors.listening
      } else if (isThinking && n.region === 'limbic') {
        baseColor = colors.thinking
      } else if (isSpeaking && n.region === 'stem') {
        baseColor = colors.speaking
      } else {
        baseColor = colors[n.region]
      }

      const intensity = n.baseIntensity * (0.5 + pulse * 0.5) * excite
      tempColor.copy(baseColor).multiplyScalar(intensity)
      colorArray[i * 3]     = tempColor.r
      colorArray[i * 3 + 1] = tempColor.g
      colorArray[i * 3 + 2] = tempColor.b
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, neurons.length]}
    >
      <sphereGeometry args={[1, 10, 10]} />
      <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
      <meshStandardMaterial
        emissive={nimActive ? NIM_NEURON_COLORS.idle : NEURON_COLORS.idle}
        emissiveIntensity={nimActive ? 2.4 : 1.5}
        color="#000020"
        vertexColors
        roughness={0.3}
        metalness={0.8}
      />
    </instancedMesh>
  )
}

// ──────────────────────────────────────────────────────────
// SYNAPSE CONNECTIONS (glowing lines)
// ──────────────────────────────────────────────────────────
function Synapses({
  neurons,
  connections,
  isListening,
  isThinking,
  nimActive = false,
}: {
  neurons: NeuronData[]
  connections: [number, number][]
  isListening: boolean
  isThinking: boolean
  nimActive?: boolean
}) {
  const lineRef = useRef<THREE.LineSegments>(null)
  const frameCount = useRef(0)

  const { positions, colors, baseColors } = useMemo(() => {
    const positions = new Float32Array(connections.length * 6)
    const colors = new Float32Array(connections.length * 6)
    const baseColors = new Float32Array(connections.length * 6)
    connections.forEach(([a, b], i) => {
      const idx = i * 6
      positions[idx]     = neurons[a].position.x
      positions[idx + 1] = neurons[a].position.y
      positions[idx + 2] = neurons[a].position.z
      positions[idx + 3] = neurons[b].position.x
      positions[idx + 4] = neurons[b].position.y
      positions[idx + 5] = neurons[b].position.z

      const mix = (neurons[a].position.y + 5) / 10
      const r = nimActive ? 0.05 + mix * 0.45 : mix * 0.55
      const g = nimActive ? 0.65 + (1 - mix) * 0.35 : 0.3 + (1 - mix) * 0.5
      const bv = nimActive ? 0.22 + (1 - mix) * 0.2 : 1.0

      baseColors[idx]     = r
      baseColors[idx + 1] = g
      baseColors[idx + 2] = bv
      baseColors[idx + 3] = r
      baseColors[idx + 4] = g
      baseColors[idx + 5] = bv

      colors[idx]     = r * 0.2
      colors[idx + 1] = g * 0.2
      colors[idx + 2] = bv * 0.2
      colors[idx + 3] = r * 0.2
      colors[idx + 4] = g * 0.2
      colors[idx + 5] = bv * 0.2
    })
    return { positions, colors, baseColors }
  }, [neurons, connections, nimActive])

  useFrame(({ clock }) => {
    if (!lineRef.current) return
    frameCount.current++
    // Throttle color buffer updates to every 2nd frame to save CPU
    if (frameCount.current % 2 !== 0) return

    const t = clock.getElapsedTime()
    const colAttr = lineRef.current.geometry.getAttribute('color') as THREE.BufferAttribute
    const colArray = colAttr.array as Float32Array
    const baseAlpha = isListening ? 0.35 : isThinking ? 0.45 : 0.18

    for (let i = 0; i < connections.length; i++) {
      const [a, b] = connections[i]
      const pulse = Math.sin(t * 0.8 + neurons[a].phase + neurons[b].phase) * 0.5 + 0.5
      const brightness = baseAlpha + pulse * 0.15
      const idx = i * 6

      const r = baseColors[idx] * brightness
      const g = baseColors[idx + 1] * brightness
      const bv = baseColors[idx + 2] * brightness

      colArray[idx]     = r
      colArray[idx + 1] = g
      colArray[idx + 2] = bv
      colArray[idx + 3] = r
      colArray[idx + 4] = g
      colArray[idx + 5] = bv
    }
    colAttr.needsUpdate = true
  })

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={connections.length * 2}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={connections.length * 2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={1}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  )
}

// ──────────────────────────────────────────────────────────
// SIGNAL PARTICLES (firing signals along synapses)
// ──────────────────────────────────────────────────────────
function SignalParticles({
  neurons,
  connections,
  isListening,
  isThinking,
  isSpeaking,
  nimActive = false,
}: {
  neurons: NeuronData[]
  connections: [number, number][]
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  nimActive?: boolean
}) {
  const MAX_SIGNALS = 60
  const signals = useRef<SynapseSignal[]>([])
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tempPos = useMemo(() => new THREE.Vector3(), [])

  // Initialize signal pool
  useMemo(() => {
    const firingRate = isListening ? 0.06 : isThinking ? 0.04 : isSpeaking ? 0.05 : 0.015
    signals.current = Array.from({ length: MAX_SIGNALS }, () => ({
      startIdx: Math.floor(Math.random() * connections.length),
      endIdx: 0,
      progress: Math.random(),
      speed: (0.3 + Math.random() * 0.7) * firingRate * 15,
      color: new THREE.Color(nimActive ? '#39ff88' : '#00d4ff'),
      active: Math.random() < firingRate * 10,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections.length])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const firingRate = isListening ? 0.12 : isThinking ? 0.08 : isSpeaking ? 0.1 : 0.03

    for (let i = 0; i < MAX_SIGNALS; i++) {
      const sig = signals.current[i]

      if (!sig.active) {
        if (Math.random() < firingRate) {
          sig.startIdx = Math.floor(Math.random() * connections.length)
          const [a, b] = connections[sig.startIdx]
          sig.endIdx = b
          sig.progress = 0
          sig.speed = 0.4 + Math.random() * 0.8
          sig.active = true
          if (nimActive) sig.color.set(isThinking ? '#f5d0fe' : '#c084fc')
          else if (isListening) sig.color.set('#e879f9')
          else if (isThinking) sig.color.set('#d946ef')
          else if (isSpeaking) sig.color.set('#f472b6')
          else sig.color.set('#a855f7')
        }

        // Hide inactive signal
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        continue
      }

      sig.progress += delta * sig.speed
      if (sig.progress >= 1) {
        sig.active = false
        dummy.scale.setScalar(0)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        continue
      }

      const [a, b] = connections[sig.startIdx]
      tempPos.lerpVectors(neurons[a].position, neurons[b].position, sig.progress)
      dummy.position.copy(tempPos)
      dummy.scale.setScalar(0.06 + Math.sin(sig.progress * Math.PI) * 0.04)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.setXYZ(i, sig.color.r, sig.color.g, sig.color.b)
        meshRef.current.instanceColor.needsUpdate = true
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_SIGNALS]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color={nimActive ? '#39ff88' : '#00d4ff'}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

// ──────────────────────────────────────────────────────────
// BRAIN GROUP (rotation + overall animation)
// ──────────────────────────────────────────────────────────
function BrainGroup({
  neurons,
  connections,
  isListening,
  isThinking,
  isSpeaking,
  companionEnabled = false,
  audioLevel,
  nimActive = false,
}: {
  neurons: NeuronData[]
  connections: [number, number][]
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  companionEnabled?: boolean
  audioLevel?: number | (() => number)
  nimActive?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()

    if (!companionEnabled) {
      // Graceful standard baseline fallback: slow majestic rotation & simple breathing
      groupRef.current.rotation.y = t * 0.04
      groupRef.current.rotation.x = Math.sin(t * 0.02) * 0.08
      const breathe = 1 + Math.sin(t * 0.5) * 0.012
      groupRef.current.scale.setScalar(breathe)
      groupRef.current.position.z = 0
      return
    }

    const currentZ = groupRef.current.position.z
    const currentPitch = groupRef.current.rotation.x
    let rawAudio = 0
    if (typeof audioLevel === 'function') {
      try {
        rawAudio = audioLevel()
      } catch {
        rawAudio = 0
      }
    } else if (typeof audioLevel === 'number') {
      rawAudio = audioLevel
    }

    const motion = computeBrainMotion(
      t,
      delta,
      { positionZ: currentZ, rotationX: currentPitch },
      {
        isListening,
        isThinking,
        isSpeaking,
        audioLevel: rawAudio,
        companionEnabled: true,
      }
    )

    groupRef.current.rotation.y += delta * motion.rotationSpeedY
    groupRef.current.rotation.x = motion.rotationX
    groupRef.current.position.z = motion.positionZ
    groupRef.current.scale.set(motion.scale[0], motion.scale[1], motion.scale[2])
  })

  return (
    <group ref={groupRef}>
      <Neurons
        neurons={neurons}
        isListening={isListening}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        companionEnabled={companionEnabled}
        audioLevel={audioLevel}
        nimActive={nimActive}
      />
      <Synapses
        neurons={neurons}
        connections={connections}
        isListening={isListening}
        isThinking={isThinking}
        nimActive={nimActive}
      />
      <SignalParticles
        neurons={neurons}
        connections={connections}
        isListening={isListening}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        nimActive={nimActive}
      />
    </group>
  )
}

// ──────────────────────────────────────────────────────────
// SCENE LIGHTS
// ──────────────────────────────────────────────────────────
function SceneLights({ isListening, isThinking, nimActive }: { isListening: boolean; isThinking: boolean; nimActive: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame(({ clock }) => {
    if (!lightRef.current) return
    const t = clock.getElapsedTime()
    lightRef.current.intensity = (isListening ? 2.5 : isThinking ? 2.0 : 1.5) +
      Math.sin(t * 2) * 0.3
  })

  return (
    <>
      <ambientLight intensity={nimActive ? 0.25 : 0.20} color={nimActive ? '#150529' : '#0d041c'} />
      <pointLight ref={lightRef} position={[0, 5, 5]} intensity={nimActive ? 2.8 : 2.2} color={nimActive ? '#c084fc' : '#a855f7'} />
      <pointLight position={[-5, -3, 0]} intensity={nimActive ? 1.4 : 1.0} color={nimActive ? '#8b5cf6' : '#7c3aed'} />
      <pointLight position={[5, 0, -3]} intensity={nimActive ? 1.1 : 0.8} color={nimActive ? '#d946ef' : '#9333ea'} />
    </>
  )
}

// ──────────────────────────────────────────────────────────
// ABHI GURJAR MINIMALIST MOVING ORBITAL RING
// ──────────────────────────────────────────────────────────
function createOrbitalTextTexture(nameText: string): THREE.CanvasTexture {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const canvas = document.createElement('canvas')
  canvas.width = isMobile ? 1024 : 4096
  canvas.height = isMobile ? 64 : 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Subtle luminous guiding baseline
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, canvas.height / 2)
  ctx.lineTo(canvas.width, canvas.height / 2)
  ctx.stroke()

  // High-class minimalist typography
  ctx.font = '600 32px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const items = [
    `✦  ${nameText}  ✦`,
    `NEMI NEURAL ARCHITECT`,
    `✦  ${nameText}  ✦`,
    `LIVING AI BRAIN`,
    `✦  ${nameText}  ✦`,
    `SYSTEM CORE ONLINE`,
    `✦  ${nameText}  ✦`,
    `SYNAPTIC MATRIX`,
  ]

  const segmentWidth = canvas.width / items.length
  items.forEach((item, idx) => {
    const x = idx * segmentWidth + segmentWidth / 2
    const isName = item.includes(nameText)

    if (isName) {
      // Sleek cyan-violet gradient with glow for ABHI GURJAR
      const grad = ctx.createLinearGradient(x - 150, 0, x + 150, 0)
      grad.addColorStop(0, '#c084fc') // soft purple
      grad.addColorStop(0.5, '#38bdf8') // luminous cyan
      grad.addColorStop(1, '#e879f9') // soft magenta
      ctx.fillStyle = grad
      ctx.shadowColor = 'rgba(56, 189, 248, 0.9)'
      ctx.shadowBlur = 12
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    }

    ctx.fillText(item, x, canvas.height / 2)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.repeat.set(1, 1)
  texture.needsUpdate = true
  return texture
}

function AbhiGurjarOrbitalRing({
  isListening,
  isThinking,
  isSpeaking,
  audioLevel,
}: {
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  audioLevel?: number | (() => number)
}) {
  const groupRef = useRef<THREE.Group>(null)
  const textureRef = useRef<THREE.CanvasTexture | null>(null)
  const ringMeshRef = useRef<THREE.Mesh>(null)

  const textTexture = useMemo(() => {
    const tex = createOrbitalTextTexture('ABHI GURJAR')
    textureRef.current = tex
    return tex
  }, [])

  useFrame(({ camera, clock }, delta) => {
    const t = clock.getElapsedTime()
    const camDist = camera.position.length()
    const prox = updateOrbitalProximity(camDist)

    // Smooth orbital rotation in 3D
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.PI / 14 + Math.sin(t * 0.3) * 0.04
      groupRef.current.rotation.y += delta * (0.08 + prox * 0.06)
    }

    // Smooth continuous text scrolling along the ring
    if (textureRef.current) {
      const scrollSpeed = (isListening ? 0.06 : isThinking ? 0.08 : isSpeaking ? 0.07 : 0.035) + prox * 0.04
      textureRef.current.offset.x -= delta * scrollSpeed
    }

    // Subtle breathing pulse, audio reactivity and proximity bloom
    if (ringMeshRef.current) {
      let rawAudio = 0
      if (typeof audioLevel === 'function') {
        try { rawAudio = audioLevel() } catch {}
      } else if (typeof audioLevel === 'number') {
        rawAudio = audioLevel
      }
      const audioPulse = Math.min(0.2, rawAudio * 0.15)
      const pulse = 1 + Math.sin(t * 1.5) * 0.015 + audioPulse + prox * 0.035
      ringMeshRef.current.scale.set(pulse, pulse, pulse)

      const mat = ringMeshRef.current.material as THREE.MeshBasicMaterial
      if (mat) {
        mat.opacity = 0.85 + prox * 0.15
      }
    }
  })

  return (
    <group ref={groupRef} rotation={[Math.PI / 2.3, 0, Math.PI / 14]} position={[0, 0, 0]}>
      {/* 1. Sleek Thin Outer Glowing Torus Wire */}
      <mesh>
        <torusGeometry args={[5.4, 0.02, 16, 128]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={isListening ? 0.6 : 0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Concentric Inner Accent Orbit Line */}
      <mesh>
        <torusGeometry args={[5.28, 0.008, 12, 96]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Cylindrical Moving Text Ribbon with ABHI GURJAR */}
      <mesh ref={ringMeshRef}>
        <cylinderGeometry args={[5.4, 5.4, 0.42, 128, 1, true]} />
        <meshBasicMaterial
          map={textTexture}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// ──────────────────────────────────────────────────────────
// CAMERA RIG & ORBIT CONTROLLER
// ──────────────────────────────────────────────────────────
interface CameraRigProps {
  resetSignal: number
  zoomSignal: { action: 'in' | 'out'; id: number } | null
}

function CameraRig({ resetSignal, zoomSignal }: CameraRigProps) {
  const controlsRef = useRef<any>(null)
  const { camera } = useThree()

  // Zoom In / Zoom Out trigger from HUD buttons
  useEffect(() => {
    if (!zoomSignal) return
    const controls = controlsRef.current
    if (!controls) return

    const factor = zoomSignal.action === 'in' ? 0.72 : 1.35
    const target = controls.target || new THREE.Vector3(0, 0, 0)
    const dir = new THREE.Vector3().subVectors(camera.position, target)
    let newDist = dir.length() * factor
    if (newDist < 1.2) newDist = 1.2
    if (newDist > 40) newDist = 40
    dir.setLength(newDist)
    camera.position.copy(target).add(dir)
    controls.update()
  }, [zoomSignal, camera])

  // Reset Camera trigger from HUD buttons
  useEffect(() => {
    if (resetSignal === 0) return
    const controls = controlsRef.current
    if (!controls) return

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    controls.target.set(0, 0, 0)
    camera.position.set(0, 0, isMobile ? 19.5 : 14)
    camera.up.set(0, 1, 0)
    controls.update()
  }, [resetSignal, camera])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enableZoom={true}
      enablePan={!isMobile}
      screenSpacePanning={!isMobile}
      minDistance={1.2}
      maxDistance={40}
      dampingFactor={0.06}
      enableDamping={true}
      rotateSpeed={isMobile ? 0.65 : 0.85}
      zoomSpeed={1.05}
      makeDefault
    />
  )
}

// ──────────────────────────────────────────────────────────
// RESILIENT 2D NEURAL ORB FALLBACK (Used if WebGL fails or is disabled)
// ──────────────────────────────────────────────────────────
export function NeuralOrbFallback({
  isListening,
  isThinking,
  isSpeaking,
  onBrainClick,
}: {
  isListening: boolean
  isThinking: boolean
  isSpeaking: boolean
  onBrainClick?: () => void
}) {
  return (
    <div
      onClick={onBrainClick}
      className="fixed inset-0 flex items-center justify-center pointer-events-auto cursor-pointer select-none z-0"
    >
      <div className="relative flex items-center justify-center">
        {/* Outer ambient glow */}
        <div
          className={`absolute w-72 h-72 rounded-full blur-3xl transition-all duration-700 ${
            isListening
              ? 'bg-cyan-500/25 scale-125'
              : isThinking
              ? 'bg-purple-500/25 scale-110'
              : isSpeaking
              ? 'bg-pink-500/25 scale-120'
              : 'bg-cyan-500/15 scale-100'
          }`}
        />

        {/* Outer pulsing ring */}
        <div
          className={`w-72 h-72 rounded-full border border-cyan-400/20 animate-pulse flex items-center justify-center transition-all duration-500 relative ${
            isListening ? 'border-cyan-400/50 scale-105' : ''
          }`}
        >
          {/* Orbital Moving Text Ring: ABHI GURJAR */}
          <svg className="absolute w-72 h-72 animate-spin pointer-events-none" style={{ animationDuration: '32s' }} viewBox="0 0 300 300">
            <defs>
              <path id="orbitPath" d="M 150, 150 m -120, 0 a 120,120 0 1,1 240,0 a 120,120 0 1,1 -240,0" fill="none" />
            </defs>
            <text fill="#38bdf8" fontSize="11" fontWeight="600" letterSpacing="4" opacity="0.85">
              <textPath href="#orbitPath" startOffset="0%">
                ✦ ABHI GURJAR ✦ NEMI NEURAL ARCHITECT ✦ ABHI GURJAR ✦
              </textPath>
            </text>
          </svg>

          {/* Middle rotating dashed ring */}
          <div
            className="w-52 h-52 rounded-full border border-dashed border-purple-400/30 animate-spin flex items-center justify-center"
            style={{ animationDuration: '24s' }}
          >
            {/* Inner glowing sphere */}
            <div
              className={`w-40 h-40 rounded-full shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center justify-center transition-all duration-500 ${
                isListening
                  ? 'bg-gradient-to-tr from-cyan-600 via-teal-500 to-cyan-300'
                  : isThinking
                  ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-400'
                  : isSpeaking
                  ? 'bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-400'
                  : 'bg-gradient-to-tr from-cyan-900 via-slate-800 to-cyan-700'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 blur-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export class BrainErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error: any) {
    console.warn('Brain 3D WebGL fallback triggered:', error)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ──────────────────────────────────────────────────────────
// MAIN NEMI BRAIN COMPONENT
// ──────────────────────────────────────────────────────────
export default function NemiBrain({
  isListening,
  isThinking,
  isSpeaking,
  onBrainClick,
  companionEnabled = false,
  audioLevel,
  nimActive = false,
}: NemiBrainProps) {
  const NEURON_COUNT = 220
  const MAX_CONNECTION_DIST = 2.8

  const [resetSignal, setResetSignal] = useState(0)
  const [zoomSignal, setZoomSignal] = useState<{ action: 'in' | 'out'; id: number } | null>(null)

  const neurons = useMemo(() => generateNeurons(NEURON_COUNT), [])
  const connections = useMemo(
    () => generateConnections(neurons, MAX_CONNECTION_DIST),
    [neurons]
  )

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return
    const dx = Math.abs(e.clientX - pointerStartRef.current.x)
    const dy = Math.abs(e.clientY - pointerStartRef.current.y)
    pointerStartRef.current = null

    // Only fire brain click if pointer moved less than 6px (intentional click vs 3D drag)
    if (dx < 6 && dy < 6 && onBrainClick) {
      onBrainClick()
    }
  }

  const [webGlSupported] = useState<boolean>(() => {
    try {
      const canvas = document.createElement('canvas')
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
    } catch {
      return false
    }
  })

  const fallbackNode = (
    <NeuralOrbFallback
      isListening={isListening}
      isThinking={isThinking}
      isSpeaking={isSpeaking}
      onBrainClick={onBrainClick}
    />
  )

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {!webGlSupported ? (
        fallbackNode
      ) : (
        <BrainErrorBoundary fallback={fallbackNode}>
          <Canvas
        className="brain-canvas pointer-events-auto"
        dpr={isMobile ? [1, 1.2] : [1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        camera={{ position: [0, 0, isMobile ? 19.5 : 14], fov: isMobile ? 58 : 55, near: 0.1, far: 100 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          touchAction: 'manipulation',
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <CameraRig resetSignal={resetSignal} zoomSignal={zoomSignal} />

        <SceneLights isListening={isListening} isThinking={isThinking} nimActive={nimActive} />

        <AbhiGurjarOrbitalRing
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          audioLevel={audioLevel}
        />

        <group scale={nimActive ? 1.35 : 1}>
          <BrainGroup
            neurons={neurons}
            connections={connections}
            isListening={isListening}
            isThinking={isThinking}
            isSpeaking={isSpeaking}
            companionEnabled={companionEnabled}
            audioLevel={audioLevel}
            nimActive={nimActive}
          />
        </group>

        {/* Optimized Post-processing: Fast Mipmap Bloom without costly multi-pass convolution */}
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={isMobile ? (nimActive ? 1.2 : 0.8) : (nimActive ? (isListening ? 2.8 : isThinking ? 2.4 : 1.8) : (isListening ? 2.2 : isThinking ? 1.8 : 1.2))}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.85}
            mipmapBlur
            blendFunction={BlendFunction.ADD}
          />
        </EffectComposer>
      </Canvas>
        </BrainErrorBoundary>
      )}

      {/* ── Sleek Minimalist 3D Brain Camera HUD (Fixed Lower-Left) ── */}
      <div
        className="fixed bottom-28 sm:bottom-6 left-3 sm:left-6 z-30 pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel bg-slate-950/85 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.75)] select-none"
        role="toolbar"
        aria-label="3D Brain Navigation Controls"
      >
        <button
          type="button"
          onClick={() => setZoomSignal((prev) => ({ action: 'in', id: (prev?.id || 0) + 1 }))}
          aria-label="Zoom in on NEMI Brain"
          className="p-2 min-h-[36px] min-w-[36px] rounded-xl text-white/60 hover:text-cyan-300 hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          title="Zoom In (Scroll up, pinch, or click)"
        >
          <ZoomIn className="w-4 h-4" strokeWidth={1.65} />
        </button>

        <button
          type="button"
          onClick={() => setZoomSignal((prev) => ({ action: 'out', id: (prev?.id || 0) + 1 }))}
          aria-label="Zoom out of NEMI Brain"
          className="p-2 min-h-[36px] min-w-[36px] rounded-xl text-white/60 hover:text-cyan-300 hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          title="Zoom Out (Scroll down, pinch, or click)"
        >
          <ZoomOut className="w-4 h-4" strokeWidth={1.65} />
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-0.5" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setResetSignal((c) => c + 1)}
          aria-label="Reset Brain Camera View"
          className="p-2 min-h-[36px] min-w-[36px] rounded-xl text-white/60 hover:text-purple-300 hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
          title="Reset 3D View (Default perspective)"
        >
          <RotateCcw className="w-4 h-4" strokeWidth={1.65} />
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-0.5 hidden sm:block" aria-hidden="true" />

        {/* Minimal hint badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/40">
          <Compass className="w-3.5 h-3.5 text-purple-400/70" strokeWidth={1.65} />
          <span>Drag to orbit • Scroll to zoom</span>
        </div>
      </div>
    </div>
  )
}
