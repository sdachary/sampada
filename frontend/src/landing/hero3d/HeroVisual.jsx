// HeroVisual — lazy-loads the 3D hero, shows static poster first (LCP element)
// Cross-fades to 3D on first frame. Mirrors Appendix C of SAMPADA_UI_MODERNIZATION.md
import { lazy, Suspense, useEffect, useState, useRef } from 'react'
import HeroPoster from './HeroPoster'

const Hero3D = lazy(() => import('./Hero3D'))

function canRender3D() {
  if (typeof window === 'undefined') return false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const wide = window.innerWidth >= 768
  const nav = navigator
  const saveData = nav.connection?.saveData === true
  const cores = nav.hardwareConcurrency ?? 8
  const canvas = document.createElement('canvas')
  const webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  return webgl && wide && !reduced && !saveData && cores > 4
}

export default function HeroVisual() {
  const [enable, setEnable] = useState(false)
  const [show3D, setShow3D] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    const go = () => setEnable(canRender3D())
    const id = 'requestIdleCallback' in window
      ? (window).requestIdleCallback(go)
      : window.setTimeout(go, 800)
    return () => ('cancelIdleCallback' in window
      ? (window).cancelIdleCallback(id)
      : clearTimeout(id))
  }, [])

  // Handle 3D canvas ready - cross-fade from poster to 3D
  const handleCanvasReady = () => {
    if (canvasRef.current) {
      // Start fade-in
      requestAnimationFrame(() => {
        setShow3D(true)
      })
    }
  }

  return (
    <div className="hero-visual" style={{ aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden' }}>
      {/* Static poster - always rendered, cross-fades out when 3D ready */}
      <HeroPoster
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: show3D ? 0 : 1,
          transition: 'opacity 600ms ease-out',
          pointerEvents: 'none',
        }}
      />
      {/* 3D Canvas - fades in when ready */}
      {enable && (
        <Suspense fallback={null}>
          <Hero3D
            ref={canvasRef}
            onReady={handleCanvasReady}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              opacity: show3D ? 1 : 0,
              transition: 'opacity 600ms ease-out',
            }}
          />
        </Suspense>
      )}
    </div>
  )
}