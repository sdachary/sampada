import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Coin face texture — "सं" baked into the top face so it scales in 3D
// (drei <Html> text stays screen-sized, which made the coin read as a blob).
function makeFaceTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(216, 200, 40, 256, 256, 280)
  grad.addColorStop(0, '#f4a48f')
  grad.addColorStop(1, '#c45a4a')
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)
  g.fillStyle = '#7d2b1f'
  g.font = 'bold 230px "Noto Sans Devanagari", "Nirmala UI", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('सं', 256, 268)
  return new THREE.CanvasTexture(c)
}

// Coin mark component - procedural geometry with "सं"
function CoinMark({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const groupRef = useRef()
  const faceTex = useMemo(makeFaceTexture, [])

  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: '#ed6f5c', metalness: 0.3, roughness: 0.7, side: THREE.DoubleSide })
    const face = new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.3, roughness: 0.7, side: THREE.DoubleSide })
    const bottom = new THREE.MeshStandardMaterial({ color: '#c45a4a', metalness: 0.3, roughness: 0.7, side: THREE.DoubleSide })
    return [side, face, bottom]
  }, [faceTex])

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* The coin body - cylinder; material array = [side, top face, bottom face] */}
      <mesh
        material={materials}
        castShadow={false}
        receiveShadow={false}
      >
        <cylinderGeometry args={[1.2, 1.2, 0.15, 64]} />
      </mesh>
    </group>
  )
}

// Zero ring - the target ring the coin settles onto
const ZeroRing = forwardRef(function ZeroRing({ position = [0, -0.85, 0], radius = 1.5 }, ref) {
  return (
    <group ref={ref} position={position}>
      <mesh>
        <ringGeometry args={[radius * 0.85, radius, 64]} />
        <meshBasicMaterial
          color="#ed6f5c"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
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
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
})

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

    // Intro drop: coin settles onto the ring in the first ~2s (easeOutCubic),
    // so there's visible motion right after the poster cross-fade.
    const t = state.clock.elapsedTime
    const k = Math.min(t / 2.2, 1)
    const ease = 1 - Math.pow(1 - k, 3)
    const drop = 0.5 * (1 - ease)

    // Coin floats above the ring at load (matches poster), settles to rest,
    // and drifts down into the zero as the hero scrolls out (progress 0→1).
    coinRef.current.position.y = drop - 0.55 - 0.25 * progress

    // Gentle tilt based on progress plus a slow idle sway
    const maxTilt = Math.PI / 12 // 15 degrees
    coinRef.current.rotation.x = Math.sin(progress * Math.PI) * maxTilt * 0.3 + Math.sin(t * 0.6) * 0.02
    coinRef.current.rotation.z = Math.cos(progress * Math.PI) * maxTilt * 0.2

    // Subtle rotation around Y (slow spin)
    coinRef.current.rotation.y += delta * 0.15

    // Ring pulse when coin settles / near the zero
    if (ringRef.current && progress > 0.5) {
      const pulse = 1 + Math.sin(t * 4) * 0.1 * (progress - 0.5) / 0.5
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
      <CoinMark ref={coinRef} position={[0, -0.55, 0]} />

      {/* Ambient particles */}
      <AmbientParticles count={40} spread={10} />
    </>
  )
}

// Canvas wrapper with performance settings
function Hero3DCanvas({ scrollProgress, prefersReducedMotion, onReady }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Canvas
      camera={{ position: [0, 1.4, 5], fov: 40 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      dpr={[1, 1.5]}
      frameloop={prefersReducedMotion ? 'never' : 'always'}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        // Explicitly set clear color to transparent to avoid black background
        gl.clearColor(0, 0, 0, 0)
        onReady?.()
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
const Hero3DComponent = (props) => {
  const { onReady, ...rest } = props
  const [scrollProgress, setScrollProgress] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

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
      const heroHeight = rect.height

      // Progress: 0 when the hero is fully on screen, → 1 as the hero
      // bottom leaves the viewport. Old mapping started at ~0.5 on load,
      // which killed the first half of the motion.
      const progress = Math.max(0, Math.min(1, -rect.top / heroHeight))

      setScrollProgress(progress)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <Hero3DCanvas
      scrollProgress={scrollProgress}
      prefersReducedMotion={prefersReducedMotion}
      onReady={onReady}
      {...rest}
    />
  )
}

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