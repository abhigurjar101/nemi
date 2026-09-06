import React, { useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

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
  idle:        new THREE.Color('#00bfff'),
  listening:   new THREE.Color('#00ffcc'),
  thinking:    new THREE.Color('#8b5cf6'),
  speaking:    new THREE.Color('#ec4899'),
  cortex:      new THREE.Color('#0088cc'),
  limbic:      new THREE.Color('#5533aa'),
  stem:        new THREE.Color('#cc3388'),
  cerebellum:  new THREE.Color('#0055bb'),
}

const NIM_NEURON_COLORS = {
  idle:        new THREE.Color('#39ff88'),
  listening:   new THREE.Color('#b7ff5a'),
  thinking:    new THREE.Color('#00e676'),
  speaking:    new THREE.Color('#7cffc4'),
  cortex:      new THREE.Color('#20d978'),
  limbic:      new THREE.Color('#00b85c'),
  stem:        new THREE.Color('#9cff57'),
  cerebellum:  new THREE.Color('#18f08a'),
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

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(connections.length * 6)
    const colors = new Float32Array(connections.length * 6)
    connections.forEach(([a, b], i) => {
      positions[i * 6]     = neurons[a].position.x
      positions[i * 6 + 1] = neurons[a].position.y
      positions[i * 6 + 2] = neurons[a].position.z
      positions[i * 6 + 3] = neurons[b].position.x
      positions[i * 6 + 4] = neurons[b].position.y
      positions[i * 6 + 5] = neurons[b].position.z
    })
    return { positions, colors }
  }, [neurons, connections])

  useFrame(({ clock }) => {
    if (!lineRef.current) return
    const t = clock.getElapsedTime()
    const colAttr = lineRef.current.geometry.getAttribute('color') as THREE.BufferAttribute

    const baseAlpha = isListening ? 0.35 : isThinking ? 0.45 : 0.18

    for (let i = 0; i < connections.length; i++) {
      const [a, b] = connections[i]
      const pulse = Math.sin(t * 0.8 + neurons[a].phase + neurons[b].phase) * 0.5 + 0.5
      const brightness = baseAlpha + pulse * 0.15

      // The NIM palette uses a vivid emerald-to-lime neural gradient.
      const mix = (neurons[a].position.y + 5) / 10
      const r = nimActive ? 0.05 + mix * 0.45 : mix * 0.55
      const g = nimActive ? 0.65 + (1 - mix) * 0.35 : 0.3 + (1 - mix) * 0.5
      const bv = nimActive ? 0.22 + (1 - mix) * 0.2 : 1.0

      for (let v = 0; v < 2; v++) {
        colAttr.setXYZ(i * 2 + v, r * brightness, g * brightness, bv * brightness)
      }
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
          if (nimActive) sig.color.set(isThinking ? '#b7ff5a' : '#39ff88')
          else if (isListening) sig.color.set('#00ffaa')
          else if (isThinking) sig.color.set('#a855f7')
          else if (isSpeaking) sig.color.set('#f472b6')
          else sig.color.set('#00d4ff')
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
      <ambientLight intensity={nimActive ? 0.22 : 0.15} color={nimActive ? '#063d1d' : '#001133'} />
      <pointLight ref={lightRef} position={[0, 5, 5]} intensity={nimActive ? 2.8 : 2} color={nimActive ? '#39ff88' : '#00aaff'} />
      <pointLight position={[-5, -3, 0]} intensity={nimActive ? 1.1 : 0.8} color={nimActive ? '#00b85c' : '#8833ff'} />
      <pointLight position={[5, 0, -3]} intensity={nimActive ? 0.9 : 0.6} color={nimActive ? '#b7ff5a' : '#ff0066'} />
    </>
  )
}

function NimEnergyHalo() {
  const haloRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!haloRef.current) return
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 1.8) * 0.035
    haloRef.current.scale.setScalar(pulse)
    const material = haloRef.current.material as THREE.MeshBasicMaterial
    material.opacity = 0.12 + (Math.sin(clock.getElapsedTime() * 2.2) + 1) * 0.035
  })

  return (
    <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -1.5]}>
      <torusGeometry args={[5.25, 0.035, 12, 96]} />
      <meshBasicMaterial color="#39ff88" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  )
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

  const neurons = useMemo(() => generateNeurons(NEURON_COUNT), [])
  const connections = useMemo(
    () => generateConnections(neurons, MAX_CONNECTION_DIST),
    [neurons]
  )

  return (
    <Canvas
      className="brain-canvas"
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      camera={{ position: [0, 0, 14], fov: 55, near: 0.1, far: 100 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'none', // pass through unless clicked
      }}
      onClick={onBrainClick}
    >
      <SceneLights isListening={isListening} isThinking={isThinking} nimActive={nimActive} />

      {nimActive && <NimEnergyHalo />}

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

      {/* Post-processing: Bloom glow makes the brain look alive */}
      <EffectComposer>
        <Bloom
          intensity={nimActive ? (isListening ? 3.2 : isThinking ? 2.8 : 2.2) : (isListening ? 2.5 : isThinking ? 2.0 : 1.4)}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          blendFunction={BlendFunction.ADD}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.0006, 0.0006] as unknown as THREE.Vector2}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>
    </Canvas>
  )
}
