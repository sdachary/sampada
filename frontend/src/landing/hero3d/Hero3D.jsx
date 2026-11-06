import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'

// Coin mark component - procedural geometry with "सं"
function CoinMark({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const groupRef = useRef()

  useEffect(() => {
    // The mark texture could be generated via canvas
    // For now using a simple text approach
  }, [])

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* The coin body - cylinder */}
      <mesh
        castShadow={false}
        receiveShadow={false}
      >
        <cylinderGeometry args={[1.2, 1.2, 0.15, 64]} />
        <meshStandardMaterial
          color="#ed6f5c"
          metalness={0.3}
          roughness={0.7}
          side={2}
        />
      </mesh>

      {/* The "सं" mark on top face */}
      <Html
        position={[0, 0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        style={{
          fontFamily: '"Noto Sans Devanagari", sans-serif',
          fontSize: '2.5rem',
          fontWeight: 700,
          color: '#ed6f5c',
          textShadow: '0 0 8px rgba(237,111,92,0.5)',
          pointerEvents: 'none',
          transform: 'scale(1)',
        }}
      >
        सं
      </Html>

      {/* Bottom face mark (subtle) */}
      <Html
        position={[0, -0.08, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        style={{
          fontFamily: '"Noto Sans Devanagari", sans-serif',
          fontSize: '1.5rem',
          fontWeight: 500,
          color: '#ed6f5c',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      >
        संपदा
      </Html>
    </group>
  )
}

// Zero ring - the target ring the coin settles onto
function ZeroRing({ position = [0, -2, 0], radius = 1.5 }) {
  return (
    <group position={position}>
      <mesh>
        <ringGeometry args={[radius * 0.85, radius, 64]} />
        <meshBasicMaterial
          color="#ed6f5c"
          transparent
          opacity={0.15}
          side={2}
          depthWrite={false}
        />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <ringGeometry args={[radius * 0.6, radius * 0.85, 64]} />
        <meshBasicMaterial
          color="#ed6f5c"
          transparent
          opacity={0.08}
          side={2}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// Ambient particles for atmosphere
function AmbientParticles({ count = 60, spread = 8 }) {
  const pointsRef = useRef()
  const positions = useRef(new Float32Array(count * 3))

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * spread
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * spread
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * spread
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  }, [count, spread])

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} itemSize={3} array={positions.current} />
      </bufferGeometry>
      <pointsMaterial
        color="#ed6f5c"
        size={0.02}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  )
}

// Main scene component
function Scene({ scrollProgress = 0, prefersReducedMotion = false }) {
  const coinRef = useRef()
  const ringRef = useRef()

  // Animation loop - drive coin position/rotation from scrollProgress
  useFrame((state, delta) => {
    if (!coinRef.current || prefersReducedMotion) return

    const progress = Math.max(0, Math.min(1, scrollProgress))

    // Coin starts at ring level (y=0) and descends slightly as scroll goes 0→1
    // Matches poster: coin sits on the zero ring
    const startY = 0
    const endY = -0.3 // Slightly below ring level
    coinRef.current.position.y = startY + (endY - startY) * progress

    // Gentle tilt based on progress (swaying as it descends)
    const maxTilt = Math.PI / 12 // 15 degrees
    coinRef.current.rotation.x = Math.sin(progress * Math.PI * 2) * maxTilt * 0.3
    coinRef.current.rotation.z = Math.cos(progress * Math.PI * 1.5) * maxTilt * 0.2

    // Subtle rotation around Y (slow spin)
    coinRef.current.rotation.y += delta * 0.15

    // Ring pulse when coin approaches bottom
    if (ringRef.current && progress > 0.7) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1 * (progress - 0.7) / 0.3
      ringRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight color="#f7f1de" intensity={0.8} />
      <directionalLight
        position={[3, 5, 3]}
        color="#ffffff"
        intensity={1.2}
        castShadow={false}
      />
      <directionalLight
        position={[-2, 3, -2]}
        color="#fff8f0"
        intensity={0.4}
        castShadow={false}
      />

      {/* Zero ring - the target */}
      <ZeroRing ref={ringRef} />

      {/* Coin with "सं" mark */}
      <CoinMark ref={coinRef} />

      {/* Ambient particles */}
      <AmbientParticles count={40} spread={10} />
    </>
  )
}

// Canvas wrapper with performance settings
function Hero3DCanvas({ scrollProgress, prefersReducedMotion }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Canvas
      camera={{ position: [0, 1.2, 3.5], fov: 30 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      dpr={[1, 1.5]}
      frameloop={prefersReducedMotion ? 'never' : 'demand'}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        // Explicitly set clear color to transparent to avoid black background
        gl.clearColor(0, 0, 0, 0)
      }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <Scene scrollProgress={scrollProgress} prefersReducedMotion={prefersReducedMotion} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={true}
        autoRotate={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  )
}

// Main Hero3D component with scroll tracking
const Hero3DComponent = forwardRef((props, ref) => {
  const { onReady, style, ...rest } = props
  const [scrollProgress, setScrollProgress] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const canvasRef = useRef(null)

  useImperativeHandle(ref, () => ({
    canvas: canvasRef.current,
  }))

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener?.('change', handler)
    return () => mediaQuery.removeEventListener?.('change', handler)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('landing-hero')
      if (!hero) return

      const rect = hero.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const heroHeight = rect.height

      // Progress from when hero top enters viewport to when hero bottom leaves
      const _start = -heroHeight
      const _end = viewportHeight
      const progress = Math.max(0, Math.min(1, (viewportHeight - rect.top) / (heroHeight + viewportHeight)))

      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Call onReady when canvas is mounted
  useEffect(() => {
    if (onReady && canvasRef.current) {
      onReady()
    }
  }, [onReady])

  return (
    <Hero3DCanvas
      ref={canvasRef}
      scrollProgress={scrollProgress}
      prefersReducedMotion={prefersReducedMotion}
      style={style}
      {...rest}
    />
  )
})

Hero3DComponent.displayName = 'Hero3D'

export default Hero3DComponent

// Error boundary wrapper
export function Hero3DWithFallback() {
  const [hasError, setHasError] = useState(false)

  if (hasError) return null

  return (
    <Hero3DComponent
      onError={(e) => {
        console.error('Hero3D error:', e)
        setHasError(true)
      }}
    />
  )
}