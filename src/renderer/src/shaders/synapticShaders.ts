/**
 * NEMI WebGPU / WebGL Neural Particle & Synaptic GLSL Shaders
 * Provides volumetric particle turbulence, audio-reactive frequency pulse uniforms,
 * synaptic firing waves, and high-DPI glow rendering for the 3D brain canvas.
 */

export const SynapticVertexShader = `
  uniform float uTime;
  uniform float uAudioBass;
  uniform float uAudioMid;
  uniform float uAudioTreble;
  uniform float uTokenPulse;
  
  attribute float aScale;
  attribute vec3 aVelocity;
  attribute float aSynapsePhase;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 transformed = position;
    
    // Volumetric harmonic turbulence
    float displacement = sin(transformed.y * 3.0 + uTime * 2.0 + aSynapsePhase) * 0.08 * (1.0 + uAudioBass * 2.0);
    displacement += cos(transformed.x * 2.5 + uTime * 1.5) * 0.06 * (1.0 + uAudioMid);
    
    transformed += normal * displacement;
    
    // Synaptic firing impulse
    float pulse = sin(uTime * 4.0 + aSynapsePhase * 6.28) * uTokenPulse;
    transformed += aVelocity * pulse * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Distance attenuation
    gl_PointSize = aScale * (300.0 / -mvPosition.z) * (1.0 + uAudioBass * 0.8 + uTokenPulse * 0.5);

    // Color gradient based on depth & audio frequency
    vec3 cyanColor = vec3(0.12, 0.74, 0.98);
    vec3 violetColor = vec3(0.68, 0.28, 0.98);
    vec3 goldColor = vec3(1.0, 0.84, 0.2);

    vec3 finalColor = mix(cyanColor, violetColor, sin(transformed.z * 2.0 + uTime) * 0.5 + 0.5);
    finalColor = mix(finalColor, goldColor, uTokenPulse * 0.7 + uAudioTreble * 0.4);

    vColor = finalColor;
    vAlpha = clamp(0.4 + uAudioMid * 0.5 + uTokenPulse * 0.4, 0.2, 1.0);
  }
`

export const SynapticFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Smooth circular particle with soft radial falloff
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float glow = smoothstep(0.5, 0.0, dist);
    float core = smoothstep(0.2, 0.0, dist);

    vec3 col = vColor + vec3(core * 0.5);
    gl_FragColor = vec4(col, glow * vAlpha);
  }
`
